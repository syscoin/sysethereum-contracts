pragma solidity ^0.4.19;

import './SyscoinClaimManager.sol';
import './SyscoinErrorCodes.sol';
import './SyscoinSuperblocks.sol';
import './SyscoinParser/SyscoinMessageLibrary.sol';

// @dev - Manages a battle session between superblock submitter and challenger
contract SyscoinBattleManager is SyscoinErrorCodes {

    enum ChallengeState {
        Unchallenged,             // Unchallenged submission
        Challenged,               // Claims was challenged
        QueryMerkleRootHashes,    // Challenger expecting block hashes
        RespondMerkleRootHashes,  // Block hashes were received and verified
        QueryBlockHeaderProof,     // Challenger is requesting block hash proof
        RespondBlockHeaderProof,   // All block hashes were received and verified by merkle commitment to superblock merkle root
        PendingVerification,      // Pending superblock verification
        SuperblockVerified,       // Superblock verified
        SuperblockFailed          // Superblock not valid
    }

    enum BlockInfoStatus {
        Uninitialized,
        Requested,
		Verified
    }

    struct BlockInfo {
        bytes32 prevBlock;
        uint64 timestamp;
        uint32 bits;
        BlockInfoStatus status;
        bytes32 blockHash;
    }
    struct SiblingInfo{
        uint[] siblings;
        bool exists;
    }

    struct BattleSession {
        bytes32 id;
        bytes32 superblockHash;
        address submitter;
        address challenger;
        uint lastActionTimestamp;         // Last action timestamp
        uint lastActionClaimant;          // Number last action submitter
        uint lastActionChallenger;        // Number last action challenger
        uint actionsCounter;              // Counter session actions

        bytes32[] blockHashes;            // Block hashes
        SiblingInfo[] blockSiblings;
        BlockInfo lastBlockInfo;

        ChallengeState challengeState;    // Claim state
    }


    mapping (bytes32 => BattleSession) public sessions;



    uint public superblockDuration;         // Superblock duration (in seconds)
    uint public superblockTimeout;          // Timeout action (in seconds)


    // network that the stored blocks belong to
    SyscoinMessageLibrary.Network private net;


    // Syscoin claim manager
    SyscoinClaimManager trustedSyscoinClaimManager;

    // Superblocks contract
    SyscoinSuperblocks trustedSuperblocks;

    event NewBattle(bytes32 superblockHash, bytes32 sessionId, address submitter, address challenger);
    event ChallengerConvicted(bytes32 superblockHash, bytes32 sessionId, address challenger);
    event SubmitterConvicted(bytes32 superblockHash, bytes32 sessionId, address submitter);

    event QueryMerkleRootHashes(bytes32 superblockHash, bytes32 sessionId, address submitter);
    event RespondMerkleRootHashes(bytes32 superblockHash, bytes32 sessionId, address challenger);
    event QueryBlockHeaderProof(bytes32 sessionId, address submitter);
    event RespondBlockHeaderProof(bytes32 sessionId, address challenger);
    event RespondLastBlockHeader(bytes32 superblockHash, bytes32 blockSha256Hash);
    event Difficulty(uint hashes, uint timestamp, uint work, uint accWork, uint32 newBits, uint32 prevBits);
    event DifficultyEnd(uint work, uint accWork);
    event DifficultyStep(uint work, uint32 bits);
    event DifficultyAdjustment(uint retargetPeriod, uint32 bits);

    event ErrorBattle(bytes32 sessionId, uint err);
    modifier onlyFrom(address sender) {
        require(msg.sender == sender);
        _;
    }

    modifier onlyClaimant(bytes32 sessionId) {
        require(msg.sender == sessions[sessionId].submitter);
        _;
    }

    modifier onlyChallenger(bytes32 sessionId) {
        require(msg.sender == sessions[sessionId].challenger);
        _;
    }

    // @dev – Configures the contract managing superblocks battles
    // @param _network Network type to use for block difficulty validation
    // @param _superblocks Contract that manages superblocks
    // @param _superblockDuration Superblock duration (in seconds)
    // @param _superblockTimeout Time to wait for challenges (in seconds)
    constructor(
        SyscoinMessageLibrary.Network _network,
        SyscoinSuperblocks _superblocks,
        uint _superblockDuration,
        uint _superblockTimeout
    ) public {
        net = _network;
        trustedSuperblocks = _superblocks;
        superblockDuration = _superblockDuration;
        superblockTimeout = _superblockTimeout;
    }

    function setSyscoinClaimManager(SyscoinClaimManager _syscoinClaimManager) public {
        require(address(trustedSyscoinClaimManager) == 0x0 && address(_syscoinClaimManager) != 0x0);
        trustedSyscoinClaimManager = _syscoinClaimManager;
    }

    // @dev - Start a battle session
    function beginBattleSession(bytes32 superblockHash, address submitter, address challenger)
        onlyFrom(trustedSyscoinClaimManager) public returns (bytes32) {
        bytes32 sessionId = keccak256(abi.encode(superblockHash, msg.sender));
        BattleSession storage session = sessions[sessionId];
        session.id = sessionId;
        session.superblockHash = superblockHash;
        session.submitter = submitter;
        session.challenger = challenger;
        session.lastActionTimestamp = block.timestamp;
        session.lastActionChallenger = 0;
        session.lastActionClaimant = 1;     // Force challenger to start
        session.actionsCounter = 1;
        session.challengeState = ChallengeState.Challenged;


        emit NewBattle(superblockHash, sessionId, submitter, challenger);
        return sessionId;
    }

    // @dev - Challenger makes a query for superblock hashes
    function doQueryMerkleRootHashes(BattleSession storage session) internal returns (uint) {
        if (!hasDeposit(msg.sender, respondMerkleRootHashesCost)) {
            return ERR_SUPERBLOCK_MIN_DEPOSIT;
        }
        if (session.challengeState == ChallengeState.Challenged) {
            session.challengeState = ChallengeState.QueryMerkleRootHashes;
            assert(msg.sender == session.challenger);
            uint err = bondDeposit(session.superblockHash, msg.sender, respondMerkleRootHashesCost);
            if (err != ERR_SUPERBLOCK_OK) {
                return err;
            }
            return ERR_SUPERBLOCK_OK;
        }
        return ERR_SUPERBLOCK_BAD_STATUS;
    }

    // @dev - Challenger makes a query for superblock hashes
    function queryMerkleRootHashes(bytes32 superblockHash, bytes32 sessionId) onlyChallenger(sessionId) public {
        BattleSession storage session = sessions[sessionId];
        uint err = doQueryMerkleRootHashes(session);
        if (err != ERR_SUPERBLOCK_OK) {
            emit ErrorBattle(sessionId, err);
        } else {
            session.actionsCounter += 1;
            session.lastActionTimestamp = block.timestamp;
            session.lastActionChallenger = session.actionsCounter;
            emit QueryMerkleRootHashes(superblockHash, sessionId, session.submitter);
        }
    }

    // @dev - Submitter sends hashes to verify superblock merkle root
    function doVerifyMerkleRootHashes(BattleSession storage session, bytes32[] blockHashes) internal returns (uint) {
        if (!hasDeposit(msg.sender, verifySuperblockCost)) {
            return ERR_SUPERBLOCK_MIN_DEPOSIT;
        }
        require(session.blockHashes.length == 0);
        if (session.challengeState == ChallengeState.QueryMerkleRootHashes) {
            (bytes32 merkleRoot, , , , bytes32 lastHash, , , ,,) = getSuperblockInfo(session.superblockHash);
            if (lastHash != blockHashes[blockHashes.length - 1]){
                return ERR_SUPERBLOCK_BAD_LASTBLOCK;
            }
            if (merkleRoot != SyscoinMessageLibrary.makeMerkle(blockHashes)) {
                return ERR_SUPERBLOCK_INVALID_MERKLE;
            }
            uint err = bondDeposit(session.superblockHash, msg.sender, verifySuperblockCost);
            if (err != ERR_SUPERBLOCK_OK) {
                return err;
            }
            session.blockHashes = blockHashes;
            session.blockSiblings.length = blockHashes.length;
            session.challengeState = ChallengeState.RespondMerkleRootHashes;
            return ERR_SUPERBLOCK_OK;
        }
        return ERR_SUPERBLOCK_BAD_STATUS;
    }

    // @dev - For the submitter to respond to challenger queries
    function respondMerkleRootHashes(bytes32 superblockHash, bytes32 sessionId, bytes32[] blockHashes) onlyClaimant(sessionId) public {
        BattleSession storage session = sessions[sessionId];
        uint err = doVerifyMerkleRootHashes(session, blockHashes);
        if (err != 0) {
            emit ErrorBattle(sessionId, err);
        } else {
            session.actionsCounter += 1;
            session.lastActionTimestamp = block.timestamp;
            session.lastActionClaimant = session.actionsCounter;
            emit RespondMerkleRootHashes(superblockHash, sessionId, session.challenger);
        }
    }
    // @dev - Challenger makes a query for block proof
    function doQueryBlockHeaderProof(BattleSession storage session) internal returns (uint) {
        if (!hasDeposit(msg.sender, respondBlockHeaderProofCost)) {
            return ERR_SUPERBLOCK_MIN_DEPOSIT;
        }
        if (session.challengeState == ChallengeState.RespondMerkleRootHashes) {
            require(session.lastBlockInfo.status == BlockInfoStatus.Uninitialized);
            uint err = bondDeposit(session.superblockHash, msg.sender, respondBlockHeaderProofCost);
            if (err != ERR_SUPERBLOCK_OK) {
                return err;
            }
            session.lastBlockInfo.status = BlockInfoStatus.Requested;
            session.challengeState = ChallengeState.QueryBlockHeaderProof;
            return ERR_SUPERBLOCK_OK;
        }
        return ERR_SUPERBLOCK_BAD_STATUS;
    }

    // @dev - For the challenger to start a query
    function queryBlockHeaderProof(bytes32 sessionId) onlyChallenger(sessionId) public {
        BattleSession storage session = sessions[sessionId];
        uint err = doQueryBlockHeaderProof(session);
        if (err != ERR_SUPERBLOCK_OK) {
            emit ErrorBattle(sessionId, err);
        } else {
            session.actionsCounter += 1;
            session.lastActionTimestamp = block.timestamp;
            session.lastActionChallenger = session.actionsCounter;
            emit QueryBlockHeaderProof(sessionId, session.submitter);
        }
    }

    // @dev - Verify that block timestamp is in the superblock timestamp interval
    function verifyTimestamp(bytes32 superblockHash, bytes blockHeader) internal view returns (bool) {
        uint blockTimestamp = SyscoinMessageLibrary.getTimestamp(blockHeader);
        uint superblockTimestamp;

        (, , superblockTimestamp, , , , , ,,) = getSuperblockInfo(superblockHash);

        // Block timestamp to be within the expected timestamp of the superblock
        return (blockTimestamp <= superblockTimestamp)
            && (blockTimestamp / superblockDuration >= superblockTimestamp / superblockDuration - 1);
    }

    // @dev - Verify Syscoin block AuxPoW
    function verifyBlockAuxPoW(
        BlockInfo storage blockInfo,
        bytes32 blockHash,
        bytes blockHeader
    ) internal returns (uint) {
        uint err = SyscoinMessageLibrary.verifyBlockHeader(blockHeader, 0, uint(blockHash));
        if (err != 0) {
            return err;
        }
        blockInfo.timestamp = SyscoinMessageLibrary.getTimestamp(blockHeader);
        blockInfo.bits = SyscoinMessageLibrary.getBits(blockHeader);
        blockInfo.prevBlock = bytes32(SyscoinMessageLibrary.getHashPrevBlock(blockHeader));
        blockInfo.blockHash = blockHash;
        return ERR_SUPERBLOCK_OK;
    }


    function getSlice(uint begin, uint end, uint[] siblingsArray) internal pure returns (uint[]) {
        uint[] memory a = new uint[](end-begin+1);
        uint i;
        for(i=0;i<=end-begin;i++){
            a[i] = uint[](siblingsArray)[i+begin];
        }
        return a;
    }

    function doRespondBlockHeaderProof(BattleSession storage session, uint startingIndex, uint count, uint[] _siblingsMap) internal returns (uint) {      
        uint numHashesPerProof = (_siblingsMap.length / count);
        bool filled = session.blockSiblings.length > 0;
        uint i;
        uint index;
 
        for(i = startingIndex;i < (startingIndex+count);i++){
            index = (i-startingIndex)*numHashesPerProof;
            uint[] memory sliceSiblings = getSlice(index, index+(numHashesPerProof - 1), _siblingsMap);
            assert(sliceSiblings.length == numHashesPerProof);
            session.blockSiblings[i].siblings = sliceSiblings;
            session.blockSiblings[i].exists = true;
        }
        for(i =0;i<session.blockSiblings.length;i++){
            if(!session.blockSiblings[i].exists){
                filled = false;
                break;
            }
        }
        if(filled){
           return doVerifyBlockHeaderProof(session); 
        }
        return ERR_SUPERBLOCK_MISSING_SIBLINGS;
    }
    function doVerifyBlockHeaderProof(BattleSession storage session) internal returns (uint) {
        // Verify sb Merkle root committed by block hash
        uint i;
        (bytes32 merkleRoot, , , , , , , ,,) = getSuperblockInfo(session.superblockHash);
        assert(session.blockSiblings.length == session.blockHashes.length);
        if(session.blockHashes.length > 1){
            for(i = 0;i < session.blockHashes.length;i++){
                if (bytes32(SyscoinMessageLibrary.computeMerkle(uint(session.blockHashes[i]), i, session.blockSiblings[i].siblings)) != merkleRoot) {
                    return (ERR_MERKLE_ROOT);
                }
            }
        }
        else if(merkleRoot != session.blockHashes[0]){
            return (ERR_MERKLE_ROOT);
        }
        session.challengeState = ChallengeState.PendingVerification;
        session.actionsCounter += 1;
        session.lastActionTimestamp = block.timestamp;
        session.lastActionClaimant = session.actionsCounter;
        emit RespondBlockHeaderProof(session.superblockHash, session.challenger);
        return ERR_SUPERBLOCK_OK;
    }
    // @dev - Verify block header sent by challenger
    function doVerifyBlockHeader(
        BattleSession storage session,
        bytes blockHeader
    ) internal returns (uint) {
        if (!hasDeposit(msg.sender, respondBlockHeaderProofCost)) {
            return (ERR_SUPERBLOCK_MIN_DEPOSIT);
        }
        if (session.challengeState == ChallengeState.QueryBlockHeaderProof) {
            bytes32 blockSha256Hash = bytes32(SyscoinMessageLibrary.dblShaFlipMem(blockHeader, 0, 80));
            if(session.blockHashes[session.blockHashes.length-1] != blockSha256Hash){
                return (ERR_SUPERBLOCK_BAD_LASTBLOCK);
            }
            if (!verifyTimestamp(session.superblockHash, blockHeader)) {
                return (ERR_SUPERBLOCK_BAD_TIMESTAMP);
            }
            BlockInfo storage blockInfo = session.lastBlockInfo;
            if(blockInfo.status == BlockInfoStatus.Verified)
               return ERR_SUPERBLOCK_OK;
			// pass in blockSha256Hash here instead of proposedScryptHash because we
            // don't need a proposed hash (we already calculated it here, syscoin uses 
            // sha256 just like bitcoin)
            uint err = verifyBlockAuxPoW(blockInfo, blockSha256Hash, blockHeader);
            if (err != ERR_SUPERBLOCK_OK) {
                return (err);
            }

            err = bondDeposit(session.superblockHash, msg.sender, respondBlockHeaderProofCost);
            if (err != ERR_SUPERBLOCK_OK) {
                return (err);
            }
           
            blockInfo.status = BlockInfoStatus.Verified;
            emit RespondLastBlockHeader(session.superblockHash, blockSha256Hash);
            return (ERR_SUPERBLOCK_OK);
        }
        return (ERR_SUPERBLOCK_BAD_STATUS);
    }

    // @dev - For the submitter to respond to challenger queries
    function respondBlockHeaderProof(
        bytes32 sessionId,
        uint[] _siblingsMap,
        uint startingIndex,
        uint count,
        bytes blockHeader
    ) onlyClaimant(sessionId) public {
        BattleSession storage session = sessions[sessionId];
        if(blockHeader.length > 0){
            (uint err) = doVerifyBlockHeader(session, blockHeader);
            if (err != 0) {
                emit ErrorBattle(sessionId, err);
                return;
            }
        }
        (err) = doRespondBlockHeaderProof(session, startingIndex, count, _siblingsMap);
        if (err != ERR_SUPERBLOCK_OK && err != ERR_SUPERBLOCK_MISSING_SIBLINGS) {
            emit ErrorBattle(sessionId, err);
        } 
    }

    // @dev - Validate superblock information from last blocks
    function validateLastBlocks(BattleSession storage session) internal view returns (uint) {
        if (session.blockHashes.length <= 0) {
            return ERR_SUPERBLOCK_BAD_LASTBLOCK;
        }
        uint lastTimestamp;
        uint prevTimestamp;
        bytes32 parentId;
        bytes32 lastBlockHash;
        (, , lastTimestamp, , lastBlockHash, , parentId,,,) = getSuperblockInfo(session.superblockHash);
        bytes32 blockSha256Hash = session.blockHashes[session.blockHashes.length - 1];
        if(session.blockHashes.length > 2){
            bytes32 prevBlockSha256Hash = session.blockHashes[session.blockHashes.length - 2];
            if(session.lastBlockInfo.prevBlock != prevBlockSha256Hash){
                return ERR_SUPERBLOCK_BAD_PREVBLOCK;
            }

        }
        if(blockSha256Hash != lastBlockHash){
            return ERR_SUPERBLOCK_BAD_LASTBLOCK;
        }
        if (session.lastBlockInfo.timestamp != lastTimestamp) {
            return ERR_SUPERBLOCK_BAD_TIMESTAMP;
        }
        if (session.lastBlockInfo.status != BlockInfoStatus.Verified) {
            return ERR_SUPERBLOCK_BAD_LASTBLOCK_STATUS;
        }
        (, ,prevTimestamp , ,,, , , ,) = getSuperblockInfo(parentId);
        
        if (prevTimestamp > lastTimestamp) {
            return ERR_SUPERBLOCK_BAD_TIMESTAMP;
        }
        return ERR_SUPERBLOCK_OK;
    }

    // @dev - Validate superblock accumulated work
    function validateProofOfWork(BattleSession storage session) internal returns (uint) {
        uint accWork;
        bytes32 prevBlock;
        uint32 prevHeight;  
        uint32 proposedHeight;  
        uint retargetPeriod;
        uint32 prevBits;
        uint prevWork; 
        (, accWork, , retargetPeriod, , prevBits,prevBlock,,,proposedHeight) = getSuperblockInfo(session.superblockHash);
        if(accWork <= 0){
            return ERR_SUPERBLOCK_BAD_ACCUMULATED_WORK;
        } 
        if(prevBits <= 0){
            return ERR_SUPERBLOCK_BAD_BITS;
        }  
        if(retargetPeriod <= 0){
            return ERR_SUPERBLOCK_BAD_RETARGET;
        }   
        (, prevWork, , ,,, , , ,prevHeight) = getSuperblockInfo(prevBlock);
        
        if (proposedHeight != (prevHeight+uint32(session.blockHashes.length))) {
            return proposedHeight;
        } 
        if(accWork <= prevWork){
            return ERR_SUPERBLOCK_INVALID_ACCUMULATED_WORK;
        }   
        uint ret = validateSuperblockProofOfWork(session, prevHeight, prevWork, accWork, retargetPeriod, prevBits);
        if(ret != 0){
            return ret;
        }
        return ERR_SUPERBLOCK_OK;
    }
    function validateSuperblockProofOfWork(BattleSession storage session, uint32 prevHeight, uint prevWork, uint accWork, uint retargetPeriod, uint32 prevBits) internal returns (uint){     
         uint32 idx = 0;
         while (idx < session.blockHashes.length) {
            if (net != SyscoinMessageLibrary.Network.REGTEST) {
                if((prevHeight+idx+1) % SyscoinMessageLibrary.difficultyAdjustmentInterval() == 0){
                    emit DifficultyAdjustment(retargetPeriod, prevBits);
                    prevBits = SyscoinMessageLibrary.calculateDifficulty(int64(retargetPeriod), prevBits);
                    // ensure last block bits is consistent with the difficulty adjustment with bits set inside of superblock
                    if(session.lastBlockInfo.bits != prevBits){
                        return ERR_SUPERBLOCK_BAD_BITS;
                    }
                }
            }
            if(prevBits > 0){
                prevWork += SyscoinMessageLibrary.diffFromBits(prevBits);
                emit DifficultyStep(prevWork, prevBits);
            }
            idx += 1;
        }
        emit DifficultyEnd(prevWork, accWork);
        if (net != SyscoinMessageLibrary.Network.REGTEST && prevWork != accWork) {
            return ERR_SUPERBLOCK_BAD_ACCUMULATED_WORK;
        }       
        return 0;
    }
    // @dev - Verify whether a superblock's data is consistent
    // Only should be called when all blocks header were submitted
    function doVerifySuperblock(BattleSession storage session, bytes32 sessionId) internal returns (uint) {
        if (session.challengeState == ChallengeState.PendingVerification) {
            uint err;
            err = validateLastBlocks(session);
            if (err != 0) {
                emit ErrorBattle(sessionId, err);
                return 2;
            }
            err = validateProofOfWork(session);
            if (err != 0) {
                emit ErrorBattle(sessionId, err);
                return 2;
            }
            return 1;
        } else if (session.challengeState == ChallengeState.SuperblockFailed) {
            return 2;
        }
        return 0;
    }

    // @dev - Perform final verification once all blocks were submitted
    function verifySuperblock(bytes32 sessionId) public {
        BattleSession storage session = sessions[sessionId];
        uint status = doVerifySuperblock(session, sessionId);
        if (status == 1) {
            convictChallenger(sessionId, session.challenger, session.superblockHash);
        } else if (status == 2) {
            convictSubmitter(sessionId, session.submitter, session.superblockHash);
        }
    }

    // @dev - Trigger conviction if response is not received in time
    function timeout(bytes32 sessionId) public returns (uint) {
        BattleSession storage session = sessions[sessionId];
        if (session.challengeState == ChallengeState.SuperblockFailed ||
            (session.lastActionChallenger > session.lastActionClaimant &&
            block.timestamp > session.lastActionTimestamp + superblockTimeout)) {
            convictSubmitter(sessionId, session.submitter, session.superblockHash);
            return ERR_SUPERBLOCK_OK;
        } else if (session.lastActionClaimant > session.lastActionChallenger &&
            block.timestamp > session.lastActionTimestamp + superblockTimeout) {
            convictChallenger(sessionId, session.challenger, session.superblockHash);
            return ERR_SUPERBLOCK_OK;
        }
        emit ErrorBattle(sessionId, ERR_SUPERBLOCK_NO_TIMEOUT);
        return ERR_SUPERBLOCK_NO_TIMEOUT;
    }

    // @dev - To be called when a challenger is convicted
    function convictChallenger(bytes32 sessionId, address challenger, bytes32 superblockHash) internal {
        BattleSession storage session = sessions[sessionId];
        sessionDecided(sessionId, superblockHash, session.submitter, session.challenger);
        disable(sessionId);
        emit ChallengerConvicted(superblockHash, sessionId, challenger);
    }

    // @dev - To be called when a submitter is convicted
    function convictSubmitter(bytes32 sessionId, address submitter, bytes32 superblockHash) internal {
        BattleSession storage session = sessions[sessionId];
        sessionDecided(sessionId, superblockHash, session.challenger, session.submitter);
        disable(sessionId);
        emit SubmitterConvicted(superblockHash, sessionId, submitter);
    }

    // @dev - Disable session
    // It should be called only when either the submitter or the challenger were convicted.
    function disable(bytes32 sessionId) internal {
        delete sessions[sessionId];
    }

    // @dev - Check if a session's challenger did not respond before timeout
    function getChallengerHitTimeout(bytes32 sessionId) public view returns (bool) {
        BattleSession storage session = sessions[sessionId];
        return (session.lastActionClaimant > session.lastActionChallenger &&
            block.timestamp > session.lastActionTimestamp + superblockTimeout);
    }

    // @dev - Check if a session's submitter did not respond before timeout
    function getSubmitterHitTimeout(bytes32 sessionId) public view returns (bool) {
        BattleSession storage session = sessions[sessionId];
        return (session.lastActionChallenger > session.lastActionClaimant &&
            block.timestamp > session.lastActionTimestamp + superblockTimeout);
    }

    // @dev - Return Syscoin block hashes associated with a certain battle session
    function getSyscoinBlockHashes(bytes32 sessionId) public view returns (bytes32[]) {
        return sessions[sessionId].blockHashes;
    }

    // @dev - To be called when a battle sessions  was decided
    function sessionDecided(bytes32 sessionId, bytes32 superblockHash, address winner, address loser) internal {
        trustedSyscoinClaimManager.sessionDecided(sessionId, superblockHash, winner, loser);
    }

    // @dev - Retrieve superblock information
    function getSuperblockInfo(bytes32 superblockHash) internal view returns (
        bytes32 _blocksMerkleRoot,
        uint _accumulatedWork,
        uint _timestamp,
        uint _retargetPeriod,
        bytes32 _lastHash,
        uint32 _lastBits,
        bytes32 _parentId,
        address _submitter,
        SyscoinSuperblocks.Status _status,
        uint32 _height
    ) {
        return trustedSuperblocks.getSuperblock(superblockHash);
    }

    // @dev - Verify whether a user has a certain amount of deposits or more
    function hasDeposit(address who, uint amount) internal view returns (bool) {
        return trustedSyscoinClaimManager.getDeposit(who) >= amount;
    }

    // @dev – locks up part of a user's deposit into a claim.
    function bondDeposit(bytes32 superblockHash, address account, uint amount) internal returns (uint) {
        return trustedSyscoinClaimManager.bondDeposit(superblockHash, account, amount);
    }
}

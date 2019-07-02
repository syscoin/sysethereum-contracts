pragma solidity >=0.5.0 <0.6.0;

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
        QueryLastBlockHeader,     // Challenger is requesting last block header
        PendingVerification,      // All block hashes were received and verified by merkle commitment to superblock merkle root set to pending superblock verification
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

        mapping (bytes32 => BlockInfo) blocksInfo;

        ChallengeState challengeState;    // Claim state
    }


    mapping (bytes32 => BattleSession) public sessions;



    uint public superblockDuration;         // Superblock duration (in blocks)
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
    event QueryLastBlockHeader(bytes32 sessionId);
    event RespondLastBlockHeader(bytes32 sessionId, address challenger);

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
    // @param _superblockDuration Superblock duration (in blocks)
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
        require(address(trustedSyscoinClaimManager) == address(0) && address(_syscoinClaimManager) != address(0));
        trustedSyscoinClaimManager = _syscoinClaimManager;
    }

    // @dev - Start a battle session
    function beginBattleSession(bytes32 superblockHash, address submitter, address challenger)
        onlyFrom(address(trustedSyscoinClaimManager)) public returns (bytes32) {
        bytes32 sessionId = keccak256(abi.encode(superblockHash, msg.sender, challenger));
        BattleSession storage session = sessions[sessionId];
        if(session.id != 0x0){
            revert();
        }
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
    function doVerifyMerkleRootHashes(BattleSession storage session, bytes32[] memory blockHashes) internal returns (uint) {
        if (!hasDeposit(msg.sender, verifySuperblockCost)) {
            return ERR_SUPERBLOCK_MIN_DEPOSIT;
        }
        require(session.blockHashes.length == 0);
        if (session.challengeState == ChallengeState.QueryMerkleRootHashes) {
            (bytes32 merkleRoot, , ,bytes32 lastHash,, , ,,) = getSuperblockInfo(session.superblockHash);
            if (lastHash != blockHashes[blockHashes.length - 1]){
                return ERR_SUPERBLOCK_BAD_LASTBLOCK;
            }
            if(net != SyscoinMessageLibrary.Network.REGTEST && blockHashes.length != superblockDuration){
                return ERR_SUPERBLOCK_BAD_BLOCKHEIGHT;
            }
            if (merkleRoot != SyscoinMessageLibrary.makeMerkle(blockHashes)) {
                return ERR_SUPERBLOCK_INVALID_MERKLE;
            }
            uint err = bondDeposit(session.superblockHash, msg.sender, verifySuperblockCost);
            if (err != ERR_SUPERBLOCK_OK) {
                return err;
            }
            session.blockHashes = blockHashes;
            session.challengeState = ChallengeState.RespondMerkleRootHashes;
            return ERR_SUPERBLOCK_OK;
        }
        return ERR_SUPERBLOCK_BAD_STATUS;
    }

    // @dev - For the submitter to respond to challenger queries
    function respondMerkleRootHashes(bytes32 superblockHash, bytes32 sessionId, bytes32[] memory blockHashes) onlyClaimant(sessionId) public {
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
       
    // @dev - Challenger makes a query for last block header
    function doQueryLastBlockHeader(BattleSession storage session) internal returns (uint) {
        if (!hasDeposit(msg.sender, respondLastBlockHeaderCost)) {
            return ERR_SUPERBLOCK_MIN_DEPOSIT;
        }
        if (session.challengeState == ChallengeState.RespondMerkleRootHashes) {
            require(session.blocksInfo[session.superblockHash].status == BlockInfoStatus.Uninitialized);
            uint err = bondDeposit(session.superblockHash, msg.sender, respondLastBlockHeaderCost);
            if (err != ERR_SUPERBLOCK_OK) {
                return err;
            }
            session.challengeState = ChallengeState.QueryLastBlockHeader;
            session.blocksInfo[session.superblockHash].status = BlockInfoStatus.Requested;
            return ERR_SUPERBLOCK_OK;
        }
        return ERR_SUPERBLOCK_BAD_STATUS;
    }

    // @dev - For the challenger to start a query
    function queryLastBlockHeader(bytes32 sessionId) onlyChallenger(sessionId) public {
        BattleSession storage session = sessions[sessionId];
        uint err = doQueryLastBlockHeader(session);
        if (err != ERR_SUPERBLOCK_OK) {
            emit ErrorBattle(sessionId, err);
        } else {
            session.actionsCounter += 1;
            session.lastActionTimestamp = block.timestamp;
            session.lastActionChallenger = session.actionsCounter;
            emit QueryLastBlockHeader(sessionId);
        }
    }

    // @dev - Verify Syscoin block AuxPoW
    function verifyBlockAuxPoW(
        BlockInfo storage blockInfo,
        bytes32 blockHash,
        bytes memory blockHeader
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

    // @dev - Verify block header sent by challenger
    function doVerifyLastBlockHeader(
        BattleSession storage session,
        bytes memory blockHeader
    ) internal returns (uint) {
        if (!hasDeposit(msg.sender, respondLastBlockHeaderCost)) {
            return (ERR_SUPERBLOCK_MIN_DEPOSIT);
        }
        if (session.challengeState == ChallengeState.QueryLastBlockHeader) {
            bytes32 blockSha256Hash = bytes32(SyscoinMessageLibrary.dblShaFlipMem(blockHeader, 0, 80));
            if(session.blockHashes[session.blockHashes.length-1] != blockSha256Hash){
                return (ERR_SUPERBLOCK_BAD_LASTBLOCK);
            }
            BlockInfo storage blockInfo = session.blocksInfo[session.superblockHash];
            if (blockInfo.status != BlockInfoStatus.Requested) {
                return (ERR_SUPERBLOCK_BAD_SYSCOIN_STATUS);
            }

			// pass in blockSha256Hash here instead of proposedScryptHash because we
            // don't need a proposed hash (we already calculated it here, syscoin uses 
            // sha256 just like bitcoin)
            uint err = verifyBlockAuxPoW(blockInfo, blockSha256Hash, blockHeader);
            if (err != ERR_SUPERBLOCK_OK) {
                return (err);
            }

            err = bondDeposit(session.superblockHash, msg.sender, respondLastBlockHeaderCost);
            if (err != ERR_SUPERBLOCK_OK) {
                return (err);
            }
            session.challengeState = ChallengeState.PendingVerification;
            blockInfo.status = BlockInfoStatus.Verified;
            return (ERR_SUPERBLOCK_OK);
        }
        return (ERR_SUPERBLOCK_BAD_STATUS);
    }
    function respondLastBlockHeader(
        bytes32 sessionId,
        bytes memory blockHeader
        ) onlyClaimant(sessionId) public {
        BattleSession storage session = sessions[sessionId];
        (uint err) = doVerifyLastBlockHeader(session, blockHeader);
        if (err != 0) {
            emit ErrorBattle(sessionId, err);
        }else{
            session.actionsCounter += 1;
            session.lastActionTimestamp = block.timestamp;
            session.lastActionClaimant = session.actionsCounter;
            emit RespondLastBlockHeader(sessionId, session.challenger);
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
        (, , lastTimestamp, lastBlockHash, ,parentId,,,) = getSuperblockInfo(session.superblockHash);
        bytes32 blockSha256Hash = session.blockHashes[session.blockHashes.length - 1];
        BlockInfo storage blockInfo = session.blocksInfo[session.superblockHash];
        if(session.blockHashes.length > 2){
            bytes32 prevBlockSha256Hash = session.blockHashes[session.blockHashes.length - 2];
            if(blockInfo.prevBlock != prevBlockSha256Hash){
                return ERR_SUPERBLOCK_BAD_PREVBLOCK;
            }

        }
        if(blockSha256Hash != lastBlockHash){
            return ERR_SUPERBLOCK_BAD_LASTBLOCK;
        }
        if (blockInfo.timestamp != lastTimestamp) {
            return ERR_SUPERBLOCK_BAD_TIMESTAMP;
        }
        if (blockInfo.status != BlockInfoStatus.Verified) {
            return ERR_SUPERBLOCK_BAD_LASTBLOCK_STATUS;
        }
        (, ,prevTimestamp , ,,,, , ) = getSuperblockInfo(parentId);
        
        if (prevTimestamp > lastTimestamp) {
            return ERR_SUPERBLOCK_BAD_TIMESTAMP;
        }
        return ERR_SUPERBLOCK_OK;
    }

    // @dev - Validate superblock accumulated work
    function validateProofOfWork(BattleSession storage session) internal view returns (uint) {
        uint accWork;
        bytes32 prevBlock;
        uint heightDiff = superblockDuration; 
        uint prevWork;
        uint32 prevBits;
        uint superblockHeight;
        bytes32 superblockHash = session.superblockHash;
        (, accWork, ,,prevBits,prevBlock,,,superblockHeight) = getSuperblockInfo(superblockHash);
        BlockInfo storage blockInfo = session.blocksInfo[superblockHash];
        if(accWork <= 0){
            return ERR_SUPERBLOCK_BAD_ACCUMULATED_WORK;
        }    
        (, prevWork, ,, ,, ,,) = getSuperblockInfo(prevBlock);
        if(net == SyscoinMessageLibrary.Network.REGTEST)
            heightDiff = session.blockHashes.length;
         
        if(accWork <= prevWork){
            return ERR_SUPERBLOCK_INVALID_ACCUMULATED_WORK;
        }
        // make sure every 6th superblock adjusts difficulty
        if((superblockHeight % 6) == 0){
            if(prevBits == blockInfo.bits){
                return ERR_SUPERBLOCK_INVALID_DIFFICULTY_ADJUSTMENT;
            }
            // make sure difficulty adjustment is within bounds
            uint32 lowerBoundDiff = SyscoinMessageLibrary.calculateDifficulty(SyscoinMessageLibrary.getLowerBoundDifficultyTarget()-1, prevBits);
            uint32 upperBoundDiff = SyscoinMessageLibrary.calculateDifficulty(SyscoinMessageLibrary.getUpperBoundDifficultyTarget()+1, prevBits);
            if(blockInfo.bits < lowerBoundDiff || blockInfo.bits > upperBoundDiff){
                return ERR_SUPERBLOCK_BAD_RETARGET;
            }          
        }
        // within the 6th make sure bits don't change
        else if(prevBits != blockInfo.bits){
            return ERR_SUPERBLOCK_BAD_BITS;
        }
        uint newWork = prevWork + (SyscoinMessageLibrary.diffFromBits(blockInfo.bits)*heightDiff);
        if (net != SyscoinMessageLibrary.Network.REGTEST && newWork != accWork) {
            return ERR_SUPERBLOCK_BAD_ACCUMULATED_WORK;
        }   
        return ERR_SUPERBLOCK_OK;
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
    function getSyscoinBlockHashes(bytes32 sessionId) public view returns (bytes32[] memory) {
        return sessions[sessionId].blockHashes;
    }

    function getSuperblockBySession(bytes32 sessionId) public view returns (bytes32) {
        return sessions[sessionId].superblockHash;
    }

    function getSessionStatus(bytes32 sessionId) public view returns (BlockInfoStatus) {
        BattleSession storage session = sessions[sessionId];
        return session.blocksInfo[session.superblockHash].status;
    }
    function getSessionChallengeState(bytes32 sessionId) public view returns (ChallengeState) {
        return sessions[sessionId].challengeState;
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

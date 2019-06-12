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
        RespondMerkleRootHashes,  // Blcok hashes were received and verified
        QueryBlockHeader,         // Challenger is requesting block headers
        RespondBlockHeader,       // All block headers were received
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
        bytes powBlockHeader;
        bytes32 blockHash;
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
        uint countBlockHeaderQueries;     // Number of block header queries
        uint countBlockHeaderResponses;   // Number of block header responses

        mapping (bytes32 => BlockInfo) blocksInfo;

        ChallengeState challengeState;    // Claim state
    }


    mapping (bytes32 => BattleSession) public sessions;

    uint public sessionsCount = 0;

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
    event RespondMerkleRootHashes(bytes32 superblockHash, bytes32 sessionId, address challenger, bytes32[] blockHashes);
    event QueryBlockHeader(bytes32 superblockHash, bytes32 sessionId, address submitter, bytes32 blockSha256Hash);
    event RespondBlockHeader(bytes32 superblockHash, bytes32 sessionId, address challenger, bytes blockHeader, bytes powBlockHeader);

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
        bytes32 sessionId = keccak256(abi.encode(superblockHash, msg.sender, sessionsCount));
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

        sessionsCount += 1;

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
            (uint err, ) = bondDeposit(session.superblockHash, msg.sender, respondMerkleRootHashesCost);
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
            (uint err, ) = bondDeposit(session.superblockHash, msg.sender, verifySuperblockCost);
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
    function respondMerkleRootHashes(bytes32 superblockHash, bytes32 sessionId, bytes32[] blockHashes) onlyClaimant(sessionId) public {
        BattleSession storage session = sessions[sessionId];
        uint err = doVerifyMerkleRootHashes(session, blockHashes);
        if (err != 0) {
            emit ErrorBattle(sessionId, err);
        } else {
            session.actionsCounter += 1;
            session.lastActionTimestamp = block.timestamp;
            session.lastActionClaimant = session.actionsCounter;
            emit RespondMerkleRootHashes(superblockHash, sessionId, session.challenger, blockHashes);
        }
    }

    // @dev - Challenger makes a query for block header data for a hash
    function doQueryBlockHeader(BattleSession storage session, bytes32 blockHash) internal returns (uint) {
        if (!hasDeposit(msg.sender, respondBlockHeaderCost)) {
            return ERR_SUPERBLOCK_MIN_DEPOSIT;
        }
        if ((session.countBlockHeaderQueries == 0 && session.challengeState == ChallengeState.RespondMerkleRootHashes) ||
            (session.countBlockHeaderQueries > 0 && session.challengeState == ChallengeState.RespondBlockHeader)) {
            require(session.countBlockHeaderQueries < session.blockHashes.length);
            require(session.blocksInfo[blockHash].status == BlockInfoStatus.Uninitialized);
            (uint err, ) = bondDeposit(session.superblockHash, msg.sender, respondBlockHeaderCost);
            if (err != ERR_SUPERBLOCK_OK) {
                return err;
            }
            session.countBlockHeaderQueries += 1;
            session.blocksInfo[blockHash].status = BlockInfoStatus.Requested;
            session.challengeState = ChallengeState.QueryBlockHeader;
            return ERR_SUPERBLOCK_OK;
        }
        return ERR_SUPERBLOCK_BAD_STATUS;
    }

    // @dev - For the challenger to start a query
    function queryBlockHeader(bytes32 superblockHash, bytes32 sessionId, bytes32 blockHash) onlyChallenger(sessionId) public {
        BattleSession storage session = sessions[sessionId];
        uint err = doQueryBlockHeader(session, blockHash);
        if (err != ERR_SUPERBLOCK_OK) {
            emit ErrorBattle(sessionId, err);
        } else {
            session.actionsCounter += 1;
            session.lastActionTimestamp = block.timestamp;
            session.lastActionChallenger = session.actionsCounter;
            emit QueryBlockHeader(superblockHash, sessionId, session.submitter, blockHash);
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
    ) internal returns (uint, bytes) {
        (uint err, bool isMergeMined) =
            SyscoinMessageLibrary.verifyBlockHeader(blockHeader, 0, uint(blockHash));
        if (err != 0) {
            return (err, new bytes(0));
        }
        bytes memory powBlockHeader = (isMergeMined) ?
            SyscoinMessageLibrary.sliceArray(blockHeader, blockHeader.length - 80, blockHeader.length) :
            SyscoinMessageLibrary.sliceArray(blockHeader, 0, 80);

        blockInfo.timestamp = SyscoinMessageLibrary.getTimestamp(blockHeader);
        blockInfo.bits = SyscoinMessageLibrary.getBits(blockHeader);
        blockInfo.prevBlock = bytes32(SyscoinMessageLibrary.getHashPrevBlock(blockHeader));
        blockInfo.blockHash = blockHash;
        blockInfo.powBlockHeader = powBlockHeader;
        return (ERR_SUPERBLOCK_OK, powBlockHeader);
    }

    // @dev - Verify block header sent by challenger
    function doVerifyBlockHeader(
        BattleSession storage session,
        bytes memory blockHeader
    ) internal returns (uint, bytes) {
        if (!hasDeposit(msg.sender, respondBlockHeaderCost)) {
            return (ERR_SUPERBLOCK_MIN_DEPOSIT, new bytes(0));
        }
        if (session.challengeState == ChallengeState.QueryBlockHeader) {
            bytes32 blockSha256Hash = bytes32(SyscoinMessageLibrary.dblShaFlipMem(blockHeader, 0, 80));
            BlockInfo storage blockInfo = session.blocksInfo[blockSha256Hash];
            if (blockInfo.status != BlockInfoStatus.Requested) {
                return (ERR_SUPERBLOCK_BAD_SYSCOIN_STATUS, new bytes(0));
            }

            if (!verifyTimestamp(session.superblockHash, blockHeader)) {
                return (ERR_SUPERBLOCK_BAD_TIMESTAMP, new bytes(0));
            }
			// pass in blockSha256Hash here instead of proposedScryptHash because we
            // don't need a proposed hash (we already calculated it here, syscoin uses 
            // sha256 just like bitcoin)
            (uint err, bytes memory powBlockHeader) =
                verifyBlockAuxPoW(blockInfo, blockSha256Hash, blockHeader);
            if (err != ERR_SUPERBLOCK_OK) {
                return (err, new bytes(0));
            }
			// set to verify block header status
            blockInfo.status = BlockInfoStatus.Verified;

            (err, ) = bondDeposit(session.superblockHash, msg.sender, respondBlockHeaderCost);
            if (err != ERR_SUPERBLOCK_OK) {
                return (err, new bytes(0));
            }

            session.countBlockHeaderResponses += 1;
			// if header responses matches num block hashes we skip to respond block header instead of pending verification
            if (session.countBlockHeaderResponses == session.blockHashes.length) {
                session.challengeState = ChallengeState.PendingVerification;
            } else {
                session.challengeState = ChallengeState.RespondBlockHeader;
            }

            return (ERR_SUPERBLOCK_OK, powBlockHeader);
        }
        return (ERR_SUPERBLOCK_BAD_STATUS, new bytes(0));
    }

    // @dev - For the submitter to respond to challenger queries
    function respondBlockHeader(
        bytes32 superblockHash,
        bytes32 sessionId,
        bytes memory blockHeader
    ) onlyClaimant(sessionId) public {
        BattleSession storage session = sessions[sessionId];
        (uint err, bytes memory powBlockHeader) = doVerifyBlockHeader(session, blockHeader);
        if (err != 0) {
            emit ErrorBattle(sessionId, err);
        } else {
            session.actionsCounter += 1;
            session.lastActionTimestamp = block.timestamp;
            session.lastActionClaimant = session.actionsCounter;
            emit RespondBlockHeader(superblockHash, sessionId, session.challenger, blockHeader, powBlockHeader);
        }
    }

    // @dev - Validate superblock information from last blocks
    function validateLastBlocks(BattleSession storage session) internal view returns (uint) {
        if (session.blockHashes.length <= 0) {
            return ERR_SUPERBLOCK_BAD_LASTBLOCK;
        }
        uint lastTimestamp;
        uint prevTimestamp;
        uint32 lastBits;
        bytes32 parentId;
        (, , lastTimestamp, prevTimestamp, , lastBits, parentId,,,) = getSuperblockInfo(session.superblockHash);
        bytes32 blockSha256Hash = session.blockHashes[session.blockHashes.length - 1];
        if (session.blocksInfo[blockSha256Hash].timestamp != lastTimestamp) {
            return ERR_SUPERBLOCK_BAD_TIMESTAMP;
        }
        if (session.blocksInfo[blockSha256Hash].bits != lastBits) {
            return ERR_SUPERBLOCK_BAD_BITS;
        }
        if (prevTimestamp > lastTimestamp) {
            return ERR_SUPERBLOCK_BAD_TIMESTAMP;
        }
        
        return ERR_SUPERBLOCK_OK;
    }

    // @dev - Validate superblock accumulated work
    function validateProofOfWork(BattleSession storage session) internal view returns (uint) {
        uint accWork;
        bytes32 prevBlock;
        uint32 prevHeight;  
        uint32 proposedHeight;  
        uint prevTimestamp;
        (, accWork, , prevTimestamp, , , prevBlock, ,,proposedHeight) = getSuperblockInfo(session.superblockHash);
        uint parentTimestamp;
        
        uint32 prevBits;
       
        uint work;    
        (, work, parentTimestamp, , prevBlock, prevBits, , , ,prevHeight) = getSuperblockInfo(prevBlock);
        
        if (proposedHeight != (prevHeight+uint32(session.blockHashes.length))) {
            return ERR_SUPERBLOCK_BAD_BLOCKHEIGHT;
        }      
        uint ret = validateSuperblockProofOfWork(session, parentTimestamp, prevHeight, work, accWork, prevTimestamp, prevBits, prevBlock);
        if(ret != 0){
            return ret;
        }
        return ERR_SUPERBLOCK_OK;
    }
    function validateSuperblockProofOfWork(BattleSession storage session, uint parentTimestamp, uint32 prevHeight, uint work, uint accWork, uint prevTimestamp, uint32 prevBits, bytes32 prevBlock) internal view returns (uint){
         uint32 idx = 0;
         while (idx < session.blockHashes.length) {
            bytes32 blockSha256Hash = session.blockHashes[idx];
            uint32 bits = session.blocksInfo[blockSha256Hash].bits;
            if (session.blocksInfo[blockSha256Hash].prevBlock != prevBlock) {
                return ERR_SUPERBLOCK_BAD_PARENT;
            }
            if (net != SyscoinMessageLibrary.Network.REGTEST) {
                uint32 newBits;
                if (net == SyscoinMessageLibrary.Network.TESTNET && session.blocksInfo[blockSha256Hash].timestamp - parentTimestamp > 120) {
                    newBits = 0x1e0fffff;
                }
                else if((prevHeight+idx+1) % SyscoinMessageLibrary.difficultyAdjustmentInterval() != 0){
                    newBits = prevBits;
                }
                else{
                    newBits = SyscoinMessageLibrary.calculateDifficulty(int64(parentTimestamp) - int64(prevTimestamp), prevBits);
                    prevTimestamp = parentTimestamp;
                    prevBits = bits;
                }
                if (bits != newBits) {
                   return ERR_SUPERBLOCK_BAD_BITS;
                }
            }
            work += SyscoinMessageLibrary.diffFromBits(bits);
            prevBlock = blockSha256Hash;
            parentTimestamp = session.blocksInfo[blockSha256Hash].timestamp;
            idx += 1;
        }
        if (net != SyscoinMessageLibrary.Network.REGTEST &&  work != accWork) {
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
        uint _prevTimestamp,
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
    function bondDeposit(bytes32 superblockHash, address account, uint amount) internal returns (uint, uint) {
        return trustedSyscoinClaimManager.bondDeposit(superblockHash, account, amount);
    }
}

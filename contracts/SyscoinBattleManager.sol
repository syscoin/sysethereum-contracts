pragma solidity ^0.5.10;

import './interfaces/SyscoinClaimManagerI.sol';
import './interfaces/SyscoinSuperblocksI.sol';
import './SyscoinErrorCodes.sol';
import './SyscoinParser/SyscoinMessageLibrary.sol';
import "@openzeppelin/upgrades/contracts/Initializable.sol";

// @dev - Manages a battle session between superblock submitter and challenger
contract SyscoinBattleManager is Initializable, SyscoinErrorCodes {

    enum ChallengeState {
        Unchallenged,             // Unchallenged submission
        Challenged                // Claims was challenged
    }



    struct BattleSession {
        bytes32 id;
        bytes32 superblockHash;
        address submitter;
        address challenger;
        uint lastActionTimestamp;         // Last action timestamp
        ChallengeState challengeState;    // Claim state
    }


    mapping (bytes32 => BattleSession) sessions;



    uint public superblockDuration;         // Superblock duration (in blocks)
    uint public superblockTimeout;          // Timeout action (in seconds)


    // network that the stored blocks belong to
    SyscoinMessageLibrary.Network private net;


    // Syscoin claim manager
    SyscoinClaimManagerI trustedSyscoinClaimManager;

    // Superblocks contract
    SyscoinSuperblocksI trustedSuperblocks;

    event NewBattle(bytes32 superblockHash, bytes32 sessionId, address submitter, address challenger);
    event ChallengerConvicted(bytes32 sessionId, uint err, address challenger);
    event SubmitterConvicted(bytes32 sessionId, uint err, address submitter);
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
    function init(
        SyscoinMessageLibrary.Network _network,
        SyscoinSuperblocksI _superblocks,
        uint _superblockDuration,
        uint _superblockTimeout
    ) public initializer {
        net = _network;
        trustedSuperblocks = _superblocks;
        superblockDuration = _superblockDuration;
        superblockTimeout = _superblockTimeout;
    }

    function setSyscoinClaimManager(SyscoinClaimManagerI _syscoinClaimManager) public {
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
        session.challengeState = ChallengeState.Challenged;


        emit NewBattle(superblockHash, sessionId, submitter, challenger);
        return sessionId;
    }


    // @dev - Verify block headers sent by challenger
    function doRespondBlockHeaders(
        BattleSession storage session,
        bytes memory blockHeaders,
        uint numHeaders
    ) internal view returns (uint, SyscoinMessageLibrary.BlockHeader[] memory ) {
        SyscoinMessageLibrary.BlockHeader[] memory myEmptyArray;
        if (session.challengeState == ChallengeState.Challenged) {
            uint pos = 0;
            uint err;
            uint i;
            SyscoinMessageLibrary.BlockHeader[] memory blockHeadersParsed = new SyscoinMessageLibrary.BlockHeader[](numHeaders);
            for(i =0;i<blockHeadersParsed.length;i++){
                (err, blockHeadersParsed[i].bits,blockHeadersParsed[i].prevBlock,blockHeadersParsed[i].timestamp,blockHeadersParsed[i].blockHash, pos) = SyscoinMessageLibrary.verifyBlockHeader(blockHeaders, pos);
                if (err != ERR_SUPERBLOCK_OK) {
                    return (err, myEmptyArray);
                }
                if(pos >= blockHeaders.length){
                    break;
                }
            }
            if(net == SyscoinMessageLibrary.Network.MAINNET){
                if(numHeaders != superblockDuration || (i+1) != superblockDuration)
                    return (ERR_SUPERBLOCK_MISSING_BLOCKS, myEmptyArray);
            }
            else{
                if(numHeaders != (i+1))
                    return (ERR_SUPERBLOCK_MISSING_BLOCKS, myEmptyArray);
            }
            return (ERR_SUPERBLOCK_OK, blockHeadersParsed);
        }
        return (ERR_SUPERBLOCK_BAD_STATUS, myEmptyArray);
    }
    function respondBlockHeaders (
        bytes32 sessionId,
        bytes memory blockHeaders,
        uint numHeaders
        ) onlyClaimant(sessionId) public {
        BattleSession storage session = sessions[sessionId];
        (uint err, SyscoinMessageLibrary.BlockHeader[] memory blockHeadersParsed ) = doRespondBlockHeaders(session, blockHeaders, numHeaders);
        if (err != 0) {
            convictSubmitter(sessionId, err);
        }else{
            err = validateHeaders(session.superblockHash, blockHeadersParsed);
            if (err != 0) {
                convictSubmitter(sessionId, err);
            }
            else{
                convictChallenger(sessionId, err);
            }
        }
    }     

    // @dev - Validate merkle root, prev bits, prev hash and timestamp of block header
    function checkMerkleRoot(SyscoinMessageLibrary.BlockHeader[] memory blockHeadersParsed, uint32 prevBits, bytes32 merkleRoot) internal pure returns (uint) {
        bytes32[] memory blockHashes = new bytes32[](blockHeadersParsed.length);
        blockHashes[0] = blockHeadersParsed[0].blockHash;
        for(uint i = blockHeadersParsed.length-1;i>0;i--){
            SyscoinMessageLibrary.BlockHeader memory thisHeader = blockHeadersParsed[i];
            SyscoinMessageLibrary.BlockHeader memory prevHeader = blockHeadersParsed[i-1];
            // except for the last header except all the bits to match
            if(i < (blockHeadersParsed.length-1)){
                if(prevBits != thisHeader.bits || thisHeader.bits != prevHeader.bits)
                    return thisHeader.bits;
            }
            if(prevHeader.blockHash != thisHeader.prevBlock)
                return ERR_SUPERBLOCK_HASH_PREVBLOCK;

            // if previous block timestamp was greator or the next block timestamp was greator than 2 hours from previous timestamp
            if(prevHeader.timestamp > thisHeader.timestamp || (prevHeader.timestamp < (thisHeader.timestamp - 7200)))
                return ERR_SUPERBLOCK_TIMESTAMP_PREVBLOCK;
            blockHashes[i] = thisHeader.blockHash;
        }
        if (merkleRoot != SyscoinMessageLibrary.makeMerkle(blockHashes))
            return ERR_SUPERBLOCK_INVALID_MERKLE;

        return ERR_SUPERBLOCK_OK;
    }
    // @dev - Validate superblock accumulated work + other block header fields
    function validateHeaders(bytes32 superblockHash, SyscoinMessageLibrary.BlockHeader[] memory blockHeadersParsed) internal view returns (uint) {
        uint accWork;
        bytes32 parentId;
        uint32 newBits;
        uint32 currentBits;
        uint height;
        bytes32 lastHash;
        uint prevTimestamp;
        bytes32 merkleRoot;
        (merkleRoot, accWork,prevTimestamp,lastHash,currentBits,parentId,,,height) = getSuperblockInfo(superblockHash);
        SyscoinMessageLibrary.BlockHeader memory lastHeader = blockHeadersParsed[blockHeadersParsed.length-1];
        SyscoinMessageLibrary.BlockHeader memory prevToLastHeader;
        if(net == SyscoinMessageLibrary.Network.MAINNET)
            prevToLastHeader = blockHeadersParsed[blockHeadersParsed.length-2];
            
        // ensure the last block's timestamp matches the superblock's proposed timestamp
        if(prevTimestamp != lastHeader.timestamp)
            return ERR_SUPERBLOCK_INVALID_TIMESTAMP;
        // ensure last headers hash matches the last hash of the superblock
        if(lastHeader.blockHash != lastHash)
            return ERR_SUPERBLOCK_HASH_SUPERBLOCK;
        uint32 prevBits;
        uint prevWork;
        (, prevWork,prevTimestamp,lastHash,prevBits,, ,,) = getSuperblockInfo(parentId);
         // ensure first headers prev block matches the last hash of the prev superblock
        if(blockHeadersParsed[0].prevBlock != lastHash)
            return ERR_SUPERBLOCK_HASH_PREVSUPERBLOCK;   
 
        // timestamp check against prev block in prev superblock
        if((prevTimestamp > blockHeadersParsed[0].timestamp) || (prevTimestamp < (blockHeadersParsed[0].timestamp - 7200)))
            return ERR_SUPERBLOCK_TIMESTAMP_SUPERBLOCK;

        // make sure all bits are the same and timestamps are within range as well as headers are all linked
        uint err = checkMerkleRoot(blockHeadersParsed, prevBits, merkleRoot);
        if(err != 0)
            return err;
        
        // make sure every 6th superblock adjusts difficulty
        // calculate the new work from prevBits minus one as if its an adjustment we need to account for new bits, if not then just add one more prevBits work
        if(net == SyscoinMessageLibrary.Network.MAINNET){
            prevWork += (SyscoinMessageLibrary.getWorkFromBits(prevBits)*blockHeadersParsed.length-1);
            if(((height-1) % 6) == 0){
                // ie: superblockHeight = 7 meaning blocks 661->720, we need to check timestamp from block 719 - to block 360
                // get 6 superblocks previous for second timestamp (for example block 360 is the timetamp 6 superblocks ago on second adjustment)
                prevTimestamp = trustedSuperblocks.getSuperblockTimestamp(trustedSuperblocks.getSuperblockAt(height - 6));
                newBits = SyscoinMessageLibrary.calculateDifficulty(prevToLastHeader.timestamp - prevTimestamp, prevBits); 
                // make sure difficulty adjustment is within bounds
                if(newBits < SyscoinMessageLibrary.calculateDifficulty(SyscoinMessageLibrary.getLowerBoundDifficultyTarget()-1, prevBits) || newBits > SyscoinMessageLibrary.calculateDifficulty(SyscoinMessageLibrary.getUpperBoundDifficultyTarget()+1, prevBits))
                    return ERR_SUPERBLOCK_BAD_RETARGET; 
                // ensure bits of superblock match derived bits from calculateDifficulty
                if(currentBits != newBits)
                    return ERR_SUPERBLOCK_BITS_SUPERBLOCK;
                prevWork += SyscoinMessageLibrary.getWorkFromBits(newBits);
            }
            else
                prevWork += SyscoinMessageLibrary.getWorkFromBits(prevBits);
            // make sure superblock bits match that of the last block
            if(currentBits != lastHeader.bits)
                return ERR_SUPERBLOCK_BITS_LASTBLOCK;
            
            if (prevWork != accWork) 
                return ERR_SUPERBLOCK_INVALID_ACCUMULATED_WORK;
        }
         
        return ERR_SUPERBLOCK_OK;
    }


    // @dev - Trigger conviction if response is not received in time
    function timeout(bytes32 sessionId) public returns (uint) {
        BattleSession storage session = sessions[sessionId];
        if (session.challengeState == ChallengeState.Challenged &&
            (block.timestamp > session.lastActionTimestamp + superblockTimeout)) {
            convictSubmitter(sessionId, ERR_SUPERBLOCK_TIMEOUT);
            return ERR_SUPERBLOCK_TIMEOUT;
        }
        return ERR_SUPERBLOCK_NO_TIMEOUT;
    }

    // @dev - To be called when a challenger is convicted
    function convictChallenger(bytes32 sessionId, uint err) internal {
        BattleSession storage session = sessions[sessionId];
        sessionDecided(sessionId, session.superblockHash, session.submitter, session.challenger);
        emit ChallengerConvicted(sessionId, err, session.challenger);
        disable(sessionId);
    }

    // @dev - To be called when a submitter is convicted
    function convictSubmitter(bytes32 sessionId, uint err) internal {
        BattleSession storage session = sessions[sessionId];
        sessionDecided(sessionId, session.superblockHash, session.challenger, session.submitter);
        emit SubmitterConvicted(sessionId, err, session.submitter);
        disable(sessionId);
    }

    // @dev - Disable session
    // It should be called only when either the submitter or the challenger were convicted.
    function disable(bytes32 sessionId) internal {
        delete sessions[sessionId];
    }


    // @dev - Check if a session's submitter did not respond before timeout
    function getSubmitterHitTimeout(bytes32 sessionId) public view returns (bool) {
        BattleSession storage session = sessions[sessionId];
        return (block.timestamp > session.lastActionTimestamp + superblockTimeout);
    }

    function getSuperblockBySession(bytes32 sessionId) public view returns (bytes32) {
        return sessions[sessionId].superblockHash;
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
        SyscoinSuperblocksI.Status _status,
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

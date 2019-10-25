pragma solidity ^0.5.12;

import './interfaces/SyscoinSuperblocksI.sol';
import './interfaces/SyscoinClaimManagerI.sol';
import './interfaces/SyscoinBattleManagerI.sol';
import './SyscoinDepositsManager.sol';
import './SyscoinErrorCodes.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import "@openzeppelin/upgrades/contracts/Initializable.sol";

// @dev - Manager of superblock claims
//
// Manages superblocks proposal and challenges
contract SyscoinClaimManager is Initializable, SyscoinDepositsManager, SyscoinErrorCodes {

    using SafeMath for uint;

    uint constant MAX_FUTURE_BLOCK_TIME_SYSCOIN = 7200;
    uint constant MAX_FUTURE_BLOCK_TIME_ETHEREUM = 15;

    struct SuperblockClaim {
        bytes32 superblockHash;                       // Superblock Id
        address submitter;                           // Superblock submitter
        address challenger;                         // Superblock challenger
        uint createdAt;                             // Superblock creation time

        mapping (address => uint) bondedDeposits;   // Deposit associated to submitter+challenger

        bytes32 session;                            // Challenge session

        uint challengeTimeout;                      // Claim timeout

        bool verificationOngoing;                   // Challenge session has started

        bool decided;                               // If the claim was decided
        bool invalid;                               // If superblock is invalid
    }

    // Active superblock claims
    mapping (bytes32 => SuperblockClaim) public claims;

    // Superblocks contract
    SyscoinSuperblocksI public trustedSuperblocks;

    // Battle manager contract
    SyscoinBattleManagerI public trustedSyscoinBattleManager;

    // Confirmations required to confirm semi approved superblocks
    uint public superblockConfirmations;

    uint public superblockDelay;    // Delay required to submit superblocks (in seconds)
    uint public superblockTimeout;  // Timeout for action (in seconds)

    event DepositBonded(bytes32 superblockHash, address account, uint amount);
    event DepositUnbonded(bytes32 superblockHash, address account, uint amount);
    event SuperblockClaimCreated(bytes32 superblockHash, address submitter);
    event SuperblockClaimChallenged(bytes32 superblockHash, address challenger);
    event SuperblockBattleDecided(bytes32 sessionId, address winner, address loser);
    event SuperblockClaimSuccessful(bytes32 superblockHash, address submitter);
    event SuperblockClaimPending(bytes32 superblockHash, address submitter);
    event SuperblockClaimFailed(bytes32 superblockHash, address submitter);
    event VerificationGameStarted(bytes32 superblockHash, address submitter, address challenger, bytes32 sessionId);

    event ErrorClaim(bytes32 superblockHash, uint err);

    modifier onlyBattleManager() {
        require(msg.sender == address(trustedSyscoinBattleManager));
        _;
    }

    modifier onlyMeOrBattleManager() {
        require(msg.sender == address(trustedSyscoinBattleManager) || msg.sender == address(this));
        _;
    }

    // @dev – Sets up the contract managing superblock challenges
    // @param _superblocks Contract that manages superblocks
    // @param _battleManager Contract that manages battles
    // @param _superblockDelay Delay to accept a superblock submission (in seconds)
    // @param _superblockTimeout Time to wait for challenges (in seconds)
    // @param _superblockConfirmations Confirmations required to confirm semi approved superblocks
    function init(
        SyscoinSuperblocksI _superblocks,
        SyscoinBattleManagerI _syscoinBattleManager,
        uint _superblockDelay,
        uint _superblockTimeout,
        uint _superblockConfirmations
    ) public initializer {
        trustedSuperblocks = _superblocks;
        trustedSyscoinBattleManager = _syscoinBattleManager;
        superblockDelay = _superblockDelay;
        superblockTimeout = _superblockTimeout;
        superblockConfirmations = _superblockConfirmations;
    }

    // @dev – locks up part of a user's deposit into a claim.
    // @param superblockHash – claim id.
    // @param account – user's address.
    // @param amount – amount of deposit to lock up.
    // @return – user's deposit bonded for the claim.
    function bondDeposit(bytes32 superblockHash, address account, uint amount) external onlyMeOrBattleManager returns (uint) {
        SuperblockClaim storage claim = claims[superblockHash];

        if (!claimExists(claim)) {
            return ERR_SUPERBLOCK_BAD_CLAIM;
        }

        if (deposits[account] < amount) {
            return ERR_SUPERBLOCK_MIN_DEPOSIT;
        }

        deposits[account] = deposits[account].sub(amount);
        claim.bondedDeposits[account] = claim.bondedDeposits[account].add(amount);
        emit DepositBonded(superblockHash, account, amount);

        return ERR_SUPERBLOCK_OK;
    }

    // @dev – accessor for a claim's bonded deposits.
    // @param superblockHash – claim id.
    // @param account – user's address.
    // @return – user's deposit bonded for the claim.
    function getBondedDeposit(bytes32 superblockHash, address account) external view returns (uint) {
        SuperblockClaim storage claim = claims[superblockHash];
        require(claimExists(claim));
        return claim.bondedDeposits[account];
    }

    // @dev – unlocks a user's bonded deposits from a claim.
    // @param superblockHash – claim id.
    // @param account – user's address.
    // @return – user's deposit which was unbonded from the claim.
    function unbondDeposit(bytes32 superblockHash, address account) private returns (uint, uint) {
        SuperblockClaim storage claim = claims[superblockHash];
        if (!claimExists(claim)) {
            return (ERR_SUPERBLOCK_BAD_CLAIM, 0);
        }
        if (!claim.decided) {
            return (ERR_SUPERBLOCK_BAD_STATUS, 0);
        }

        uint bondedDeposit = claim.bondedDeposits[account];

        delete claim.bondedDeposits[account];
        deposits[account] = deposits[account].add(bondedDeposit);

        emit DepositUnbonded(superblockHash, account, bondedDeposit);

        return (ERR_SUPERBLOCK_OK, bondedDeposit);
    }

    // @dev – Propose a new superblock.
    //
    // @param _blocksMerkleRoot Root of the merkle tree of blocks contained in a superblock
    // @param _timestamp Timestamp of the last block in the superblock
    // @param _mtpTimestamp Median Timestamp of the last block in the superblock
    // @param _lastHash Hash of the last block in the superblock
    // @param _lastBits Difficulty bits of the last block in the superblock bits
    // @param _parentHash Id of the parent superblock
    // @return Error code and superblockHash
    function proposeSuperblock(
        bytes32 _blocksMerkleRoot,
        uint _timestamp,
        uint _mtpTimestamp,
        bytes32 _lastHash,
        uint32 _lastBits,
        bytes32 _parentHash
    ) external returns (uint, bytes32) {
        require(address(trustedSuperblocks) != address(0));

        if (deposits[msg.sender] < minProposalDeposit) {
            emit ErrorClaim(0, ERR_SUPERBLOCK_MIN_DEPOSIT);
            return (ERR_SUPERBLOCK_MIN_DEPOSIT, 0);
        }

        if (_mtpTimestamp + superblockDelay > block.timestamp) {
            emit ErrorClaim(0, ERR_SUPERBLOCK_BAD_TIMESTAMP_MTP);
            return (ERR_SUPERBLOCK_BAD_TIMESTAMP_MTP, 0);
        }

        if (block.timestamp + MAX_FUTURE_BLOCK_TIME_SYSCOIN + MAX_FUTURE_BLOCK_TIME_ETHEREUM <= _timestamp) {
            emit ErrorClaim(0, ERR_SUPERBLOCK_BAD_TIMESTAMP);
            return (ERR_SUPERBLOCK_BAD_TIMESTAMP, 0);
        }

        uint err;
        bytes32 superblockHash;
        (err, superblockHash) = trustedSuperblocks.propose(_blocksMerkleRoot, _timestamp, _mtpTimestamp, _lastHash, _lastBits, _parentHash, msg.sender);
        if (err != 0) {
            emit ErrorClaim(superblockHash, err);
            return (err, superblockHash);
        }


        SuperblockClaim storage claim = claims[superblockHash];
        // allow to propose an existing claim only if its invalid and decided and its a different submitter or not on the tip
        // those are the ones that may actually be stuck and need to be proposed again,
        // but we want to ensure its not the same submitter submitting the same thing
        if (claimExists(claim)) {
            require(claim.invalid == true && claim.decided == true && claim.submitter != msg.sender);
        }

        claim.superblockHash = superblockHash;
        claim.submitter = msg.sender;
        claim.challenger = address(0);
        claim.decided = false;
        claim.invalid = false;
        claim.verificationOngoing = false;
        claim.createdAt = block.timestamp;
        claim.challengeTimeout = block.timestamp + superblockTimeout;

        err = this.bondDeposit(superblockHash, msg.sender, minProposalDeposit);
        require(err == ERR_SUPERBLOCK_OK);

        emit SuperblockClaimCreated(superblockHash, msg.sender);

        return (ERR_SUPERBLOCK_OK, superblockHash);
    }

    // @dev – challenge a superblock claim.
    // @param superblockHash – Id of the superblock to challenge.
    // @return - Error code and claim Id
    function challengeSuperblock(bytes32 superblockHash) external returns (uint, bytes32) {
        require(address(trustedSuperblocks) != address(0));

        SuperblockClaim storage claim = claims[superblockHash];

        if (!claimExists(claim)) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_BAD_CLAIM);
            return (ERR_SUPERBLOCK_BAD_CLAIM, superblockHash);
        }
        if (claim.decided || claim.invalid) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_CLAIM_DECIDED);
            return (ERR_SUPERBLOCK_CLAIM_DECIDED, superblockHash);
        }
        if (claim.verificationOngoing) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_CHALLENGE_EXISTS);
            return (ERR_SUPERBLOCK_CHALLENGE_EXISTS, superblockHash);
        }
        if (deposits[msg.sender] < minProposalDeposit) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_MIN_DEPOSIT);
            return (ERR_SUPERBLOCK_MIN_DEPOSIT, superblockHash);
        }
    
        uint err = trustedSuperblocks.challenge(superblockHash, msg.sender);
        if (err != 0) {
            emit ErrorClaim(superblockHash, err);
            return (err, 0);
        }

        err = this.bondDeposit(superblockHash, msg.sender, minProposalDeposit);
        require(err == ERR_SUPERBLOCK_OK);

        claim.challengeTimeout = block.timestamp + superblockTimeout;
        claim.challenger = msg.sender;
        emit SuperblockClaimChallenged(superblockHash, msg.sender);

        claim.session = trustedSyscoinBattleManager.beginBattleSession(superblockHash, claim.submitter,
            claim.challenger);

        emit VerificationGameStarted(superblockHash, claim.submitter,
            claim.challenger, claim.session);

        claim.verificationOngoing = true;
        return (ERR_SUPERBLOCK_OK, superblockHash);
    }



    // @dev – check whether a claim has successfully withstood all challenges.
    // If successful without challenges, it will mark the superblock as confirmed.
    // If successful with at least one challenge, it will mark the superblock as semi-approved.
    // If verification failed, it will mark the superblock as invalid.
    //
    // @param superblockHash – claim ID.
    function checkClaimFinished(bytes32 superblockHash) external returns (bool) {
        SuperblockClaim storage claim = claims[superblockHash];

        if (!claimExists(claim) || claim.decided) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_BAD_CLAIM);
            return false;
        }

        // check that there is no ongoing verification game.
        if (claim.verificationOngoing) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_VERIFICATION_PENDING);
            return false;
        }

        // an invalid superblock can be rejected immediately
        if (claim.invalid) {
            // The superblock is invalid, submitter abandoned
            // or superblock data is inconsistent
            claim.decided = true;
            uint err = trustedSuperblocks.invalidate(superblockHash, msg.sender);
            require(err == ERR_SUPERBLOCK_OK);
            emit SuperblockClaimFailed(superblockHash, claim.submitter);
            doPayChallenger(superblockHash, claim);
            return false;
        }

        // check that the claim has exceeded the claim's specific challenge timeout.
        if (block.timestamp <= claim.challengeTimeout) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_NO_TIMEOUT);
            return false;
        }

        claim.decided = true;

        bool confirmImmediately = false;
        // No challenger and parent approved; confirm immediately
        if (claim.challenger == address(0)) {
            bytes32 parentId = trustedSuperblocks.getSuperblockParentId(superblockHash);
            SyscoinSuperblocksI.Status status = trustedSuperblocks.getSuperblockStatus(parentId);
            if (status == SyscoinSuperblocksI.Status.Approved) {
                confirmImmediately = true;
            }
        }

        if (confirmImmediately) {
            uint err = trustedSuperblocks.confirm(superblockHash, msg.sender);
            require(err == ERR_SUPERBLOCK_OK);
            address submitter = claim.submitter;
            unbondDeposit(superblockHash, submitter);
            emit SuperblockClaimSuccessful(superblockHash, submitter);
        } else {
            uint err = trustedSuperblocks.semiApprove(superblockHash, msg.sender);
            require(err == ERR_SUPERBLOCK_OK);
            emit SuperblockClaimPending(superblockHash, claim.submitter);
        }
        return true;
    }

    // @dev – confirm semi approved superblock.
    //
    // A semi approved superblock can be confirmed if it has several descendant
    // superblocks that are also semi-approved.
    // If none of the descendants were challenged they will also be confirmed.
    //
    // @param superblockHash – the claim ID.
    // @param descendantId - claim ID descendants
    function confirmClaim(bytes32 superblockHash, bytes32 descendantId) external returns (bool) {
        uint numSuperblocks = 0;
        bool confirmDescendants = true;
        bytes32 id = descendantId;
        SuperblockClaim storage claim = claims[id];
        while (id != superblockHash) {
            if (!claimExists(claim) || claim.invalid) {
                emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_BAD_CLAIM);
                return false;
            }
            if (trustedSuperblocks.getSuperblockStatus(id) != SyscoinSuperblocksI.Status.SemiApproved) {
                emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_BAD_STATUS);
                return false;
            }
            if (confirmDescendants && claim.challenger != address(0)) {
                confirmDescendants = false;
            }
            id = trustedSuperblocks.getSuperblockParentId(id);
            claim = claims[id];
            numSuperblocks += 1;
        }

        if (numSuperblocks < superblockConfirmations) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_MISSING_CONFIRMATIONS);
            return false;
        }
        if (trustedSuperblocks.getSuperblockStatus(id) != SyscoinSuperblocksI.Status.SemiApproved) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_BAD_STATUS);
            return false;
        }

        uint err = trustedSuperblocks.confirm(superblockHash, msg.sender);
        if (err != ERR_SUPERBLOCK_OK) {
            emit ErrorClaim(superblockHash, err);
            return false;
        }
        emit SuperblockClaimSuccessful(superblockHash, claim.submitter);
        doPaySubmitter(superblockHash, claim);

        if (confirmDescendants) {
            bytes32[] memory descendants = new bytes32[](numSuperblocks);
            id = descendantId;
            uint idx = 0;
            while (id != superblockHash) {
                descendants[idx] = id;
                id = trustedSuperblocks.getSuperblockParentId(id);
                idx += 1;
            }
            while (idx > 0) {
                idx -= 1;
                id = descendants[idx];
                claim = claims[id];
                err = trustedSuperblocks.confirm(id, msg.sender);
                require(err == ERR_SUPERBLOCK_OK);
                emit SuperblockClaimSuccessful(id, claim.submitter);
                doPaySubmitter(id, claim);
            }
        }

        return true;
    }

    // @dev – Reject a semi approved superblock.
    //
    // Superblocks that are not in the main chain can be marked as
    // invalid.
    //
    // @param superblockHash – the claim ID.
    function rejectClaim(bytes32 superblockHash) external returns (bool) {
        SuperblockClaim storage claim = claims[superblockHash];
        if (!claimExists(claim)) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_BAD_CLAIM);
            return false;
        }

        uint height = trustedSuperblocks.getSuperblockHeight(superblockHash);

        if (height > trustedSuperblocks.getChainHeight()) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_BAD_BLOCKHEIGHT);
            return false;
        }

        SyscoinSuperblocksI.Status status = trustedSuperblocks.getSuperblockStatus(superblockHash);

        if (status != SyscoinSuperblocksI.Status.SemiApproved) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_BAD_STATUS);
            return false;
        }

        if (!claim.decided) {
            emit ErrorClaim(superblockHash, ERR_SUPERBLOCK_CLAIM_DECIDED);
            return false;
        }

        uint err = trustedSuperblocks.invalidate(superblockHash, msg.sender);
        require(err == ERR_SUPERBLOCK_OK);
        emit SuperblockClaimFailed(superblockHash, claim.submitter);
        doPayChallenger(superblockHash, claim);
        return true;
    }

    // @dev – called when a battle session has ended.
    //
    // @param sessionId – session Id.
    // @param superblockHash - claim Id
    // @param winner – winner of verification game.
    // @param loser – loser of verification game.
    function sessionDecided(bytes32 sessionId, bytes32 superblockHash, address winner, address loser) external onlyBattleManager {
        SuperblockClaim storage claim = claims[superblockHash];

        require(claimExists(claim));

        claim.verificationOngoing = false;
        address submitter = claim.submitter;

        if (submitter == loser) {
            claim.invalid = true;
        } else if (submitter != winner) {
            revert();
        }

        emit SuperblockBattleDecided(sessionId, winner, loser);
    }

    // @dev - Pay challenger
    function doPayChallenger(bytes32 superblockHash, SuperblockClaim storage claim) private {
        address challenger = claim.challenger;
        address submitter = claim.submitter;

        if (challenger != address(0)) {
            uint reward = claim.bondedDeposits[submitter];
            claim.bondedDeposits[challenger] = claim.bondedDeposits[challenger].add(reward);
            unbondDeposit(superblockHash, challenger);
        }
        delete claim.bondedDeposits[submitter];
    }

    // @dev - Pay submitter with challenger deposit
    function doPaySubmitter(bytes32 superblockHash, SuperblockClaim storage claim) private {
        address challenger = claim.challenger;
        address submitter = claim.submitter;

        if (challenger != address(0)) {
            uint reward = claim.bondedDeposits[challenger];
            claim.bondedDeposits[challenger] = 0;
            claim.bondedDeposits[submitter] = claim.bondedDeposits[submitter].add(reward);

            unbondDeposit(superblockHash, challenger);
        }
        unbondDeposit(superblockHash, submitter);
    }

    // @dev - Check if a superblock can be semi approved by calling checkClaimFinished
    function getInBattleAndSemiApprovable(bytes32 superblockHash) external view returns (bool) {
        SuperblockClaim storage claim = claims[superblockHash];
        return (trustedSuperblocks.getSuperblockStatus(superblockHash) == SyscoinSuperblocksI.Status.InBattle &&
            !claim.invalid && !claim.verificationOngoing && block.timestamp > claim.challengeTimeout
            && claim.challenger != address(0));
    }

    // @dev – Check if a claim exists
    function claimExists(SuperblockClaim storage claim) private view returns (bool) {
        return (claim.submitter != address(0));
    }

    // @dev - Return a given superblock's submitter
    function getClaimSubmitter(bytes32 superblockHash) external view returns (address) {
        return claims[superblockHash].submitter;
    }

    // @dev - Return superblock submission timestamp
    function getNewSuperblockEventTimestamp(bytes32 superblockHash) external view returns (uint) {
        return claims[superblockHash].createdAt;
    }

    // @dev - Return whether or not a claim has already been made
    function getClaimExists(bytes32 superblockHash) external view returns (bool) {
        return claimExists(claims[superblockHash]);
    }

    // @dev - Return claim status
    function getClaimDecided(bytes32 superblockHash) external view returns (bool) {
        return claims[superblockHash].decided;
    }

    // @dev - Check if a claim is invalid
    function getClaimInvalid(bytes32 superblockHash) external view returns (bool) {
        // TODO: see if this is redundant with superblock status
        return claims[superblockHash].invalid;
    }

    // @dev – Return session by challenger
    function getSession(bytes32 superblockHash) external view returns(bytes32) {
        return claims[superblockHash].session;
    }

    function getClaimChallenger(bytes32 superblockHash) external view returns (address) {
        SuperblockClaim storage claim = claims[superblockHash];
        return claim.challenger;
    }
}

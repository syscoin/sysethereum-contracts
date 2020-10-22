pragma solidity ^0.5.13;

import './interfaces/SyscoinSuperblocksI.sol';
import "./SyscoinErrorCodes.sol";
import "./SyscoinTransactionProcessor.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "./SyscoinParser/SyscoinMessageLibrary.sol";

// @dev - Manages superblocks
//
// Management of superblocks and status transitions
contract SyscoinSuperblocks is Initializable, SyscoinSuperblocksI, SyscoinErrorCodes, SyscoinMessageLibrary {

    uint constant ERR_PARSE_TX_SYS = 10170;

    uint32 constant SYSCOIN_TX_VERSION_ALLOCATION_BURN_TO_ETHEREUM = 134;
    uint32 constant SYSCOIN_TX_VERSION_ALLOCATION_MINT = 133;
    
    // Mapping superblock id => superblock data
    mapping (bytes32 => SuperblockInfo) internal superblocks;

    bytes32 internal bestSuperblock;

    SyscoinTransactionProcessor public syscoinERC20Manager;

    event NewSuperblock(bytes32 superblockHash, address who);
    event ApprovedSuperblock(bytes32 superblockHash, address who);
    event ChallengeSuperblock(bytes32 superblockHash, address who);
    event SemiApprovedSuperblock(bytes32 superblockHash, address who);
    event InvalidSuperblock(bytes32 superblockHash, address who);

    event ErrorSuperblock(bytes32 superblockHash, uint err);

    event VerifyTransaction(bytes32 txHash, uint returnCode);
    event RelayTransaction(bytes32 txHash, uint returnCode);
    event ChallengeCancelTransferRequest(uint returnCode);
    // SyscoinClaimManager
    address public trustedClaimManager;

    uint32 constant SYSCOIN_TX_VERSION_ASSET_ACTIVATE = 130;
    uint32 constant SYSCOIN_TX_VERSION_ASSET_UPDATE = 131;
    byte constant OP_PUSHDATA1 = 0x4c;
    byte constant OP_PUSHDATA2 = 0x4d;
    modifier onlyClaimManager() {
        require(msg.sender == trustedClaimManager);
        _;
    }
    uint32 constant ASSET_UPDATE_CONTRACT = 2;
    uint32 constant ASSET_INIT = 128;


    // @param _syscoinERC20Manager - address of the SyscoinERC20Manager contract to be associated with
    // @param _claimManager - address of the ClaimManager contract to be associated with
    function init(address _syscoinERC20Manager, address _claimManager) public initializer {
        require(address(syscoinERC20Manager) == address(0) && _syscoinERC20Manager != address(0));
        syscoinERC20Manager = SyscoinTransactionProcessor(_syscoinERC20Manager);

        require(address(trustedClaimManager) == address(0) && _claimManager != address(0));
        trustedClaimManager = _claimManager;
    }

    // Returns true if the tx output is an OP_RETURN output
    function isOpReturn(bytes memory txBytes, uint pos) internal pure returns (bool) {
        // scriptPub format is
        // 0x6a OP_RETURN
        return txBytes[pos] == byte(0x6a);
    }

    function bytesToUint64(bytes memory input, uint pos) public pure returns (uint64 result) {
        result = uint64(uint8(input[pos+7])) + uint64(uint8(input[pos + 6]))*(2**8) + uint64(uint8(input[pos + 5]))*(2**16) + uint64(uint8(input[pos + 4]))*(2**24) + uint64(uint8(input[pos + 3]))*(2**32) + uint64(uint8(input[pos + 2]))*(2**40) + uint64(uint8(input[pos + 1]))*(2**48) + uint64(uint8(input[pos]))*(2**56);
    }

    function bytesToUint32(bytes memory input, uint pos) public pure returns (uint32 result) {
        result = uint32(uint8(input[pos+3])) + uint32(uint8(input[pos + 2]))*(2**8) + uint32(uint8(input[pos + 1]))*(2**16) + uint32(uint8(input[pos]))*(2**24);
    }

    function DecompressAmount(uint64 x) internal pure returns (uint64) {
        // x = 0  OR  x = 1+10*(9*n + d - 1) + e  OR  x = 1+10*(n - 1) + 9
        if (x == 0)
            return 0;
        x--;
        // x = 10*(9*n + d - 1) + e
        int32 e = int32(x % 10);
        x /= 10;
        uint64 n = 0;
        if (e < 9) {
            // x = 9*n + d - 1
            int32 d = int32(x % 9) + 1;
            x /= 9;
            // x = n
            n = x*10 + uint64(d);
        } else {
            n = x+1;
        }
        while (e > 0) {
            n *= 10;
            e--;
        }
        return n;
    }

    // Returns asset data parsed from the op_return data output from syscoin asset burn transaction
    function scanBurnTx(bytes memory txBytes, uint opIndex, uint pos)
        internal
        pure
        returns (uint, address, uint32)
    {
        uint32 assetGUID;
        address destinationAddress;
        uint output_value;
        uint op;
        uint compactSize;
        uint output_value_compressed;
        uint maxVal = 2**64;
        (compactSize, pos) = parseCompactSize(txBytes, pos);
        require(compactSize == 1, "#SyscoinSuperblocks scanBurnTx(): Invalid numAssets");
        // get nAsset
        assetGUID = bytesToUint32Flipped(txBytes, pos);
        pos += 4;
        (compactSize, pos) = parseCompactSize(txBytes, pos);
        require(compactSize < 10, "#SyscoinSuperblocks scanBurnTx(): Invalid numOutputs");
        // find output that is connected to the burn output (opIndex)
        for (uint i = 0; i < compactSize; i++) {
            (op, pos) = parseCompactSize(txBytes, pos);
             // get compressed amount
            if(op == opIndex) {
                (output_value_compressed, pos) = parseVarInt(txBytes, pos, maxVal);
            } else {
                (, pos) = parseVarInt(txBytes, pos, maxVal);
            }
        }
        require(output_value_compressed > 0, "#SyscoinSuperblocks scanBurnTx(): Burn output index not found");
        output_value = DecompressAmount(uint64(output_value_compressed));
         // destination address
        (op, pos) = getOpcode(txBytes, pos);
        // ethereum contracts are 20 bytes (without the 0x)
        require(op == 0x14, "#SyscoinSuperblocks scanBurnTx(): Invalid destinationAddress");
        destinationAddress = readEthereumAddress(txBytes, pos);
        return (output_value, destinationAddress, assetGUID);
    }

    // Read the ethereum address embedded in the tx output
    function readEthereumAddress(bytes memory txBytes, uint pos) internal pure returns (address) {
        uint256 data;
        assembly {
            data := mload(add(add(txBytes, 20), pos))
        }
        return address(uint160(data));
    }

    // Read next opcode from script
    function getOpcode(bytes memory txBytes, uint pos) private pure returns (uint8, uint) {
        require(pos < txBytes.length);
        return (uint8(txBytes[pos]), pos + 1);
    }

    function getOpReturnPos(bytes memory txBytes, uint pos) public pure returns (uint, uint) {
        uint n_inputs;
        uint script_len;
        uint output_value;
        uint n_outputs;

        (n_inputs, pos) = parseCompactSize(txBytes, pos);
        // if dummy 0x00 is present this is a witness transaction
        if(n_inputs == 0x00){
            (n_inputs, pos) = parseCompactSize(txBytes, pos); // flag
            require(n_inputs != 0x00, "#SyscoinSuperblocks getOpReturnPos(): Unexpected dummy/flag");
            // after dummy/flag the real var int comes for txins
            (n_inputs, pos) = parseCompactSize(txBytes, pos);
        }
        require(n_inputs < 100, "#SyscoinSuperblocks getOpReturnPos(): Incorrect size of n_inputs");

        for (uint i = 0; i < n_inputs; i++) {
            pos += 36;  // skip outpoint
            (script_len, pos) = parseCompactSize(txBytes, pos);
            pos += script_len + 4;  // skip sig_script, seq
        }
        
        (n_outputs, pos) = parseCompactSize(txBytes, pos);
        require(n_outputs < 10, "#SyscoinSuperblocks getOpReturnPos(): Incorrect size of n_outputs");
        for (uint i = 0; i < n_outputs; i++) {
            pos += 8;
            // varint
            (script_len, pos) = parseCompactSize(txBytes, pos);
            if(!isOpReturn(txBytes, pos)){
                // output script
                pos += script_len;
                output_value = 0;
                continue;
            }
            // skip opreturn marker
            pos += 1;
            byte pushDataOp = txBytes[pos];
            // if payload >= OP_PUSHDATA1 && <= 0xff bytes skip 2 bytes (push data + 1 byte varint)
            if (pushDataOp == OP_PUSHDATA1){
                pos += 2;
            }
            // if payload > 0xff && <= 0xffff then skip 3 bytes (push data + 2 byte varint)
            else if (pushDataOp == OP_PUSHDATA2){
                pos += 3;
            } else {
                pos += 1; // skip 1 byte varint
            }
            return (i, pos);
        }
        revert("#SyscoinSuperblocks getOpReturnPos(): No OpReturn found");
    }

    /**
     * @dev Parse syscoin mint transaction to recover bridgeTransferId
     * @param txBytes syscoin raw transaction
     * @return errorCode, bridgeTransferId
     */
    function parseMintTx(bytes memory txBytes)
        public
        pure
        returns (uint errorCode, uint32 bridgeTransferId)
    {
        uint32 version;
        uint pos = 0;
        version = bytesToUint32Flipped(txBytes, pos);
        if(version != SYSCOIN_TX_VERSION_ALLOCATION_MINT){
            return (ERR_PARSE_TX_SYS, bridgeTransferId);
        }
        (, pos) = getOpReturnPos(txBytes, 4);
        bridgeTransferId = scanMintTx(txBytes, pos);
        return (0, bridgeTransferId);
    }

     /** @dev Parse syscoin asset transaction to recover asset guid and contract, for purposes of updating asset registry in erc20manager
     * @param txBytes syscoin raw transaction
     * @return errorCode, assetGuid, erc20Address
     */
    function parseAssetTx(bytes memory txBytes)
        public
        pure
        returns (uint errorCode, uint32 assetGuid, address erc20Address, uint8 precision)
    {
        uint32 version;
        uint pos = 0;
        version = bytesToUint32Flipped(txBytes, pos);
        if(version != SYSCOIN_TX_VERSION_ASSET_ACTIVATE && version != SYSCOIN_TX_VERSION_ASSET_UPDATE){
            return (ERR_PARSE_TX_SYS, 0, address(0), 0);
        }
        (, pos) = getOpReturnPos(txBytes, 4);
        (assetGuid, erc20Address, precision) = scanAssetTx(txBytes, pos);
        require(erc20Address != address(0),
        "parseAssetTx(): erc20Address cannot be empty");
        return (0, assetGuid, erc20Address, precision);
    }

    /**
     * Parse txBytes and returns Bridge Transfer ID
     * @param txBytes syscoin raw transaction
     * @param pos position at where to start parsing
     * @return bridge id (uint32)
     */
    function scanMintTx(bytes memory txBytes, uint pos)
        private
        pure
        returns (uint32)
    {
        uint bridgeId;
        uint numAssets;
        uint numOutputs;
        uint amount;
        uint bytesToRead;
        (numAssets, pos) = parseCompactSize(txBytes, pos);
        require(numAssets == 1);
        // skip nAsset
        pos += 4;
        (numOutputs, pos) = parseCompactSize(txBytes, pos);
        require(numOutputs == 1);
        // skip over output index
        (, pos) = parseCompactSize(txBytes, pos);
        // skip over compressed amount
        (, pos) = parseVarInt(txBytes, pos, 2**64);
        // skip notary sig
        (bytesToRead, pos) = parseCompactSize(txBytes, pos);
        pos += bytesToRead;
        bridgeId = bytesToUint32Flipped(txBytes, pos);
        return uint32(bridgeId);
    }

     /**
     * Parse txBytes and returns assetguid + contract address
     * @param txBytes syscoin raw transaction
     * @param pos position at where to start parsing
     * @return asset guid (uint32), erc20 address and precision linked to the asset guid to update registry in erc20manager
     */
    function scanAssetTx(bytes memory txBytes, uint pos)
        public
        pure
        returns (uint32, address, uint8)
    {
        uint32 assetGUID;
        address erc20Address;
        uint8 precision;
        uint bytesToRead;
        uint numAssets;
        uint numOutputs;
        uint8 nUpdateFlags;
        (numAssets, pos) = parseCompactSize(txBytes, pos);
        require(numAssets == 1);
        // get nAsset
        assetGUID = bytesToUint32Flipped(txBytes, pos);
        pos += 4;
        (numOutputs, pos) = parseCompactSize(txBytes, pos);
        require(numOutputs == 1);
        // skip over output index
        (, pos) = parseCompactSize(txBytes, pos);
        // skip over compressed amount
        (, pos) = parseVarInt(txBytes, pos, 2**64);
        // skip notary sig
        (bytesToRead, pos) = parseCompactSize(txBytes, pos);
        pos += bytesToRead;
        // nPrecision
        precision = uint8(txBytes[pos]);
        pos += 1;
        // update flags
        nUpdateFlags = uint8(txBytes[pos]);
        pos += 1;
        require((nUpdateFlags & ASSET_UPDATE_CONTRACT) > 0, "scanAssetTx(): Update flags mask did set ASSET_UPDATE_CONTRACT bit");
        if((nUpdateFlags & ASSET_INIT) > 0) {
            // skip symbol
            (bytesToRead, pos) = parseCompactSize(txBytes, pos);
            pos += bytesToRead;
            // skip over max supply
            (, pos) = parseVarInt(txBytes, pos, 2**64);
        }
        // get vchContract
        (bytesToRead, pos) = parseCompactSize(txBytes, pos);
        require(bytesToRead == 0x14,
        "scanAssetTx(): Invalid number of bytes read for contract field");
        erc20Address = readEthereumAddress(txBytes, pos);
        return (assetGUID, erc20Address, precision);
    }


    // @dev - Initializes superblocks contract
    //
    // Initializes the superblock contract. It can only be called once.
    //
    // @param _blocksMerkleRoot Root of the merkle tree of blocks contained in a superblock
    // @param _timestamp Timestamp of the last block in the superblock
    // @param _mtpTimestamp Median Timestamp of the last block in the superblock
    // @param _lastHash Hash of the last block in the superblock
    // @param _lastBits Difficulty bits of the last block in the superblock bits
    // @param _parentId Id of the parent superblock
    // @param _blockHeight Block height of last block in superblock
    // @return Error code and superblockHash
    function initialize(
        bytes32 _blocksMerkleRoot,
        uint _timestamp,
        uint _mtpTimestamp,
        bytes32 _lastHash,
        uint32 _lastBits,
        bytes32 _parentId
    ) external returns (uint, bytes32) {
        require(bestSuperblock == 0);
        require(_parentId == 0);

        bytes32 superblockHash = calcSuperblockHash(_blocksMerkleRoot, _timestamp, _mtpTimestamp, _lastHash, _lastBits, _parentId);
        SuperblockInfo storage superblock = superblocks[superblockHash];

        require(superblock.status == Status.Uninitialized);

        superblock.blocksMerkleRoot = _blocksMerkleRoot;
        superblock.timestamp = _timestamp;
        superblock.mtpTimestamp = _mtpTimestamp;
        superblock.lastHash = _lastHash;
        superblock.parentId = _parentId;
        superblock.submitter = msg.sender;
        superblock.height = 1;
        superblock.lastBits = _lastBits;
        superblock.status = Status.Approved;

        emit NewSuperblock(superblockHash, msg.sender);

        bestSuperblock = superblockHash;
        emit ApprovedSuperblock(superblockHash, msg.sender);

        return (ERR_SUPERBLOCK_OK, superblockHash);
    }

    // @dev - Proposes a new superblock
    //
    // To be accepted, a new superblock needs to have its parent
    // either approved or semi-approved.
    //
    // @param _blocksMerkleRoot Root of the merkle tree of blocks contained in a superblock
    // @param _timestamp Timestamp of the last block in the superblock
    // @param _mtpTimestamp Median Timestamp of the last block in the superblock
    // @param _lastHash Hash of the last block in the superblock
    // @param _lastBits Difficulty bits of the last block in the superblock bits
    // @param _parentId Id of the parent superblock
    // @return Error code and superblockHash
    function propose(
        bytes32 _blocksMerkleRoot,
        uint _timestamp,
        uint _mtpTimestamp,
        bytes32 _lastHash,
        uint32 _lastBits,
        bytes32 _parentId,
        address submitter
    ) external returns (uint, bytes32) {
        if (msg.sender != trustedClaimManager) {
            emit ErrorSuperblock(0, ERR_SUPERBLOCK_NOT_CLAIMMANAGER);
            return (ERR_SUPERBLOCK_NOT_CLAIMMANAGER, 0);
        }

        SuperblockInfo storage parent = superblocks[_parentId];
        if (parent.status != Status.SemiApproved && parent.status != Status.Approved) {
            emit ErrorSuperblock(_parentId, ERR_SUPERBLOCK_BAD_PARENT + uint(parent.status));
            return (ERR_SUPERBLOCK_BAD_PARENT + uint(parent.status), 0);
        }

        if (parent.height < getChainHeight()) {
            emit ErrorSuperblock(_parentId, ERR_SUPERBLOCK_BAD_BLOCKHEIGHT);
            return (ERR_SUPERBLOCK_BAD_BLOCKHEIGHT, 0);
        }

        bytes32 superblockHash = calcSuperblockHash(_blocksMerkleRoot, _timestamp, _mtpTimestamp, _lastHash, _lastBits, _parentId);
        SuperblockInfo storage superblock = superblocks[superblockHash];
        if (superblock.status == Status.Uninitialized) {
            superblock.blocksMerkleRoot = _blocksMerkleRoot;
            superblock.timestamp = _timestamp;
            superblock.mtpTimestamp = _mtpTimestamp;
            superblock.lastHash = _lastHash;
            superblock.parentId = _parentId;
            superblock.height = parent.height + 1;
            superblock.lastBits = _lastBits;
        }
        superblock.status = Status.New;
        superblock.submitter = submitter;
        emit NewSuperblock(superblockHash, submitter);
        return (ERR_SUPERBLOCK_OK, superblockHash);
    }

    // @dev - Confirm a proposed superblock
    //
    // An unchallenged superblock can be confirmed after a timeout.
    // A challenged superblock is confirmed if it has enough descendants
    // in the main chain.
    //
    // @param _superblockHash Id of the superblock to confirm
    // @param _validator Address requesting superblock confirmation
    // @return Error code and superblockHash
    function confirm(bytes32 _superblockHash, address _validator) external returns (uint) {
        if (msg.sender != trustedClaimManager) {
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_NOT_CLAIMMANAGER);
            return ERR_SUPERBLOCK_NOT_CLAIMMANAGER;
        }
        SuperblockInfo storage superblock = superblocks[_superblockHash];
        if (superblock.status != Status.New && superblock.status != Status.SemiApproved) {
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_BAD_STATUS);
            return ERR_SUPERBLOCK_BAD_STATUS;
        }

        if (superblock.height <= getChainHeight()) {
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_BAD_BLOCKHEIGHT);
            return ERR_SUPERBLOCK_BAD_BLOCKHEIGHT;
        }

        SuperblockInfo storage parent = superblocks[superblock.parentId];
        if (parent.status != Status.Approved) {
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_BAD_PARENT);
            return ERR_SUPERBLOCK_BAD_PARENT;
        }

        superblock.status = Status.Approved;
        bestSuperblock = _superblockHash;

        emit ApprovedSuperblock(_superblockHash, _validator);
        return ERR_SUPERBLOCK_OK;
    }

    // @dev - Challenge a proposed superblock
    //
    // A new superblock can be challenged to start a battle
    // to verify the correctness of the data submitted.
    //
    // @param _superblockHash Id of the superblock to challenge
    // @param _challenger Address requesting a challenge
    // @return Error code and superblockHash
    function challenge(bytes32 _superblockHash, address _challenger) external returns (uint) {
        if (msg.sender != trustedClaimManager) {
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_NOT_CLAIMMANAGER);
            return ERR_SUPERBLOCK_NOT_CLAIMMANAGER;
        }
        SuperblockInfo storage superblock = superblocks[_superblockHash];
        if (superblock.status != Status.New && superblock.status != Status.InBattle) {
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_BAD_STATUS);
            return ERR_SUPERBLOCK_BAD_STATUS;
        }
        if(superblock.submitter == _challenger){
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_OWN_CHALLENGE);
            return ERR_SUPERBLOCK_OWN_CHALLENGE;
        }
        superblock.status = Status.InBattle;
        emit ChallengeSuperblock(_superblockHash, _challenger);
        return ERR_SUPERBLOCK_OK;
    }

    // @dev - Semi-approve a challenged superblock
    //
    // A challenged superblock can be marked as semi-approved
    // if it satisfies all the queries or when all challengers have
    // stopped participating.
    //
    // @param _superblockHash Id of the superblock to semi-approve
    // @param _validator Address requesting semi approval
    // @return Error code and superblockHash
    function semiApprove(bytes32 _superblockHash, address _validator) external returns (uint) {
        if (msg.sender != trustedClaimManager) {
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_NOT_CLAIMMANAGER);
            return ERR_SUPERBLOCK_NOT_CLAIMMANAGER;
        }
        SuperblockInfo storage superblock = superblocks[_superblockHash];

        if (superblock.status != Status.InBattle && superblock.status != Status.New) {
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_BAD_STATUS);
            return ERR_SUPERBLOCK_BAD_STATUS;
        }
        superblock.status = Status.SemiApproved;

        emit SemiApprovedSuperblock(_superblockHash, _validator);
        return ERR_SUPERBLOCK_OK;
    }

    // @dev - Invalidates a superblock
    //
    // A superblock with incorrect data can be invalidated immediately.
    // Superblocks that are not in the main chain can be invalidated
    // if not enough superblocks follow them, i.e. they don't have
    // enough descendants.
    //
    // @param _superblockHash Id of the superblock to invalidate
    // @param _validator Address requesting superblock invalidation
    // @return Error code and superblockHash
    function invalidate(bytes32 _superblockHash, address _validator) external returns (uint) {
        if (msg.sender != trustedClaimManager) {
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_NOT_CLAIMMANAGER);
            return ERR_SUPERBLOCK_NOT_CLAIMMANAGER;
        }
        SuperblockInfo storage superblock = superblocks[_superblockHash];
        if (superblock.status != Status.InBattle && superblock.status != Status.SemiApproved) {
            emit ErrorSuperblock(_superblockHash, ERR_SUPERBLOCK_BAD_STATUS);
            return ERR_SUPERBLOCK_BAD_STATUS;
        }
        superblock.status = Status.Invalid;
        emit InvalidSuperblock(_superblockHash, _validator);
        return ERR_SUPERBLOCK_OK;
    }

    // @dev - Verify TX SPV to Block proof as well as Block SPV proof to Superblock
    // @param _txBytes - transaction bytes
    // @param _txIndex - transaction's index within the block
    // @param _txSiblings - transaction's Merkle siblings
    // @param _syscoinBlockHeader - block header containing transaction
    // @param _syscoinBlockIndex - block's index within superblock
    // @param _syscoinBlockSiblings - block's merkle siblings
    // @param _superblockHash - superblock containing block header
    function verifySPVProofs(
        bytes memory _syscoinBlockHeader,
        uint _syscoinBlockIndex,
        uint[] memory _syscoinBlockSiblings,
        bytes32 _superblockHash,
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _txSiblings
    ) private returns (uint) {
        // Check if Syscoin block belongs to given superblock
        if (bytes32(computeMerkle(dblShaFlip(_syscoinBlockHeader), _syscoinBlockIndex, _syscoinBlockSiblings))
            != superblocks[_superblockHash].blocksMerkleRoot) {
            // Syscoin block is not in superblock
            emit VerifyTransaction(bytes32(0), ERR_SUPERBLOCK_MERKLE_ROOT);
            return 0;
        }
        return verifyTx(_txBytes, _txIndex, _txSiblings, _syscoinBlockHeader, _superblockHash);
    }

    // @dev - relays transaction `_txBytes` to ERC20Manager's processTransaction() method.
    // Also logs the value of processTransaction.
    // Note: callers cannot be 100% certain when an ERR_RELAY_VERIFY occurs because
    // it may also have been returned by processTransaction(). Callers should be
    // aware of the contract that they are relaying transactions to and
    // understand what that contract's processTransaction method returns.
    //
    // @param _txBytes - transaction bytes
    // @param _txIndex - transaction's index within the block
    // @param _txSiblings - transaction's Merkle siblings
    // @param _syscoinBlockHeader - block header containing transaction
    // @param _syscoinBlockIndex - block's index within superblock
    // @param _syscoinBlockSiblings - block's merkle siblings
    // @param _superblockHash - superblock containing block header
    function relayTx(
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _txSiblings,
        bytes memory _syscoinBlockHeader,
        uint _syscoinBlockIndex,
        uint[] memory _syscoinBlockSiblings,
        bytes32 _superblockHash
    ) public returns (uint) {
        uint txHash = verifySPVProofs(_syscoinBlockHeader, _syscoinBlockIndex, _syscoinBlockSiblings, _superblockHash, _txBytes, _txIndex, _txSiblings);
        if (txHash != 0) {
            uint value;
            address destinationAddress;
            uint ret;
            uint32 assetGUID;
            (ret, value, destinationAddress, assetGUID) = parseBurnTx(_txBytes);
            if(ret != 0){
                emit RelayTransaction(bytes32(txHash), ret);
                return ret;
            }
            syscoinERC20Manager.processTransaction(txHash, value, destinationAddress, superblocks[_superblockHash].submitter, assetGUID);
            return value;
        }
        emit RelayTransaction(bytes32(0), ERR_RELAY_VERIFY);
        return(ERR_RELAY_VERIFY);
    }

    // @dev - relays asset transaction(new or update) `_txBytes` to ERC20Manager's processAsset() method.
    // Also logs the value of processAsset.
    // Note: callers cannot be 100% certain when an ERR_RELAY_VERIFY occurs because
    // it may also have been returned by processAsset(). Callers should be
    // aware of the contract that they are relaying transactions to and
    // understand what that contract's processTransaction method returns.
    //
    // @param _txBytes - transaction bytes
    // @param _txIndex - transaction's index within the block
    // @param _txSiblings - transaction's Merkle siblings
    // @param _syscoinBlockHeader - block header containing transaction
    // @param _syscoinBlockIndex - block's index within superblock
    // @param _syscoinBlockSiblings - block's merkle siblings
    // @param _superblockHash - superblock containing block header
    function relayAssetTx(
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _txSiblings,
        bytes memory _syscoinBlockHeader,
        uint _syscoinBlockIndex,
        uint[] memory _syscoinBlockSiblings,
        bytes32 _superblockHash
    ) public returns (uint) {
        uint txHash = verifySPVProofs(_syscoinBlockHeader, _syscoinBlockIndex, _syscoinBlockSiblings, _superblockHash, _txBytes, _txIndex, _txSiblings);
        if (txHash != 0) {
            uint ret;
            uint32 assetGUID;
            address erc20ContractAddress;
            uint8 precision;
            (ret, assetGUID, erc20ContractAddress, precision) = parseAssetTx(_txBytes);
            if(ret != 0){
                emit RelayTransaction(bytes32(txHash), ret);
                return ret;
            }
            uint32 height = superblocks[_superblockHash].height*60;
            height += uint32(_syscoinBlockIndex);
            // pass in height of block as well by calc superblock sets of 60 blocks
            syscoinERC20Manager.processAsset(txHash, assetGUID, height, erc20ContractAddress, precision);
            return 0;
        }
        emit RelayTransaction(bytes32(0), ERR_RELAY_VERIFY);
        return(ERR_RELAY_VERIFY);
    }

    // Challenges a bridge cancellation request with SPV proofs linking tx to superblock and showing that a valid
    // cancellation request exists. If challenge fails, the cancellation request continues until timeout at which point erc20 is refunded
    //
    // @param _txBytes - transaction bytes
    // @param _txIndex - transaction's index within the block
    // @param _txSiblings - transaction's Merkle siblings
    // @param _syscoinBlockHeader - block header containing transaction
    // @param _syscoinBlockIndex - block's index within superblock
    // @param _syscoinBlockSiblings - block's merkle siblings
    // @param _superblockHash - superblock containing block header
    function challengeCancelTransfer(
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _txSiblings,
        bytes memory _syscoinBlockHeader,
        uint _syscoinBlockIndex,
        uint[] memory _syscoinBlockSiblings,
        bytes32 _superblockHash
    ) public returns (uint) {
        uint txHash = verifySPVProofs(_syscoinBlockHeader, _syscoinBlockIndex, _syscoinBlockSiblings, _superblockHash, _txBytes, _txIndex, _txSiblings);
        if (txHash != 0) {
            uint32 bridgeTransferId;
            uint ret;
            (ret, bridgeTransferId) = parseMintTx(_txBytes);
            if(ret != 0){
                emit RelayTransaction(bytes32(txHash), ret);
                return ret;
            }
            // check if cancellation request exists in valid state
            // cancel cancellation request if challenger wins, challenger gets paid cancellors deposit
            syscoinERC20Manager.processCancelTransferFail(bridgeTransferId, msg.sender);
            return 0;
        }
        emit ChallengeCancelTransferRequest(ERR_CANCEL_TRANSFER_VERIFY);
        return(ERR_CANCEL_TRANSFER_VERIFY);
    }

    // @dev - Parses a syscoin tx
    //
    // @param txBytes - tx byte array
    // Outputs
    // @return output_value - amount sent to the lock address in satoshis
    // @return destinationAddress - ethereum destination address
    function parseBurnTx(bytes memory txBytes)
        public
        pure
        returns (uint, uint, address, uint32)
    {
        uint output_value;
        uint32 assetGUID;
        address destinationAddress;
        uint32 version;
        uint pos = 0;
        uint opIndex = 0;
        version = bytesToUint32Flipped(txBytes, pos);
        if(version != SYSCOIN_TX_VERSION_ALLOCATION_BURN_TO_ETHEREUM){
            return (ERR_PARSE_TX_SYS, output_value, destinationAddress, assetGUID);
        }
        (opIndex, pos) = getOpReturnPos(txBytes, 4);
        (output_value, destinationAddress, assetGUID) = scanBurnTx(txBytes, opIndex, pos);
        return (0, output_value, destinationAddress, assetGUID);
    }

    function skipInputs(bytes memory txBytes, uint pos)
        private
        pure
        returns (uint)
    {
        uint n_inputs;
        uint script_len;
        (n_inputs, pos) = parseCompactSize(txBytes, pos);
        // if dummy 0x00 is present this is a witness transaction
        if(n_inputs == 0x00){
            (n_inputs, pos) = parseCompactSize(txBytes, pos); // flag
            require(n_inputs != 0x00, "#SyscoinSuperblocks skipInputs(): Unexpected dummy/flag");
            // after dummy/flag the real var int comes for txins
            (n_inputs, pos) = parseCompactSize(txBytes, pos);
        }
        require(n_inputs < 100, "#SyscoinSuperblocks skipInputs(): Incorrect size of n_inputs");

        for (uint i = 0; i < n_inputs; i++) {
            pos += 36;  // skip outpoint
            (script_len, pos) = parseCompactSize(txBytes, pos);
            pos += script_len + 4;  // skip sig_script, seq
        }

        return pos;
    }

    // @dev - Checks whether the transaction given by `_txBytes` is in the block identified by `_txBlockHeaderBytes`.
    // First it guards against a Merkle tree collision attack by raising an error if the transaction is exactly 64 bytes long,
    // then it calls helperVerifyHash to do the actual check.
    //
    // @param _txBytes - transaction bytes
    // @param _txIndex - transaction's index within the block
    // @param _siblings - transaction's Merkle siblings
    // @param _txBlockHeaderBytes - block header containing transaction
    // @param _txsuperblockHash - superblock containing block header
    // @return - SHA-256 hash of _txBytes if the transaction is in the block, 0 otherwise
    function verifyTx(
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _siblings,
        bytes memory _txBlockHeaderBytes,
        bytes32 _txsuperblockHash
    ) private returns (uint) {
        uint txHash = dblShaFlip(_txBytes);

        if (_txBytes.length == 64) {  // todo: is check 32 also needed?
            emit VerifyTransaction(bytes32(txHash), ERR_TX_64BYTE);
            return 0;
        }

        if (helperVerifyHash(txHash, _txIndex, _siblings, _txBlockHeaderBytes, _txsuperblockHash) == 1) {
            return txHash;
        } else {
            // log is done via helperVerifyHash
            return 0;
        }
    }

    // @dev - Bitcoin-way of hashing
    // @param _dataBytes - raw data to be hashed
    // @return - result of applying SHA-256 twice to raw data and then flipping the bytes
    function dblShaFlip(bytes memory _dataBytes) public pure returns (uint) {
        return flip32Bytes(uint(sha256(abi.encodePacked(sha256(abi.encodePacked(_dataBytes))))));
    }

    // @dev - extract Merkle root field from a raw Syscoin block header
    //
    // @param _blockHeader - Syscoin block header bytes
    // @param pos - where to start reading root from
    // @return - block's Merkle root in big endian format
    function getHeaderMerkleRoot(bytes memory _blockHeader) public pure returns (uint) {
        uint merkle;
        assembly {
            merkle := mload(add(add(_blockHeader, 32), 0x24))
        }
        return flip32Bytes(merkle);
    }

    // @dev - Checks whether the transaction identified by `_txHash` is in the block identified by `_blockHeaderBytes`
    // and whether the block is in the Syscoin main chain. Transaction check is done via Merkle proof.
    // Note: no verification is performed to prevent txHash from just being an
    // internal hash in the Merkle tree. Thus this helper method should NOT be used
    // directly and is intended to be private.
    //
    // @param _txHash - transaction hash
    // @param _txIndex - transaction's index within the block
    // @param _siblings - transaction's Merkle siblings
    // @param _blockHeaderBytes - block header containing transaction
    // @param _txsuperblockHash - superblock containing block header
    // @return - 1 if the transaction is in the block and the block is in the main chain,
    // 20020 (ERR_CONFIRMATIONS) if the block is not in the main chain,
    // 20050 (ERR_MERKLE_ROOT) if the block is in the main chain but the Merkle proof fails.
    function helperVerifyHash(
        uint256 _txHash,
        uint _txIndex,
        uint[] memory _siblings,
        bytes memory _blockHeaderBytes,
        bytes32 _txsuperblockHash
    ) private returns (uint) {

        if (!isApproved(_txsuperblockHash)) {
            emit VerifyTransaction(bytes32(_txHash), ERR_CHAIN);
            return (ERR_CHAIN);
        }

        // Verify tx Merkle root
        uint merkle = getHeaderMerkleRoot(_blockHeaderBytes);
        if (computeMerkle(_txHash, _txIndex, _siblings) != merkle) {
            emit VerifyTransaction(bytes32(_txHash), ERR_MERKLE_ROOT);
            return (ERR_MERKLE_ROOT);
        }
        return (1);
    }

    // @dev - Calculate superblock hash from superblock data
    //
    // @param _blocksMerkleRoot Root of the merkle tree of blocks contained in a superblock
    // @param _timestamp Timestamp of the last block in the superblock
    // @param _mtpTimestamp Median Timestamp of the last block in the superblock
    // @param _lastHash Hash of the last block in the superblock
    // @param _lastBits Difficulty bits of the last block in the superblock bits
    // @param _parentId Id of the parent superblock
    // @return Superblock id
    function calcSuperblockHash(
        bytes32 _blocksMerkleRoot,
        uint _timestamp,
        uint _mtpTimestamp,
        bytes32 _lastHash,
        uint32 _lastBits,
        bytes32 _parentId
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            _blocksMerkleRoot,
            _timestamp,
            _mtpTimestamp,
            _lastHash,
            _lastBits,
            _parentId
        ));
    }

    // @dev - Returns the confirmed superblock with the most accumulated work
    //
    // @return Best superblock hash
    function getBestSuperblock() external view returns (bytes32) {
        return bestSuperblock;
    }

    // @dev - Returns the superblock data for the supplied superblock hash
    //
    function getSuperblock(bytes32 superblockHash) external view returns (
        bytes32 _blocksMerkleRoot,
        uint _timestamp,
        uint _mtpTimestamp,
        bytes32 _lastHash,
        uint32 _lastBits,
        bytes32 _parentId,
        address _submitter,
        Status _status,
        uint32 _height
    ) {
        SuperblockInfo storage superblock = superblocks[superblockHash];
        return (
            superblock.blocksMerkleRoot,
            superblock.timestamp,
            superblock.mtpTimestamp,
            superblock.lastHash,
            superblock.lastBits,
            superblock.parentId,
            superblock.submitter,
            superblock.status,
            superblock.height
        );
    }

    // @dev - Returns superblock height
    function getSuperblockHeight(bytes32 superblockHash) public view returns (uint32) {
        return superblocks[superblockHash].height;
    }

    // @dev - Return superblock timestamp
    function getSuperblockTimestamp(bytes32 _superblockHash) external view returns (uint) {
        return superblocks[_superblockHash].timestamp;
    }

    // @dev - Return superblock median timestamp
    function getSuperblockMedianTimestamp(bytes32 _superblockHash) external view returns (uint) {
        return superblocks[_superblockHash].mtpTimestamp;
    }

    // @dev - Return superblock parent
    function getSuperblockParentId(bytes32 _superblockHash) external view returns (bytes32) {
        return superblocks[_superblockHash].parentId;
    }


    // @dev - Return superblock status
    function getSuperblockStatus(bytes32 _superblockHash) public view returns (Status) {
        return superblocks[_superblockHash].status;
    }

    function isApproved(bytes32 _superblockHash) private view returns (bool) {
        return (getSuperblockStatus(_superblockHash) == Status.Approved);
    }
    function getChainHeight() public view returns (uint) {
        return superblocks[bestSuperblock].height;
    }

    // @dev - return superblock hash at a given height in superblock main chain
    //
    // @param _height - superblock height
    // @return - hash corresponding to block of height _height
    function getSuperblockAt(uint _height) external view returns (bytes32) {
        bytes32 superblockHash = bestSuperblock;

        while (getSuperblockHeight(superblockHash) > _height) {
            superblockHash = superblocks[superblockHash].parentId;
        }

        return superblockHash;
    }
}

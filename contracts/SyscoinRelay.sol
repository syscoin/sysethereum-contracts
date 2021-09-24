// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import './interfaces/SyscoinRelayI.sol';
import "./interfaces/SyscoinTransactionProcessorI.sol";
import "./SyscoinErrorCodes.sol";
import "./SyscoinParser/SyscoinMessageLibrary.sol";

contract SyscoinRelay is SyscoinRelayI, SyscoinErrorCodes, SyscoinMessageLibrary {
    uint32 constant SYSCOIN_TX_VERSION_ASSET_ACTIVATE = 130;
    uint32 constant SYSCOIN_TX_VERSION_ASSET_UPDATE = 131;
    uint32 constant SYSCOIN_TX_VERSION_ALLOCATION_BURN_TO_NEVM = 134;
    bytes1 constant OP_PUSHDATA1 = 0x4c;
    bytes1 constant OP_PUSHDATA2 = 0x4d;
    uint32 constant ASSET_UPDATE_CONTRACT = 2;
    uint32 constant ASSET_INIT = 128;
    SyscoinTransactionProcessorI public syscoinERC20Manager;
    event VerifyTransaction(bytes32 txHash, uint returnCode);
    event RelayTransaction(bytes32 txHash, uint returnCode);

    // @param _syscoinERC20Manager - address of the SyscoinERC20Manager contract to be associated with
    function init(address _syscoinERC20Manager) public {
        require(address(syscoinERC20Manager) == address(0) && _syscoinERC20Manager != address(0));
        syscoinERC20Manager = SyscoinTransactionProcessorI(_syscoinERC20Manager);
    }

    // Returns true if the tx output is an OP_RETURN output
    function isOpReturn(bytes memory txBytes, uint pos) internal pure returns (bool) {
        // scriptPub format is
        // 0x6a OP_RETURN
        return txBytes[pos] == bytes1(0x6a);
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
        uint64 e = x % 10;
        x /= 10;
        uint64 n = 0;
        if (e < 9) {
            // x = 9*n + d - 1
            uint64 d = x % 9 + 1;
            x /= 9;
            // x = n
            n = x*10 + d;
        } else {
            n = x+1;
        }
        while (e > 0) {
            n *= 10;
            e--;
        }
        return n;
    }

    function parseFirstAssetCommitmentInTx(bytes memory txBytes, uint pos, int opIndex) internal pure returns (uint, uint32, uint) {
        uint numAssets;
        uint assetGuid;
        uint32 assetGuid32;
        uint bytesToRead;
        uint numOutputs;
        uint output_value;
        uint maxVal = 2**64;
        (numAssets, pos) = parseCompactSize(txBytes, pos);
        // loop through all assets in tx
        for (uint assetIndex = 0; assetIndex < numAssets; assetIndex++) {
            // the first asset is the one we care about
            if(assetIndex == 0) {
                // get nAsset
                (assetGuid, pos) = parseVarInt(txBytes, pos, maxVal);
                assetGuid32 = uint32(assetGuid);
                (numOutputs, pos) = parseCompactSize(txBytes, pos);
                // find output that is connected to the burn output (opIndex)
                for (uint i = 0; i < numOutputs; i++) {
                    // output index
                    (bytesToRead, pos) = parseCompactSize(txBytes, pos);
                    // get compressed amount
                    if(int(bytesToRead) == opIndex) {
                        (output_value, pos) = parseVarInt(txBytes, pos, maxVal);
                    } else {
                        (, pos) = parseVarInt(txBytes, pos, maxVal);
                    }
                }
                // skip notary sig
                (bytesToRead, pos) = parseCompactSize(txBytes, pos);
                pos += bytesToRead;
                if(opIndex >= 0) {
                    require(output_value > 0, "#SyscoinRelay parseFirstAssetCommitmentInTx(): output index not found");
                    output_value = DecompressAmount(uint64(output_value));
                }
            // skip over all other assets
            } else {
                // get nAsset
                (, pos) = parseVarInt(txBytes, pos, maxVal);
                (numOutputs, pos) = parseCompactSize(txBytes, pos);
                // find output that is connected to the burn output (opIndex)
                for (uint i = 0; i < numOutputs; i++) {
                    // skip output index
                    (, pos) = parseCompactSize(txBytes, pos);
                    // skip compressed amount
                    (, pos) = parseVarInt(txBytes, pos, maxVal);
                }
                // skip notary sig
                (bytesToRead, pos) = parseCompactSize(txBytes, pos);
                pos += bytesToRead;
            }
        }
        return (output_value, assetGuid32, pos);
    }
    // Returns asset data parsed from the op_return data output from syscoin asset burn transaction
    function scanBurnTx(bytes memory txBytes, uint opIndex, uint pos)
        public
        pure
        returns (uint, address, uint32)
    {
        uint32 assetGuid;
        address destinationAddress;
        uint output_value;
        uint numBytesInAddress;
        // return burned amount of an asset from the first asset output (opIndex is the index we are looking for inside of the first asset)
        (output_value, assetGuid, pos) = parseFirstAssetCommitmentInTx(txBytes, pos, int(opIndex));
        // destination address
        (numBytesInAddress, pos) = getOpcode(txBytes, pos);
        // ethereum contracts are 20 bytes (without the 0x)
        require(numBytesInAddress == 0x14, "#SyscoinRelay scanBurnTx(): Invalid destinationAddress");
        destinationAddress = readEthereumAddress(txBytes, pos);
        return (output_value, destinationAddress, assetGuid);
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
            require(n_inputs != 0x00, "#SyscoinRelay getOpReturnPos(): Unexpected dummy/flag");
            // after dummy/flag the real var int comes for txins
            (n_inputs, pos) = parseCompactSize(txBytes, pos);
        }
        require(n_inputs < 100, "#SyscoinRelay getOpReturnPos(): Incorrect size of n_inputs");

        for (uint i = 0; i < n_inputs; i++) {
            pos += 36;  // skip outpoint
            (script_len, pos) = parseCompactSize(txBytes, pos);
            pos += script_len + 4;  // skip sig_script, seq
        }
        
        (n_outputs, pos) = parseCompactSize(txBytes, pos);
        require(n_outputs < 10, "#SyscoinRelay getOpReturnPos(): Incorrect size of n_outputs");
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
            bytes1 pushDataOp = txBytes[pos];
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
        revert("#SyscoinRelay getOpReturnPos(): No OpReturn found");
    }


     /** @dev Parse syscoin asset transaction to recover asset guid and contract, for purposes of updating asset registry in erc20manager
     * @param txBytes syscoin raw transaction
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
     * Parse txBytes and returns assetGuid + contract address
     * @param txBytes syscoin raw transaction
     * @param pos position at where to start parsing
     * @return asset guid (uint32), erc20 address and precision linked to the asset guid to update registry in erc20manager
     */
    function scanAssetTx(bytes memory txBytes, uint pos)
        public
        pure
        returns (uint32, address, uint8)
    {
        uint32 assetGuid;
        address erc20Address;
        uint8 precision;
        uint bytesToRead;
        uint8 nUpdateFlags;
        uint maxVal = 2**64;
        
        // return asset from the first asset output
        (, assetGuid, pos) = parseFirstAssetCommitmentInTx(txBytes, pos, -1);
        
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
            (, pos) = parseVarInt(txBytes, pos, maxVal);
        }
        // get vchContract
        (bytesToRead, pos) = parseCompactSize(txBytes, pos);
        require(bytesToRead == 0x14,
        "scanAssetTx(): Invalid number of bytes read for contract field");
        erc20Address = readEthereumAddress(txBytes, pos);
        return (assetGuid, erc20Address, precision);
    }


    // @dev - Verify TX SPV to Block proof
    // @param _blockNumber - NEVM block number which is associated with a Syscoin Block with burned SPT (_txBytes)
    // @param _txBytes - transaction bytes
    // @param _txIndex - transaction's index within the block
    // @param _txSiblings - transaction's Merkle siblings
    // @param _syscoinBlockHeader - block header containing transaction
    function verifySPVProofs(
        uint64 _blockNumber,
        bytes memory _syscoinBlockHeader,
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _txSiblings
    ) private returns (uint) {
        if (_syscoinBlockHeader.length != 80) {  
            emit VerifyTransaction(0, ERR_INVALID_HEADER);
            return 0;
        }
        // ensure the NEVM block number can lookup a valid syscoin block hash
        if (uint(sysblockhash(_blockNumber)) != dblSha(_syscoinBlockHeader)) {
            emit VerifyTransaction(0, ERR_INVALID_HEADER_HASH);
            return 0;
        }
        // then ensure that the SPV proof against this validated syscoin block header is also valid
        return verifyTx(_txBytes, _txIndex, _txSiblings, _syscoinBlockHeader);
    }

    // @dev - relays transaction `_txBytes` to ERC20Manager's processTransaction() method.
    // Also logs the value of processTransaction.
    // Note: callers cannot be 100% certain when an error occurs because
    // it may also have been returned by processTransaction(). Callers should be
    // aware of the contract that they are relaying transactions to and
    // understand what that contract's processTransaction method returns.
    //
    // @param _blockNumber - NEVM block number which is associated with a Syscoin Block with burned SPT (_txBytes)
    // @param _txBytes - transaction bytes
    // @param _txIndex - transaction's index within the block
    // @param _txSiblings - transaction's Merkle siblings
    // @param _syscoinBlockHeader - block header containing transaction
    function relayTx(
        uint64 _blockNumber,
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _txSiblings,
        bytes memory _syscoinBlockHeader
    ) public override returns (uint) {
        uint txHash = verifySPVProofs(_blockNumber, _syscoinBlockHeader, _txBytes, _txIndex, _txSiblings);
        require(txHash != 0);
        uint value;
        address destinationAddress;
        uint ret;
        uint32 assetGuid;
        (ret, value, destinationAddress, assetGuid) = parseBurnTx(_txBytes);
        if(ret != 0){
            emit RelayTransaction(bytes32(txHash), ret);
            return ret;
        }
        syscoinERC20Manager.processTransaction(txHash, value, destinationAddress, assetGuid);
        return value;
    }

    // @dev - relays asset transaction(new or update) `_txBytes` to ERC20Manager's processAsset() method.
    // Also logs the value of processAsset.
    // Note: callers cannot be 100% certain when an error occurs because
    // it may also have been returned by processAsset(). Callers should be
    // aware of the contract that they are relaying transactions to and
    // understand what that contract's processTransaction method returns.
    //
    // @param _blockNumber - NEVM block number which is associated with a Syscoin Block with burned SPT (_txBytes)
    // @param _txBytes - transaction bytes
    // @param _txIndex - transaction's index within the block
    // @param _txSiblings - transaction's Merkle siblings
    // @param _syscoinBlockHeader - block header containing transaction
    function relayAssetTx(
        uint64 _blockNumber,
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _txSiblings,
        bytes memory _syscoinBlockHeader
    ) public override returns (uint) {
        uint txHash = verifySPVProofs(_blockNumber, _syscoinBlockHeader, _txBytes, _txIndex, _txSiblings);
        require(txHash != 0);
        uint ret;
        uint32 assetGuid;
        address erc20ContractAddress;
        uint8 precision;
        (ret, assetGuid, erc20ContractAddress, precision) = parseAssetTx(_txBytes);
        if(ret != 0){
            emit RelayTransaction(bytes32(txHash), ret);
            return ret;
        }
        syscoinERC20Manager.processAsset(txHash, assetGuid, _blockNumber, erc20ContractAddress, precision);
        return 0;
       
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
        returns (uint errorCode, uint output_value, address destinationAddress, uint32 assetGuid)
    {
        uint32 version;
        uint pos = 0;
        uint opIndex = 0;
        version = bytesToUint32Flipped(txBytes, pos);
        if(version != SYSCOIN_TX_VERSION_ALLOCATION_BURN_TO_NEVM){
            return (ERR_PARSE_TX_SYS, output_value, destinationAddress, assetGuid);
        }
        (opIndex, pos) = getOpReturnPos(txBytes, 4);
        (output_value, destinationAddress, assetGuid) = scanBurnTx(txBytes, opIndex, pos);
        return (0, output_value, destinationAddress, assetGuid);
    }

    // @dev - Checks whether the transaction given by `_txBytes` is in the block identified by `_txBlockHeaderBytes`.
    // First it guards against a Merkle tree collision attack by raising an error if the transaction is exactly 64 bytes long,
    // then it calls helperVerifyHash to do the actual check.
    //
    // @param _txBytes - transaction bytes
    // @param _txIndex - transaction's index within the block
    // @param _siblings - transaction's Merkle siblings
    // @param _txBlockHeaderBytes - block header containing transaction
    // @return - SHA-256 hash of _txBytes if the transaction is in the block, 0 otherwise
    function verifyTx(
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _siblings,
        bytes memory _txBlockHeaderBytes
    ) private returns (uint) {
        uint txHash = dblShaFlip(_txBytes);

        if (_txBytes.length == 64) {  // todo: is check 32 also needed?
            emit VerifyTransaction(bytes32(txHash), ERR_TX_64BYTE);
            return 0;
        }

        if (helperVerifyHash(txHash, _txIndex, _siblings, _txBlockHeaderBytes) == 1) {
            return txHash;
        } else {
            // log is done via helperVerifyHash
            return 0;
        }
    }
    function dblSha(bytes memory _dataBytes) public pure returns (uint) {
        return uint(sha256(abi.encodePacked(sha256(abi.encodePacked(_dataBytes)))));
    }

    // @dev - Bitcoin-way of hashing
    // @param _dataBytes - raw data to be hashed
    // @return - result of applying SHA-256 twice to raw data and then flipping the bytes
    function dblShaFlip(bytes memory _dataBytes) public pure returns (uint) {
        return flip32Bytes(dblSha(_dataBytes));
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
    // @return - 1 if the transaction is in the block and the block is in the main chain,
    // 20050 (ERR_MERKLE_ROOT) if the Merkle proof fails.
    function helperVerifyHash(
        uint256 _txHash,
        uint _txIndex,
        uint[] memory _siblings,
        bytes memory _blockHeaderBytes
    ) private returns (uint) {

        // Verify tx Merkle root
        uint merkle = getHeaderMerkleRoot(_blockHeaderBytes);
        if (computeMerkle(_txHash, _txIndex, _siblings) != merkle) {
            emit VerifyTransaction(bytes32(_txHash), ERR_MERKLE_ROOT);
            return (ERR_MERKLE_ROOT);
        }
        return (1);
    }
}

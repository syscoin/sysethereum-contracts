// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import './interfaces/SyscoinRelayI.sol';
import "./interfaces/SyscoinTransactionProcessorI.sol";
import "./SyscoinErrorCodes.sol";
import "./SyscoinParser/SyscoinMessageLibrary.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SyscoinRelay is SyscoinRelayI, SyscoinErrorCodes, SyscoinMessageLibrary, Ownable {
    bool public initialized = false;
    bytes1 constant OP_PUSHDATA1 = 0x4c;
    bytes1 constant OP_PUSHDATA2 = 0x4d;
    address internal constant SYSBLOCKHASH_PRECOMPILE_ADDRESS = address(0x61);
    uint16 internal constant SYSBLOCKHASH_PRECOMPILE_COST = 200;
    SyscoinTransactionProcessorI public syscoinVaultManager;
    event VerifyTransaction(bytes32 txHash, uint returnCode);
    event RelayTransaction(bytes32 txHash, uint returnCode);

    // @param _syscoinVaultManager - address of the SyscoinVaultManager contract to be associated with
    function init(address _syscoinVaultManager) external onlyOwner {
        require(!initialized, "Already initialized");
        require(_syscoinVaultManager != address(0), "Invalid address");
        syscoinVaultManager = SyscoinTransactionProcessorI(_syscoinVaultManager);
        initialized = true;
    }


    // Returns true if the tx output is an OP_RETURN output
    function isOpReturn(bytes memory txBytes, uint pos) internal pure returns (bool) {
        // scriptPub format is
        // 0x6a OP_RETURN
        return txBytes[pos] == bytes1(0x6a);
    }


    // Returns address parsed from the op_return data output from syscoin burn transaction
    function scanBurnTx(bytes memory txBytes, uint pos)
        public
        pure
        returns (address)
    {
        uint numBytesInAddress;
        // destination address
        (numBytesInAddress, pos) = getOpcode(txBytes, pos);
        // ethereum contracts are 20 bytes (without the 0x)
        require(numBytesInAddress == 0x14, "#SyscoinRelay scanBurnTx(): Invalid destinationAddress");
        return readEthereumAddress(txBytes, pos);
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

    function getOpReturnPos(bytes memory txBytes, uint pos) internal pure returns (uint, uint) {
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
            output_value = getBytesLE(txBytes, pos, 64);
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
            return (pos, output_value);
        }
        revert("#SyscoinRelay getOpReturnPos(): No OpReturn found");
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
        // Create the input data for the SYSBLOCKHASH precompile
        bytes memory input = abi.encodePacked(_blockNumber);

        // Call the SYSBLOCKHASH precompile
        (bool success, bytes memory result) = SYSBLOCKHASH_PRECOMPILE_ADDRESS.staticcall{gas: SYSBLOCKHASH_PRECOMPILE_COST}(input);

        // Ensure the call was successful and the result is not empty
        require(success, "SYSBLOCKHASH precompile call failed.");
        require(result.length > 0, "SYSBLOCKHASH precompile returned empty result.");

        // Compare the result (the Syscoin block hash) with the expected double SHA256 hash of the block header
        if (uint256(bytes32(result)) != dblSha(_syscoinBlockHeader)) {
            emit VerifyTransaction(0, ERR_INVALID_HEADER_HASH);
            return 0;
        }
        // then ensure that the SPV proof against this validated syscoin block header is also valid
        uint txHash = verifySPVProofs(_blockNumber, _syscoinBlockHeader, _txBytes, _txIndex, _txSiblings);
        if (txHash == 0) {
            emit VerifyTransaction(0, ERR_TX_VERIFICATION_FAILED);
            return 0;
        }
        return txHash;
    }

    // @dev - relays transaction `_txBytes` to SyscoinVaultManager's processTransaction() method.
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
    ) external override returns (uint) {
        uint txHash = verifySPVProofs(_blockNumber, _syscoinBlockHeader, _txBytes, _txIndex, _txSiblings);
        require(txHash != 0);
        uint value;
        address destinationAddress;
        uint ret;
        (ret, value, destinationAddress) = parseBurnTx(_txBytes);
        if(ret != 0){
            emit RelayTransaction(bytes32(txHash), ret);
            return ret;
        }
        syscoinVaultManager.processTransaction(txHash, value, destinationAddress);
        return value;
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
        returns (uint errorCode, uint output_value, address destinationAddress)
    {
        uint pos = 0;
        (pos, output_value) = getOpReturnPos(txBytes, 4);
        destinationAddress = scanBurnTx(txBytes, pos);
        return (0, output_value, destinationAddress);
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
    function dblSha(bytes memory _dataBytes) internal pure returns (uint) {
        return uint(sha256(abi.encodePacked(sha256(abi.encodePacked(_dataBytes)))));
    }

    // @dev - Bitcoin-way of hashing
    // @param _dataBytes - raw data to be hashed
    // @return - result of applying SHA-256 twice to raw data and then flipping the bytes
    function dblShaFlip(bytes memory _dataBytes) internal pure returns (uint) {
        return flip32Bytes(dblSha(_dataBytes));
    }

    // @dev - extract Merkle root field from a raw Syscoin block header
    //
    // @param _blockHeader - Syscoin block header bytes
    // @param pos - where to start reading root from
    // @return - block's Merkle root in big endian format
    function getHeaderMerkleRoot(bytes memory _blockHeader) internal pure returns (uint) {
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

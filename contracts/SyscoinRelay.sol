// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/SyscoinRelayI.sol";
import "./interfaces/SyscoinTransactionProcessorI.sol";
import "./SyscoinParser/SyscoinMessageLibrary.sol";

contract SyscoinRelay is SyscoinRelayI, SyscoinMessageLibrary {
    bool public initialized = false;
    uint32 constant SYSCOIN_TX_VERSION_ALLOCATION_BURN_TO_NEVM = 134;
    uint constant ERR_INVALID_HEADER = 10000;
    uint constant ERR_INVALID_HEADER_HASH = 10010;
    uint constant ERR_PARSE_TX_SYS = 10020;
    uint constant ERR_MERKLE_ROOT = 10030;
    uint constant ERR_TX_64BYTE = 10040;
    uint constant ERR_TX_VERIFICATION_FAILED = 10040;
    uint constant ERR_OP_RETURN_PARSE_FAILED = 10050;
    bytes1 constant OP_PUSHDATA1 = 0x4c;
    bytes1 constant OP_PUSHDATA2 = 0x4d;

    address internal constant SYSBLOCKHASH_PRECOMPILE_ADDRESS = address(0x61);
    uint16 internal constant SYSBLOCKHASH_PRECOMPILE_COST = 200;

    SyscoinTransactionProcessorI public syscoinVaultManager;

    event VerifyTransaction(bytes32 txHash, uint returnCode);
    event RelayTransaction(bytes32 txHash, uint returnCode);
    function init(address _syscoinVaultManager) external {
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

    function DecompressAmount(uint64 x) internal pure returns (uint64) {
        if (x == 0) return 0;
        x--;
        uint64 e = x % 10;
        x /= 10;
        uint64 n = 0;
        if (e < 9) {
            uint64 d = x % 9 + 1;
            x /= 9;
            n = x * 10 + d;
        } else {
            n = x + 1;
        }
        while (e > 0) {
            n *= 10;
            e--;
        }
        return n;
    }

    function parseFirstAssetCommitmentInTx(bytes memory txBytes, uint pos, int opIndex) internal pure returns (uint, uint64, uint) {
        uint numAssets;
        uint assetGuid;
        uint64 assetGuid64;
        uint bytesToRead;
        uint numOutputs;
        uint output_value;
        uint maxVal = 2**64;
        (numAssets, pos) = parseCompactSize(txBytes, pos);

        for (uint assetIndex = 0; assetIndex < numAssets; assetIndex++) {
            if(assetIndex == 0) {
                (assetGuid, pos) = parseVarInt(txBytes, pos, maxVal);
                assetGuid64 = uint64(assetGuid);
                (numOutputs, pos) = parseCompactSize(txBytes, pos);
                for (uint i = 0; i < numOutputs; i++) {
                    (bytesToRead, pos) = parseCompactSize(txBytes, pos);
                    if(int(bytesToRead) == opIndex) {
                        (output_value, pos) = parseVarInt(txBytes, pos, maxVal);
                    } else {
                        (, pos) = parseVarInt(txBytes, pos, maxVal);
                    }
                }
                if(opIndex >= 0) {
                    require(output_value > 0, "#SyscoinRelay parseFirstAssetCommitmentInTx(): output index not found");
                    output_value = DecompressAmount(uint64(output_value));
                }
            } else {
                (, pos) = parseVarInt(txBytes, pos, maxVal);
                (numOutputs, pos) = parseCompactSize(txBytes, pos);
                for (uint i = 0; i < numOutputs; i++) {
                    (, pos) = parseCompactSize(txBytes, pos);
                    (, pos) = parseVarInt(txBytes, pos, maxVal);
                }
            }
        }
        return (output_value, assetGuid64, pos);
    }

    // parse the burn transaction to find output_value, destination address, and assetGuid
    function scanBurnTx(bytes memory txBytes, uint opIndex, uint pos)
        public
        pure
        returns (uint output_value, address destinationAddress, uint64 assetGuid)
    {
        uint numBytesInAddress;
        (output_value, assetGuid, pos) = parseFirstAssetCommitmentInTx(txBytes, pos, int(opIndex));
        // Now read the next opcode for the Ethereum address
        (numBytesInAddress, pos) = getOpcode(txBytes, pos);
        require(numBytesInAddress == 0x14, "#SyscoinRelay scanBurnTx(): Invalid destinationAddress");
        destinationAddress = readEthereumAddress(txBytes, pos);
    }

    function readEthereumAddress(bytes memory txBytes, uint pos) internal pure returns (address) {
        uint256 data;
        assembly {
            data := mload(add(add(txBytes, 20), pos))
        }
        return address(uint160(data));
    }

    function getOpcode(bytes memory txBytes, uint pos) private pure returns (uint8, uint) {
        require(pos < txBytes.length, "Out of bounds in getOpcode");
        return (uint8(txBytes[pos]), pos + 1);
    }

    function getOpReturnPos(bytes memory txBytes, uint pos) internal pure returns (uint, uint) {
        uint n_inputs;
        uint script_len;
        uint n_outputs;

        (n_inputs, pos) = parseCompactSize(txBytes, pos);
        if(n_inputs == 0x00){
            (n_inputs, pos) = parseCompactSize(txBytes, pos); // flag
            require(n_inputs != 0x00, "#SyscoinRelay getOpReturnPos(): Unexpected dummy/flag");
            (n_inputs, pos) = parseCompactSize(txBytes, pos);
        }
        require(n_inputs < 100, "#SyscoinRelay getOpReturnPos(): Incorrect size of n_inputs");

        for (uint i = 0; i < n_inputs; i++) {
            pos += 36;
            (script_len, pos) = parseCompactSize(txBytes, pos);
            pos += script_len + 4;
        }

        (n_outputs, pos) = parseCompactSize(txBytes, pos);
        require(n_outputs < 10, "#SyscoinRelay getOpReturnPos(): Incorrect size of n_outputs");

        for (uint i = 0; i < n_outputs; i++) {
            pos += 8;
            (script_len, pos) = parseCompactSize(txBytes, pos);
            if(!isOpReturn(txBytes, pos)){
                pos += script_len;
                continue;
            }
            pos += 1;
            bytes1 pushDataOp = txBytes[pos];
            if (pushDataOp == OP_PUSHDATA1){
                pos += 2;
            }
            else if (pushDataOp == OP_PUSHDATA2){
                pos += 3;
            } else {
                pos += 1;
            }
            return (i, pos);
        }
        revert("#SyscoinRelay getOpReturnPos(): No OpReturn found");
    }

    function verifyTx(
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _siblings,
        bytes memory _blockHeaderBytes
    ) private returns (uint) {
        uint txHash = dblShaFlip(_txBytes);
        if (_txBytes.length == 64) {
            emit VerifyTransaction(bytes32(txHash), ERR_TX_64BYTE);
            return 0;
        }
        if (helperVerifyHash(txHash, _txIndex, _siblings, _blockHeaderBytes) == 1) {
            return txHash;
        } else {
            return 0;
        }
    }

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
        bytes memory input = abi.encodePacked(_blockNumber);
        (bool success, bytes memory result) = SYSBLOCKHASH_PRECOMPILE_ADDRESS.staticcall{gas: SYSBLOCKHASH_PRECOMPILE_COST}(input);
        require(success, "SYSBLOCKHASH precompile call failed.");
        require(result.length > 0, "SYSBLOCKHASH precompile returned empty result.");

        // compare precompile result
        if (uint256(bytes32(result)) != dblSha(_syscoinBlockHeader)) {
            emit VerifyTransaction(0, ERR_INVALID_HEADER_HASH);
            return 0;
        }
        // Now do a normal TX merkle check
        uint txHash = verifyTx(_txBytes, _txIndex, _txSiblings, _syscoinBlockHeader);
        if (txHash == 0) {
            emit VerifyTransaction(0, ERR_TX_VERIFICATION_FAILED);
            return 0;
        }
        return txHash;
    }

    function relayTx(
        uint64 _blockNumber,
        bytes memory _txBytes,
        uint _txIndex,
        uint[] memory _txSiblings,
        bytes memory _syscoinBlockHeader
    ) external override returns (uint) {
        uint txHash = verifySPVProofs(_blockNumber, _syscoinBlockHeader, _txBytes, _txIndex, _txSiblings);
        require(txHash != 0, "SPV proof verification failed");

        (uint errorCode, uint value, address destinationAddress, uint64 assetGuid) = parseBurnTx(_txBytes);
        if(errorCode != 0){
            emit RelayTransaction(bytes32(txHash), errorCode);
            return errorCode;
        }

        // pass assetGuid
        syscoinVaultManager.processTransaction(txHash, value, destinationAddress, assetGuid);
        return value;
    }

    function parseBurnTx(bytes memory txBytes)
        public
        pure
        returns (uint errorCode, uint output_value, address destinationAddress, uint64 assetGuid)
    {
        uint32 version;
        uint pos = 0;
        uint opIndex = 0;
        version = bytesToUint32Flipped(txBytes, pos);
        if (version != SYSCOIN_TX_VERSION_ALLOCATION_BURN_TO_NEVM) {
            return (ERR_PARSE_TX_SYS, 0, address(0), 0);
        }
        (opIndex, pos) = getOpReturnPos(txBytes, 4);
        (output_value, destinationAddress, assetGuid) = scanBurnTx(txBytes, opIndex, pos);
        return (0, output_value, destinationAddress, assetGuid);
    }

    function dblSha(bytes memory _dataBytes) internal pure returns (uint) {
        return uint(sha256(abi.encodePacked(sha256(abi.encodePacked(_dataBytes)))));
    }

    function dblShaFlip(bytes memory _dataBytes) internal pure returns (uint) {
        return flip32Bytes(dblSha(_dataBytes));
    }

    function getHeaderMerkleRoot(bytes memory _blockHeader) internal pure returns (uint) {
        uint merkle;
        assembly {
            merkle := mload(add(add(_blockHeader, 32), 0x24))
        }
        return flip32Bytes(merkle);
    }

    function helperVerifyHash(
        uint256 _txHash,
        uint _txIndex,
        uint[] memory _siblings,
        bytes memory _blockHeaderBytes
    ) private returns (uint) {
        uint merkle = getHeaderMerkleRoot(_blockHeaderBytes);
        if (computeMerkle(_txHash, _txIndex, _siblings) != merkle) {
            emit VerifyTransaction(bytes32(_txHash), ERR_MERKLE_ROOT);
            return ERR_MERKLE_ROOT;
        }
        return 1;
    }
}

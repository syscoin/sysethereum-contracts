pragma solidity ^0.5.13;

import './SyscoinMessageLibrary.sol';
import '../SyscoinErrorCodes.sol';
// @dev - Manages a battle session between superblock submitter and challenger
contract SyscoinMessageLibraryForTests is SyscoinErrorCodes, SyscoinMessageLibrary {

//     function bytesToUint32Public(bytes memory input) public pure returns (uint32 result) {
//         return bytesToUint32(input, 0);
//     }

//     function bytesToBytes32Public(bytes memory b) public pure returns (bytes32) {
//         return bytesToBytes32(b, 0);
//     }
//     function bytesToUint16Public(bytes memory input) public pure returns (uint32 result) {
//         return bytesToUint16(input, 0);
//     }
//     function sliceArrayPublic(bytes memory _rawBytes, uint offset, uint _endIndex) public view returns (bytes memory) {
//         uint len = _endIndex - offset;
//         bytes memory result = new bytes(len);
//         assembly {
//             // Call precompiled contract to copy data
//             if iszero(staticcall(gas, 0x04, add(add(_rawBytes, 0x20), offset), len, add(result, 0x20), len)) {
//                 revert(0, 0)
//             }
//         }
//         return result;
//     }

//     function targetFromBitsPublic(uint32 _bits) public pure returns (uint) {
//         uint exp = _bits / 0x1000000;  // 2**24
//         uint mant = _bits & 0xffffff;
//         return mant * 256**(exp - 3);
//     }

//     function makeMerklePublic(bytes32[] memory hashes2) public pure returns (bytes32) {
//         return SyscoinMessageLibrary.makeMerkle(hashes2);
//     }

//     function flip32BytesPublic(uint input) public pure returns (uint) {
//         return SyscoinMessageLibrary.flip32Bytes(input);
//     }

//     // @dev - Converts a bytes of size 4 to uint32,
//     // e.g. for input [0x01, 0x02, 0x03 0x04] returns 0x01020304
//     function bytesToUint32(bytes memory input, uint pos) private pure returns (uint32 result) {
//         result = uint32(uint8(input[pos]))*(2**24) + uint32(uint8(input[pos + 1]))*(2**16) + uint32(uint8(input[pos + 2]))*(2**8) + uint32(uint8(input[pos + 3]));
//     }

//     // @dev converts bytes of any length to bytes32.
//     // If `_rawBytes` is longer than 32 bytes, it truncates to the 32 leftmost bytes.
//     // If it is shorter, it pads with 0s on the left.
//     // Should be private, made internal for testing
//     //
//     // @param _rawBytes - arbitrary length bytes
//     // @return - leftmost 32 or less bytes of input value; padded if less than 32
//     function bytesToBytes32(bytes memory _rawBytes, uint pos) private pure returns (bytes32) {
//         bytes32 out;
//         assembly {
//             out := mload(add(add(_rawBytes, 0x20), pos))
//         }
//         return out;
//     }

//     function parseTransaction(bytes memory txBytes) public pure
//              returns (uint, uint, address, uint32, uint8, address) {
//         return SyscoinMessageLibrary.parseTransaction(txBytes);
//     }
//     // Returns true if the tx output is an OP_RETURN output
//     function isOpReturn(bytes memory txBytes, uint pos) public pure
//              returns (bool) {
//         // scriptPub format is
//         // 0x6a OP_RETURN
//         return 
//             txBytes[pos] == byte(0x6a);
//     }  
//     function getOpReturnPos(bytes memory txBytes, uint pos) public pure returns (uint) {
//         uint n_inputs;
//         uint script_len;
//         uint output_value;
//         uint n_outputs;

//         (n_inputs, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//         // if dummy 0x00 is present this is a witness transaction
//         if(n_inputs == 0x00){
//             (n_inputs, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos); // flag
//             require(n_inputs != 0x00, "#SyscoinSuperblocks getOpReturnPos(): Unexpected dummy/flag");
//             // after dummy/flag the real var int comes for txins
//             (n_inputs, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//         }
//         require(n_inputs < 100, "#SyscoinSuperblocks getOpReturnPos(): Incorrect size of n_inputs");

//         for (uint i = 0; i < n_inputs; i++) {
//             pos += 36;  // skip outpoint
//             (script_len, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//             pos += script_len + 4;  // skip sig_script, seq
//         }
        
//         (n_outputs, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//         require(n_outputs < 10, "#SyscoinSuperblocks getOpReturnPos(): Incorrect size of n_outputs");
//         for (uint i = 0; i < n_outputs; i++) {
//             pos += 8;
//             // varint
//             (script_len, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//             if(!isOpReturn(txBytes, pos)){
//                 // output script
//                 pos += script_len;
//                 output_value = 0;
//                 continue;
//             }
//             // skip opreturn marker
//             pos += 1;
//             return pos;
//         }
//         revert("#SyscoinSuperblocks getOpReturnPos(): No OpReturn found");
//     }
//     function bytesToUint16(bytes memory input, uint pos) public pure returns (uint16 result) {
//         result = uint16(uint8(input[pos+1])) + uint16(uint8(input[pos]))*(2**8);
//     }
//     /**
//      * Parse txBytes and returns ethereum tx receipt
//      * @param txBytes syscoin raw transaction
//      * @param pos position at where to start parsing
//      * @return ethTxReceipt ethereum tx receipt
//      */
//     function getEthReceipt(bytes memory txBytes, uint pos)
//         public
//         returns (bytes memory)
//     {
//         bytes memory ethTxReceipt = new bytes(0);
//         uint bytesToRead;
//         // skip vchTxValue
//         (bytesToRead, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//         pos += bytesToRead;
//         // skip vchTxParentNodes
//         (bytesToRead, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//         pos += bytesToRead;
//         // skip vchTxRoot
//         (bytesToRead, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//         pos += bytesToRead;
//         // skip vchTxPath
//         (bytesToRead, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//         pos += bytesToRead;
//         // get vchReceiptValue
//         (bytesToRead, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//         // if position is encoded in receipt value, decode position and read the value from next field (parent nodes)
//         if(bytesToRead == 2){
//             uint16 positionOfValue = bytesToUint16(txBytes, pos);
//             pos += bytesToRead;
//             // get vchReceiptParentNodes
//             (bytesToRead, pos) = SyscoinMessageLibrary.parseVarInt(txBytes, pos);
//             pos += positionOfValue;
//             ethTxReceipt = sliceArrayPublic(txBytes, pos, pos+(bytesToRead-positionOfValue));
//         }
//         // size > 2 means receipt value is fully serialized in this field and no need to get parent nodes field
//         else{
//             ethTxReceipt = sliceArrayPublic(txBytes, pos, pos+bytesToRead);      
//         }
//         return ethTxReceipt;
//     }
//     //
//     // Error / failure codes
//     //

//     // error codes for storeBlockHeader
//     uint constant ERR_DIFFICULTY =  10010;  // difficulty didn't match current difficulty
//     uint constant ERR_RETARGET = 10020;  // difficulty didn't match retarget
//     uint constant ERR_NO_PREV_BLOCK = 10030;
//     uint constant ERR_BLOCK_ALREADY_EXISTS = 10040;
//     uint constant ERR_INVALID_HEADER = 10050;
//     uint constant ERR_COINBASE_INDEX = 10060; // coinbase tx index within Bitcoin merkle isn't 0
//     uint constant ERR_NOT_MERGE_MINED = 10070; // trying to check AuxPoW on a block that wasn't merge mined
//     uint constant ERR_FOUND_TWICE = 10080; // 0xfabe6d6d found twice
//     uint constant ERR_NO_MERGE_HEADER = 10090; // 0xfabe6d6d not found
//     uint constant ERR_NOT_IN_FIRST_20 = 10100; // chain Merkle root not within first 20 bytes of coinbase tx
//     uint constant ERR_CHAIN_MERKLE = 10110;
//     uint constant ERR_PARENT_MERKLE = 10120;
//     uint constant ERR_PROOF_OF_WORK = 10130;
//     uint constant ERR_INVALID_HEADER_HASH = 10140;
//     uint constant ERR_PROOF_OF_WORK_AUXPOW = 10150;
//     uint constant ERR_PARSE_TX_OUTPUT_LENGTH = 10160;
//     uint constant ERR_PARSE_TX_SYS = 10170;

//     // error codes for verifyTx
//     uint constant ERR_BAD_FEE = 20010;
//     uint constant ERR_CONFIRMATIONS = 20020;
//     uint constant ERR_CHAIN = 20030;
//     uint constant ERR_SUPERBLOCK = 20040;
//     uint constant ERR_MERKLE_ROOT = 20050;
//     uint constant ERR_TX_64BYTE = 20060;

//     // error codes for relayTx
//     uint constant ERR_RELAY_VERIFY = 30010;
}
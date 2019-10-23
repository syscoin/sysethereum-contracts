pragma solidity ^0.5.12;

import './interfaces/SyscoinClaimManagerI.sol';
import './interfaces/SyscoinSuperblocksI.sol';
import './SyscoinErrorCodes.sol';
import "@openzeppelin/upgrades/contracts/Initializable.sol";

// @dev - Manages a battle session between superblock submitter and challenger
contract SyscoinBattleManager is Initializable, SyscoinErrorCodes {

    // For verifying Syscoin difficulty
    uint constant TARGET_TIMESPAN =  21600;
    uint constant TARGET_TIMESPAN_MIN = 17280; // TARGET_TIMESPAN * (8/10);
    uint constant TARGET_TIMESPAN_MAX = 27000; // TARGET_TIMESPAN * (10/8);
    uint constant TARGET_TIMESPAN_ADJUSTMENT =  360;  // 6 hour
    uint constant POW_LIMIT =    0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    struct BattleSession {
        bytes32 superblockHash;
        address submitter;
        address challenger;
        uint lastActionTimestamp;         // Last action timestamp
        bytes32 prevSubmitBlockhash;
        bytes32[] merkleRoots;            // interim merkle roots to recreate final root hash on last set of headers
    }
    // AuxPoW block fields
    struct AuxPoW {
        uint blockHash;

        uint txHash;

        uint coinbaseMerkleRoot; // Merkle root of auxiliary block hash tree; stored in coinbase tx field
        uint[] chainMerkleProof; // proves that a given Syscoin block hash belongs to a tree with the above root
        uint syscoinHashIndex; // index of Syscoin block hash within block hash tree
        uint coinbaseMerkleRootCode; // encodes whether or not the root was found properly

        uint parentMerkleRoot; // Merkle root of transaction tree from parent Bitcoin block header
        uint[] parentMerkleProof; // proves that coinbase tx belongs to a tree with the above root
        uint coinbaseTxIndex; // index of coinbase tx within Bitcoin tx tree

        uint parentNonce;
        uint pos;
    }
    // Syscoin block header stored as a struct, mostly for readability purposes.
    // BlockHeader structs can be obtained by parsing a block header's first 80 bytes
    // with parseHeaderBytes.
    struct BlockHeader {
        uint32 bits;
        bytes32 prevBlock;
        uint32 timestamp;
        bytes32 blockHash;
    }
    mapping (bytes32 => BattleSession) sessions;

    enum Network { MAINNET, TESTNET, REGTEST }

    uint public superblockDuration;         // Superblock duration (in blocks)
    uint public superblockTimeout;          // Timeout action (in seconds)


    // network that the stored blocks belong to
    Network private net;


    // Syscoin claim manager
    SyscoinClaimManagerI trustedSyscoinClaimManager;

    // Superblocks contract
    SyscoinSuperblocksI trustedSuperblocks;

    event NewBattle(bytes32 superblockHash, bytes32 sessionId, address submitter, address challenger);
    event ChallengerConvicted(bytes32 superblockHash, bytes32 sessionId, uint err, address challenger);
    event SubmitterConvicted(bytes32 superblockHash, bytes32 sessionId, uint err, address submitter);
    event RespondBlockHeaders(bytes32 superblockHash, bytes32 sessionId, uint merkleHashCount, address submitter);
    modifier onlyFrom(address sender) {
        require(msg.sender == sender);
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
        Network _network,
        SyscoinSuperblocksI _superblocks,
        uint _superblockDuration,
        uint _superblockTimeout
    ) external initializer {
        net = _network;
        trustedSuperblocks = _superblocks;
        superblockDuration = _superblockDuration;
        superblockTimeout = _superblockTimeout;
    }

    function setSyscoinClaimManager(SyscoinClaimManagerI _syscoinClaimManager) external {
        require(address(trustedSyscoinClaimManager) == address(0) && address(_syscoinClaimManager) != address(0));
        trustedSyscoinClaimManager = _syscoinClaimManager;
    }

    // @dev - Start a battle session
    function beginBattleSession(bytes32 superblockHash, address submitter, address challenger)
        external onlyFrom(address(trustedSyscoinClaimManager)) returns (bytes32) {
        bytes32 sessionId = keccak256(abi.encode(superblockHash, msg.sender, challenger));
        BattleSession storage session = sessions[sessionId];

        require(session.submitter == address(0));

        session.superblockHash = superblockHash;
        session.submitter = submitter;
        session.challenger = challenger;
        session.merkleRoots.length = 0;
        session.lastActionTimestamp = block.timestamp;

        emit NewBattle(superblockHash, sessionId, submitter, challenger);
        return sessionId;
    }
    // 0x00 version
    // 0x04 prev block hash
    // 0x24 merkle root
    // 0x44 timestamp
    // 0x48 bits
    // 0x4c nonce

    // @dev - extract previous block field from a raw Syscoin block header
    //
    // @param _blockHeader - Syscoin block header bytes
    // @param pos - where to start reading hash from
    // @return - hash of block's parent in big endian format
    function getHashPrevBlock(bytes memory _blockHeader, uint pos) private pure returns (uint) {
        uint hashPrevBlock;
        uint index = 0x04+pos;
        assembly {
            hashPrevBlock := mload(add(add(_blockHeader, 32), index))
        }
        return flip32Bytes(hashPrevBlock);
    }


    // @dev - extract timestamp field from a raw Syscoin block header
    //
    // @param _blockHeader - Syscoin block header bytes
    // @param pos - where to start reading bits from
    // @return - block's timestamp in big-endian format
    function getTimestamp(bytes memory _blockHeader, uint pos) private pure returns (uint32 time) {
        return bytesToUint32Flipped(_blockHeader, 0x44+pos);
    }

    // @dev - extract bits field from a raw Syscoin block header
    //
    // @param _blockHeader - Syscoin block header bytes
    // @param pos - where to start reading bits from
    // @return - block's difficulty in bits format, also big-endian
    function getBits(bytes memory _blockHeader, uint pos) private pure returns (uint32 bits) {
        return bytesToUint32Flipped(_blockHeader, 0x48+pos);
    }
    // @dev - converts raw bytes representation of a Syscoin block header to struct representation
    //
    // @param _rawBytes - first 80 bytes of a block header
    // @return - exact same header information in BlockHeader struct form
    function parseHeaderBytes(bytes memory _rawBytes, uint pos) private view returns (BlockHeader memory bh) {
        bh.bits = getBits(_rawBytes, pos);
        bh.blockHash = bytes32(dblShaFlipMem(_rawBytes, pos, 80));
        bh.timestamp = getTimestamp(_rawBytes, pos);
        bh.prevBlock = bytes32(getHashPrevBlock(_rawBytes, pos));
    }
    // Convert a variable integer into something useful and return it and
    // the index to after it.
    function parseVarInt(bytes memory txBytes, uint pos) private pure returns (uint, uint) {
        // the first byte tells us how big the integer is
        uint8 ibit = uint8(txBytes[pos]);
        pos += 1;  // skip ibit

        if (ibit < 0xfd) {
            return (ibit, pos);
        } else if (ibit == 0xfd) {
            return (getBytesLE(txBytes, pos, 16), pos + 2);
        } else if (ibit == 0xfe) {
            return (getBytesLE(txBytes, pos, 32), pos + 4);
        } else if (ibit == 0xff) {
            return (getBytesLE(txBytes, pos, 64), pos + 8);
        }
    }
    // convert little endian bytes to uint
    function getBytesLE(bytes memory data, uint pos, uint bits) private pure returns (uint256 result) {
        for (uint256 i = 0; i < bits / 8; i++) {
            result += uint256(uint8(data[pos + i])) * 2 ** (i * 8);
        }
    }
    function parseAuxPoW(bytes memory rawBytes, uint pos) private view
             returns (AuxPoW memory auxpow)
    {
        bytes memory coinbaseScript;
        uint slicePos;
        // we need to traverse the bytes with a pointer because some fields are of variable length
        pos += 80; // skip non-AuxPoW header

        (slicePos, coinbaseScript) = getSlicePos(rawBytes, pos);
        auxpow.txHash = dblShaFlipMem(rawBytes, pos, slicePos - pos);
        pos = slicePos;
        // parent block hash, skip and manually hash below
        pos += 32;
        (auxpow.parentMerkleProof, pos) = scanMerkleBranch(rawBytes, pos, 0);
        auxpow.coinbaseTxIndex = getBytesLE(rawBytes, pos, 32);
        pos += 4;
        (auxpow.chainMerkleProof, pos) = scanMerkleBranch(rawBytes, pos, 0);
        auxpow.syscoinHashIndex = getBytesLE(rawBytes, pos, 32);
        pos += 4;
        // calculate block hash instead of reading it above, as some are LE and some are BE, we cannot know endianness and have to calculate from parent block header
        auxpow.blockHash = dblShaFlipMem(rawBytes, pos, 80);
        pos += 36; // skip parent version and prev block
        auxpow.parentMerkleRoot = sliceBytes32Int(rawBytes, pos);
        pos += 40; // skip root that was just read, parent block timestamp and bits
        auxpow.parentNonce = getBytesLE(rawBytes, pos, 32);
        auxpow.pos = pos+4;
        uint coinbaseMerkleRootPosition;
        (auxpow.coinbaseMerkleRoot, coinbaseMerkleRootPosition, auxpow.coinbaseMerkleRootCode) = findCoinbaseMerkleRoot(coinbaseScript);
    }
   function skipOutputs(bytes memory txBytes, uint pos) private pure
             returns (uint)
    {
        uint n_outputs;
        uint script_len;

        (n_outputs, pos) = parseVarInt(txBytes, pos);

        require(n_outputs < 10);

        for (uint i = 0; i < n_outputs; i++) {
            pos += 8;
            (script_len, pos) = parseVarInt(txBytes, pos);
            pos += script_len;
        }

        return pos;
    }
    // get final position of inputs, outputs and lock time
    // this is a helper function to slice a byte array and hash the inputs, outputs and lock time
    function getSlicePos(bytes memory txBytes, uint pos) private view
             returns (uint slicePos, bytes memory coinbaseScript)
    {

        (slicePos, coinbaseScript) = skipInputsCoinbase(txBytes, pos + 4);
        slicePos = skipOutputs(txBytes, slicePos);
        slicePos += 4; // skip lock time
    }
    // scan a Merkle branch.
    // return array of values and the end position of the sibling hashes.
    // takes a 'stop' argument which sets the maximum number of
    // siblings to scan through. stop=0 => scan all.
    function scanMerkleBranch(bytes memory txBytes, uint pos, uint stop) private pure
             returns (uint[] memory, uint)
    {
        uint n_siblings;
        uint halt;

        (n_siblings, pos) = parseVarInt(txBytes, pos);

        if (stop == 0 || stop > n_siblings) {
            halt = n_siblings;
        } else {
            halt = stop;
        }

        uint[] memory sibling_values = new uint[](halt);

        for (uint i = 0; i < halt; i++) {
            sibling_values[i] = flip32Bytes(sliceBytes32Int(txBytes, pos));
            pos += 32;
        }

        return (sibling_values, pos);
    }

    // Slice 32 contiguous bytes from bytes `data`, starting at `start`
    function sliceBytes32Int(bytes memory data, uint start) private pure returns (uint slice) {
        assembly {
            slice := mload(add(data, add(0x20, start)))
        }
    }

    // @dev returns a portion of a given byte array specified by its starting and ending points
    // Breaks underscore naming convention for parameters because it raises a compiler error
    // if `offset` is changed to `_offset`.
    //
    // @param _rawBytes - array to be sliced
    // @param offset - first byte of sliced array
    // @param _endIndex - last byte of sliced array
    function sliceArray(bytes memory _rawBytes, uint offset, uint _endIndex) private view returns (bytes memory) {
        uint len = _endIndex - offset;
        bytes memory result = new bytes(len);
        assembly {
            // Call precompiled contract to copy data
            if iszero(staticcall(gas, 0x04, add(add(_rawBytes, 0x20), offset), len, add(result, 0x20), len)) {
                revert(0, 0)
            }
        }
        return result;
    }
    function skipInputsCoinbase(bytes memory txBytes, uint pos) private view
             returns (uint, bytes memory)
    {
        uint n_inputs;
        uint script_len;
        (n_inputs, pos) = parseVarInt(txBytes, pos);
        // if dummy 0x00 is present this is a witness transaction
        if(n_inputs == 0x00){
            (n_inputs, pos) = parseVarInt(txBytes, pos); // flag
            require(n_inputs != 0x00);
            // after dummy/flag the real var int comes for txins
            (n_inputs, pos) = parseVarInt(txBytes, pos);
        }
        require(n_inputs == 1);

        pos += 36;  // skip outpoint
        (script_len, pos) = parseVarInt(txBytes, pos);
        bytes memory coinbaseScript;
        coinbaseScript = sliceArray(txBytes, pos, pos+script_len);
        pos += script_len + 4;  // skip sig_script, seq

        return (pos, coinbaseScript);
    }
    // @dev - looks for {0xfa, 0xbe, 'm', 'm'} byte sequence
    // returns the following 32 bytes if it appears once and only once,
    // 0 otherwise
    // also returns the position where the bytes first appear
    function findCoinbaseMerkleRoot(bytes memory rawBytes) private pure
             returns (uint, uint, uint)
    {
        uint position;
        uint found = 0;
        uint target = 0xfabe6d6d00000000000000000000000000000000000000000000000000000000;
        uint mask = 0xffffffff00000000000000000000000000000000000000000000000000000000;
        assembly {
            let len := mload(rawBytes)
            let data := add(rawBytes, 0x20)
            let end := add(data, len)

            for { } lt(data, end) { } {     // while(i < end)
                if eq(and(mload(data), mask), target) {
                    if eq(found, 0x0) {
                        position := add(sub(len, sub(end, data)), 4)
                    }
                    found := add(found, 1)
                }
                data := add(data, 0x1)
            }
        }

        if (found >= 2) {
            return (0, position - 4, ERR_FOUND_TWICE);
        } else if (found == 1) {
            return (sliceBytes32Int(rawBytes, position), position - 4, 1);
        } else { // no merge mining header
            return (0, position - 4, ERR_NO_MERGE_HEADER);
        }
    }

    // @dev - For a valid proof, returns the root of the Merkle tree.
    //
    // @param _txHash - transaction hash
    // @param _txIndex - transaction's index within the block it's assumed to be in
    // @param _siblings - transaction's Merkle siblings
    // @return - Merkle tree root of the block the transaction belongs to if the proof is valid,
    // garbage if it's invalid
    function computeMerkle(uint _txHash, uint _txIndex, uint[] memory _siblings) private pure returns (uint) {
        
        uint length = _siblings.length;
        uint i;
        for (i = 0; i < length; i++) {
            _siblings[i] = flip32Bytes(_siblings[i]);
        }

        i = 0;
        uint resultHash = flip32Bytes(_txHash);        

        while (i < length) {
            uint proofHex = _siblings[i];

            uint left;
            uint right;
            if (_txIndex % 2 == 1) { // 0 means _siblings is on the right; 1 means left
                left = proofHex;
                right = resultHash;
            } else {
                left = resultHash;
                right = proofHex;
            }
            resultHash = uint(sha256(abi.encodePacked(sha256(abi.encodePacked(left, right)))));

            _txIndex /= 2;
            i += 1;
        }

        return flip32Bytes(resultHash);
    }
    // @dev - convert an unsigned integer from little-endian to big-endian representation
    //
    // @param _input - little-endian value
    // @return - input value in big-endian format
    function flip32Bytes(uint _input) private pure returns (uint result) {
        assembly {
            let pos := mload(0x40)
            mstore8(add(pos, 0), byte(31, _input))
            mstore8(add(pos, 1), byte(30, _input))
            mstore8(add(pos, 2), byte(29, _input))
            mstore8(add(pos, 3), byte(28, _input))
            mstore8(add(pos, 4), byte(27, _input))
            mstore8(add(pos, 5), byte(26, _input))
            mstore8(add(pos, 6), byte(25, _input))
            mstore8(add(pos, 7), byte(24, _input))
            mstore8(add(pos, 8), byte(23, _input))
            mstore8(add(pos, 9), byte(22, _input))
            mstore8(add(pos, 10), byte(21, _input))
            mstore8(add(pos, 11), byte(20, _input))
            mstore8(add(pos, 12), byte(19, _input))
            mstore8(add(pos, 13), byte(18, _input))
            mstore8(add(pos, 14), byte(17, _input))
            mstore8(add(pos, 15), byte(16, _input))
            mstore8(add(pos, 16), byte(15, _input))
            mstore8(add(pos, 17), byte(14, _input))
            mstore8(add(pos, 18), byte(13, _input))
            mstore8(add(pos, 19), byte(12, _input))
            mstore8(add(pos, 20), byte(11, _input))
            mstore8(add(pos, 21), byte(10, _input))
            mstore8(add(pos, 22), byte(9, _input))
            mstore8(add(pos, 23), byte(8, _input))
            mstore8(add(pos, 24), byte(7, _input))
            mstore8(add(pos, 25), byte(6, _input))
            mstore8(add(pos, 26), byte(5, _input))
            mstore8(add(pos, 27), byte(4, _input))
            mstore8(add(pos, 28), byte(3, _input))
            mstore8(add(pos, 29), byte(2, _input))
            mstore8(add(pos, 30), byte(1, _input))
            mstore8(add(pos, 31), byte(0, _input))
            result := mload(pos)
        }
    }
    // @dev - calculates the Merkle root of a tree containing Bitcoin transactions
    // in order to prove that `ap`'s coinbase tx is in that Bitcoin block.
    //
    // @param _ap - AuxPoW information
    // @return - Merkle root of Bitcoin block that the Syscoin block
    // with this info was mined in if AuxPoW Merkle proof is correct,
    // garbage otherwise
    function computeParentMerkle(AuxPoW memory _ap) private pure returns (uint) {
        return flip32Bytes(computeMerkle(_ap.txHash,
                                         _ap.coinbaseTxIndex,
                                         _ap.parentMerkleProof));
    }

    // @dev - calculates the Merkle root of a tree containing auxiliary block hashes
    // in order to prove that the Syscoin block identified by _blockHash
    // was merge-mined in a Bitcoin block.
    //
    // @param _blockHash - SHA-256 hash of a certain Syscoin block
    // @param _ap - AuxPoW information corresponding to said block
    // @return - Merkle root of auxiliary chain tree
    // if AuxPoW Merkle proof is correct, garbage otherwise
    function computeChainMerkle(uint _blockHash, AuxPoW memory _ap) private pure returns (uint) {
        return computeMerkle(_blockHash,
                             _ap.syscoinHashIndex,
                             _ap.chainMerkleProof);
    }

    // @dev - Helper function for Merkle root calculation.
    // Given two sibling nodes in a Merkle tree, calculate their parent.
    // Concatenates hashes `_tx1` and `_tx2`, then hashes the result.
    //
    // @param _tx1 - Merkle node (either root or internal node)
    // @param _tx2 - Merkle node (either root or internal node), has to be `_tx1`'s sibling
    // @return - `_tx1` and `_tx2`'s parent, i.e. the result of concatenating them,
    // hashing that twice and flipping the bytes.
    function concatHash(uint _tx1, uint _tx2) private pure returns (uint) {
        return flip32Bytes(uint(sha256(abi.encodePacked(sha256(abi.encodePacked(flip32Bytes(_tx1), flip32Bytes(_tx2)))))));
    }

    // @dev - checks if a merge-mined block's Merkle proofs are correct,
    // i.e. Syscoin block hash is in coinbase Merkle tree
    // and coinbase transaction is in parent Merkle tree.
    //
    // @param _blockHash - SHA-256 hash of the block whose Merkle proofs are being checked
    // @param _ap - AuxPoW struct corresponding to the block
    // @return 1 if block was merge-mined and coinbase index, chain Merkle root and Merkle proofs are correct,
    // respective error code otherwise
    function checkAuxPoW(uint _blockHash, AuxPoW memory _ap) private pure returns (uint) {
        if (_ap.coinbaseTxIndex != 0) {
            return ERR_COINBASE_INDEX;
        }

        if (_ap.coinbaseMerkleRootCode != 1) {
            return _ap.coinbaseMerkleRootCode;
        }

        if (computeChainMerkle(_blockHash, _ap) != _ap.coinbaseMerkleRoot) {
            return ERR_CHAIN_MERKLE;
        }

        if (computeParentMerkle(_ap) != _ap.parentMerkleRoot) {
            return ERR_PARENT_MERKLE;
        }

        return 1;
    }

    function sha256mem(bytes memory _rawBytes, uint offset, uint len) private view returns (bytes32 result) {
        assembly {
            // Call sha256 precompiled contract (located in address 0x02) to copy data.
            // Assign to ptr the next available memory position (stored in memory position 0x40).
            let ptr := mload(0x40)
            if iszero(staticcall(gas, 0x02, add(add(_rawBytes, 0x20), offset), len, ptr, 0x20)) {
                revert(0, 0)
            }
            result := mload(ptr)
        }
    }

    // @dev - Bitcoin-way of hashing
    // @param _dataBytes - raw data to be hashed
    // @return - result of applying SHA-256 twice to raw data and then flipping the bytes
    function dblShaFlip(bytes memory _dataBytes) private pure returns (uint) {
        return flip32Bytes(uint(sha256(abi.encodePacked(sha256(abi.encodePacked(_dataBytes))))));
    }

    // @dev - Bitcoin-way of hashing
    // @param _dataBytes - raw data to be hashed
    // @return - result of applying SHA-256 twice to raw data and then flipping the bytes
    function dblShaFlipMem(bytes memory _rawBytes, uint offset, uint len) private view returns (uint) {
        return flip32Bytes(uint(sha256(abi.encodePacked(sha256mem(_rawBytes, offset, len)))));
    }

    // @dev - Bitcoin-way of computing the target from the 'bits' field of a block header
    // based on http://www.righto.com/2014/02/bitcoin-mining-hard-way-algorithms.html//ref3
    //
    // @param _bits - difficulty in bits format
    // @return - difficulty in target format
    function targetFromBits(uint32 _bits) private pure returns (uint) {
        uint exp = _bits / 0x1000000;  // 2**24
        uint mant = _bits & 0xffffff;
        return mant * 256**(exp - 3);
    }
    // @dev - Verify block header
    // @param _blockHeaderBytes - array of bytes with the block header
    // @param _pos - starting position of the block header
    // @return - [ErrorCode, BlockHeader, position]
    function verifyBlockHeader(bytes memory _blockHeaderBytes, uint _pos) private view returns (uint, BlockHeader memory, uint) {
        BlockHeader memory blockHeader = parseHeaderBytes(_blockHeaderBytes, _pos);
        uint target = targetFromBits(blockHeader.bits);
        uint blockHash = uint(blockHeader.blockHash);
        if (isMergeMined(_blockHeaderBytes, _pos)) {
            AuxPoW memory ap = parseAuxPoW(_blockHeaderBytes, _pos);
            if (ap.blockHash > target) {
                return (ERR_PROOF_OF_WORK_AUXPOW, blockHeader,0);
            }

            uint auxPoWCode = checkAuxPoW(blockHash, ap);
            if (auxPoWCode != 1) {
                return (auxPoWCode, blockHeader,0);
            }
            return (0, blockHeader, ap.pos);
        } else {
            if (blockHash > target) {
                return (ERR_PROOF_OF_WORK, blockHeader,0);
            }
            return (0, blockHeader, _pos+80);
        }
    }
    
    // @param _actualTimespan - time elapsed from previous block creation til current block creation;
    // i.e., how much time it took to mine the current block
    // @param _bits - previous block header difficulty (in bits)
    // @return - expected difficulty for the next block
    function calculateDifficulty(uint _actualTimespan, uint32 _bits) private pure returns (uint32 result) {
        uint actualTimespan = _actualTimespan;
        // Limit adjustment step
        if (actualTimespan < TARGET_TIMESPAN_MIN) {
            actualTimespan = TARGET_TIMESPAN_MIN;
        } else if (actualTimespan > TARGET_TIMESPAN_MAX) {
            actualTimespan = TARGET_TIMESPAN_MAX;
        }

        // Retarget
        uint bnNew = targetFromBits(_bits);
        bnNew = bnNew * actualTimespan;
        bnNew = bnNew / TARGET_TIMESPAN;

        if (bnNew > POW_LIMIT) {
            bnNew = POW_LIMIT;
        }

        return toCompactBits(bnNew);
    }

    // @dev - shift information to the right by a specified number of bits
    //
    // @param _val - value to be shifted
    // @param _shift - number of bits to shift
    // @return - `_val` shifted `_shift` bits to the right, i.e. divided by 2**`_shift`
    function shiftRight(uint _val, uint _shift) private pure returns (uint) {
        return _val / uint(2)**_shift;
    }

    // @dev - shift information to the left by a specified number of bits
    //
    // @param _val - value to be shifted
    // @param _shift - number of bits to shift
    // @return - `_val` shifted `_shift` bits to the left, i.e. multiplied by 2**`_shift`
    function shiftLeft(uint _val, uint _shift) private pure returns (uint) {
        return _val * uint(2)**_shift;
    }

    // @dev - get the number of bits required to represent a given integer value without losing information
    //
    // @param _val - unsigned integer value
    // @return - given value's bit length
    function bitLen(uint _val) private pure returns (uint length) {
        uint int_type = _val;
        while (int_type > 0) {
            int_type = shiftRight(int_type, 1);
            length += 1;
        }
    }

    // @dev - Convert uint256 to compact encoding
    // based on https://github.com/petertodd/python-bitcoinlib/blob/2a5dda45b557515fb12a0a18e5dd48d2f5cd13c2/bitcoin/core/serialize.py
    // Analogous to arith_uint256::GetCompact from C++ implementation
    //
    // @param _val - difficulty in target format
    // @return - difficulty in bits format
    function toCompactBits(uint _val) private pure returns (uint32) {
        uint nbytes = uint (shiftRight((bitLen(_val) + 7), 3));
        uint32 compact = 0;
        if (nbytes <= 3) {
            compact = uint32 (shiftLeft((_val & 0xFFFFFF), 8 * (3 - nbytes)));
        } else {
            compact = uint32 (shiftRight(_val, 8 * (nbytes - 3)));
            compact = uint32 (compact & 0xFFFFFF);
        }

        // If the sign bit (0x00800000) is set, divide the mantissa by 256 and
        // increase the exponent to get an encoding without it set.
        if ((compact & 0x00800000) > 0) {
            compact = uint32(shiftRight(compact, 8));
            nbytes += 1;
        }

        return compact | uint32(shiftLeft(nbytes, 24));
    }
    // @dev - Verify block headers sent by challenger
    function doRespondBlockHeaders(
        BattleSession storage session,
        SyscoinSuperblocksI.SuperblockInfo memory superblockInfo,
        bytes32 merkleRoot,
        BlockHeader memory lastHeader
    ) private returns (uint) {
        if (session.merkleRoots.length == 3 || net == Network.REGTEST) {
            bytes32[] memory merkleRoots = new bytes32[](net != Network.REGTEST ? 4 : 1);
            uint i;
            for (i = 0; i < session.merkleRoots.length; i++) {
                merkleRoots[i] = session.merkleRoots[i];
            }
            merkleRoots[i] = merkleRoot;
            if (superblockInfo.blocksMerkleRoot != makeMerkle(merkleRoots)) {
                return ERR_SUPERBLOCK_INVALID_MERKLE;
            }

            // if you have the last set of headers we can enfoce checks against the end
            // ensure the last block's timestamp matches the superblock's proposed timestamp
            if (superblockInfo.timestamp != lastHeader.timestamp) {
                return ERR_SUPERBLOCK_INVALID_TIMESTAMP;
            }
            // ensure last headers hash matches the last hash of the superblock
            if (lastHeader.blockHash != superblockInfo.lastHash) {
                return ERR_SUPERBLOCK_HASH_SUPERBLOCK;
            }
        } else {
            session.merkleRoots.push(merkleRoot);
        }

        return ERR_SUPERBLOCK_OK;
    }

    function respondBlockHeaders (
        bytes32 sessionId,
        bytes memory blockHeaders,
        uint numHeaders
    ) public {
        BattleSession storage session = sessions[sessionId];
        address submitter = session.submitter;

        require(msg.sender == submitter);

        uint merkleRootsLen = session.merkleRoots.length;

        if (net != Network.REGTEST) {
            if ((merkleRootsLen <= 2 && numHeaders != 16) || (merkleRootsLen == 3 && numHeaders != 12)) {
                revert();
            }
        }

        SyscoinSuperblocksI.SuperblockInfo memory superblockInfo;
        bytes32 superblockHash = session.superblockHash;
        (superblockInfo.blocksMerkleRoot, superblockInfo.timestamp,superblockInfo.mtpTimestamp,superblockInfo.lastHash,superblockInfo.lastBits,superblockInfo.parentId,,,superblockInfo.height) =
            trustedSuperblocks.getSuperblock(superblockHash);

        uint pos = 0;
        bytes32[] memory blockHashes = new bytes32[](numHeaders);
        BlockHeader[] memory parsedBlockHeaders = new BlockHeader[](numHeaders);

        uint err = ERR_SUPERBLOCK_OK;

        for (uint i = 0; i < parsedBlockHeaders.length; i++){
            parsedBlockHeaders[i] = parseHeaderBytes(blockHeaders, pos);
            uint target = targetFromBits(parsedBlockHeaders[i].bits);

            if (isMergeMined(blockHeaders, pos)) {
                AuxPoW memory ap = parseAuxPoW(blockHeaders, pos);
                if (ap.blockHash > target) {
                    err = ERR_PROOF_OF_WORK_AUXPOW;
                    break;
                }

                uint auxPoWCode = checkAuxPoW(uint(parsedBlockHeaders[i].blockHash), ap);
                if (auxPoWCode != 1) {
                    err = auxPoWCode;
                    break;
                }

                pos = ap.pos;
            } else {
                if (uint(parsedBlockHeaders[i].blockHash) > target) {
                    err = ERR_PROOF_OF_WORK;
                    break;
                }

                pos = pos+80;
            }

            blockHashes[i] = parsedBlockHeaders[i].blockHash;
        }

        if (err != ERR_SUPERBLOCK_OK) {
            convictSubmitter(sessionId, superblockHash, submitter, session.challenger, err);
            return;
        }

        err = doRespondBlockHeaders(
            session,
            superblockInfo,
            makeMerkle(blockHashes),
            parsedBlockHeaders[parsedBlockHeaders.length-1]
        );
        if (err != ERR_SUPERBLOCK_OK) {
            convictSubmitter(sessionId, superblockHash, submitter, session.challenger, err);
        } else {
            session.lastActionTimestamp = block.timestamp;
            err = validateHeaders(session, superblockInfo, parsedBlockHeaders);
            if (err != ERR_SUPERBLOCK_OK) {
                convictSubmitter(sessionId, superblockHash, submitter, session.challenger, err);
                return;
            }
            // only convict challenger at the end if all headers have been provided
            if(numHeaders == 12 || net == Network.REGTEST){
                convictChallenger(sessionId, superblockHash, submitter, session.challenger, err);
                return;
            }
            emit RespondBlockHeaders(superblockHash, sessionId, merkleRootsLen + 1, submitter);
        }
    }
    // @dev - Converts a bytes of size 4 to uint32,
    // e.g. for input [0x01, 0x02, 0x03 0x04] returns 0x01020304
    function bytesToUint32Flipped(bytes memory input, uint pos) private pure returns (uint32 result) {
        assembly {
            let data := mload(add(add(input, 0x20), pos))
            let flip := mload(0x40)
            mstore8(add(flip, 0), byte(3, data))
            mstore8(add(flip, 1), byte(2, data))
            mstore8(add(flip, 2), byte(1, data))
            mstore8(add(flip, 3), byte(0, data))
            result := shr(mul(8, 28), mload(flip))
        }
    }
    uint32 constant VERSION_AUXPOW = (1 << 8);
    // @dev - checks version to determine if a block has merge mining information
    function isMergeMined(bytes memory _rawBytes, uint pos) private pure returns (bool) {
        return bytesToUint32Flipped(_rawBytes, pos) & VERSION_AUXPOW != 0;
    }
    // @dev - Evaluate the merkle root
    //
    // Given an array of hashes it calculates the
    // root of the merkle tree.
    //
    // @return root of merkle tree
    function makeMerkle(bytes32[] memory hashes) private pure returns (bytes32) {
        uint length = hashes.length;

        if (length == 1) return hashes[0];
        require(length > 0, "Must provide hashes");

        uint i;
        for (i = 0; i < length; i++) {
            hashes[i] = bytes32(flip32Bytes(uint(hashes[i])));
        }

        uint j;
        uint k;

        while (length > 1) {
            k = 0;
            for (i = 0; i < length; i += 2) {
                j = (i + 1 < length) ? i + 1 : length - 1;
                hashes[k] = sha256(abi.encodePacked(sha256(abi.encodePacked(hashes[i], hashes[j]))));
                k += 1;
            }
            length = k;
        }
        return bytes32(flip32Bytes(uint(hashes[0])));
    }

    // @dev - Validate prev bits, prev hash of block header
    function checkBlocks(BattleSession storage session, BlockHeader[] memory blockHeadersParsed, uint32 prevBits) private view returns (uint) {
        for(uint i = blockHeadersParsed.length-1;i>0;i--){
            BlockHeader memory thisHeader = blockHeadersParsed[i];
            BlockHeader memory prevHeader = blockHeadersParsed[i-1];
            // except for the last header except all the bits to match
            // last chunk has 12 headers which is the only time we care to skip the last header
            if (blockHeadersParsed.length != 12 || i < (blockHeadersParsed.length-1)){
                if (prevBits != thisHeader.bits)
                    return ERR_SUPERBLOCK_BITS_PREVBLOCK;
            }
            if(prevHeader.blockHash != thisHeader.prevBlock)
                return ERR_SUPERBLOCK_HASH_PREVBLOCK;
        }
        // enforce linking against previous submitted batch of blocks
        if(session.merkleRoots.length >= 2){
            BlockHeader memory firstHeader = blockHeadersParsed[0];
            if(session.prevSubmitBlockhash != firstHeader.prevBlock)
                return ERR_SUPERBLOCK_HASH_INTERIM_PREVBLOCK;
        }
        return ERR_SUPERBLOCK_OK;
    }
    function sort_array(uint[11] memory arr) private pure {
        for(uint i = 0; i < 11; i++) {
            for(uint j = i+1; j < 11 ;j++) {
                if(arr[i] > arr[j]) {
                    uint temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
                }
            }
        }
    }

    // @dev - Gets the median timestamp of the last 11 blocks
    function getMedianTimestamp(BlockHeader[] memory blockHeadersParsed) private pure returns (uint){
        uint[11] memory timestamps;
        // timestamps 0->10 = blockHeadersParsed 1->11
        for(uint i=0;i<11;i++){
            timestamps[i] = blockHeadersParsed[i+1].timestamp;
        }
        sort_array(timestamps);
        return timestamps[5];
    }
    // @dev - Validate superblock accumulated work + other block header fields
    function validateHeaders(BattleSession storage session, SyscoinSuperblocksI.SuperblockInfo memory superblockInfo, BlockHeader[] memory blockHeadersParsed) private returns (uint) {
        SyscoinSuperblocksI.SuperblockInfo memory prevSuperblockInfo;
        BlockHeader memory lastHeader = blockHeadersParsed[blockHeadersParsed.length-1];
        (,,prevSuperblockInfo.mtpTimestamp,prevSuperblockInfo.lastHash,prevSuperblockInfo.lastBits,,,,) =
            trustedSuperblocks.getSuperblock(superblockInfo.parentId);
        // for blocks 0 -> 16 we can check the first header
        if(session.merkleRoots.length <= 1){
            // ensure first headers prev block matches the last hash of the prev superblock
            if(blockHeadersParsed[0].prevBlock != prevSuperblockInfo.lastHash)
                return ERR_SUPERBLOCK_HASH_PREVSUPERBLOCK;

        }
        // make sure all bits are the same and timestamps are within range as well as headers are all linked
        uint err = checkBlocks(session, blockHeadersParsed, prevSuperblockInfo.lastBits);
        if(err != ERR_SUPERBLOCK_OK)
            return err;
        // for every batch of blocks up to the last one (at superblockDuration blocks we have all the headers so we can complete the game)
        if(blockHeadersParsed.length != 12){
            // set the last block header details in the session for subsequent batch of blocks to validate it connects to this header
            session.prevSubmitBlockhash = lastHeader.blockHash;
        }
        // once all the headers are received we can check merkle and enforce difficulty
        else{
            uint mtpTimestamp = getMedianTimestamp(blockHeadersParsed);

            // make sure calculated MTP is same as superblock MTP
            if(mtpTimestamp != superblockInfo.mtpTimestamp)
                 return ERR_SUPERBLOCK_MISMATCH_TIMESTAMP_MTP;

            // ensure MTP of this SB is > than last SB MTP
            if(mtpTimestamp <= prevSuperblockInfo.mtpTimestamp)
                return ERR_SUPERBLOCK_TOOSMALL_TIMESTAMP_MTP;


            // make sure every 6th superblock adjusts difficulty
            // calculate the new work from prevBits minus one as if its an adjustment we need to account for new bits, if not then just add one more prevBits work
            if (net != Network.REGTEST){
                if (((superblockInfo.height-1) % 6) == 0) {
                    BlockHeader memory prevToLastHeader = blockHeadersParsed[blockHeadersParsed.length-2];

                    // ie: superblockHeight = 7 meaning blocks 661->720, we need to check timestamp from block 719 - to block 360
                    // get 6 superblocks previous for second timestamp (for example block 360 has the timetamp 6 superblocks ago on second adjustment)
                    superblockInfo.timestamp = trustedSuperblocks.getSuperblockTimestamp(trustedSuperblocks.getSuperblockAt(superblockInfo.height - 6));
                    uint32 newBits = calculateDifficulty(prevToLastHeader.timestamp - superblockInfo.timestamp, prevSuperblockInfo.lastBits);

                    // ensure bits of superblock match derived bits from calculateDifficulty
                    if (superblockInfo.lastBits != newBits) {
                        return ERR_SUPERBLOCK_BITS_SUPERBLOCK;
                    }
                }

                // make sure superblock bits match that of the last block
                if (superblockInfo.lastBits != lastHeader.bits)
                    return ERR_SUPERBLOCK_BITS_LASTBLOCK;
            }
        }

        return ERR_SUPERBLOCK_OK;
    }


    // @dev - Trigger conviction if response is not received in time
    function timeout(bytes32 sessionId) external returns (uint) {
        BattleSession storage session = sessions[sessionId];
        require(session.submitter != address(0));

        if (block.timestamp > session.lastActionTimestamp + superblockTimeout) {
            convictSubmitter(sessionId, session.superblockHash, session.submitter, session.challenger, ERR_SUPERBLOCK_TIMEOUT);
            return ERR_SUPERBLOCK_TIMEOUT;
        }
        return ERR_SUPERBLOCK_NO_TIMEOUT;
    }

    // @dev - To be called when a challenger is convicted
    function convictChallenger(bytes32 sessionId, bytes32 superblockHash, address submitter, address challenger, uint err) private {
        trustedSyscoinClaimManager.sessionDecided(sessionId, superblockHash, submitter, challenger);
        emit ChallengerConvicted(superblockHash, sessionId, err, challenger);
        disable(sessionId);
    }

    // @dev - To be called when a submitter is convicted
    function convictSubmitter(bytes32 sessionId, bytes32 superblockHash, address submitter, address challenger, uint err) private {
        trustedSyscoinClaimManager.sessionDecided(sessionId, superblockHash, challenger, submitter);
        emit SubmitterConvicted(superblockHash, sessionId, err, submitter);
        disable(sessionId);
    }

    // @dev - Disable session
    // It should be called only when either the submitter or the challenger were convicted.
    function disable(bytes32 sessionId) private {
        delete sessions[sessionId];
    }

    // @dev - Check if a session's submitter did not respond before timeout
    function getSubmitterHitTimeout(bytes32 sessionId) external view returns (bool) {
        BattleSession storage session = sessions[sessionId];
        return (block.timestamp > session.lastActionTimestamp + superblockTimeout);
    }
    function getNumMerkleHashesBySession(bytes32 sessionId) external view returns (uint) {
        BattleSession memory session = sessions[sessionId];
        if (session.submitter == address(0))
            return 0;
        return sessions[sessionId].merkleRoots.length;
    }
    function sessionExists(bytes32 sessionId) external view returns (bool) {
        return sessions[sessionId].submitter != address(0);
    }
}

pragma solidity ^0.5.12;

interface SyscoinSuperblocksI {

    // @dev - Superblock status
    enum Status { Uninitialized, New, InBattle, SemiApproved, Approved, Invalid }
    struct SuperblockInfo {
        bytes32 blocksMerkleRoot;
        uint timestamp;
        uint mtpTimestamp;
        bytes32 lastHash;
        bytes32 parentId;
        address submitter;
        bytes32 ancestors;
        uint32 lastBits;
        uint32 index;
        uint32 height;
        Status status;
    }
    function propose(
        bytes32 _blocksMerkleRoot,
        uint _timestamp,
        uint _mtpTimestamp,
        bytes32 _lastHash,
        uint32 _lastBits,
        bytes32 _parentId,
        address submitter
    ) external returns (uint, bytes32);

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
    );

    function relayTx(
        bytes calldata _txBytes,
        uint _txIndex,
        uint[] calldata _txSiblings,
        bytes calldata _syscoinBlockHeader,
        uint _syscoinBlockIndex,
        uint[] calldata _syscoinBlockSiblings,
        bytes32 _superblockHash
    ) external returns (uint);

    function confirm(bytes32 _superblockHash, address _validator) external returns (uint);
    function challenge(bytes32 _superblockHash, address _challenger) external returns (uint);
    function semiApprove(bytes32 _superblockHash, address _validator) external returns (uint);
    function invalidate(bytes32 _superblockHash, address _validator) external returns (uint);
    function getBestSuperblock() external view returns (bytes32);
    function getSuperblockHeight(bytes32 superblockHash) external view returns (uint32);
    function getSuperblockParentId(bytes32 _superblockHash) external view returns (bytes32);
    function getSuperblockStatus(bytes32 _superblockHash) external view returns (Status);
    function getSuperblockAt(uint _height) external view returns (bytes32);
    function getSuperblockTimestamp(bytes32 _superblockHash) external view returns (uint);
    function getSuperblockMedianTimestamp(bytes32 _superblockHash) external view returns (uint);
}

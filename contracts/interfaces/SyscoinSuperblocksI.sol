pragma solidity ^0.5.10;

interface SyscoinSuperblocksI {

    // @dev - Superblock status
    enum Status { Unitialized, New, InBattle, SemiApproved, Approved, Invalid }

    function propose(
        bytes32 _blocksMerkleRoot,
        uint _accumulatedWork,
        uint _timestamp,
        bytes32 _lastHash,
        uint32 _lastBits,
        bytes32 _parentId,
        address submitter
    ) external returns (uint, bytes32);

    function getSuperblock(bytes32 superblockHash) external view returns (
        bytes32 _blocksMerkleRoot,
        uint _accumulatedWork,
        uint _timestamp,
        bytes32 _lastHash,
        uint32 _lastBits,
        bytes32 _parentId,
        address _submitter,
        Status _status,
        uint32 _height
    );

    function confirm(bytes32 _superblockHash, address _validator) external returns (uint);
    function challenge(bytes32 _superblockHash, address _challenger) external returns (uint);
    function semiApprove(bytes32 _superblockHash, address _validator) external returns (uint, bytes32);
    function invalidate(bytes32 _superblockHash, address _validator) external returns (uint, bytes32);
    function getBestSuperblock() external view returns (bytes32);
    function getSuperblockHeight(bytes32 superblockHash) external view returns (uint32);
    function getSuperblockParentId(bytes32 _superblockHash) external view returns (bytes32);
    function getSuperblockStatus(bytes32 _superblockHash) external view returns (Status);
    function getSuperblockAt(uint _height) external view returns (bytes32);
}

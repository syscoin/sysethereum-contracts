pragma solidity ^0.5.12;

import './SyscoinSuperblocksI.sol';

interface SyscoinClaimManagerI {
    function bondDeposit(bytes32 superblockHash, address account, uint amount) external returns (uint);

    function getDeposit(address account) external view returns (uint);

    function getSuperblockInfo(bytes32 superblockHash) external view returns (
        bytes32 _blocksMerkleRoot,
        uint _timestamp,
        uint _mtpTimestamp,
        bytes32 _lastHash,
        uint32 _lastBits,
        bytes32 _parentId,
        address _submitter,
        SyscoinSuperblocksI.Status _status,
        uint32 _height
    );

    function sessionDecided(bytes32 sessionId, bytes32 superblockHash, address winner, address loser) external;
}

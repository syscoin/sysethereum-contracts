pragma solidity ^0.5.13;

import './SyscoinSuperblocksI.sol';

interface SyscoinClaimManagerI {
    function bondDeposit(bytes32 superblockHash, address account, uint amount) external returns (uint);
    function getDeposit(address account) external view returns (uint);
    function checkClaimFinished(bytes32 superblockHash) external returns (bool);
    function sessionDecided(bytes32 superblockHash, address winner, address loser) external;
}

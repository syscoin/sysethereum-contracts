// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

// Interface contract to be implemented by SyscoinVaultManager
interface SyscoinTransactionProcessorI {
    function processTransaction(uint txHash, uint value, address destinationAddress) external;
    function freezeBurn(uint value, string calldata syscoinAddress) external payable returns (bool);
}

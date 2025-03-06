// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// Interface contract to be implemented by SyscoinVaultManager
interface SyscoinTransactionProcessorI {
    function processTransaction(uint txHash, uint value, address destinationAddress, uint64 assetGuid) external;
    function freezeBurn(uint value, address assetAddr, uint256 tokenId, string calldata syscoinAddress) external payable returns (bool);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

// Interface contract to be implemented by SyscoinERC20Manager
interface SyscoinTransactionProcessorI {
    function processTransaction(uint txHash, uint value, address destinationAddress, uint32 assetGUID) external;
    function freezeBurnERC20(uint value, uint32 assetGUID, string calldata syscoinAddress) external payable returns (bool);
    function processAsset(uint txHash, uint32 assetGUID, uint64 height, address erc20ContractAddress, uint8 _precision) external;
}
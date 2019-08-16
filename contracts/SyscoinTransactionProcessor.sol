pragma solidity ^0.5.10;

// Interface contract to be implemented by SyscoinERC20Manager
interface SyscoinTransactionProcessor {
    function processTransaction(uint txHash, uint value, address destinationAddress, address superblockSubmitterAddress, address erc20ContractAddress, uint32 assetGUID) external returns (uint);
    function freezeBurnERC20(uint value, uint32 assetGUID, bytes calldata syscoinAddress, address erc20ContractAddress) external returns (bool);
}

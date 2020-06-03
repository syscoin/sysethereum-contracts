pragma solidity ^0.5.13;

// Interface contract to be implemented by SyscoinERC20Manager
interface SyscoinTransactionProcessor {
    function processTransaction(uint txHash, uint value, address destinationAddress, address superblockSubmitterAddress, uint32 assetGUID) external;
    function freezeBurnERC20(uint value, uint32 assetGUID, bytes calldata syscoinAddress) external returns (bool);
    function cancelTransferRequest(uint32 bridgeTransferId) external;
    function cancelTransferSuccess(uint32 bridgeTransferId, address challengerAddress) external;
    function processCancelTransferFail(uint32 bridgeTransferId, address payable challengerAddress) external;
    function processAsset(uint txHash, uint32 assetGUID, uint32 height, address erc20ContractAddress, uint8 _precision) external;
}

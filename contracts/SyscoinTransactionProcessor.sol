pragma solidity >=0.5.0 <0.6.0;

// Interface contract to be implemented by SyscoinToken
interface SyscoinTransactionProcessor {
    function processTransaction(uint txHash, uint value, address destinationAddress, uint32 _assetGUID, address superblockSubmitterAddress) external returns (uint);
    function burn(uint _value, uint32 _assetGUID, bytes calldata syscoinWitnessProgram) payable external returns (bool success);
}

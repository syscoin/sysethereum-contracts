pragma solidity ^0.4.26;

// Interface contract to be implemented by SyscoinToken
contract SyscoinTransactionProcessor {
    function processTransaction(uint txHash, uint value, address destinationAddress, uint32 _assetGUID, address superblockSubmitterAddress) public returns (uint);
    function burn(uint _value, uint32 _assetGUID, bytes syscoinWitnessProgram) payable public returns (bool success);
}

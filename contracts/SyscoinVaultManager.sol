// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/SyscoinTransactionProcessorI.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SyscoinVaultManager is SyscoinTransactionProcessorI, ReentrancyGuard {


    // Contract to trust for tx included in a syscoin block verification.
    // Only syscoin txs relayed from trustedRelayerContract will be accepted.
    address public trustedRelayerContract;
    // Syscoin transactions that were already processed by processTransaction()
    mapping(uint => bool) private syscoinTxHashesAlreadyProcessed;

    event TokenUnfreeze(address receipient, uint value);
    event TokenFreeze(address freezer, uint value);
    function contains(uint value) private view returns (bool) {
        return syscoinTxHashesAlreadyProcessed[value];
    }

    function insert(uint value) private returns (bool) {
        if (contains(value))
            return false; // already there
        syscoinTxHashesAlreadyProcessed[value] = true;
        return true;
    }
    
    constructor (address _trustedRelayerContract) {
        trustedRelayerContract = _trustedRelayerContract;
    }

    modifier onlyTrustedRelayer() {
        require(msg.sender == trustedRelayerContract, "Call must be from trusted relayer");
        _;
    }

    function wasSyscoinTxProcessed(uint txHash) public view returns (bool) {
        return contains(txHash);
    }

    function processTransaction(
        uint txHash,
        uint value,
        address destinationAddress
    ) external override onlyTrustedRelayer nonReentrant {
        value *= uint(10)**(uint(10));
        
        require(value > 0, "Value must be positive");
        // Add tx to the syscoinTxHashesAlreadyProcessed and Check tx was not already processed
        require(insert(txHash), "TX already processed");
        withdrawSYS(value, payable(destinationAddress));
        emit TokenUnfreeze(destinationAddress, value);
    }

    function freezeBurn(
        uint value,
        string memory syscoinAddress
    ) external payable override returns (bool)
    {
        require(bytes(syscoinAddress).length > 0, "syscoinAddress cannot be zero");
        require(value > 0, "Value must be positive");
        require(value == msg.value, "msg.value must be the same as value");
        emit TokenFreeze(msg.sender, value);
        return true;
    }

    function withdrawSYS(uint value, address payable destinationAddress) private {
        require(address(this).balance >= value && value > 0, "Insufficient balance or invalid value");
        (bool success, ) = destinationAddress.call{value: value}("");
        require(success, "Withdraw failed");
    }
}

pragma solidity ^0.4.19;

import "./HumanStandardToken.sol";
import "./Set.sol";
import "../SyscoinTransactionProcessor.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract SyscoinToken is HumanStandardToken(0, "SyscoinToken", 8, "SYSX"), SyscoinTransactionProcessor {

    using SafeMath for uint;

    // Lock constants
    uint public constant MIN_LOCK_VALUE = 300000000; // 3 syscoins
    uint public constant SUPERBLOCK_SUBMITTER_LOCK_FEE = 1; // 1 = 0.1%

    // Unlock constants
    uint public constant MIN_UNLOCK_VALUE = 300000000; // 3 syscoins

    // Variables set by constructor

    // Contract to trust for tx included in a syscoin block verification.
    // Only syscoin txs relayed from trustedRelayerContract will be accepted.
    address public trustedRelayerContract;

    // publically exposed asset param if this is a syscoin asset token
    uint32 public assetGUID;


    // Syscoin transactions that were already processed by processTransaction()
    Set.Data syscoinTxHashesAlreadyProcessed;

    event NewToken(address indexed user, uint value);

    constructor (address _trustedRelayerContract, uint32 _assetGUID, string _tokenName, uint8 _decimalUnits, string _tokenSymbol) public {
        trustedRelayerContract = _trustedRelayerContract;
        assetGUID = _assetGUID;
        name = _tokenName;
        decimals = _decimalUnits;
        symbol = _tokenSymbol;
    }

    function wasSyscoinTxProcessed(uint txHash) public view returns (bool) {
        return Set.contains(syscoinTxHashesAlreadyProcessed, txHash);
    }

    function processTransaction(uint txHash, uint value, address destinationAddress, uint32 _assetGUID, address superblockSubmitterAddress)
        public returns (uint) {
            
        require(msg.sender == trustedRelayerContract);
        require (assetGUID > 0);
        require (assetGUID == _assetGUID);
            
            
        // Add tx to the syscoinTxHashesAlreadyProcessed
        bool inserted = Set.insert(syscoinTxHashesAlreadyProcessed, txHash);
        // Check tx was not already processed
        require (inserted);


        require (value >= MIN_LOCK_VALUE);

        processLockTransaction(destinationAddress, value, superblockSubmitterAddress);
        return value;
     
    }

    function processLockTransaction(address destinationAddress, uint value, address superblockSubmitterAddress) private {

        uint superblockSubmitterFee = value.mul(SUPERBLOCK_SUBMITTER_LOCK_FEE) / 1000;
        balances[superblockSubmitterAddress] = balances[superblockSubmitterAddress].add(superblockSubmitterFee);
        emit NewToken(superblockSubmitterAddress, superblockSubmitterFee);
        // Hack to make etherscan show the event
        emit Transfer(0, superblockSubmitterAddress, superblockSubmitterFee);

        uint userValue = value.sub(superblockSubmitterFee);
        balances[destinationAddress] = balances[destinationAddress].add(userValue);
        emit NewToken(destinationAddress, userValue);
        // Hack to make etherscan show the event
        emit Transfer(0, destinationAddress, userValue);   
        totalSupply += value;  
    }
    // keyhash or scripthash for syscoinWitnessProgram
    function burn(uint _value, uint32 _assetGUID, bytes) payable public returns (bool success) {
        require (assetGUID > 0);
        require (assetGUID == _assetGUID);
        require (_value >= MIN_UNLOCK_VALUE);
        require (balances[msg.sender] >= _value);  
        balances[msg.sender] -= _value;            // Subtract from the sender
        totalSupply -= _value;                      // Updates totalSupply
        // Hack to make etherscan show the event
        emit Transfer(msg.sender, 0, _value);   
        return true;
    }
}

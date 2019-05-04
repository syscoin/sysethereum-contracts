pragma solidity ^0.4.8;

import "./HumanStandardToken.sol";
import "./Set.sol";
import "./../SyscoinTransactionProcessor.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract SyscoinToken is HumanStandardToken(0, "SyscoinToken", 8, "SYSX"), SyscoinTransactionProcessor {

    using SafeMath for uint;

    // Lock constants
    uint public constant MIN_LOCK_VALUE = 300000000; // 3 syscoins
    uint public constant SUPERBLOCK_SUBMITTER_LOCK_FEE = 1; // 1 = 0.1%

    // Unlock constants
    uint public constant MIN_UNLOCK_VALUE = 300000000; // 3 syscoins

    // Error codes
    uint constant ERR_PROCESS_TX_ALREADY_PROCESSED = 60070;
    uint constant ERR_UNLOCK_MIN_UNLOCK_VALUE = 60080;
    uint constant ERR_UNLOCK_USER_BALANCE = 60090;
    uint constant ERR_UNLOCK_ASSET_MISMATCH = 60100;
    uint constant ERR_UNLOCK_CONTRACT_MISMATCH = 60110;
    uint constant ERR_UNLOCK_INVALID_TYPE = 60120;

   
    uint constant ERR_UNLOCK_VALUE_TO_SEND_LESS_THAN_FEE = 60140;
    uint constant ERR_UNLOCK_BAD_ADDR_LENGTH = 60150;
    uint constant ERR_UNLOCK_BAD_ADDR_PREFIX = 60160;
    uint constant ERR_UNLOCK_BAD_ADDR_CHAR = 60170;
    uint constant ERR_LOCK_MIN_LOCK_VALUE = 60180;

    // Variables set by constructor

    // Contract to trust for tx included in a syscoin block verification.
    // Only syscoin txs relayed from trustedRelayerContract will be accepted.
    address public trustedRelayerContract;

    // publically exposed asset param if this is a syscoin asset token
    uint32 public assetGUID;


    // Syscoin transactions that were already processed by processTransaction()
    Set.Data syscoinTxHashesAlreadyProcessed;

    event ErrorSyscoinToken(uint err);
    event NewToken(address indexed user, uint value);
    /* This notifies clients about the amount burnt */
    event Burn(address indexed from, uint value, uint32 assetGUID, bytes syscoinWitnessProgram);


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
        if (assetGUID != _assetGUID){
            emit ErrorSyscoinToken(ERR_UNLOCK_ASSET_MISMATCH);
            return;         
        }       
            
        // Add tx to the syscoinTxHashesAlreadyProcessed
        bool inserted = Set.insert(syscoinTxHashesAlreadyProcessed, txHash);
        // Check tx was not already processed
        if (!inserted) {
            emit ErrorSyscoinToken(ERR_PROCESS_TX_ALREADY_PROCESSED);
            return;        
        }


        if (value < MIN_LOCK_VALUE) {
              emit ErrorSyscoinToken(ERR_LOCK_MIN_LOCK_VALUE);
              return;
        }

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
    function burn(uint _value, uint32 _assetGUID, bytes syscoinWitnessProgram) payable public returns (bool success) {
        if (assetGUID != _assetGUID){
            emit ErrorSyscoinToken(ERR_UNLOCK_ASSET_MISMATCH);
            return;         
        }
        if (_value < MIN_UNLOCK_VALUE) {
            emit ErrorSyscoinToken(ERR_UNLOCK_MIN_UNLOCK_VALUE);
            return;
        }
        if (balances[msg.sender] < _value) {
            emit ErrorSyscoinToken(ERR_UNLOCK_USER_BALANCE);
            return;
        }     
        balances[msg.sender] -= _value;            // Subtract from the sender
        totalSupply -= _value;                      // Updates totalSupply
        // Hack to make etherscan show the event
        emit Transfer(msg.sender, 0, userValue);   
        return true;
    }
}

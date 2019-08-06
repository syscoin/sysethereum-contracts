pragma solidity ^0.5.10;

import "./Set.sol";
import "../SyscoinTransactionProcessor.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract SyscoinERC20Manager is SyscoinTransactionProcessor {

    using SafeMath for uint;
    using Set for Set.Data;

    // Lock constants
    uint public constant MIN_LOCK_VALUE = 10; // 0.1 token
    uint public constant SUPERBLOCK_SUBMITTER_LOCK_FEE = 1; // 1 = 0.1%

    // Variables set by constructor

    // Contract to trust for tx included in a syscoin block verification.
    // Only syscoin txs relayed from trustedRelayerContract will be accepted.
    address public trustedRelayerContract;

    // Syscoin transactions that were already processed by processTransaction()
    Set.Data syscoinTxHashesAlreadyProcessed;

    event TokenUnfreeze(address receipient, uint value);
    event TokenFreeze(address freezer, uint value);

    constructor (address _trustedRelayerContract) public {
        trustedRelayerContract = _trustedRelayerContract;
    }

    modifier onlyTrustedRelayer() {
        require(msg.sender == trustedRelayerContract, "Call must be from trusted relayer");
        _;
    }

    modifier minimumValue(address erc20ContractAddress, uint value) {
        require(
            value >= (10 ** IERC20(erc20ContractAddress).decimals()).div(MIN_LOCK_VALUE),
            "Value must be bigger or equal MIN_LOCK_VALUE"
        );
        _;
    }

    function wasSyscoinTxProcessed(uint txHash) public view returns (bool) {
        return syscoinTxHashesAlreadyProcessed.contains(txHash);
    }

    function processTransaction(
        uint txHash,
        uint value,
        address destinationAddress,
        address superblockSubmitterAddress,
        address erc20ContractAddress
    ) public onlyTrustedRelayer minimumValue(erc20ContractAddress, value) returns (uint) {
        IERC20 erc20 = IERC20(erc20ContractAddress);

        // Add tx to the syscoinTxHashesAlreadyProcessed and Check tx was not already processed
        require(syscoinTxHashesAlreadyProcessed.insert(txHash), "TX already processed");

        // make sure we have enough balance for transfer
        if (erc20.balanceOf(address(this)) < value) {
            // if not, try to mint token
            erc20.mint(
                address(this),
                erc20.balanceOf(address(this)).sub(value)
            );
        }

        uint superblockSubmitterFee = value.mul(SUPERBLOCK_SUBMITTER_LOCK_FEE).div(1000);
        uint userValue = value.sub(superblockSubmitterFee);

        // pay the fee
        erc20.transfer(superblockSubmitterAddress, superblockSubmitterFee);
        emit TokenUnfreeze(superblockSubmitterAddress, superblockSubmitterFee);

        // get your token
        erc20.transfer(destinationAddress, userValue);
        emit TokenUnfreeze(destinationAddress, userValue);

        return value;
    }

    // keyhash or scripthash for syscoinWitnessProgram
    function freezeBurnERC20(uint value, address erc20ContractAddress)
        public
        minimumValue(erc20ContractAddress, value)
        returns (bool)
    {
        IERC20 erc20 = IERC20(erc20ContractAddress);

        // is this a Syscoin asset?
        if (erc20.isMinter(address(this))) {
            erc20.burnFrom(msg.sender, value);
        } else { // no, it's original ERC20
            erc20.transferFrom(msg.sender, address(this), value);
        }
        emit TokenFreeze(msg.sender, value);

        return true;
    }
}

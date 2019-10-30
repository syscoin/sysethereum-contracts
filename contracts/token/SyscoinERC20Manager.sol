pragma solidity ^0.5.12;

import "../SyscoinTransactionProcessor.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../interfaces/SyscoinERC20I.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

contract SyscoinERC20Manager is Initializable {

    using SafeMath for uint256;
    using SafeMath for uint8;

    // Lock constants
    uint public constant MIN_LOCK_VALUE = 10; // 0.1 token
    uint public constant SUPERBLOCK_SUBMITTER_LOCK_FEE = 10000; // 10000 = 0.01%

    // Variables set by constructor

    // Contract to trust for tx included in a syscoin block verification.
    // Only syscoin txs relayed from trustedRelayerContract will be accepted.
    address public trustedRelayerContract;


    mapping(uint32 => uint256) public assetBalances;
    // Syscoin transactions that were already processed by processTransaction()
    mapping(uint => bool) private syscoinTxHashesAlreadyProcessed;


    event TokenUnfreeze(address receipient, uint value);
    event TokenUnfreezeFee(address receipient, uint value);
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
    
    function init(address _trustedRelayerContract) public initializer {
        trustedRelayerContract = _trustedRelayerContract;
    }

    modifier onlyTrustedRelayer() {
        require(msg.sender == trustedRelayerContract, "Call must be from trusted relayer");
        _;
    }

    modifier minimumValue(address erc20ContractAddress, uint value) {
        uint256 decimals = SyscoinERC20I(erc20ContractAddress).decimals();
        require(
            value >= (uint256(10) ** decimals).div(MIN_LOCK_VALUE),
            "Value must be bigger or equal MIN_LOCK_VALUE"
        );
        _;
    }

    function requireMinimumValue(uint8 decimalsIn, uint value) private pure {
        uint256 decimals = uint256(decimalsIn);
        require(
            value >= (uint256(10) ** decimals).div(MIN_LOCK_VALUE),
            "Value must be bigger or equal MIN_LOCK_VALUE"
        );
    }

    function wasSyscoinTxProcessed(uint txHash) public view returns (bool) {
        return contains(txHash);
    }

    function processTransaction(
        uint txHash,
        uint value,
        address destinationAddress,
        address superblockSubmitterAddress,
        address erc20ContractAddress,
        uint32 assetGUID,
        uint8 precision
    ) public onlyTrustedRelayer {
        SyscoinERC20I erc20 = SyscoinERC20I(erc20ContractAddress);
        uint8 nLocalPrecision = erc20.decimals();
        // see issue #372 on syscoin
        if(nLocalPrecision > precision){
            value *= uint(10)**(uint(nLocalPrecision - precision));
        }else if(nLocalPrecision < precision){
            value /= uint(10)**(uint(precision - nLocalPrecision));
        }
        requireMinimumValue(nLocalPrecision, value);
        // Add tx to the syscoinTxHashesAlreadyProcessed and Check tx was not already processed
        require(insert(txHash), "TX already processed");


        assetBalances[assetGUID] = assetBalances[assetGUID].sub(value);

        uint superblockSubmitterFee = value.div(SUPERBLOCK_SUBMITTER_LOCK_FEE);
        uint userValue = value.sub(superblockSubmitterFee);

        // pay the fee
        erc20.transfer(superblockSubmitterAddress, superblockSubmitterFee);
        emit TokenUnfreezeFee(superblockSubmitterAddress, superblockSubmitterFee);

        // get your token
        erc20.transfer(destinationAddress, userValue);
        emit TokenUnfreeze(destinationAddress, userValue);
    }

    // keyhash or scripthash for syscoinWitnessProgram
    function freezeBurnERC20(
        uint value,
        uint32 assetGUID,
        address erc20ContractAddress,
        uint8 precision,
        bytes memory syscoinAddress
    )
        public
        minimumValue(erc20ContractAddress, value)
        returns (bool)
    {
        require(syscoinAddress.length > 0, "syscoinAddress cannot be zero");
        require(assetGUID > 0, "Asset GUID must not be 0");
        

        SyscoinERC20I erc20 = SyscoinERC20I(erc20ContractAddress);
        require(precision == erc20.decimals(), "Decimals were not provided with the correct value");
        erc20.transferFrom(msg.sender, address(this), value);
        assetBalances[assetGUID] = assetBalances[assetGUID].add(value);
        emit TokenFreeze(msg.sender, value);

        return true;
    }
}

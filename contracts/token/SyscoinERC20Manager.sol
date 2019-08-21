pragma solidity ^0.5.10;

import "./Set.sol";
import "../SyscoinTransactionProcessor.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../interfaces/SyscoinERC20AssetI.sol";

contract SyscoinERC20Manager {

    using SafeMath for uint256;
    using SafeMath for uint8;
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

    mapping(uint32 => uint256) public assetBalances;

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
        uint256 decimals = SyscoinERC20AssetI(erc20ContractAddress).decimals();
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
        return syscoinTxHashesAlreadyProcessed.contains(txHash);
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
        SyscoinERC20AssetI erc20 = SyscoinERC20AssetI(erc20ContractAddress);
        uint8 nLocalPrecision = erc20.decimals();
        // see issue #372 on syscoin
        if(nLocalPrecision > precision){
            value *= uint(10)**(uint(nLocalPrecision - precision));
        }else if(nLocalPrecision < precision){
            value /= uint(10)**(uint(precision - nLocalPrecision));
        }
        requireMinimumValue(nLocalPrecision, value);
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

        assetBalances[assetGUID] = assetBalances[assetGUID].sub(value);

        uint superblockSubmitterFee = value.mul(SUPERBLOCK_SUBMITTER_LOCK_FEE).div(10000);
        uint userValue = value.sub(superblockSubmitterFee);

        // pay the fee
        erc20.transfer(superblockSubmitterAddress, superblockSubmitterFee);
        emit TokenUnfreeze(superblockSubmitterAddress, superblockSubmitterFee);

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
        
        assetBalances[assetGUID] = assetBalances[assetGUID].add(value);

        SyscoinERC20AssetI erc20 = SyscoinERC20AssetI(erc20ContractAddress);
        require(precision == erc20.decimals(), "Decimals were not provided with the correct value");
        // is this a Syscoin asset and we are allowed to mint?
        if (isMinterOf(erc20ContractAddress)) {
            erc20.burnFrom(msg.sender, value);
        } else { // no, it's original ERC20
            erc20.transferFrom(msg.sender, address(this), value);
        }
        emit TokenFreeze(msg.sender, value);

        return true;
    }

    function isMinterOf(address erc20ContractAddress) internal returns (bool) {
        // call isMinter(address) and get result
        bytes4 sig = bytes4(keccak256("isMinter(address)"));
        address me = address(this);
        bool isMinterInterfaceSupport;
        bool isMinter;
        assembly {
            let x := mload(0x40)    //Find empty storage location using "free memory pointer"
            mstore(x,sig)           //Place signature at begining of empty storage 
            mstore(add(x,0x04),me)  //Place first argument directly next to signature
            isMinterInterfaceSupport := call(
                5000,                   //5k gas
                erc20ContractAddress,   //To addr
                0,                      //No value
                x,                      //Inputs are stored at location x
                0x24,                   //Inputs are 36 bytes long
                x,                      //Store output over input (saves space)
                0x20)                   //Outputs are 32 bytes long
            isMinter := mload(x)
        }
        return isMinterInterfaceSupport && isMinter;
    }
}

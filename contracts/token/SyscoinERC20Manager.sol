// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/SyscoinTransactionProcessorI.sol";

contract SyscoinERC20Manager is SyscoinTransactionProcessorI {

    using SafeERC20 for IERC20Metadata;

    // Contract to trust for tx included in a syscoin block verification.
    // Only syscoin txs relayed from trustedRelayerContract will be accepted.
    address public trustedRelayerContract;
    mapping(uint32 => uint256) public assetBalances;
    uint32 immutable SYSAssetGuid;
    // network that the stored blocks belong to
    bool private immutable testNetwork;
    // Syscoin transactions that were already processed by processTransaction()
    mapping(uint => bool) private syscoinTxHashesAlreadyProcessed;

    event TokenUnfreeze(uint32 assetGuid, address receipient, uint value);
    event TokenFreeze(uint32 assetGuid, address freezer, uint value, uint precisions);
    struct AssetRegistryItem {
        address erc20ContractAddress;
        uint64 height;
        uint8 precision;   
    }
    mapping(uint32 => AssetRegistryItem) public assetRegistry;
    event TokenRegistry(uint32 assetGuid, address erc20ContractAddress);
    function contains(uint value) private view returns (bool) {
        return syscoinTxHashesAlreadyProcessed[value];
    }

    function insert(uint value) private returns (bool) {
        if (contains(value))
            return false; // already there
        syscoinTxHashesAlreadyProcessed[value] = true;
        return true;
    }
    
    constructor (address _trustedRelayerContract, uint32 _sysxGuid, address _erc20ContractAddress) {
        trustedRelayerContract = _trustedRelayerContract;
        SYSAssetGuid = _sysxGuid;
        testNetwork = _erc20ContractAddress != address(0);
        assetRegistry[_sysxGuid] = AssetRegistryItem({erc20ContractAddress:_trustedRelayerContract, height:1, precision: 8});
        // override erc20ContractAddress field if running tests, because erc20 is passed in some tests to the constructor for SYSX
        // but in deployment _erc20ContractAddress is empty so in that case we need it to be set to a non-empty field we just use _trustedRelayerContract (could be anything thats not empty)
        if (_erc20ContractAddress != address(0)) {
            assetRegistry[_sysxGuid].erc20ContractAddress = _erc20ContractAddress;
        }
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
        address destinationAddress,
        uint32 assetGuid
    ) public override onlyTrustedRelayer {
        // lookup asset from registry
        AssetRegistryItem storage assetRegistryItem = assetRegistry[assetGuid];
        // ensure state is Ok
        require(assetRegistryItem.erc20ContractAddress != address(0),
            "#SyscoinERC20Manager processTransaction(): Asset not found in registry");
        IERC20Metadata erc20;
        uint8 nLocalPrecision;
        if (assetGuid == SYSAssetGuid && !testNetwork) {
            nLocalPrecision = 18;
        } else {
            erc20 = IERC20Metadata(assetRegistryItem.erc20ContractAddress);
            nLocalPrecision = erc20.decimals();
        } 
        // see issue #372 on syscoin
        if(nLocalPrecision > assetRegistryItem.precision){
            value *= uint(10)**(uint(nLocalPrecision - assetRegistryItem.precision));
        } else if(nLocalPrecision < assetRegistryItem.precision){
            value /= uint(10)**(uint(assetRegistryItem.precision - nLocalPrecision));
        }
        require(value > 0, "Value must be positive");
        // Add tx to the syscoinTxHashesAlreadyProcessed and Check tx was not already processed
        require(insert(txHash), "TX already processed");
        if (assetGuid == SYSAssetGuid && !testNetwork) {
            withdrawSYS(value, payable(destinationAddress));
        } else {
            withdrawAsset(erc20, assetGuid, value, destinationAddress);
        }
        emit TokenUnfreeze(assetGuid, destinationAddress, value);
    }

    function processAsset(
        uint _txHash,
        uint32 _assetGuid,
        uint64 _height,
        address _erc20ContractAddress,
        uint8 _precision
    ) public override onlyTrustedRelayer {
        // ensure height increases over asset updates
        require(assetRegistry[_assetGuid].height < _height, "Height must increase when updating asset registry");
        // Add tx to the syscoinTxHashesAlreadyProcessed and Check tx was not already processed
        require(insert(_txHash), "TX already processed");
        assetRegistry[_assetGuid] = AssetRegistryItem({erc20ContractAddress:_erc20ContractAddress, height:_height, precision: _precision});
        emit TokenRegistry(_assetGuid, _erc20ContractAddress);
    }

    function freezeBurnERC20(
        uint value,
        uint32 assetGuid,
        string memory syscoinAddress
    ) public payable override returns (bool)
    {
        require(bytes(syscoinAddress).length > 0, "syscoinAddress cannot be zero");
        require(assetGuid > 0, "Asset Guid must not be 0");
        // lookup asset from registry
        AssetRegistryItem storage assetRegistryItem = assetRegistry[assetGuid];
        // ensure state is Ok
        require(assetRegistryItem.erc20ContractAddress != address(0),
            "#SyscoinERC20Manager freezeBurnERC20(): Asset not found in registry");
        require(value > 0, "Value must be positive");
        uint8 nLocalPrecision;
        if (assetGuid == SYSAssetGuid && !testNetwork) {
            nLocalPrecision = 18;
            require(value == msg.value, "msg.value must be the same as value");
        } else {
            IERC20Metadata erc20 = IERC20Metadata(assetRegistryItem.erc20ContractAddress);
            nLocalPrecision = erc20.decimals();
            depositAsset(erc20, assetGuid, value);
        }
        uint precisions = nLocalPrecision + uint(assetRegistryItem.precision)*(2**32);
        emit TokenFreeze(assetGuid, msg.sender, value, precisions);
        return true;
    }
    function withdrawAsset(IERC20Metadata erc20, uint32 assetGuid, uint value, address destinationAddress) private {
        require(assetBalances[assetGuid] >= value && value > 0, "Value must be positive and contract has to have sufficient balance of this asset");
        unchecked {
            assetBalances[assetGuid] -= value;
        }
        SafeERC20.safeTransfer(erc20, destinationAddress, value);
    }
    function withdrawSYS(uint value, address payable destinationAddress) private {
        require(address(this).balance >= value && value > 0, "Value must be positive and contract has to have sufficient balance of SYS");
        // stop using .transfer() because of gas issue after ethereum upgrade
        (bool success, ) = destinationAddress.call{value: value}("");
        require(success, "Could not execute msg.sender.call.value");
    }
    function depositAsset(IERC20Metadata erc20, uint32 assetGuid, uint value) private {
        SafeERC20.safeTransferFrom(erc20, msg.sender, address(this), value);
        assetBalances[assetGuid] += value;
    }
}

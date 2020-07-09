pragma solidity ^0.5.13;

import "./SyscoinERC20Manager.sol";

// DONOT USE IN PRODUCTION
contract SyscoinERC20ManagerForTests is SyscoinERC20Manager {
    using SafeERC20 for SyscoinERC20I;
    uint private constant MIN_LOCK_VALUE = 10; // 0.1 token
    function requireMinimumValue(uint8 decimalsIn, uint value) private pure {
        uint256 decimals = uint256(decimalsIn);
        require(value > 0, "Value must be positive");
        require(
            value >= (uint256(10) ** decimals).div(MIN_LOCK_VALUE),
            "Value must be bigger or equal MIN_LOCK_VALUE"
        );
        
    }
    // keyhash or scripthash for syscoinWitnessProgram
    function freezeBurnERC20(
        uint value,
        uint32 assetGUID,
        string memory
    ) public returns (bool)
    {
        // commented out on purpose
        // require(syscoinAddress.length > 0, "syscoinAddress cannot be zero");

        // commented out on purpose
        // require(assetGUID > 0, "Asset GUID must not be 0");
        // lookup asset from registry
        AssetRegistryItem storage assetRegistryItem = assetRegistry[assetGUID];
        // ensure state is Ok
        require(assetRegistryItem.erc20ContractAddress != address(0),
            "#SyscoinERC20ManagerForTests processTransaction(): Asset not found in registry");
        
        SyscoinERC20I erc20 = SyscoinERC20I(assetRegistryItem.erc20ContractAddress);
        uint8 nLocalPrecision = erc20.decimals();
        requireMinimumValue(nLocalPrecision, value);
        erc20.safeTransferFrom(msg.sender, address(this), value);
        assetBalances[assetGUID] = assetBalances[assetGUID].add(value);
        bridgeTransferIdCount++;
        uint transferIdAndPrecisions = bridgeTransferIdCount + uint(nLocalPrecision)*(2**32) + uint(assetRegistryItem.precision)*(2**40);
        emit TokenFreeze(msg.sender, value, transferIdAndPrecisions);

        return true;
    }
}

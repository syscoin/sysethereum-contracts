pragma solidity ^0.5.13;

import "./SyscoinERC20Manager.sol";

// DONOT USE IN PRODUCTION
contract SyscoinERC20ManagerForTests is SyscoinERC20Manager {
    // keyhash or scripthash for syscoinWitnessProgram
    function freezeBurnERC20(
        uint value,
        uint32 assetGUID,
        bytes memory
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
        // see issue #372 on syscoin
        if(assetRegistryItem.precision > nLocalPrecision){
            value *= uint(10)**(uint(assetRegistryItem.precision - nLocalPrecision));
        }else if(assetRegistryItem.precision < nLocalPrecision){
            value /= uint(10)**(uint(nLocalPrecision - assetRegistryItem.precision ));
        }
        // truncate to uint64
        uint64 amount = uint64(value);
        uint amountTruncated = uint(amount)    
        assetBalances[assetGUID] = assetBalances[assetGUID].add(amountTruncated);

        SyscoinERC20I erc20 = SyscoinERC20I(erc20ContractAddress);
        requireMinimumValue(nLocalPrecision, amountTruncated);
        erc20.safeTransferFrom(msg.sender, address(this), amountTruncated);
        emit TokenFreeze(msg.sender, amountTruncated, 0);

        return true;
    }
}

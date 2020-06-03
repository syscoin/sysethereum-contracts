pragma solidity ^0.5.13;

import "./SyscoinERC20Manager.sol";

// DONOT USE IN PRODUCTION
contract SyscoinERC20ManagerForTests is SyscoinERC20Manager {
    using SafeERC20 for SyscoinERC20I;
    // keyhash or scripthash for syscoinWitnessProgram
    function freezeBurnERC20(
        uint value,
        uint32 assetGUID,
        address erc20ContractAddress,
        uint8 precision,
        bytes memory
    )
        public
        minimumValue(erc20ContractAddress, value)
        returns (bool)
    {
        // commented out on purpose
        // require(syscoinAddress.length > 0, "syscoinAddress cannot be zero");

        // commented out on purpose
        // require(assetGUID > 0, "Asset GUID must not be 0");
        
        assetBalances[assetGUID] = assetBalances[assetGUID].add(value);

        SyscoinERC20I erc20 = SyscoinERC20I(erc20ContractAddress);
        require(precision == erc20.decimals(), "Decimals were not provided with the correct value");
        erc20.safeTransferFrom(msg.sender, address(this), value);
        emit TokenFreeze(msg.sender, value, 0);

        return true;
    }
}

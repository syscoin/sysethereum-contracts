pragma solidity ^0.5.10;

import "./SyscoinERC20Manager.sol";

// DONOT USE IN PRODUCTION
contract SyscoinERC20ManagerForTests is SyscoinERC20Manager {
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
}

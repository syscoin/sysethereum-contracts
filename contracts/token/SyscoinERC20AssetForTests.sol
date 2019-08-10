pragma solidity ^0.5.10;

import "./SyscoinERC20Asset.sol";

contract SyscoinERC20AssetForTests is SyscoinERC20Asset {
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address syscoinERC20Manager
    ) SyscoinERC20Asset(name, symbol, decimals, syscoinERC20Manager) public {}

    function assign(address _to, uint256 _value) public {
        _mint(_to, _value);
    }
}

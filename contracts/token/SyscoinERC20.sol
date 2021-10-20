// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
// note that this class is only used for testing and not meant to be deployed to a mainnet
// see test/testRelayToSyscoinAssetToken.js and test/testSyscoinERC20Manager.js
contract SyscoinERC20 is ERC20 {
    uint8 immutable private _decimals;
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    function assign(address _to, uint256 _value) public {
        _mint(_to, _value);
    }
}

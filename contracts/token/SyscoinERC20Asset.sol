pragma solidity ^0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract SyscoinERC20Asset is ERC20, ERC20Detailed, ERC20Burnable, ERC20Mintable {
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address syscoinERC20Manager
    ) ERC20Detailed(name, symbol, decimals) public {
        // add syscoinERC20Manager contract as minter
        addMinter(syscoinERC20Manager);
        // remove yourself from minter role to create trustless token
        renounceMinter();
    }
}

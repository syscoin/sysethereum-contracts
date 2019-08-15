pragma solidity ^0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract LegacyERC20ForTests is ERC20, ERC20Detailed {
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) ERC20Detailed(name, symbol, decimals) public {}

    function assign(address _to, uint256 _value) public {
        _mint(_to, _value);
    }
}

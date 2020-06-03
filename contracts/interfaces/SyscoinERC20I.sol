pragma solidity ^0.5.13;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract SyscoinERC20I is IERC20 {
    function decimals() external view returns (uint8);
    using SafeERC20 for IERC20;
}

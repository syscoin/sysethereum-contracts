pragma solidity ^0.5.11;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract SyscoinERC20AssetI is IERC20 {
    function decimals() external view returns (uint8);
    function burnFrom(address account, uint256 amount) external;
    function mint(address account, uint256 amount) external returns (bool);
    function isMinter(address account) external view returns (bool);
}

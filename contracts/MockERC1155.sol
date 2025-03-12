// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MockERC1155 is ERC1155 {
    constructor(string memory uri_) ERC1155(uri_) {}

    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external {
        _mint(to, id, amount, "");
    }
}

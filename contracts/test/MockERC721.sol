// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    uint256 private _tokenIdCounter;

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {}

    function mint(address to) external {
        _tokenIdCounter += 1;
        _mint(to, _tokenIdCounter);
    }

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}

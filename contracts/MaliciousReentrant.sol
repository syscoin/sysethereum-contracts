// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./SyscoinVaultManager.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

/**
 * @title MaliciousReentrant
 * @notice Tries to call `freezeBurn` in the vault again from onERC1155Received,
 * causing a re-entrancy attempt.
 */
contract MaliciousReentrant is IERC1155Receiver {
    SyscoinVaultManager public vault;
    address public erc1155Asset;
    bool public didAttack;

    constructor(address _vault, address _erc1155Asset) {
        vault = SyscoinVaultManager(_vault);
        erc1155Asset = _erc1155Asset;
        didAttack = false;
    }

    // We call this to deposit tokens from the Malicious contract to the vault
    // This will trigger onERC1155Received.
    function doAttack(uint tokenId, uint amount) external {
        // we first need to have the tokens in this contract
        // then we call safeTransferFrom => which triggers onERC1155Received
        IERC1155(erc1155Asset).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
    }

    // =============== IERC1155Receiver Implementation ================
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        // If this is the first time, attempt re-entrancy:
        if (!didAttack) {
            didAttack = true;
            // Attempt to re-enter the vault by calling freezeBurn
            // We pass 'value', 'erc1155Asset' etc.
            // The malicious logic => we want to see if it reverts due to nonReentrant
            try vault.freezeBurn(
                value,
                erc1155Asset,
                id,
                "sysMaliciousAddress"
            ) {
                // If it doesn't revert, re-entrancy was successful (which is BAD)
                // We'll store a flag or revert
                revert("Malicious attack succeeded, re-entrancy is possible!");
            } catch {
                // The expected path is that it reverts due to `nonReentrant`.
            }
        }
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == this.onERC1155Received.selector
            || interfaceId == this.onERC1155BatchReceived.selector;
    }
}

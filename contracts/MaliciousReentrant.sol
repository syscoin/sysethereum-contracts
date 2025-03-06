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
    bool public attackReverted; // to track if the vault call reverted

    constructor(address _vault, address _erc1155Asset) {
        vault = SyscoinVaultManager(_vault);
        erc1155Asset = _erc1155Asset;
        didAttack = false;
        attackReverted = false;
    }

    function doAttack(uint tokenId, uint amount) external {
        // to test re-entrancy, we will call safeTransferFrom => triggers onERC1155Received
        IERC1155(erc1155Asset).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
    }

    // =============== IERC1155Receiver Implementation ================
    function onERC1155Received(
        address /*operator*/,
        address /*from*/,
        uint256 id,
        uint256 value,
        bytes calldata /*data*/
    ) external override returns (bytes4) {
        // If this is the first time, attempt re-entrancy
        if (!didAttack) {
            didAttack = true;
            try vault.freezeBurn(
                value,
                erc1155Asset,
                id,
                "sysMaliciousAddress"
            ) {
                // If it didn't revert, that means re-entrancy was successful
                revert("Malicious attack succeeded, re-entrancy is possible!");
            } catch {
                // expected revert due to nonReentrant
                attackReverted = true;
            }
        }
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address /*operator*/,
        address /*from*/,
        uint256[] calldata /*ids*/,
        uint256[] calldata /*values*/,
        bytes calldata /*data*/
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == this.onERC1155Received.selector 
            || interfaceId == this.onERC1155BatchReceived.selector;
    }
}

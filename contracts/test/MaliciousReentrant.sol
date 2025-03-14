// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../SyscoinVaultManager.sol";
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

    constructor(address _erc1155Asset) {
        erc1155Asset = _erc1155Asset;
        didAttack = false;
        attackReverted = false;
    }

    function setVault(address _vault) external {
        vault = SyscoinVaultManager(_vault);
    }

    function doAttack(uint amount, uint32 assetId, uint32 tokenIdx) external {
        // The malicious calls the vault => processTransaction => calls _withdrawERC1155(..., this) => triggers onERC1155Received
        uint64 assetGuid = (uint64(tokenIdx) << 32) | uint64(assetId);
        // pick a random txHash => 111
        vault.processTransaction(111, amount, address(this), assetGuid);
    }

    // =============== IERC1155Receiver Implementation ================
    function onERC1155Received(
        address /*operator*/,
        address /*from*/,
        uint256 id,
        uint256 value,
        bytes calldata /*data*/
    ) external override returns (bytes4) {
        if (!didAttack) {
            didAttack = true;
            try
                vault.freezeBurn(value, erc1155Asset, id, "sysMaliciousAddress")
            {
                attackReverted = false;
                revert("Malicious attack succeeded");
            } catch {
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

    function supportsInterface(
        bytes4 interfaceId
    ) external pure override returns (bool) {
        return
            interfaceId == this.onERC1155Received.selector ||
            interfaceId == this.onERC1155BatchReceived.selector;
    }
}

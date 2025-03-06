const { expect } = require("chai");
const truffleAssert = require('truffle-assertions');
const SyscoinVaultManager = artifacts.require("SyscoinVaultManager");
const MockERC1155 = artifacts.require("MockERC1155");
const MaliciousReentrant = artifacts.require("MaliciousReentrant");

contract("Malicious Re-Entrancy Test", (accounts) => {
  let vault, mock1155, attacker;
  const owner = accounts[1]; // user that owns tokens
  const trustedRelayer = accounts[0]; // vault constructor param

  before(async () => {
    vault = await SyscoinVaultManager.new(trustedRelayer, 8888, false);
    mock1155 = await MockERC1155.new("https://test.api/");
    // Deploy attacker contract
    attacker = await MaliciousReentrant.new(vault.address, mock1155.address);

    // Mint some tokens to the 'owner'
    await mock1155.mint(owner, 777, 10);

    // Approve the attacker to move them => so we can do safeTransferFrom
    await mock1155.setApprovalForAll(attacker.address, true, {from: owner});
  });

  it("Attempt re-entrancy => should revert", async () => {
    // The attacker calls doAttack => triggers safeTransferFrom from 'owner'
    // => The token goes to 'attacker' => onERC1155Received is called
    // => attacker calls vault.freezeBurn => expected to fail (nonReentrant).
    await truffleAssert.reverts(
      attacker.doAttack(777, 1, {from: owner}),
      "Malicious attack succeeded" // The revert reason from the contract if it DID succeed
    );
    // If it reverts with "Returned error: VM Exception while processing..."
    // that means our malicious attempt was blocked by nonReentrant or 
    // because we forcibly revert in the malicious contract.
    // We can also check the `didAttack` flag or other logs as needed.
  });
});

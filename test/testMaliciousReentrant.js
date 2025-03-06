const { expect } = require("chai");
const truffleAssert = require("truffle-assertions");

const SyscoinVaultManager = artifacts.require("SyscoinVaultManager");
const MockERC1155 = artifacts.require("MockERC1155");
const MaliciousReentrant = artifacts.require("MaliciousReentrant");

contract("Malicious Re-Entrancy Test", (accounts) => {
  let vault, mock1155, attacker;
  const owner = accounts[1]; // user that owns tokens
  const trustedRelayer = accounts[0]; // for the vault's constructor

  before(async () => {
    vault = await SyscoinVaultManager.new(
      trustedRelayer, 
      8888,    // SYSAssetGuid 
      false    // testNetwork
    );

    mock1155 = await MockERC1155.new("https://test.api/");
    attacker = await MaliciousReentrant.new(vault.address, mock1155.address);

    // Mint some ERC1155 tokens (id=777, amount=10) to the 'owner'
    await mock1155.mint(owner, 777, 10);

    // Owner must approve the 'attacker' contract to take them
    await mock1155.setApprovalForAll(attacker.address, true, { from: owner });
  });

  it("Attempt re-entrancy => should revert", async () => {
    // Initially, didAttack = false, attackReverted = false
    let didAttackInitial = await attacker.didAttack();
    let attackRevertedInitial = await attacker.attackReverted();
    expect(didAttackInitial).to.equal(false);
    expect(attackRevertedInitial).to.equal(false);

    // The attacker calls doAttack => triggers safeTransferFrom 
    // => onERC1155Received => calls vault.freezeBurn => revert
    await truffleAssert.reverts(
      attacker.doAttack(777, 1, { from: owner }),
      "Malicious attack succeeded" // If re-entrancy was possible, we'd get this revert reason
    );

    // Now check the flags
    let didAttackFinal = await attacker.didAttack();
    let attackRevertedFinal = await attacker.attackReverted();

    // We expect didAttackFinal == true => meaning the code path was triggered
    expect(didAttackFinal).to.equal(true, "didAttack should be true after doAttack attempt");

    // We expect attackRevertedFinal == true => meaning the vault's freezeBurn call failed
    expect(attackRevertedFinal).to.equal(true, "attackReverted should be true => revert from nonReentrant");
  });
});

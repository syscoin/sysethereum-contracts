const { expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const SyscoinVaultManager = artifacts.require("SyscoinVaultManager");
const MockERC1155 = artifacts.require("MockERC1155");
const MaliciousReentrant = artifacts.require("MaliciousReentrant");

/**
 * This test triggers a re-entrancy by making the vault call 
 * `_withdrawERC1155(..., malicious, ...)` in the same TX that 
 * malicious calls freezeBurn(...) again. 
 */
contract("Malicious Re-Entrancy Test", (accounts) => {
  let vault, mock1155, attacker;
  const owner = accounts[1]; 

  before(async () => {
    // Deploy an ERC1155
    mock1155 = await MockERC1155.new("https://test.api/");

    // Deploy malicious first
    attacker = await MaliciousReentrant.new(mock1155.address);

    // Now create the vault with `attacker.address` as the trusted relayer
    vault = await SyscoinVaultManager.new(attacker.address, 8888, owner);

    // Then set the vault address inside the malicious constructor or a separate init function
    await attacker.setVault(vault.address);

  });

  it("Attempt real re-entrancy => should revert", async () => {
    // 1) We want the vault to call `_withdrawERC1155(..., attacker, 1, ...)`
    // so we do a bridging scenario. Suppose we do a Sys->NEVM bridging logic 
    // that calls `_withdrawERC1155(assetAddr, realTokenId, value, malicious)`.
    // For simplicity, let's just call `_withdrawERC1155` from a function 
    // that the malicious triggers. We'll rely on your bridging 'processTransaction'
    // or a test function on the vault, etc.

    // We'll do a small patch: in MaliciousReentrant, we do:
    // attacker.doAttack => calls vault 'processTransaction' => vault sees 'destination=attacker'
    // => calls `_withdrawERC1155(..., to=attacker, amount=1) => triggers onERC1155Received

    // Step: the attacker triggers doAttack(1), so the vault sends 1 token to 'attacker'
    // => onERC1155Received => malicious calls freezeBurn => re-enter => revert
    // 
    // Ensure the vault recognizes mock1155 as ERC1155 
    // (auto-registration or manual). We'll do a quick auto-register by freezeBurn(0)?

    // In production, you'd do a real bridging, but let's do a direct 'processTransaction' call:
    // to simulate bridging 1 unit from Sys => NEVM with destination=attacker.
    // We must set up the registry for mock1155 => assetId => item.assetType=ERC1155, realTokenId=777 => tokenIdx=1 
    // You can do that by freezeBurn first if you want. Or forcibly set item in the test.

    // For brevity, let's do a direct force:
    // (In a real scenario you'd do freezeBurn from NEVM side first or a public register.)

    // We'll pretend the bridging param => value=1 => 1 token => tokenIdx=1 => realTokenId=777
    // We'll do a direct 'vault.processTransaction(txHash=999, 1, attacker, guid= (1<<32|someAssetId))'

    // 2) Register the ERC1155 asset
    // a) we do a minimal freezeBurn with 0? or we can forcibly do:
    // We skip real bridging steps for brevity:
    await mock1155.mint(owner, 777, 10);
    await mock1155.setApprovalForAll(vault.address, true, { from: owner });
    const result = await vault.freezeBurn(
      1, 
      mock1155.address,
      777, 
      "someSysAddr", 
      { from: owner }
    );
    // now asset is registered => tokenIndex=1

    // read assetId
    let assetId = await vault.assetRegistryByAddress(mock1155.address);
    // tokenIndex=1 from the code => let's see
    // next bridging from Sys->NEVM => call processTransaction => 'destination=attacker'

    // doAttack => calls vault.processTx => which calls _withdrawERC1155(..., attacker)
    // => triggers onERC1155Received => calls freezeBurn => re-enter => revert
    await attacker.doAttack(1, assetId, 1)

    // check final flags
    let didAttack = await attacker.didAttack();
    let attackReverted = await attacker.attackReverted();
    expect(didAttack).to.equal(true, "didAttack should be set");
    expect(attackReverted).to.equal(true, "attackReverted should be set => reentrancy blocked");
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * This test triggers a re-entrancy by making the vault call 
 * `_withdrawERC1155(..., malicious, ...)` in the same TX that 
 * malicious calls freezeBurn(...) again. 
 */
describe("Malicious Re-Entrancy Test", function () {
    async function deployFixture() {
        const [deployer, owner] = await ethers.getSigners();

        // Deploy an ERC1155
        const MockERC1155Factory = await ethers.getContractFactory("MockERC1155");
        const mock1155 = await MockERC1155Factory.deploy("https://test.api/");
        await mock1155.waitForDeployment();

        // Deploy malicious first
        const MaliciousReentrantFactory = await ethers.getContractFactory("MaliciousReentrant");
        const attacker = await MaliciousReentrantFactory.deploy(await mock1155.getAddress());
        await attacker.waitForDeployment();

        // Now create the vault with `attacker.address` as the trusted relayer
        const SyscoinVaultManagerFactory = await ethers.getContractFactory("SyscoinVaultManager");
        const vault = await SyscoinVaultManagerFactory.deploy(
            await attacker.getAddress(), // attacker as trustedRelayer
            8888n,                       // SYSAssetGuid
            owner.address                // initialOwner
        );
        await vault.waitForDeployment();

        // Then set the vault address inside the malicious constructor or a separate init function
        await attacker.setVault(await vault.getAddress());

        return { vault, mock1155, attacker, deployer, owner };
    }

    it("Attempt real re-entrancy => should revert", async function () {
        // Load the fixture
        const { vault, mock1155, attacker, owner } = await loadFixture(deployFixture);

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
        await mock1155.mint(owner.address, 777, 10);
        await mock1155.connect(owner).setApprovalForAll(await vault.getAddress(), true);

        await vault.connect(owner).freezeBurn(
            1,
            await mock1155.getAddress(),
            777,
            "someSysAddr"
        );
        // now asset is registered => tokenIndex=1

        // Add tokens to the vault for the test to work
        await mock1155.mint(await vault.getAddress(), 777, 2);

        // read assetId
        const assetId = await vault.assetRegistryByAddress(await mock1155.getAddress());
        // tokenIndex=1 from the code => let's see
        // next bridging from Sys->NEVM => call processTransaction => 'destination=attacker'

        // doAttack => calls vault.processTx => which calls _withdrawERC1155(..., attacker)
        // => triggers onERC1155Received => calls freezeBurn => re-enter => revert
        await attacker.doAttack(1, assetId, 1);

        // check final flags
        const didAttack = await attacker.didAttack();
        const attackReverted = await attacker.attackReverted();

        expect(didAttack).to.equal(true, "didAttack should be set");
        expect(attackReverted).to.equal(true, "attackReverted should be set => reentrancy blocked");
    });
});
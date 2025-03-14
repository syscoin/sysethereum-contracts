import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// Helper functions to mimic the contract’s scaling functions
function scaleToSatoshi(rawValue: bigint, tokenDecimals: number): bigint {
    if (tokenDecimals > 8) {
        // scale down: integer division truncates fraction
        return rawValue / 10n ** BigInt(tokenDecimals - 8);
    } else if (tokenDecimals < 8) {
        // scale up
        return rawValue * 10n ** BigInt(8 - tokenDecimals);
    } else {
        return rawValue;
    }
}

describe("SyscoinVaultManager", function () {
    // A fixture to deploy the contracts
    async function deployVaultFixture() {
        const [trustedRelayer, owner, user1, user2] = await ethers.getSigners();

        // Deploy the vault contract
        const SyscoinVaultManagerFactory = await ethers.getContractFactory("SyscoinVaultManager");
        const vault = await SyscoinVaultManagerFactory.deploy(
            trustedRelayer.address, // trustedRelayer
            9999n,                  // SYSAssetGuid
            owner.address           // initialOwner
        );
        await vault.waitForDeployment();

        // Deploy ERC20 mocks (one with 18, one with 6 decimals, one with 4)
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        const erc20 = await MockERC20Factory.deploy("MockToken", "MCK", 18);
        await erc20.waitForDeployment();

        const erc20_6dec = await MockERC20Factory.deploy("SixDecToken", "SIX", 6);
        await erc20_6dec.waitForDeployment();

        const erc20_4dec = await MockERC20Factory.deploy("FourDecToken", "FOUR", 4);
        await erc20_4dec.waitForDeployment();

        // Deploy ERC721 and ERC1155 mocks
        const MockERC721Factory = await ethers.getContractFactory("MockERC721");
        const erc721 = await MockERC721Factory.deploy("MockNFT", "MNFT");
        await erc721.waitForDeployment();

        const MockERC1155Factory = await ethers.getContractFactory("MockERC1155");
        const erc1155 = await MockERC1155Factory.deploy("https://test.api/");
        await erc1155.waitForDeployment();

        return { vault, erc20, erc20_6dec, erc20_4dec, erc721, erc1155, trustedRelayer, owner, user1, user2 };
    }

    // ─── ERC20 BRIDGING TESTS ────────────────────────────────────────────────
    describe("ERC20 bridging tests", function () {
        it("should auto-register and freezeBurn small amounts", async function () {
            const { vault, erc20, owner } = await loadFixture(deployVaultFixture);
            const decimals = 18;
            const amount = ethers.parseEther("5"); // 5 tokens

            // Mint 100 tokens to owner and approve vault
            await erc20.mint(owner.address, ethers.parseEther("100"));
            await erc20.connect(owner).approve(await vault.getAddress(), amount);

            // FreezeBurn 5 tokens
            const tx = await vault.connect(owner).freezeBurn(
                amount,
                await erc20.getAddress(),
                0,
                "sys1qtestaddress"
            );

            // For ERC20, tokenIdx is fixed at 0. First registration yields assetId = 1.
            const expectedAssetGuid = (0n << 32n) | 1n;
            const satoshiValue = scaleToSatoshi(BigInt(amount.toString()), decimals);

            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs(expectedAssetGuid, owner.address, satoshiValue, "sys1qtestaddress");

            const vaultBalance = await erc20.balanceOf(await vault.getAddress());
            expect(vaultBalance).to.equal(amount);

            const userBalance = await erc20.balanceOf(owner.address);
            expect(userBalance).to.equal(ethers.parseEther("100") - amount);

            const assetId = await vault.assetRegistryByAddress(await erc20.getAddress());
            expect(assetId).to.equal(1n);
        });

        it("should revert bridging zero", async function () {
            const { vault, erc20, owner } = await loadFixture(deployVaultFixture);
            await erc20.mint(owner.address, ethers.parseEther("10"));
            await erc20.connect(owner).approve(await vault.getAddress(), ethers.parseEther("1"));
            await expect(
                vault.connect(owner).freezeBurn(
                    0,
                    await erc20.getAddress(),
                    0,
                    "sys1qtestaddress"
                )
            ).to.be.revertedWith("ERC20 requires positive value");
        });

        it("should revert if scaledValue > 2^63-1", async function () {
            const { vault, erc20, owner } = await loadFixture(deployVaultFixture);
            // Mint a huge amount (1e10 tokens with 18 decimals)
            const hugeAmount = ethers.parseEther("10000000000");
            await erc20.mint(owner.address, hugeAmount);
            await erc20.connect(owner).approve(await vault.getAddress(), hugeAmount);
            await expect(
                vault.connect(owner).freezeBurn(
                    hugeAmount,
                    await erc20.getAddress(),
                    0,
                    "sys1qtestaddress"
                )
            ).to.be.revertedWith("Overflow bridging to Sys");
        });

        it("should pass 10b - 1", async function () {
            const { vault, erc20, owner } = await loadFixture(deployVaultFixture);
            const amount = ethers.parseEther("9999999999");
            await erc20.mint(owner.address, amount);
            await erc20.connect(owner).approve(await vault.getAddress(), amount);
            const tx = await vault.connect(owner).freezeBurn(
                amount,
                await erc20.getAddress(),
                0,
                "sys1qtestaddress"
            );
            const expectedAssetGuid = (0n << 32n) | 1n;
            const satoshiValue = scaleToSatoshi(BigInt(amount.toString()), 18);

            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs(expectedAssetGuid, owner.address, satoshiValue, "sys1qtestaddress");

            const vaultBalance = await erc20.balanceOf(await vault.getAddress());
            expect(vaultBalance).to.equal(amount);
            const userBalance = await erc20.balanceOf(owner.address);
            // In a fresh fixture the owner’s balance will be zero after depositing.
            expect(userBalance).to.equal(0);
            const assetId = await vault.assetRegistryByAddress(await erc20.getAddress());
            expect(assetId).to.equal(1n);
        });

        it("should handle a processTransaction from trustedRelayer", async function () {
            const { vault, erc20, trustedRelayer, owner, user1 } = await loadFixture(deployVaultFixture);
            const depositAmount = ethers.parseEther("100");
            await erc20.mint(owner.address, depositAmount);
            await erc20.connect(owner).approve(await vault.getAddress(), depositAmount);
            await vault.connect(owner).freezeBurn(
                depositAmount,
                await erc20.getAddress(),
                0,
                "sys1someaddr"
            );
            const assetId = await vault.assetRegistryByAddress(await erc20.getAddress());
            // ERC20: tokenIdx = 0 so assetGuid = (0 << 32) | assetId
            const assetGuid = (0n << 32n) | BigInt(assetId.toString());

            const satoshiValue = scaleToSatoshi(depositAmount, 18);

            // Process the bridging (Sys -> NEVM) so that tokens are withdrawn to user1
            await vault.connect(trustedRelayer).processTransaction(
                123,
                satoshiValue,
                user1.address,
                assetGuid
            );
            const user1Balance = await erc20.balanceOf(user1.address);
            expect(user1Balance).to.equal(depositAmount);

            // Replay with the same txHash should revert
            await expect(
                vault.connect(trustedRelayer).processTransaction(
                    123,
                    satoshiValue,
                    owner.address,
                    assetGuid
                )
            ).to.be.revertedWith("TX already processed");
        });
    });

    // ─── BRIDGING A 6-DECIMALS TOKEN ────────────────────────────────────────
    describe("Bridging a 6-decimals token => scale up to 8 decimals", function () {
        it("should freezeBurn small amounts for 6-dec token => logs scaled satoshiValue", async function () {
            const { vault, erc20_6dec, owner } = await loadFixture(deployVaultFixture);
            const decimals = 6;
            const amount = ethers.parseUnits("5", 6);
            // Mint 20 tokens (20×1e6)
            await erc20_6dec.mint(owner.address, ethers.parseUnits("20", 6));
            await erc20_6dec.connect(owner).approve(await vault.getAddress(), amount);
            const tx = await vault.connect(owner).freezeBurn(
                amount,
                await erc20_6dec.getAddress(),
                0,
                "sys1qtestaddress"
            );

            const assetId = await vault.assetRegistryByAddress(await erc20_6dec.getAddress());
            expect(assetId).to.equal(1n);
            const satoshiValue = scaleToSatoshi(BigInt(amount.toString()), decimals);
            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs((0n << 32n) | assetId, owner.address, satoshiValue, "sys1qtestaddress");
            const vaultBal = await erc20_6dec.balanceOf(await vault.getAddress());
            expect(vaultBal).to.equal(amount);
            const userBal = await erc20_6dec.balanceOf(owner.address);
            // 20 - 5 = 15 tokens (in 6-decimal units)
            expect(userBal).to.equal(ethers.parseUnits("15", 6));
        });

        it("should revert bridging over 10B limit for 6-dec", async function () {
            const { vault, erc20_6dec, owner } = await loadFixture(deployVaultFixture);
            // Mint a huge amount: e.g. 2e17 tokens in 6-decimals
            const hugeAmount = ethers.parseUnits("200000000000000000", 6);
            await erc20_6dec.mint(owner.address, hugeAmount);
            await erc20_6dec.connect(owner).approve(await vault.getAddress(), hugeAmount);
            await expect(
                vault.connect(owner).freezeBurn(
                    hugeAmount,
                    await erc20_6dec.getAddress(),
                    0,
                    "sys1qtestaddress"
                )
            ).to.be.revertedWith("Overflow bridging to Sys");
        });
    });

    // ─── BRIDGING A 4-DECIMALS TOKEN ─────────────────────────────────────────
    describe("Bridging a 4-decimals token => scale up x 10^(8-4)=10^4", function () {
        it("should freezeBurn 12.3456 tokens => logs 1234560000 sat", async function () {
            const { vault, erc20_4dec, owner } = await loadFixture(deployVaultFixture);
            // Mint 100 tokens (4 decimals)
            await erc20_4dec.mint(owner.address, ethers.parseUnits("100", 4));
            // Bridging 12.3456 tokens (raw = 123456)
            const amount = ethers.parseUnits("12.3456", 4);
            await erc20_4dec.connect(owner).approve(await vault.getAddress(), amount);
            const tx = await vault.connect(owner).freezeBurn(
                amount,
                await erc20_4dec.getAddress(),
                0,
                "sys1qtestaddress"
            );
            const assetId = await vault.assetRegistryByAddress(await erc20_4dec.getAddress());
            expect(assetId).to.equal(1n);
            const satoshiValue = scaleToSatoshi(BigInt(amount.toString()), 4);
            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs((0n << 32n) | assetId, owner.address, satoshiValue, "sys1qtestaddress");
            const vaultBal = await erc20_4dec.balanceOf(await vault.getAddress());
            expect(vaultBal).to.equal(amount);
            const userBal = await erc20_4dec.balanceOf(owner.address);
            // 100 - 12.3456 = 87.6544 tokens (raw units)
            expect(userBal).to.equal(ethers.parseUnits("87.6544", 4));
        });
    });

    // ─── PAUSE FUNCTIONALITY ────────────────────────────────────────────────
    describe("Pause Functionality", function () {
        it("should allow freezeBurn and processTransaction when not paused", async function () {
            const { vault, erc20, owner, trustedRelayer } = await loadFixture(deployVaultFixture);
            await erc20.mint(owner.address, ethers.parseEther("100"));
            await erc20.connect(owner).approve(await vault.getAddress(), ethers.parseEther("10"));
            await vault.connect(owner).freezeBurn(
                ethers.parseEther("10"),
                await erc20.getAddress(),
                0,
                "sys1addr"
            );
            const assetId = await vault.assetRegistryByAddress(await erc20.getAddress());
            const assetGuid = (0n << 32n) | BigInt(assetId.toString());
            await vault.connect(trustedRelayer).processTransaction(
                123,
                scaleToSatoshi(ethers.parseEther("10"), 18),
                owner.address,
                assetGuid
            );
        });

        it("should revert freezeBurn and processTransaction when paused", async function () {
            const { vault, erc20, owner, trustedRelayer } = await loadFixture(deployVaultFixture);
            await vault.connect(owner).setPaused(true);
            await expect(
                vault.connect(owner).freezeBurn(
                    ethers.parseEther("1"),
                    await erc20.getAddress(),
                    0,
                    "sys1addr"
                )
            ).to.be.revertedWith("Bridge is paused");
            const assetId = await vault.assetRegistryByAddress(await erc20.getAddress());
            const assetGuid = (0n << 32n) | BigInt(assetId.toString());
            await expect(
                vault.connect(trustedRelayer).processTransaction(
                    456,
                    scaleToSatoshi(ethers.parseEther("1"), 18),
                    owner.address,
                    assetGuid
                )
            ).to.be.revertedWith("Bridge is paused");
        });

        it("should resume operations after unpausing", async function () {
            const { vault, erc20, owner, trustedRelayer } = await loadFixture(deployVaultFixture);
            await vault.connect(owner).setPaused(true);
            await vault.connect(owner).setPaused(false);
            await erc20.mint(owner.address, ethers.parseEther("100"))
            await erc20.connect(owner).approve(await vault.getAddress(), ethers.parseEther("5"));
            const tx = await vault.connect(owner).freezeBurn(
                ethers.parseEther("5"),
                await erc20.getAddress(),
                0,
                "sys1addr"
            );
            await expect(tx).to.emit(vault, "TokenFreeze");
            const assetId = await vault.assetRegistryByAddress(await erc20.getAddress());
            const assetGuid = (0n << 32n) | BigInt(assetId.toString());
            await vault.connect(trustedRelayer).processTransaction(
                456,
                scaleToSatoshi(ethers.parseEther("5"), 18),
                owner.address,
                assetGuid
            );
        });
    });

    // ─── ERC721 BRIDGING TESTS ────────────────────────────────────────────────
    describe("ERC721 bridging tests", function () {
        it("should revert bridging ERC721 tokenId=0", async function () {
            const { vault, erc721, owner } = await loadFixture(deployVaultFixture);
            await expect(
                vault.connect(owner).freezeBurn(
                    1,
                    await erc721.getAddress(),
                    0,
                    "sys1addr"
                )
            ).to.be.revertedWith("ERC721 tokenId required");
        });

        it("should revert bridging ERC1155 tokenId=0", async function () {
            const { vault, erc1155, owner } = await loadFixture(deployVaultFixture);
            await expect(
                vault.connect(owner).freezeBurn(
                    1,
                    await erc1155.getAddress(),
                    0,
                    "sys1addr"
                )
            ).to.be.revertedWith("ERC1155 tokenId required");
        });

        it("should auto-register and freezeBurn an NFT", async function () {
            const { vault, erc721, owner } = await loadFixture(deployVaultFixture);
            // Mint an NFT (assumed tokenId = 1)
            await erc721["mint(address)"](owner.address);
            await erc721.connect(owner).approve(await vault.getAddress(), 1);
            const ownerBefore = await erc721.ownerOf(1);
            expect(ownerBefore).to.equal(owner.address);
            const tx = await vault.connect(owner).freezeBurn(
                1,
                await erc721.getAddress(),
                1,
                "sys1qNFTaddress"
            );
            // For ERC721, the first NFT deposit assigns a tokenIdx(e.g. 1)
            // Assuming ERC20, 6dec, 4dec have taken assetIds 1–3, ERC721 gets assetId 1.
            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs((1n << 32n) | 1n, owner.address, 1n, "sys1qNFTaddress");
            const assetId = await vault.assetRegistryByAddress(await erc721.getAddress());
            expect(assetId).to.equal(1n);
            const ownerAfter = await erc721.ownerOf(1);
            expect(ownerAfter).to.equal(await await vault.getAddress());
        });

        it("should revert bridging ERC721 if value != 1", async function () {
            const { vault, erc721, owner } = await loadFixture(deployVaultFixture);
            await erc721["mint(address,uint256)"](owner.address, 2);
            await erc721.connect(owner).approve(await vault.getAddress(), 2);
            await expect(
                vault.connect(owner).freezeBurn(
                    2,
                    await erc721.getAddress(),
                    2,
                    "sys1qNFTaddress"
                )
            ).to.be.revertedWith("ERC721 deposit requires exactly 1");
        });

        it("should bridge 1 NFT => value=1", async function () {
            const { vault, erc721, owner } = await loadFixture(deployVaultFixture);
            await erc721["mint(address,uint256)"](owner.address, 2);
            await erc721.connect(owner).approve(await vault.getAddress(), 2);
            const tx = await vault.connect(owner).freezeBurn(
                1,
                await erc721.getAddress(),
                2,
                "sys1mydestination"
            );
            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs((1n << 32n) | 1n, owner.address, 1n, "sys1mydestination");
            const newOwner = await erc721.ownerOf(2);
            expect(newOwner).to.equal(await vault.getAddress());
        });

        it("should revert bridging value=2 for ERC721", async function () {
            const { vault, erc721, owner } = await loadFixture(deployVaultFixture);
            await erc721["mint(address,uint256)"](owner.address, 3);
            await erc721.connect(owner).approve(await vault.getAddress(), 3);
            await expect(
                vault.connect(owner).freezeBurn(
                    2,
                    await erc721.getAddress(),
                    3,
                    "sys1mydestination"
                )
            ).to.be.revertedWith("ERC721 deposit requires exactly 1");
        });

        it("should bridge in => value=1 => unlock the NFT", async function () {
            const { vault, erc721, trustedRelayer, owner, user1 } = await loadFixture(deployVaultFixture);
            // Mint and deposit an NFT (tokenId 3)
            await erc721["mint(address,uint256)"](owner.address, 3);
            await erc721.connect(owner).approve(await vault.getAddress(), 3);
            await vault.connect(owner).freezeBurn(
                1,
                await erc721.getAddress(),
                3,
                "sys1mydestination"
            );
            const assetId = await vault.assetRegistryByAddress(await erc721.getAddress());
            const assetGuid = (1n << 32n) | BigInt(assetId.toString());
            const ownerInVault = await erc721.ownerOf(3);
            expect(ownerInVault).to.equal(await vault.getAddress());
            // Process bridging to unlock the NFT
            await vault.connect(trustedRelayer).processTransaction(
                1000,
                1,
                user1.address,
                assetGuid
            );
            const newOwner = await erc721.ownerOf(3);
            expect(newOwner).to.equal(user1.address);
        });

        it("should bridge in => value=2 => reverts", async function () {
            const { vault, erc721, trustedRelayer, owner, user1 } = await loadFixture(deployVaultFixture);
            // Mint and deposit an NFT (tokenId 3)
            await erc721["mint(address,uint256)"](owner.address, 3);
            await erc721.connect(owner).approve(await vault.getAddress(), 3);
            await vault.connect(owner).freezeBurn(
                1,
                await erc721.getAddress(),
                3,
                "sys1mydestination"
            );
            const assetId = await vault.assetRegistryByAddress(await erc721.getAddress());
            const assetGuid = (1n << 32n) | BigInt(assetId.toString());
            await expect(
                vault.connect(trustedRelayer).processTransaction(
                    1001,
                    2,
                    user1.address,
                    assetGuid
                )
            ).to.be.revertedWith("ERC721 bridging requires value=1");
        });

        it("should revert when depositing already bridged ERC721 token", async function () {
            const { vault, erc721, owner } = await loadFixture(deployVaultFixture);
            await erc721["mint(address)"](owner.address);
            await erc721.connect(owner).approve(await vault.getAddress(), 1);
            // First deposit
            await vault.connect(owner).freezeBurn(
                1,
                await erc721.getAddress(),
                1,
                "sys1existingtoken"
            );
            // Attempt to re-deposit the same token should revert
            await expect(
                vault.connect(owner).freezeBurn(
                    1,
                    await erc721.getAddress(),
                    1,
                    "sys1existingtoken"
                )
            ).to.be.reverted;
            const tokenOwner = await erc721.ownerOf(1);
            expect(tokenOwner).to.equal(await vault.getAddress());
        });

        it("should correctly calculate assetGuid for ERC721", async function () {
            const { vault, erc721, owner } = await loadFixture(deployVaultFixture);
            await erc721["mint(address,uint256)"](owner.address, 4); // tokenId = 4
            await erc721.connect(owner).approve(await vault.getAddress(), 4);
            const tx = await vault.connect(owner).freezeBurn(
                1,
                await erc721.getAddress(),
                4,
                "sys1address"
            );
            const assetId = await vault.assetRegistryByAddress(await erc721.getAddress());
            const expectedAssetGuid = (1n << 32n) | BigInt(assetId.toString());
            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs(expectedAssetGuid, owner.address, 1n, "sys1address");
        });

        it("should allow re-depositing ERC721 after withdrawal", async function () {
            const { vault, erc721, trustedRelayer, owner } = await loadFixture(deployVaultFixture);
            // Mint tokenId 10 and deposit it
            await erc721["mint(address,uint256)"](owner.address, 10);
            await erc721.connect(owner).approve(await vault.getAddress(), 10);
            const tx = await vault.connect(owner).freezeBurn(
                1,
                await erc721.getAddress(),
                10,
                "sys1addrNFT"
            );
            const ownerInVault = await erc721.ownerOf(10);
            expect(ownerInVault).to.equal(await vault.getAddress());
            const assetId = await vault.assetRegistryByAddress(await erc721.getAddress());
            // Assume tokenIndex for tokenId 10 is 5 so assetGuid = (5 << 32) | assetId
            const assetGuid = (1n << 32n) | BigInt(assetId.toString());
            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs(assetGuid, owner.address, 1n, "sys1addrNFT");
            // Process withdrawal to return NFT to owner
            await vault.connect(trustedRelayer).processTransaction(
                5555,
                1,
                owner.address,
                assetGuid
            );
            const ownerAfterWithdrawal = await erc721.ownerOf(10);
            expect(ownerAfterWithdrawal).to.equal(owner.address);
            // Re-deposit the same NFT
            await erc721.connect(owner).approve(await vault.getAddress(), 10);
            await vault.connect(owner).freezeBurn(
                1,
                await erc721.getAddress(),
                10,
                "sys1addrNFT"
            );
            const ownerAfterRedeploy = await erc721.ownerOf(10);
            expect(ownerAfterRedeploy).to.equal(await vault.getAddress());
        });

        it("should bridge ERC721 token with large tokenId correctly using registry", async function () {
            const { vault, erc721, trustedRelayer, owner } = await loadFixture(deployVaultFixture);
            const largeTokenId = "123456789123456789123456789";
            await erc721["mint(address,uint256)"](owner.address, largeTokenId);
            await erc721.connect(owner).approve(await vault.getAddress(), largeTokenId);
            await vault.connect(owner).freezeBurn(
                1,
                await erc721.getAddress(),
                largeTokenId,
                "sys1largeidaddr"
            );
            const assetId = await vault.assetRegistryByAddress(await erc721.getAddress());
            // Retrieve tokenIdx using the contract’s lookup function
            const tokenIdx = await vault.getTokenIdxFromRealTokenId(assetId, largeTokenId);

            expect(tokenIdx).to.be.gt(0);
            const assetGuid = (BigInt(tokenIdx.toString()) << 32n) | BigInt(assetId.toString());
            await vault.connect(trustedRelayer).processTransaction(
                98765,
                1,
                owner.address,
                assetGuid
            );
            const newOwner = await erc721.ownerOf(largeTokenId);
            expect(newOwner).to.equal(owner.address);
        });

        it("should correctly map ERC721 tokenIdx to realTokenId in registry", async function () {
            const { vault, erc721, owner } = await loadFixture(deployVaultFixture);
            const tokenId = 9999;
            await erc721["mint(address,uint256)"](owner.address, tokenId);
            await erc721.connect(owner).approve(await vault.getAddress(), tokenId);
            await vault.connect(owner).freezeBurn(
                1,
                await erc721.getAddress(),
                tokenId,
                "sys1address9999"
            );
            const assetId = await vault.assetRegistryByAddress(await erc721.getAddress());
            const tokenIdx = await vault.getTokenIdxFromRealTokenId(assetId, tokenId);
            expect(tokenIdx).to.be.gt(0);
            const realTokenId = await vault.getRealTokenIdFromTokenIdx(assetId, tokenIdx);
            expect(realTokenId.toString()).to.equal(tokenId.toString());
        });
    });

    // ─── ERC1155 BRIDGING TESTS ───────────────────────────────────────────────
    describe("ERC1155 bridging tests", function () {
        it("should auto-register and freezeBurn quantity", async function () {
            const { vault, erc1155, owner } = await loadFixture(deployVaultFixture);
            // Mint item id=777 with quantity=10
            await erc1155.mint(owner.address, 777, 10);
            await erc1155.connect(owner).setApprovalForAll(await vault.getAddress(), true);
            const tx = await vault.connect(owner).freezeBurn(
                5,
                await erc1155.getAddress(),
                777,
                "sys1155Address"
            );
            const assetId = await vault.assetRegistryByAddress(await erc1155.getAddress());
            const tokenIdx = await vault.getTokenIdxFromRealTokenId(assetId, 777);
            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs(((BigInt(tokenIdx.toString()) << 32n)) | assetId, owner.address, 5n, "sys1155Address");
            const vaultBal = await erc1155.balanceOf(await vault.getAddress(), 777);
            expect(vaultBal).to.equal(5);
        });

        it("should revert bridging zero quantity in ERC1155", async function () {
            const { vault, erc1155, owner } = await loadFixture(deployVaultFixture);
            await expect(
                vault.connect(owner).freezeBurn(
                    0,
                    await erc1155.getAddress(),
                    999,
                    "sys1155Address"
                )
            ).to.be.revertedWith("ERC1155 requires positive value");
        });

        it("should freezeBurn 100 integer units in 1155 => bridging to Sys", async function () {
            const { vault, erc1155, owner } = await loadFixture(deployVaultFixture);
            await erc1155.mint(owner.address, 777, 1000);
            await erc1155.connect(owner).setApprovalForAll(await vault.getAddress(), true);
            const tx = await vault.connect(owner).freezeBurn(
                200,
                await erc1155.getAddress(),
                777,
                "sys1address"
            );
            const assetId = await vault.assetRegistryByAddress(await erc1155.getAddress());
            const tokenIdx = await vault.getTokenIdxFromRealTokenId(assetId, 777);
            const assetGuid = (BigInt(tokenIdx.toString()) << 32n) | assetId;
            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs(assetGuid, owner.address, 200n, "sys1address");
            const vaultBal = await erc1155.balanceOf(await vault.getAddress(), 777);
            expect(vaultBal).to.equal(200);
        });

        it("should revert bridging >10B for 1155", async function () {
            const { vault, erc1155, owner } = await loadFixture(deployVaultFixture);
            await erc1155.mint(owner.address, 777, "20000000000");
            await erc1155.connect(owner).setApprovalForAll(await vault.getAddress(), true);
            await vault.connect(owner).freezeBurn(
                "20000000000",
                await erc1155.getAddress(),
                777,
                "sys1address"
            );
            const vaultBal = await erc1155.balanceOf(await vault.getAddress(), 777);
            expect(vaultBal).to.equal("20000000000");
        });

        it("should processTransaction for 1155 integer bridging", async function () {
            const { vault, erc1155, trustedRelayer, owner } = await loadFixture(deployVaultFixture);

            await erc1155.mint(owner.address, 777, 1000);
            await erc1155.connect(owner).setApprovalForAll(await vault.getAddress(), true);
            await vault.connect(owner).freezeBurn(
                1000,
                await erc1155.getAddress(),
                777,
                "sys1address"
            );
            const assetId = await vault.assetRegistryByAddress(await erc1155.getAddress());
            const tokenIdx = await vault.getTokenIdxFromRealTokenId(assetId, 777);
            const assetGuid = (BigInt(tokenIdx.toString()) << 32n) | assetId;
            // Mint tokens to vault to simulate a deposit (e.g. 300 units)

            await vault.connect(trustedRelayer).processTransaction(
                999,
                300,
                owner.address,
                assetGuid
            );
            const userBal = await erc1155.balanceOf(owner.address, 777);
            expect(userBal).to.equal(300);
        });

        it("should bridge 1155 quantity up to 10B-1", async function () {
            const { vault, erc1155, owner } = await loadFixture(deployVaultFixture);
            await erc1155.mint(owner.address, 777, "9999999999");
            await erc1155.connect(owner).setApprovalForAll(await vault.getAddress(), true);
            const tx = await vault.connect(owner).freezeBurn(
                "9999999999",
                await erc1155.getAddress(),
                777,
                "sys1mydestination"
            );
            const assetId = await vault.assetRegistryByAddress(await erc1155.getAddress());
            const tokenIdx = await vault.getTokenIdxFromRealTokenId(assetId, 777);
            const assetGuid = (BigInt(tokenIdx.toString()) << 32n) | assetId;
            await expect(tx)
                .to.emit(vault, "TokenFreeze")
                .withArgs(assetGuid, owner.address, BigInt("9999999999"), "sys1mydestination");
            const vaultBal = await erc1155.balanceOf(await vault.getAddress(), 777);
            expect(vaultBal).to.equal("9999999999");
        });

        it("should bridge 1155 quantity => direct integer unlock", async function () {
            const { vault, erc1155, trustedRelayer, owner, user1 } = await loadFixture(deployVaultFixture);

            await erc1155.mint(owner.address, 777, 1000);
            await erc1155.connect(owner).setApprovalForAll(await vault.getAddress(), true);
            await vault.connect(owner).freezeBurn(
                1000,
                await erc1155.getAddress(),
                777,
                "sys1address"
            );
            const assetId = await vault.assetRegistryByAddress(await erc1155.getAddress());
            const tokenIdx = await vault.getTokenIdxFromRealTokenId(assetId, 777);
            const assetGuid = (BigInt(tokenIdx.toString()) << 32n) | assetId;

            // Mint tokens to vault to simulate deposit
            await erc1155.mint(await vault.getAddress(), 777, 500);
            await vault.connect(trustedRelayer).processTransaction(
                998,
                500,
                user1.address,
                assetGuid
            );
            const userBal = await erc1155.balanceOf(user1.address, 777);
            expect(userBal).to.equal(500);
        });

        it("should reuse tokenIdx for same ERC1155 tokenId", async function () {
            const { vault, erc1155, owner } = await loadFixture(deployVaultFixture);
            // First deposit for tokenId 777
            await erc1155.mint(owner.address, 777, 10);
            await erc1155.connect(owner).setApprovalForAll(await vault.getAddress(), true);
            await vault.connect(owner).freezeBurn(
                10,
                await erc1155.getAddress(),
                777,
                "sys1addr1"
            );
            // Get tokenIdx using the contract’s lookup function (assetId assumed to be 5)
            const tokenIdx1 = await vault.getTokenIdxFromRealTokenId(5, 777);
            // Deposit more of the same tokenId
            await erc1155.mint(owner.address, 777, 10);
            await vault.connect(owner).freezeBurn(
                5,
                await erc1155.getAddress(),
                777,
                "sys1address"
            );
            const tokenIdx2 = await vault.getTokenIdxFromRealTokenId(5, 777);
            expect(tokenIdx1.toString()).to.equal(tokenIdx2.toString());
        });

        it("should reuse same tokenIdx and update balances correctly on repeated ERC1155 deposits", async function () {
            const { vault, erc1155, owner } = await loadFixture(deployVaultFixture);
            const tokenId = 888;
            await erc1155.mint(owner.address, tokenId, 100);
            await erc1155.connect(owner).setApprovalForAll(await vault.getAddress(), true);
            await vault.connect(owner).freezeBurn(
                10,
                await erc1155.getAddress(),
                tokenId,
                "sys1address"
            );
            let vaultBal = await erc1155.balanceOf(await vault.getAddress(), tokenId);
            expect(vaultBal).to.equal(10);
            let userBal = await erc1155.balanceOf(owner.address, tokenId);
            expect(userBal).to.equal(90);
            const tokenIdxBefore = await vault.getTokenIdxFromRealTokenId(5, tokenId);
            await vault.connect(owner).freezeBurn(
                20,
                await erc1155.getAddress(),
                tokenId,
                "sys1addrERC1155"
            );
            const tokenIdxAfter = await vault.getTokenIdxFromRealTokenId(5, tokenId);
            expect(tokenIdxAfter.toString()).to.equal(tokenIdxBefore.toString());
            vaultBal = await erc1155.balanceOf(await vault.getAddress(), tokenId);
            expect(vaultBal).to.equal(30);
            userBal = await erc1155.balanceOf(owner.address, tokenId);
            expect(userBal).to.equal(70);
        });
    });
});

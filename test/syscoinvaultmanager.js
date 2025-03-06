const { expect } = require("chai");
const truffleAssert = require('truffle-assertions');
const SyscoinVaultManager = artifacts.require("SyscoinVaultManager");
const MockERC20 = artifacts.require("MockERC20");
const MockERC721 = artifacts.require("MockERC721");
const MockERC1155 = artifacts.require("MockERC1155");

contract("SyscoinVaultManager", (accounts) => {
  const owner = accounts[1];
  const trustedRelayer = accounts[0];
  let vault;
  let erc20, erc721, erc1155;

  before(async () => {
    vault = await SyscoinVaultManager.new(
      trustedRelayer, // trustedRelayer
      9999,           // SYSAssetGuid
      false           // testNetwork = false
    );
    // deploy mocks
    erc20 = await MockERC20.new("MockToken", "MCK", 18);
    erc721 = await MockERC721.new("MockNFT", "MNFT");
    erc1155 = await MockERC1155.new("https://test.api/");
  });

  describe("ERC20 bridging tests", () => {
    it("should auto-register and freezeBurn small amounts", async () => {
      // give user 100 tokens
      await erc20.mint(owner, web3.utils.toWei("100")); 
      // user approves
      await erc20.approve(vault.address, web3.utils.toWei("10"), {from: owner});
      // freezeBurn 5 tokens
      let tx = await vault.freezeBurn(
        web3.utils.toWei("5"),
        erc20.address,
        0, // tokenId = 0 for ERC20
        "sys1qtestaddress",
        {from: owner}
      );

      truffleAssert.eventEmitted(tx, 'TokenFreeze', (ev) => {
        return ev.value.toString() === web3.utils.toWei("5");
      });

      // confirm the asset auto-registered
      let assetId = await vault.assetRegistryByAddress(erc20.address);
      expect(assetId.toNumber()).to.be.gt(0);
    });

    it("should revert bridging zero", async () => {
      await truffleAssert.reverts(
        vault.freezeBurn(
          0,
          erc20.address,
          0,
          "sys1qtestaddress",
          {from: owner}
        ),
        "ERC20 deposit => value>0"
      );
    });

    it("should revert if scaledValue > 2^63-1", async () => {
      // decimals=18 => bridging 1e10 => 1e10 * 1e10 => 1e20 => exceeds 2^63-1 ~ 9.22e18
      await erc20.mint(owner, web3.utils.toWei("1000000000000")); // 1e12
      // approve
      await erc20.approve(vault.address, web3.utils.toWei("1000000000000"), {from: owner});
      // try bridging
      await truffleAssert.reverts(
        vault.freezeBurn(
          web3.utils.toWei("1000000000000"), // 1e12
          erc20.address,
          0,
          "sys1qtestaddress",
          {from: owner}
        ),
        "Bridging amount too large"
      );
    });

    it("should handle a processTransaction from trustedRelayer", async () => {
      // simulate a sys->nevm bridging
      const mockTxHash = 12345;
      const assetId = await vault.assetRegistryByAddress(erc20.address);
      // assetGuid => (tokenIndex<<32) | assetId
      // tokenIndex=0 for ERC20
      const assetGuid = (BigInt(0) << 32n) | BigInt(assetId.toNumber());
      // call processTransaction
      await vault.processTransaction(
        mockTxHash,
        100, // bridging 100 raw
        accounts[2], // destination
        assetGuid,
        {from: trustedRelayer}
      );

      // replay => revert
      await truffleAssert.reverts(
        vault.processTransaction(
          mockTxHash,
          50,
          accounts[3],
          assetGuid,
          {from: trustedRelayer}
        ),
        "TX already processed"
      );
    });
  });

  describe("ERC721 bridging tests", () => {
    it("should auto-register and freezeBurn an NFT", async () => {
      // mint an NFT to owner
      await erc721.mint(owner);
      // tokenId=1
      // approve
      await erc721.approve(vault.address, 1, {from: owner});
      // freezeBurn => must pass value=1
      let tx = await vault.freezeBurn(
        1,
        erc721.address,
        1, // real tokenId
        "sys1qNFTaddress",
        {from: owner}
      );
      truffleAssert.eventEmitted(tx, 'TokenFreeze', (ev) => {
        // bridging 1 NFT
        return ev.value.toString() === '1';
      });
      let assetId = await vault.assetRegistryByAddress(erc721.address);
      expect(assetId.toNumber()).to.be.gt(0);

      // confirm tokenIdCount increments
      // can't easily read the mapping but we can parse events or do a second freeze
    });
    it("should revert bridging ERC721 if value != 1", async () => {
      // minted tokenId=2
      await erc721.mint(owner);
      await erc721.approve(vault.address, 2, {from: owner});
      await truffleAssert.reverts(
        vault.freezeBurn(
          2, // incorrectly bridging 2
          erc721.address,
          2, 
          "sys1qNFTaddress",
          {from: owner}
        ),
        "ERC721 => bridging 1 NFT"
      );
    });
  });

  describe("ERC1155 bridging tests", () => {
    it("should auto-register and freezeBurn quantity", async () => {
      // mint item id=777, quantity=10
      await erc1155.mint(owner, 777, 10);
      // setApprovalForAll
      await erc1155.setApprovalForAll(vault.address, true, {from: owner});
      // freezeBurn => bridging 5
      let tx = await vault.freezeBurn(
        5,
        erc1155.address,
        777,
        "sys1155Address",
        {from: owner}
      );
      truffleAssert.eventEmitted(tx, 'TokenFreeze', (ev) => {
        return ev.value.toString() === '5';
      });
      let assetId = await vault.assetRegistryByAddress(erc1155.address);
      expect(assetId.toNumber()).to.be.gt(0);
    });

    it("should revert bridging zero quantity in ERC1155", async () => {
      await truffleAssert.reverts(
        vault.freezeBurn(
          0,
          erc1155.address,
          999,
          "sys1155Address",
          {from: owner}
        ),
        "ERC1155 => bridging requires value>0"
      );
    });
  });

});

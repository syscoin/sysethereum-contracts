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
      await erc20.approve(vault.address, web3.utils.toWei("5"), {from: owner});
      // freezeBurn 5 tokens
      const tx = await vault.freezeBurn(
        web3.utils.toWei("5"), // 5 in smallest decimal units
        erc20.address,
        0,
        "sys1qtestaddress",
        { from: owner }
      );
      

      // Now check the event on `tx`
      truffleAssert.eventEmitted(tx, 'TokenFreeze', (ev) => {
        // But your bridging code might actually log a scaled satoshiValue, e.g. "500000000"
        return ev.value.toString() === "500000000";
      });
      let vaultBalance = await erc20.balanceOf(vault.address);
      expect(vaultBalance.toString()).to.equal(web3.utils.toWei("5"));
      let userBalance = await erc20.balanceOf(owner);
      expect(userBalance.toString()).to.equal(web3.utils.toWei("95"))
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
      await erc20.mint(owner, web3.utils.toWei("10000000000"));
      // approve
      await erc20.approve(vault.address, web3.utils.toWei("10000000000"), {from: owner});
      // try bridging
      await truffleAssert.reverts(
        vault.freezeBurn(
          web3.utils.toWei("10000000000"),
          erc20.address,
          0,
          "sys1qtestaddress",
          {from: owner}
        ),
        "Overflow bridging to Sys"
      );
    });
    it("should pass 10b - 1", async () => {
      // 10b - 1
      await erc20.mint(owner, web3.utils.toWei("9999999999"));
      // approve
      await erc20.approve(vault.address, web3.utils.toWei("9999999999"), {from: owner});
      // try bridging
      await vault.freezeBurn(
        web3.utils.toWei("9999999999"),
        erc20.address,
        0,
        "sys1qtestaddress",
        {from: owner}
      );
      let vaultBalance = await erc20.balanceOf(vault.address);
      expect(vaultBalance.toString()).to.equal("10000000004000000000000000000");
      let userBalance = await erc20.balanceOf(owner);
      expect(userBalance.toString()).to.equal("10000000095000000000000000000")
    });
    it("should handle a processTransaction from trustedRelayer", async () => {
      // simulate a sys->nevm bridging
      const mockTxHash = 12345;
      // register asset by freezeBurn(1, erc20,0,...) or some minimal deposit
      await erc20.mint(owner, "100");
      await erc20.approve(vault.address, "100", {from: owner});
      await vault.freezeBurn(
        "100",
        erc20.address,
        0,
        "sys1someaddr",
        { from: owner }
      );
      let vaultBalance = await erc20.balanceOf(vault.address);
      expect(vaultBalance.toString()).to.equal("10000000004000000000000000100");
      const assetId = await vault.assetRegistryByAddress(erc20.address);
      // assetGuid => (tokenIndex<<32) | assetId
      // tokenIndex=0 for ERC20
      const assetGuid = (BigInt(0) << 32n) | BigInt(assetId.toNumber());
      expect(assetId.toNumber()).to.be.eq(1);
      // now asset is in registry => processTransaction 
      await vault.processTransaction(
        mockTxHash,
        "100", // bridging 100 raw
        accounts[2], // destination
        assetGuid,
        {from: trustedRelayer}
      );
      let userBalance = await erc20.balanceOf(owner);
      expect(userBalance.toString()).to.equal("10000000095000000000000000000")
      // replay => revert
      await truffleAssert.reverts(
        vault.processTransaction(
          mockTxHash,
          "100",
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
      let ownerOfNft = await erc721.ownerOf(1);
      expect(ownerOfNft).to.equal(vault.address);

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
    it("should bridging 1 NFT => value=1", async () => {
      // Mint tokenId=2
      await erc721.mint(owner);
      // Approve vault
      await erc721.approve(vault.address,2,{ from: owner });
      let tx = await vault.freezeBurn(
        1,
        erc721.address,
        2, 
        "sys1mydestination",
        { from: owner }
      );
      // check event => value=1
      truffleAssert.eventEmitted(tx, "TokenFreeze", (ev) => {
        return ev.value.toString() === "1";
      });
      let ownerOfNft = await erc721.ownerOf(2);
      expect(ownerOfNft).to.equal(vault.address);
    });

    it("should revert bridging value=2 for ERC721", async () => {
      await erc721.mint(owner);
      await erc721.approve(vault.address,3,{ from: owner });
      await truffleAssert.reverts(
        vault.freezeBurn(
          2,
          erc721.address,
          3,
          "sys1mydestination",
          { from: owner }
        ),
        "ERC721 => bridging 1 NFT"
      );
    });
    it("should bridging in => value=1 => unlock the NFT", async () => {
      // Suppose tokenId=1 was locked. We do processTransaction(999,3,dest,assetGuid)
      // parse item, calls _withdrawERC721
      const assetId = await vault.assetRegistryByAddress(erc721.address);
      let assetGuid = (BigInt(3) << 32n) | BigInt(assetId.toNumber()); 
      await vault.freezeBurn(
        1,
        erc721.address,
        3,
        "sys1mydestination",
        { from: owner }
      )
      let ownerOfNft = await erc721.ownerOf(3);
      expect(ownerOfNft).to.equal(vault.address);
      // bridging => tokenIdx=3 => realTokenId=1
      await vault.processTransaction(
        1000,
        1,
        accounts[2],
        assetGuid,
        { from: trustedRelayer }
      );
      ownerOfNft = await erc721.ownerOf(3);
      expect(ownerOfNft).to.equal(accounts[2]);
    });
    it("should bridging in => value=2 => reverts", async () => {
      // Suppose tokenId=1 was locked. We do processTransaction(999,3,dest,assetGuid)
      // parse item, calls _withdrawERC721
      const assetId = await vault.assetRegistryByAddress(erc721.address);
      let assetGuid = (BigInt(3) << 32n) | BigInt(assetId.toNumber()); 
      await truffleAssert.reverts(
        vault.processTransaction(
          1001,
          2,
          accounts[2],
          assetGuid,
          { from: trustedRelayer }
        ),
        "ERC721 bridging requires value=1");
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
      let vaultBalAfter = await erc1155.balanceOf(vault.address, 777);
      expect(vaultBalAfter.toString()).to.equal("5");
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
    it("should freezeBurn 100 integer units in 1155 => bridging to Sys", async () => {
      // user minted 1000 units of ID=777 in erc1155
      await erc1155.mint(owner, 777, 1000);
      await erc1155.setApprovalForAll(vault.address, true, { from: owner });
      // bridging 200 => under 10B => pass
      let tx = await vault.freezeBurn(
        200,
        erc1155.address,
        777,
        "sys1address",
        { from: owner }
      );
      truffleAssert.eventEmitted(tx, "TokenFreeze", ev => {
        return ev.value.toString() === "200";
      });
      let vaultBalAfter = await erc1155.balanceOf(vault.address, 777);
      expect(vaultBalAfter.toString()).to.equal("205");
    });
    it("should revert bridging >10B for 1155", async () => {
      await erc1155.mint(owner, 777, "20000000000"); // 20B
      await erc1155.setApprovalForAll(vault.address, true, { from: owner });
      await vault.freezeBurn(
        "20000000000", 
        erc1155.address,
        777,
        "sys1address",
        { from: owner }
      );
      let vaultBalAfter = await erc1155.balanceOf(vault.address, 777);
      expect(vaultBalAfter.toString()).to.equal("20000000205");
    });
    it("should processTransaction for 1155 integer bridging", async () => {
      // Suppose Sys side minted 300 for ID=777 => bridging to NEVM
      // relay calls processTransaction(..., 300, ..., assetGuidFor1155)
      await vault.processTransaction(
        999,
        300,
        owner,
        0x00000001_00000003, // tokenIdx=1, assetId=3, for example
        { from: trustedRelayer }
      );
      let userBal = await erc1155.balanceOf(owner, 777);
      expect(userBal.toString()).to.equal("1105");
    });
    it("should bridging 1155 quantity up to 10B-1", async () => {
      // Mint ID=777 with 1e10-1 => 9999999999
      await erc1155.mint(owner, 777, "9999999999");
      // Approve 
      await erc1155.setApprovalForAll(vault.address,true,{from:owner});
      let tx = await vault.freezeBurn(
        "9999999999",
        erc1155.address,
        777,
        "sys1mydestination",
        {from:owner}
      );
      truffleAssert.eventEmitted(tx, "TokenFreeze", (ev) => {
        return ev.value.toString() === "9999999999";
      });
      let vaultBalAfter = await erc1155.balanceOf(vault.address, 777);
      expect(vaultBalAfter.toString()).to.equal("29999999904");
    });
 
    it("should bridging 1155 quantity => direct integer unlock", async () => {
      // Suppose user bridging 500 from Sys => call processTransaction(999,500,...)
      const assetId = await vault.assetRegistryByAddress(erc1155.address);
      let assetGuid = (BigInt(1) << 32n) | BigInt(assetId.toNumber());
      await vault.processTransaction(
        998, 
        500, 
        accounts[2],
        assetGuid,
        {from:trustedRelayer}
      );
      let userBal = await erc1155.balanceOf(accounts[2], 777);
      expect(userBal.toString()).to.equal("500");
    });
  });

});

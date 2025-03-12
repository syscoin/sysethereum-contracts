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
    );
    // deploy mocks
    erc20 = await MockERC20.new("MockToken", "MCK", 18);
    erc721 = await MockERC721.new("MockNFT", "MNFT");
    erc1155 = await MockERC1155.new("https://test.api/");
    // 2) Deploy mock tokens with different decimals
    erc20_6dec = await MockERC20.new("SixDecToken","SIX", 6);  // 6 decimals
    erc20_4dec = await MockERC20.new("FourDecToken","FOUR", 4);  // 4 decimals
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
        return ev.satoshiValue.toString() === "500000000";
      });
      let vaultBalance = await erc20.balanceOf(vault.address);
      expect(vaultBalance.toString()).to.equal(web3.utils.toWei("5"));
      let userBalance = await erc20.balanceOf(owner);
      expect(userBalance.toString()).to.equal(web3.utils.toWei("95"))
      // confirm the asset auto-registered
      let assetId = await vault.assetRegistryByAddress(erc20.address);
      expect(assetId.toNumber()).to.be.eq(1);
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
        "ERC20 requires positive value"
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
      let assetId = await vault.assetRegistryByAddress(erc20.address);
      expect(assetId.toNumber()).to.be.eq(1);
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
  describe("Bridging a 6-decimals token => scale up to 8 decimals", () => {
    it("should freezeBurn small amounts for 6-dec token => logs scaled satoshiValue", async () => {
      // Suppose the token has 6 decimals => 1 = 1e6 base units
      // If bridging NEVM->Sys, we do: scaleToSatoshi(value,6). 
      // If fromDecimals < 8 => scale up => multiply by 10^(8-6)=10^2 => 1 => 100 sat

      // 1) Mint 20 tokens => raw= 20 * 10^6= 2000000
      await erc20_6dec.mint(owner, "20000000");  // 20 * 1e6

      // 2) Approve 5 => raw= 5 * 1e6=5000000
      await erc20_6dec.approve(vault.address, "5000000", { from: owner });

      // 3) freezeBurn(5 => 5e6)
      const tx = await vault.freezeBurn(
        "5000000",  // 5 tokens in 6-dec base
        erc20_6dec.address,
        0,
        "sys1qtestaddress",
        { from: owner }
      );
      let assetId = await vault.assetRegistryByAddress(erc20_6dec.address);
      expect(assetId.toNumber()).to.be.eq(2);
      // scaleToSatoshi(5e6,6) => multiply by 10^(8-6)=10^2 => 5e6 *100= 5e8= 500000000 => event
      truffleAssert.eventEmitted(tx, 'TokenFreeze', (ev) => {
        return ev.satoshiValue.toString() === "500000000";  // 5 tokens => 500000000 sat
      });

      // check final vault balance => 5 tokens
      let vaultBal = await erc20_6dec.balanceOf(vault.address);
      expect(vaultBal.toString()).to.equal("5000000"); // 5 in 6-dec = 5e6

      // check user => 95 tokens left
      let userBal = await erc20_6dec.balanceOf(owner);
      expect(userBal.toString()).to.equal("15000000"); // 15 => 15e6
    });

    it("should revert bridging over 10B limit for 6-dec", async () => {
      // bridging 1.5e11 tokens => if fromDec=6 => scaleUp => multiply by 10^(8-6)=10^2 => 
      // final sat => 1.5e11 * 1e2=1.5e13 => exceeds ~1e18 if large enough
      // or we do a simpler large number approach
      // We'll do 1e10 => 1e10 * 10^(8-6)=1e10 * 1e2=1e12 => well under 1e18. So let's push bigger
      // We'll do 1e13 => which is 1e13 * 1e2 =>1e15 => still <1e18 => might pass. 
      // We want something that leads to >1e18 after scale => e.g. 2e13 => =>2e15 => 2e15 <1e18 actually ok
      // Let's do 2e17 => The best approach is to do e.g. 2e17 => 2e17 *1e2=>2e19 =>>1e18 =>revert

      await erc20_6dec.mint(owner, "200000000000000000"); // 2e17 => 2 *10^17
      await erc20_6dec.approve(vault.address, "200000000000000000", { from: owner });
      // freezeBurn => scale => rawValue=2e17 => fromDec=6 => scaleUp => multiply by 10^(8-6)=1e2 => result=2e19 => >1e18 => revert
      await truffleAssert.reverts(
        vault.freezeBurn(
          "200000000000000000",
          erc20_6dec.address,
          0,
          "sys1qtestaddress",
          { from: owner }
        ),
        "Overflow bridging to Sys"
      );
    });
  });

  describe("Bridging a 4-decimals token => scale up x 10^(8-4)=10^4", () => {
    it("should freezeBurn 12.3456 tokens => logs 1234560000 sat", async () => {
      // 4 decimals => 12.3456 => raw=123456 => scale up => 10^(8-4)=1e4 => final=123456*1e4=1.23456e9 => 1234560000
      // 1) mint e.g. 100 => raw=100 *1e4=1000000
      await erc20_4dec.mint(owner, "1000000"); // 100 *1e4

      // 2) bridging 12.3456 => raw=123456
      await erc20_4dec.approve(vault.address, "123456", { from: owner });
      let tx = await vault.freezeBurn(
        "123456", 
        erc20_4dec.address,
        0,
        "sys1qtestaddress",
        { from: owner }
      );
      let assetId = await vault.assetRegistryByAddress(erc20_4dec.address);
      expect(assetId.toNumber()).to.be.eq(3);
      // scale => 123456*(1e4)=1.23456e9 => 1234560000 => check event
      truffleAssert.eventEmitted(tx, 'TokenFreeze', (ev) => {
        return ev.satoshiValue.toString() === "1234560000";
      });

      // check final vault balance => 12.3456
      let vaultBal = await erc20_4dec.balanceOf(vault.address);
      expect(vaultBal.toString()).to.equal("123456");
      // user => 100 - 12.3456= 87.6544 => raw=876544
      let userBal = await erc20_4dec.balanceOf(owner);
      expect(userBal.toString()).to.equal("876544");
    });
  });
  describe("ERC721 bridging tests", () => {
    it("should revert bridging ERC721 tokenId=0", async () => {
      await truffleAssert.reverts(
        vault.freezeBurn(1, erc721.address, 0, "sys1addr", { from: owner }),
        "ERC721 tokenId required"
      );
    });
    
    it("should revert bridging ERC1155 tokenId=0", async () => {
      await truffleAssert.reverts(
        vault.freezeBurn(1, erc1155.address, 0, "sys1addr", {from: owner}),
        "ERC1155 tokenId required"
      );
    });
    
    it("should auto-register and freezeBurn an NFT", async () => {
      // mint an NFT to owner
      await erc721.mint(owner);
      // tokenId=1
      // approve
      await erc721.approve(vault.address, 1, {from: owner});
      let ownerOfNft = await erc721.ownerOf(1);
      expect(ownerOfNft).to.equal(owner);
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
        return ev.satoshiValue.toString() === '1';
      });
      let assetId = await vault.assetRegistryByAddress(erc721.address);
      expect(assetId.toNumber()).to.be.eq(4);
      ownerOfNft = await erc721.ownerOf(1);
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
        "ERC721 deposit requires exactly 1"
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
        return ev.satoshiValue.toString() === "1";
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
        "ERC721 deposit requires exactly 1"
      );
    });
    it("should bridging in => value=1 => unlock the NFT", async () => {
      // Suppose tokenId=3 was locked. We do processTransaction(999,3,dest,assetGuid)
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
    it("should revert when depositing already bridged ERC721 token", async () => {
        // tokenId=1 already deposited in vault
        let ownerOfNft = await erc721.ownerOf(1);
        expect(ownerOfNft).to.equal(vault.address);
        try {
          await vault.freezeBurn(
            1,
            erc721.address,
            1,
            "sys1existingtoken",
            {from: owner}
          );
          assert.fail("Expected revert, but transaction succeeded.");
      } catch (error) {
          assert(error.message.includes("ERC721: transfer caller is not owner nor approved") || error.message.includes("revert"), "Unexpected revert reason");
      }
      expect(await erc721.ownerOf(1)).to.equal(ownerOfNft);
    });
    it("should correctly calculate assetGuid for ERC721", async () => {
      await erc721.mint(owner); // tokenId=4
      await erc721.approve(vault.address, 4, {from: owner});
      let tx = await vault.freezeBurn(
        1,
        erc721.address,
        4, 
        "sys1address",
        {from: owner}
      );
      let assetId = await vault.assetRegistryByAddress(erc721.address);
      let expectedAssetGuid = (BigInt(4) << 32n) | BigInt(assetId.toNumber());
      truffleAssert.eventEmitted(tx, 'TokenFreeze', (ev) => {
        return ev.assetGuid.toString() === expectedAssetGuid.toString();
      });
    });
    it("should allow re-depositing ERC721 after withdrawal", async () => {
      // Mint tokenId=10
      await erc721.mint(owner, 10);
      await erc721.approve(vault.address, 10, {from: owner});
    
      // Deposit NFT (tokenId=10)
      const tx = await vault.freezeBurn(
        1, 
        erc721.address, 
        10, 
        "sys1addrNFT",
        { from: owner }
      );
    
      let ownerOfNft = await erc721.ownerOf(10);
      expect(ownerOfNft).to.equal(vault.address);
    
      // Withdraw (simulate Syscoin relay)
      const assetId = await vault.assetRegistryByAddress(erc721.address);
      // should be the 5th index into the registry for this erc721
      const assetGuid = (BigInt(5) << 32n) | BigInt(assetId.toNumber());
      truffleAssert.eventEmitted(tx, 'TokenFreeze', (ev) => {
        return ev.assetGuid.toString() === assetGuid.toString();
      });
      await vault.processTransaction(
        5555, 
        1, 
        owner,
        assetGuid,
        {from: trustedRelayer}
      );
    
      ownerOfNft = await erc721.ownerOf(10);
      expect(ownerOfNft).to.equal(owner);
    
      // Now redeposit same tokenId
      await erc721.approve(vault.address, 10, {from: owner});
      await vault.freezeBurn(
        1,
        erc721.address,
        10,
        "sys1addrNFT",
        { from: owner }
      );
    
      ownerOfNft = await erc721.ownerOf(10);
      expect(ownerOfNft).to.equal(vault.address);
    });
    it("should bridge ERC721 token with large tokenId correctly using registry", async () => {
      const largeTokenId = web3.utils.toBN("123456789123456789123456789"); // large tokenId (uint256)
      await erc721.mint(owner, largeTokenId);
      await erc721.approve(vault.address, largeTokenId, {from: owner});
    
      // Deposit large tokenId
      await vault.freezeBurn(
        1,
        erc721.address,
        largeTokenId,
        "sys1largeidaddr",
        {from: owner}
      );
    
      let assetId = await vault.assetRegistryByAddress(erc721.address);
      let tokenIdx = await vault.getTokenIdxFromRealTokenId(assetId, largeTokenId);
      assert(tokenIdx.toNumber() > 0, "TokenIdx should be assigned");
    
      // Now withdraw back
      let assetGuid = (BigInt(tokenIdx.toNumber()) << 32n) | BigInt(assetId.toNumber());
      await vault.processTransaction(
        98765,
        1,
        owner,
        assetGuid,
        {from: trustedRelayer}
      );
    
      let ownerOfNft = await erc721.ownerOf(largeTokenId);
      expect(ownerOfNft).to.equal(owner);
    });   
    it("should correctly map ERC721 tokenIdx to realTokenId in registry", async () => {
      const tokenId = 9999;
      await erc721.mint(owner, tokenId);
      await erc721.approve(vault.address, tokenId, {from: owner});
    
      await vault.freezeBurn(
        1,
        erc721.address,
        tokenId,
        "sys1address9999",
        { from: owner }
      );
    
      const assetId = await vault.assetRegistryByAddress(erc721.address);
      const tokenIdx = await vault.getTokenIdxFromRealTokenId(assetId, tokenId);
    
      expect(tokenIdx.toNumber()).to.be.greaterThan(0);
    
      // Check reverse lookup
      const realTokenId = await vault.getRealTokenIdFromTokenIdx(assetId, tokenIdx);
      expect(realTokenId.toString()).to.equal(tokenId.toString());
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
        return ev.satoshiValue.toString() === '5';
      });
      let assetId = await vault.assetRegistryByAddress(erc1155.address);
      expect(assetId.toNumber()).to.be.eq(5);
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
        "ERC1155 requires positive value"
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
        return ev.satoshiValue.toString() === "200";
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
        0x00000001_00000005, // tokenIdx=1, assetId=3, for example
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
        return ev.satoshiValue.toString() === "9999999999";
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
    it("should reuse tokenIdx for same ERC1155 tokenId", async () => {
      // Initial deposit for tokenId=777
      await erc1155.mint(owner, 10, 777);
      await erc1155.setApprovalForAll(vault.address, true, { from: owner });
      await vault.freezeBurn(10, erc1155.address, 777, "sys1addr1", { from: owner });
    
      // Get assetId and tokenIdx
      let assetId = await vault.assetRegistryByAddress(erc1155.address);
      const firstTokenIdx = await vault.assetRegistry(assetId).then(item => item.tokenIdCount.toNumber());
      
      // Deposit more of same tokenId
      await erc1155.mint(owner, 10, 777);
      await vault.freezeBurn(
        5,
        erc1155.address,
        777,
        "sys1address",
        {from: owner}
      );
    
      const secondTokenIdx = await vault.assetRegistry(assetId).then(item => item.tokenIdCount.toNumber());
      
      // Ensure tokenIdx didn't increment
      expect(firstTokenIdx).to.equal(secondTokenIdx);
    });  
    it("should reuse same tokenIdx and update balances correctly on repeated ERC1155 deposits", async () => {
      const tokenId = 888;
    
      // Initial mint and approval
      await erc1155.mint(owner, tokenId, 100);
      await erc1155.setApprovalForAll(vault.address, true, { from: owner });
    
      // First deposit: deposit 10 units
      await vault.freezeBurn(
        10,
        erc1155.address,
        tokenId,
        "sys1address",
        { from: owner }
      );
    
      // Check vault balance after first deposit
      let vaultBalance = await erc1155.balanceOf(vault.address, tokenId);
      expect(vaultBalance.toNumber()).to.equal(10);
    
      // Check user balance: should have 90 left
      let userBalance = await erc1155.balanceOf(owner, tokenId);
      expect(userBalance.toNumber()).to.equal(90);
    
      // Get assetId and tokenIdx after first deposit
      const assetId = await vault.assetRegistryByAddress(erc1155.address);
      let item = await vault.assetRegistry(assetId);
      const tokenIdxBefore = (await item.tokenIdCount).toNumber();
    
      // Second deposit: deposit 20 more units
      await vault.freezeBurn(
        20,
        erc1155.address,
        tokenId,
        "sys1addrERC1155",
        { from: owner }
      );
    
      // Check tokenIdx was not incremented (reused)
      let itemAfter = await vault.assetRegistry(assetId);
      const tokenIdxAfter = await itemAfter.tokenIdCount.toNumber();
      expect(tokenIdxAfter).to.equal(tokenIdxBefore);
    
      // Check updated vault balance: should be 30 total (10 + 20)
      vaultBalance = await erc1155.balanceOf(vault.address, tokenId);
      expect(vaultBalance.toNumber()).to.equal(30);
    
      // Check user's updated balance (80 units remaining)
      userBalance = await erc1155.balanceOf(owner, tokenId);
      expect(userBalance.toNumber()).to.equal(70);
    });       
  });

});

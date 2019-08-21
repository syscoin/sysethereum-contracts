var SyscoinERC20Asset = artifacts.require("./token/SyscoinERC20AssetForTests.sol");
var LegacyERC20 = artifacts.require("./token/LegacyERC20ForTests.sol");
var SyscoinERC20Manager = artifacts.require("./token/SyscoinERC20Manager.sol");

var utils = require('./utils');
const truffleAssert = require('truffle-assertions');


contract('SyscoinERC20Manager', function(accounts) {
  const owner = accounts[1];
  const value = 2000000000;
  const burnVal = 1000000000;
  const belowMinValue = 9900000; // 0.0099 token
  const syscoinAddress = "0x004322ec9eb713f37cf8d701d819c165549d53d14e";
  const assetGUID = 1702063431;
  const trustedRelayerContract = accounts[0];
  const randomUser = accounts[2];
  let erc20Manager, erc20Asset, erc20Legacy, erc20AssetNoMint;

  beforeEach("set up SyscoinERC20Manager, SyscoinERC20Asset and LegacyERC20", async () => {
    erc20Manager = await SyscoinERC20Manager.new(trustedRelayerContract);
    
    erc20Asset = await SyscoinERC20Asset.new("SyscoinToken", "SYSX", 8, erc20Manager.address, {from: owner});
    await erc20Asset.assign(owner, value);
    await erc20Asset.approve(erc20Manager.address, burnVal, {from: owner});

    erc20Legacy = await LegacyERC20.new("LegacyToken", "LEGX", 8, {from: owner});
    await erc20Legacy.assign(owner, value);
    await erc20Legacy.approve(erc20Manager.address, burnVal, {from: owner});

    erc20AssetNoMint = await SyscoinERC20Asset.new("SyscoinToken", "SYSX", 8, randomUser, {from: owner});
    await erc20AssetNoMint.assign(owner, value);
    await erc20AssetNoMint.approve(erc20Manager.address, burnVal, {from: owner});
  })

  it('should burn Syscoin ERC20 Asset', async () => {
    assert.equal(await erc20Manager.trustedRelayerContract(), trustedRelayerContract, "trustedRelayerContract is not correct");
    assert.equal(await erc20Asset.isMinter(erc20Manager.address), true, "SyscoinERC20Manager should be a minter on the ERC20 token");
    assert.equal(await erc20Asset.isMinter(owner), false, "owner should NOT be a minter on the ERC20 token");
    assert.equal(await erc20Asset.balanceOf(owner), value, `SyscoinERC20Asset's ${owner} balance is not the expected one`);

    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, erc20Asset.address, 8, syscoinAddress, {from: owner});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.address), 0, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should freeze legacy ERC20', async () => {
    assert.equal(await erc20Manager.trustedRelayerContract(), trustedRelayerContract, "trustedRelayerContract is not correct");
    assert.equal(await erc20Legacy.balanceOf(owner), value, `LegacyERC20's ${owner} balance is not the expected one`);

    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, erc20Legacy.address, 8, syscoinAddress,{from: owner});

    assert.equal(await erc20Legacy.balanceOf(erc20Manager.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Legacy.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should freeze Syscoin ERC20 Asset if cannot mint', async () => {
    assert.equal(await erc20Manager.trustedRelayerContract(), trustedRelayerContract, "trustedRelayerContract is not correct");
    assert.equal(await erc20AssetNoMint.balanceOf(owner), value, `erc20AssetNoMint's ${owner} balance is not the expected one`);

    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, erc20AssetNoMint.address, 8, syscoinAddress,{from: owner});

    assert.equal(await erc20AssetNoMint.balanceOf(erc20Manager.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20AssetNoMint.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should burn Syscoin ERC20 Asset for multiple transactions', async () => {
    assert.equal(await erc20Manager.trustedRelayerContract(), trustedRelayerContract, "trustedRelayerContract is not correct");

    assert.equal(await erc20Asset.isMinter(erc20Manager.address), true, "SyscoinERC20Manager should be a minter on the ERC20 token");
    assert.equal(await erc20Asset.isMinter(owner), false, "owner should NOT be a minter on the ERC20 token");
    assert.equal(await erc20Asset.balanceOf(owner), value, `SyscoinERC20Asset's ${owner} balance is not the expected one`);

    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, erc20Asset.address, 8, syscoinAddress,{from: owner});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.address), 0, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);

    await erc20Asset.approve(erc20Manager.address, burnVal, {from: owner});
    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, erc20Asset.address, 8, syscoinAddress,{from: owner});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.address), 0, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal + burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should freeze legacy ERC20 for multiple transactions', async () => {
    assert.equal(await erc20Manager.trustedRelayerContract(), trustedRelayerContract, "trustedRelayerContract is not correct");

    assert.equal(await erc20Legacy.balanceOf(owner), value, `LegacyERC20's ${owner} balance is not the expected one`);

    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, erc20Legacy.address, 8, syscoinAddress,{from: owner});

    assert.equal(await erc20Legacy.balanceOf(erc20Manager.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Legacy.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);

    await erc20Legacy.approve(erc20Manager.address, burnVal, {from: owner});
    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, erc20Legacy.address, 8, syscoinAddress,{from: owner});

    assert.equal(await erc20Legacy.balanceOf(erc20Manager.address), burnVal + burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Legacy.balanceOf(owner), value - burnVal - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal + burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should fail to freeze & burn token without approval', async () => {
    await truffleAssert.reverts(
      erc20Manager.freezeBurnERC20(value, assetGUID, syscoinAddress, erc20Asset.address, 8, syscoinAddress,{from: owner})
    );
    await truffleAssert.reverts(
      erc20Manager.freezeBurnERC20(value, assetGUID, syscoinAddress, erc20Legacy.address, 8, syscoinAddress,{from: owner})
    );
  });

  it('should fail to freeze & burn token below minimum value', async () => {
    await truffleAssert.reverts(
      erc20Manager.freezeBurnERC20(belowMinValue, assetGUID, syscoinAddress, erc20Asset.address, 8, syscoinAddress,{from: owner})
    );
    await truffleAssert.reverts(
      erc20Manager.freezeBurnERC20(belowMinValue, assetGUID, syscoinAddress, erc20Legacy.address, 8, syscoinAddress,{from: owner})
    );
  });

  it('should fail to freeze & burn token if balance is not enough', async () => {
    await erc20Asset.approve(erc20Manager.address, 2*value, {from: owner});
    await truffleAssert.reverts(
      erc20Manager.freezeBurnERC20(2*value, assetGUID, syscoinAddress, erc20Asset.address, 8, syscoinAddress,{from: owner})
    );
    await erc20Legacy.approve(erc20Manager.address, 2*value, {from: owner});
    await truffleAssert.reverts(
      erc20Manager.freezeBurnERC20(2*value, assetGUID, syscoinAddress, erc20Legacy.address, 8, syscoinAddress,{from: owner})
    );
  });
});

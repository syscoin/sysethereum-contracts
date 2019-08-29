var SyscoinERC20Asset = artifacts.require("./token/SyscoinERC20AssetForTests.sol");
var LegacyERC20 = artifacts.require("./token/LegacyERC20ForTests.sol");
var SyscoinERC20Manager = artifacts.require("./token/SyscoinERC20Manager.sol");
var SyscoinERC20ManagerForTests = artifacts.require("./token/SyscoinERC20ManagerForTests.sol");
var AdminUpgradeabilityProxy = artifacts.require("./upgradeability/AdminUpgradeabilityProxy.sol");
var Set = artifacts.require('./token/Set.sol');

const { expectRevert } = require('openzeppelin-test-helpers');


contract('SyscoinERC20Manager', function(accounts) {
  const owner = accounts[1];
  const proxyAdmin = accounts[9];
  const value = 2000000000;
  const burnVal = 1000000000;
  const belowMinValue = 9900000; // 0.0099 token
  const syscoinAddress = "0x004322ec9eb713f37cf8d701d819c165549d53d14e";
  const assetGUID = 1702063431;
  const trustedRelayerContract = accounts[0];
  const randomUser = accounts[2];
  let erc20Manager, erc20Asset, erc20Legacy, erc20AssetNoMint, erc20ManagerLogic, erc20ManagerProxy;

  beforeEach("set up SyscoinERC20Manager, SyscoinERC20Asset and LegacyERC20", async () => {
    erc20ManagerLogic = await SyscoinERC20Manager.new(trustedRelayerContract);
    let data = erc20ManagerLogic.contract.methods.init(trustedRelayerContract).encodeABI();
    erc20ManagerProxy = await AdminUpgradeabilityProxy.new(erc20ManagerLogic.address, proxyAdmin, data);
    erc20Manager = new web3.eth.Contract(
      erc20ManagerLogic.abi,
      erc20ManagerProxy.address,
      {from: owner}
    );
    
    erc20Asset = await SyscoinERC20Asset.new("SyscoinToken", "SYSX", 8, erc20Manager.options.address, {from: owner});
    await erc20Asset.assign(owner, value);
    await erc20Asset.approve(erc20Manager.options.address, burnVal, {from: owner});

    erc20Legacy = await LegacyERC20.new("LegacyToken", "LEGX", 8, {from: owner});
    await erc20Legacy.assign(owner, value);
    await erc20Legacy.approve(erc20Manager.options.address, burnVal, {from: owner});

    erc20AssetNoMint = await SyscoinERC20Asset.new("SyscoinToken", "SYSX", 8, randomUser, {from: owner});
    await erc20AssetNoMint.assign(owner, value);
    await erc20AssetNoMint.approve(erc20Manager.options.address, burnVal, {from: owner});
  })

  it('should burn Syscoin ERC20 Asset', async () => {
    assert.equal(await erc20Manager.methods.trustedRelayerContract().call(), trustedRelayerContract, "trustedRelayerContract is not correct");
    assert.equal(await erc20Asset.isMinter(erc20Manager.options.address), true, "SyscoinERC20Manager should be a minter on the ERC20 token");
    assert.equal(await erc20Asset.isMinter(owner), false, "owner should NOT be a minter on the ERC20 token");
    assert.equal(await erc20Asset.balanceOf(owner), value, `SyscoinERC20Asset's ${owner} balance is not the expected one`);

    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.options.address), 0, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should freeze legacy ERC20', async () => {
    assert.equal(await erc20Manager.methods.trustedRelayerContract().call(), trustedRelayerContract, "trustedRelayerContract is not correct");
    assert.equal(await erc20Legacy.balanceOf(owner), value, `LegacyERC20's ${owner} balance is not the expected one`);

    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Legacy.address, 8, syscoinAddress).send({from: owner, gas: 300000});

    assert.equal(await erc20Legacy.balanceOf(erc20Manager.options.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Legacy.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should freeze Syscoin ERC20 Asset if cannot mint', async () => {
    assert.equal(await erc20Manager.methods.trustedRelayerContract().call(), trustedRelayerContract, "trustedRelayerContract is not correct");
    assert.equal(await erc20AssetNoMint.balanceOf(owner), value, `erc20AssetNoMint's ${owner} balance is not the expected one`);

    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20AssetNoMint.address, 8, syscoinAddress).send({from: owner, gas: 300000});

    assert.equal(await erc20AssetNoMint.balanceOf(erc20Manager.options.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20AssetNoMint.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should burn Syscoin ERC20 Asset for multiple transactions', async () => {
    assert.equal(await erc20Manager.methods.trustedRelayerContract().call(), trustedRelayerContract, "trustedRelayerContract is not correct");

    assert.equal(await erc20Asset.isMinter(erc20Manager.options.address), true, "SyscoinERC20Manager should be a minter on the ERC20 token");
    assert.equal(await erc20Asset.isMinter(owner), false, "owner should NOT be a minter on the ERC20 token");
    assert.equal(await erc20Asset.balanceOf(owner), value, `SyscoinERC20Asset's ${owner} balance is not the expected one`);

    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.options.address), 0, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);

    await erc20Asset.approve(erc20Manager.options.address, burnVal, {from: owner});
    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.options.address), 0, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal + burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should freeze legacy ERC20 for multiple transactions', async () => {
    assert.equal(await erc20Manager.methods.trustedRelayerContract().call(), trustedRelayerContract, "trustedRelayerContract is not correct");

    assert.equal(await erc20Legacy.balanceOf(owner), value, `LegacyERC20's ${owner} balance is not the expected one`);

    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Legacy.address, 8, syscoinAddress).send({from: owner, gas: 300000});

    assert.equal(await erc20Legacy.balanceOf(erc20Manager.options.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Legacy.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);

    await erc20Legacy.approve(erc20Manager.options.address, burnVal, {from: owner});
    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Legacy.address, 8, syscoinAddress).send({from: owner, gas: 300000});

    assert.equal(await erc20Legacy.balanceOf(erc20Manager.options.address), burnVal + burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Legacy.balanceOf(owner), value - burnVal - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal + burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should fail to freeze & burn token without approval', async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(value, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner}),
      "SafeMath: subtraction overflow"
    );
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(value, assetGUID, erc20Legacy.address, 8, syscoinAddress).send({from: owner}),
      "SafeMath: subtraction overflow"
    );
  });

  it('should fail to freeze & burn token below minimum value', async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(belowMinValue, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner}),
      "Value must be bigger or equal MIN_LOCK_VALUE"
    );
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(belowMinValue, assetGUID, erc20Legacy.address, 8, syscoinAddress).send({from: owner}),
      "Value must be bigger or equal MIN_LOCK_VALUE"
    );
  });

  it('should fail to freeze & burn token if balance is not enough', async () => {
    await erc20Asset.approve(erc20Manager.options.address, 2*value, {from: owner});
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(2*value, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner}),
      "SafeMath: subtraction overflow"
    );
    await erc20Legacy.approve(erc20Manager.options.address, 2*value, {from: owner});
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(2*value, assetGUID, erc20Legacy.address, 8, syscoinAddress).send({from: owner}),
      "SafeMath: subtraction overflow"
    );
  });

  it('should fail with incorrect precision', async () => {
    await erc20Legacy.assign(owner, value);
    await erc20Asset.assign(owner, value);
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(value, assetGUID, erc20Asset.address, 7, syscoinAddress).send({from: owner}),
      "Decimals were not provided with the correct value"
    );
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(value, assetGUID, erc20Legacy.address, 17, syscoinAddress).send({from: owner}),
      "Decimals were not provided with the correct value"
    );
  });

  it('should fail with zero syscoinAddress', async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Asset.address, 8, '0x').send({from: owner}),
      "syscoinAddress cannot be zero"
      );
  });

  it('should fail with zero assetGUID', async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(burnVal, 0, erc20Asset.address, 8, syscoinAddress).send({from: owner}),
      "Asset GUID must not be 0"
    );
  });

  it('should upgrade to new logic and freeze token with zero syscoinAddress and zero assetGUID',  async () => {
    let SetLib = await Set.new();
    SyscoinERC20ManagerForTests.link("Set", SetLib.address);
    let SyscoinERC20ManagerV2 = await SyscoinERC20ManagerForTests.new(trustedRelayerContract);
    await erc20ManagerProxy.upgradeTo(SyscoinERC20ManagerV2.address, {from: proxyAdmin});

    assert.equal(erc20ManagerProxy.address, erc20Manager.options.address, "Both object should point to the same smart contract");

    assert.equal(await erc20Manager.methods.assetBalances(0).call(), 0, `initial assetBalances for ${assetGUID} GUID is not correct`);

    // this would revert in previous version
    await erc20Manager.methods.freezeBurnERC20(burnVal, 0, erc20Asset.address, 8, '0x').send({from: owner});

    assert.equal(await erc20Manager.methods.assetBalances(0).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should fail if trying to upgrade from non-admin', async () => {
    let SyscoinERC20ManagerV2 = await SyscoinERC20ManagerForTests.new(trustedRelayerContract);
    await expectRevert.unspecified(
      erc20ManagerProxy.upgradeTo(SyscoinERC20ManagerV2.address, {from: owner})
    );
  });
});

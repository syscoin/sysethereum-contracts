const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');
const utils = require('./utils');
/* Initialize OpenZeppelin's Web3 provider. */
ZWeb3.initialize(web3.currentProvider);

/* Retrieve compiled contract artifacts. */
// fix for magically failing tests
Contracts.artifactDefaults = {
  data: undefined,
  from: undefined,
  gasPrice: undefined,
  gas: undefined 
};
const SyscoinERC20ManagerV0 = Contracts.getFromLocal('SyscoinERC20Manager');
const SyscoinERC20ManagerV1 = Contracts.getFromLocal('SyscoinERC20ManagerForTests');

var SyscoinERC20 = artifacts.require("./token/SyscoinERC20.sol");

const { expectRevert } = require('openzeppelin-test-helpers');


contract('SyscoinERC20Manager', function(accounts) {
  const owner = accounts[1];
  const proxyAdmin = accounts[9];
  const value =   2000000000;
  const burnVal = 1000000000;
  const belowMinValue = 9900000; // 0.099 token
  const syscoinAddress = "0x004322ec9eb713f37cf8d701d819c165549d53d14e";
  const assetGUID = 1702063431;
  const trustedRelayerContract = accounts[0];
  let erc20Manager, erc20Asset;


  beforeEach("set up SyscoinERC20Manager, SyscoinERC20", async () => {
    this.project = await TestHelper({from: proxyAdmin});
    erc20Manager = await this.project.createProxy(SyscoinERC20ManagerV0, {
      initMethod: 'init',
      initArgs: [utils.SYSCOIN_REGTEST, trustedRelayerContract]
    });
    
    erc20Asset = await SyscoinERC20.new("SyscoinToken", "SYSX", 8, {from: owner});
    await erc20Asset.assign(owner, value);
    await erc20Asset.approve(erc20Manager.options.address, burnVal, {from: owner}); 
  })

  it('should burn SyscoinERC20 Asset', async () => {
    assert.equal(await erc20Manager.methods.trustedRelayerContract().call(), trustedRelayerContract, "trustedRelayerContract is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value, `ERC20Asset's ${owner} balance is not the expected one`);

    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner, gas: 300000});
    assert.equal(await erc20Asset.balanceOf(erc20Manager.options.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });


  it('should burn SyscoinERC20 Asset for multiple transactions', async () => {
    assert.equal(await erc20Manager.methods.trustedRelayerContract().call(), trustedRelayerContract, "trustedRelayerContract is not correct");

    assert.equal(await erc20Asset.balanceOf(owner), value, `ERC20Asset's ${owner} balance is not the expected one`);

    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner, gas: 300000});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.options.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);

    await erc20Asset.approve(erc20Manager.options.address, burnVal, {from: owner});
    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner, gas: 300000});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.options.address), burnVal + burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal + burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  

  it('should fail to freeze & burn token without approval', async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(value, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner}),
      "ERC20: transfer amount exceeds allowance"
    );
  });

  it('should fail to freeze & burn token below minimum value', async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(belowMinValue, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner}),
      "Value must be bigger or equal MIN_LOCK_VALUE"
    );
  });

  it('should fail to freeze & burn token if balance is not enough', async () => {
    await erc20Asset.approve(erc20Manager.options.address, 2*value, {from: owner});
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(2*value, assetGUID, erc20Asset.address, 8, syscoinAddress).send({from: owner}),
      "ERC20: transfer amount exceeds balance"
    );
  });

  it('should fail with incorrect precision', async () => {
    await erc20Asset.assign(owner, value);
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(value, assetGUID, erc20Asset.address, 7, syscoinAddress).send({from: owner}),
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
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(burnVal, 0, erc20Asset.address, 8, '0x').send({from: owner}),
      "syscoinAddress cannot be zero"
    );

    await this.project.upgradeProxy(erc20Manager.address, SyscoinERC20ManagerV1);

    assert.equal(await erc20Manager.methods.assetBalances(0).call(), 0, `initial assetBalances for ${assetGUID} GUID is not correct`);

    // this would revert if upgrate did not succeed
    await erc20Manager.methods.freezeBurnERC20(burnVal, 0, erc20Asset.address, 8, '0x').send({from: owner, gas: 300000});

    assert.equal(await erc20Manager.methods.assetBalances(0).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });
});

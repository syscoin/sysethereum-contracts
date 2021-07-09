
const SyscoinERC20 = artifacts.require("./token/SyscoinERC20.sol");
const SyscoinERC20Manager = artifacts.require('./token/SyscoinERC20Manager.sol');
const truffleAssert = require('truffle-assertions');

contract('SyscoinERC20Manager', function(accounts) {
  const owner = accounts[1];
  const value =   2000000000;
  const burnVal = 1000000000;
  const syscoinAddress = "004322ec9eb713f37cf8d701d819c165549d53d14e";
  const assetGUID = 1702063431;
  const trustedRelayerContract = accounts[0];
  let erc20Manager, erc20Asset;


  beforeEach("set up SyscoinERC20Manager, SyscoinERC20", async () => {
    erc20Asset = await SyscoinERC20.new("SyscoinToken", "SYSX", 8, {from: owner});
    erc20Manager = await SyscoinERC20Manager.new(trustedRelayerContract, assetGUID, erc20Asset.address);
    
    await erc20Asset.assign(owner, value);
    await erc20Asset.approve(erc20Manager.address, burnVal, {from: owner}); 

  })

  it('should burn SyscoinERC20 Asset', async () => {
    assert.equal(await erc20Manager.trustedRelayerContract(), trustedRelayerContract, "trustedRelayerContract is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value, `ERC20Asset's ${owner} balance is not the expected one`);
    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, {from: owner, gas: 300000});
    assert.equal(await erc20Asset.balanceOf(erc20Manager.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });


  it('should burn SyscoinERC20 Asset for multiple transactions', async () => {
    assert.equal(await erc20Manager.trustedRelayerContract(), trustedRelayerContract, "trustedRelayerContract is not correct");

    assert.equal(await erc20Asset.balanceOf(owner), value, `ERC20Asset's ${owner} balance is not the expected one`);

    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, {from: owner, gas: 300000});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);

    await erc20Asset.approve(erc20Manager.address, burnVal, {from: owner});
    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, {from: owner, gas: 300000});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.address), burnVal + burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal + burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should fail to freeze & burn token without approval', async () => {
    await truffleAssert.reverts(
      erc20Manager.freezeBurnERC20(value, assetGUID, syscoinAddress, {from: owner}),
      "Returned error: VM Exception while processing transaction: revert"
    );
  });


  it('should fail to freeze & burn token if balance is not enough', async () => {
    await erc20Asset.approve(erc20Manager.address, 2*value, {from: owner});
    await truffleAssert.reverts(
      erc20Manager.freezeBurnERC20(2*value, assetGUID, syscoinAddress, {from: owner}),
      "Returned error: VM Exception while processing transaction: revert"
    );
  });


  it('should fail with zero syscoinAddress', async () => {
    await truffleAssert.reverts(
      erc20Manager.freezeBurnERC20(burnVal, assetGUID,'', {from: owner}),
      "syscoinAddress cannot be zero"
      );
  });

  it('should fail with zero assetGUID', async () => {
    await truffleAssert.reverts(
      erc20Manager.freezeBurnERC20(burnVal, 0, syscoinAddress, {from: owner}),
      "Asset GUID must not be 0"
    );
  });

});

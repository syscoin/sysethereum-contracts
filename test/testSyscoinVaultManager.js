
const SyscoinVaultManager = artifacts.require('./SyscoinVaultManager.sol');
const truffleAssert = require('truffle-assertions');

contract('SyscoinVaultManager', function(accounts) {
  const owner = accounts[1];
  const value =   2000000000;
  const burnVal = 1000000000;
  const syscoinAddress = "004322ec9eb713f37cf8d701d819c165549d53d14e";
  const trustedRelayerContract = accounts[0];
  let vaultManager;


  beforeEach("set up SyscoinVaultManager", async () => {
    vaultManager = await SyscoinVaultManager.new(trustedRelayerContract);
  })

  it('should burn Syscoin', async () => {
    assert.equal(await vaultManager.trustedRelayerContract(), trustedRelayerContract, "trustedRelayerContract is not correct");
    //assert.equal(await erc20Asset.balanceOf(owner), value, `ERC20Asset's ${owner} balance is not the expected one`);
    await vaultManager.freezeBurn(burnVal, syscoinAddress, {from: owner, gas: 300000});
   /* assert.equal(await erc20Asset.balanceOf(erc20Manager.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGuid), burnVal, `assetBalances for ${assetGuid} Guid is not correct`);*/
  });


  it('should burn Syscoin for multiple transactions', async () => {
    assert.equal(await vaultManager.trustedRelayerContract(), trustedRelayerContract, "trustedRelayerContract is not correct");

   // assert.equal(await erc20Asset.balanceOf(owner), value, `ERC20Asset's ${owner} balance is not the expected one`);

    await vaultManager.freezeBurn(burnVal, syscoinAddress, {from: owner, gas: 300000});

    /*assert.equal(await erc20Asset.balanceOf(erc20Manager.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await vaultManager.assetBalances(assetGuid), burnVal, `assetBalances for ${assetGuid} Guid is not correct`);
*/
    await vaultManager.freezeBurn(burnVal, syscoinAddress, {from: owner, gas: 300000});

    //assert.equal(await erc20Asset.balanceOf(erc20Manager.address), burnVal + burnVal, "erc20Manager balance is not correct");
    //assert.equal(await erc20Asset.balanceOf(owner), value - burnVal - burnVal, `erc20Asset's user balance after burn is not the expected one`);
   // assert.equal(await vaultManager.assetBalances(assetGuid), burnVal + burnVal, `assetBalances for ${assetGuid} Guid is not correct`);
  });

  it('should fail to freeze & burn token without approval', async () => {
    await truffleAssert.reverts(
      vaultManager.freezeBurn(value, syscoinAddress, {from: owner}),
      "Returned error: VM Exception while processing transaction: revert"
    );
  });


  it('should fail to freeze & burn token if balance is not enough', async () => {
    await truffleAssert.reverts(
      vaultManager.freezeBurn(2*value, syscoinAddress, {from: owner}),
      "Returned error: VM Exception while processing transaction: revert"
    );
  });


  it('should fail with zero syscoinAddress', async () => {
    await truffleAssert.reverts(
      vaultManager.freezeBurn(burnVal,'', {from: owner}),
      "syscoinAddress cannot be zero"
      );
  });

});

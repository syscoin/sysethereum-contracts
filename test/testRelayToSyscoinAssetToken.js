
const SyscoinERC20Manager = artifacts.require("./token/SyscoinERC20Manager.sol");
const SyscoinERC20 = artifacts.require("./token/SyscoinERC20.sol");
const SyscoinRelayArtifact = artifacts.require('SyscoinRelay');
const truffleAssert = require('truffle-assertions');

contract('testRelayToSyscoinAssetToken', function(accounts) {
  const owner = accounts[1];
  let value = web3.utils.toWei("20");
  const burnVal = web3.utils.toWei("0.5");
  const syscoinAddress = "004322ec9eb713f37cf8d701d819c165549d53d14e";
  const assetGUID = 123456;
  let assetGUIDParsed;
  let erc20Address;
  const trustedRelayerContract = accounts[0];
  let erc20Manager, erc20Token;
  let ret, amount;
  const txHash = '0x1af00a984c6264e1202d676d79d9a099275f130c007e30d00a76fa299fcbb481';
  const txData = '0x8600000000010228ed59d71961dafec1b182e46bc728b65fd6a72f0889dff7a7ec81c8fa6c840c0100000000feffffffb63f6c7ee12ef77f24684101ff029117ff77f5680f395645b00d93f7054e9df60000000000feffffff020000000000000000216a1f0186c340020030013000140a300433019986214c2cad9cadbcd7b54f245f81f9321a1e01000000160014f78dac4b40114a46e35b904e54d1af548f7e068d024730440220640f01887a2f55a946f3b118621fc9dd4bff2b29b5e154fa28b40e5c758e7532022065e8e0df2439c6bc3ebb0b84e0d17bda17857553a01f365cdeeedde93c724dd4012103be74d90431aa52aa558a55a8b8ac821d7ba84798ab47347d3923e6d67b8a24ce0247304402202ec09213bf61f8afc9e2ec7dc9114d5d2c64f488318f0a3587ee1c82b0a15de502206866a523fcf4e09708cdcb42d9384a2d7de7dfa3e4e1884cb56a66935a39ea82012102d8dc16f2e1acbcc615b2c6a8e565212c973d30ad8eea2dc7040df70170bb82c500000000';
  const erc20Owner = '0x0a300433019986214C2cAD9CaDbcD7b54f245f81';
  before(async () => {
    erc20Token = await SyscoinERC20.new("LegacyToken", "LEGX", 18, {from: owner});
    erc20Manager = await SyscoinERC20Manager.new(trustedRelayerContract, assetGUID, erc20Token.address);

    SyscoinRelay = await SyscoinRelayArtifact.new();
    
    
    await erc20Token.assign(owner, value);
    await erc20Token.approve(erc20Manager.address, burnVal, {from: owner});
    // burn erc20
    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, {from: owner, gas: 300000});
    
    assert.equal(await erc20Token.balanceOf(erc20Manager.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Token.balanceOf(owner), value - burnVal, `erc20Token's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.assetBalances(assetGUID), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
    [ ret, amount, erc20Address, assetGUIDParsed ]  = Object.values(await SyscoinRelay.parseBurnTx(txData));
    assert.equal(ret,0);
  });

  it('test mint asset', async () => {
    assert.equal(amount,0x2faf080); // burn value 0.5 COINS, the SPT has 8 precision
    assert.equal(assetGUIDParsed,assetGUID)
    assert.equal(erc20Address,erc20Owner);
    erc20Manager.assetBalances.call(assetGUID, function(err, result){
      assert.equal(result, burnVal, "erc20Manager balance is not correct");
    });
    await erc20Manager.processTransaction(txHash, amount.toString(), erc20Owner, assetGUID, {gas: 300000, from: trustedRelayerContract});
    const userValue = burnVal;
    assert.equal(await erc20Token.balanceOf(erc20Owner), userValue, `erc20Token's user balance after mint is not the expected one`);
  });
  it("processTransaction fail - tx already processed", async () => {
    await erc20Token.approve(erc20Manager.address, burnVal, {from: owner});
    await erc20Manager.freezeBurnERC20(burnVal, assetGUID, syscoinAddress, {from: owner, gas: 300000});
    await truffleAssert.reverts(erc20Manager.processTransaction(txHash, amount.toString(), owner,assetGUID, {from: trustedRelayerContract, gas: 300000}));
  });
});

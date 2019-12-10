const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');

/* Initialize OpenZeppelin's Web3 provider. */
ZWeb3.initialize(web3.currentProvider);

const SyscoinERC20Manager = Contracts.getFromLocal('SyscoinERC20Manager');
var ERC20 = artifacts.require("./token/SyscoinERC20.sol");
const SyscoinMessageLibraryForTests = artifacts.require('SyscoinMessageLibraryForTests');
const truffleAssert = require('truffle-assertions');

contract('testRelayToSyscoinAssetToken', function(accounts) {
  const owner = accounts[1];
  const proxyAdmin = accounts[9];
  let value = web3.utils.toWei("20");
  const burnVal = web3.utils.toWei("10");
  const syscoinAddress = "0x004322ec9eb713f37cf8d701d819c165549d53d14e";
  const assetGUID = 986377920;
  let assetGUIDParsed;
  let erc20Address;
  const trustedRelayerContract = accounts[0];
  let erc20Manager, erc20Token;
  const superblockSubmitterAddress = accounts[4];
  let ret, amount, inputEthAddress, precision;
  const txHash = '0xfb9f37192e041f94d9b1db12ea50778f2019b167059f6063561477982162d8f2';
  const txData = '0x0774000001d46638fce247272c08eec7be46ea2f2c5a92d27ac6a6d59e7f83051e0cc9664201000000160014e37ddd289ccd1fb130a91210644810b2415aec40feffffff020000000000000000526a043acaeec008000000003b9aca0014b0ea8c9ee8aa87efd28a12de8c034f947c144053010814fe234d3994f95bf7cebd9837c4444f5af63f0a97010014e37ddd289ccd1fb130a91210644810b2415aec40f8d7754817000000160014e37ddd289ccd1fb130a91210644810b2415aec4000000000';
  const erc20LegacyRinkeby = '0xfE234d3994f95Bf7CEBD9837C4444F5AF63F0a97';
  before(async () => {
    this.project = await TestHelper({from: proxyAdmin});
    erc20Manager = await this.project.createProxy(SyscoinERC20Manager, {
      initMethod: 'init',
      initArgs: [trustedRelayerContract]
    });

    syscoinMessageLibraryForTests = await SyscoinMessageLibraryForTests.new();
    
    erc20Token = await ERC20.new("LegacyToken", "LEGX", 18, {from: owner});
    await erc20Token.assign(owner, value);
    await erc20Token.approve(erc20Manager.options.address, burnVal, {from: owner});
    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, erc20Token.address, 18, syscoinAddress).send({from: owner, gas: 300000});
    
    assert.equal(await erc20Token.balanceOf(erc20Manager.options.address), value - burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Token.balanceOf(owner), burnVal, `erc20Token's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
    [ ret, amount, inputEthAddress, assetGUIDParsed, precision, erc20Address ]  = Object.values(await syscoinMessageLibraryForTests.parseBurnTx(txData));
    
  });

  const address = web3.utils.toChecksumAddress('0xb0ea8c9ee8aa87efd28a12de8c034f947c144053');
  it('test mint asset', async () => {
    assert.equal(assetGUIDParsed,986377920)
    assert.equal(inputEthAddress,address);
    assert.equal(amount,1000000000);
    assert.equal(precision,8);
    assert.equal(erc20Address,erc20LegacyRinkeby);
    await erc20Manager.methods.processTransaction(txHash, amount.toString(), owner,superblockSubmitterAddress,erc20Token.address, assetGUID, precision.toString()).send({gas: 300000, from: trustedRelayerContract});
    // now check the user and superblock submitter balances reflect the mint amounts
    const superblockSubmitterFee = burnVal/10000;
    const userValue = value - superblockSubmitterFee;
    assert.equal(await erc20Token.balanceOf(owner), userValue, `erc20Token's user balance after mint is not the expected one`);
    assert.equal(await erc20Token.balanceOf(superblockSubmitterAddress), superblockSubmitterFee, `erc20Token's superblock submitter balance after mint is not the expected one`);
  });
  it("processTransaction fail - tx already processed", async () => {
    await erc20Token.approve(erc20Manager.options.address, burnVal, {from: owner});
    await truffleAssert.reverts(erc20Manager.methods.processTransaction(txHash, amount.toString(), inputEthAddress,superblockSubmitterAddress,erc20Token.address, assetGUID, precision.toString()).send({from: trustedRelayerContract, gas: 300000}));
  });
});

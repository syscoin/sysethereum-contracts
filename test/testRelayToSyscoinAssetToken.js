const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');
const utils = require('./utils');
/* Initialize OpenZeppelin's Web3 provider. */
ZWeb3.initialize(web3.currentProvider);

const SyscoinERC20Manager = Contracts.getFromLocal('SyscoinERC20Manager');
var ERC20 = artifacts.require("./token/SyscoinERC20.sol");
const SyscoinSuperblocksArtifact = artifacts.require('SyscoinSuperblocks');
const truffleAssert = require('truffle-assertions');

contract('testRelayToSyscoinAssetToken', function(accounts) {
  const owner = accounts[1];
  const proxyAdmin = accounts[9];
  let value = web3.utils.toWei("20");
  const burnVal = web3.utils.toWei("10");
  const syscoinAddress = "004322ec9eb713f37cf8d701d819c165549d53d14e";
  const assetGUID = 3725793040;
  let assetGUIDParsed;
  let erc20Address;
  const trustedRelayerContract = accounts[0];
  let erc20Manager, erc20Token;
  const superblockSubmitterAddress = accounts[4];
  let ret, amount;
  const txHash = '0x1af00a984c6264e1202d676d79d9a099275f130c007e30d00a76fa299fcbb481';
  const txData = '0x86000000000102cd69ed3add69ef46f820a3e8248507e9401e940efc1ccb8010e253b1640c8f480200000000feffffffa221cb90e439ca8c5583238feebd31d6f6bf788895fb2fc4981150783b238f260000000000feffffff020000000000000000216a1f01101713de02000a015a14fe234d3994f95bf7cebd9837c4444f5af63f0a97f9336fc4130000001600148a397f06baf551349eb1327f9c0d94fb054e3d94024730440220375ca6f154e362631fdc393fd3968c41d457c8c3ba847e2c12638116f4f89470022019b25ffcefbc84b005cc571f5262d33c4e8f820fa1cc92bf1e09861207fb38a00121035c5cd51716d11b51db2aae42e309f691b26fcb784bd5b68730e005167475b9dd02473044022078260660eae3a910e26f3e017416e68fafbfaa5ee018f204195993c0167fbbea02201a9c59ca1985440ccef67e67ddb158a8cf4fad57c310b0caea474f769f1c6cac0121038a79c8bee13e10d162ea5cb88c19455e75a1ba81debfcbc63b5bee44df7b4c1ccd000000';
  const erc20OwnerRinkeby = '0xfE234d3994f95Bf7CEBD9837C4444F5AF63F0a97';
  before(async () => {
    this.project = await TestHelper({from: proxyAdmin});
    erc20Manager = await this.project.createProxy(SyscoinERC20Manager, {
      initMethod: 'init',
      initArgs: [utils.SYSCOIN_REGTEST, trustedRelayerContract]
    });

    SyscoinSuperblocks = await SyscoinSuperblocksArtifact.new();
    
    erc20Token = await ERC20.new("LegacyToken", "LEGX", 18, {from: owner});
    await erc20Token.assign(owner, value);
    await erc20Token.approve(erc20Manager.options.address, burnVal, {from: owner});
    // set registry
    await erc20Manager.methods.processAsset('0x0', assetGUID, 1, erc20Token.address, 8).send({gas: 300000, from: trustedRelayerContract});
    // burn erc20
    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, syscoinAddress).send({from: owner, gas: 300000});
    
    assert.equal(await erc20Token.balanceOf(erc20Manager.options.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Token.balanceOf(owner), value - burnVal, `erc20Token's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
    [ ret, amount, erc20Address, assetGUIDParsed ]  = Object.values(await SyscoinSuperblocks.parseBurnTx(txData));
  });

  it('test mint asset', async () => {
    assert.equal(assetGUIDParsed,assetGUID)
    assert.equal(amount,1000000000); // burn value 10 COINS, the SPT has 8 percision
    assert.equal(erc20Address,erc20OwnerRinkeby);
    await erc20Manager.methods.processTransaction(txHash, amount.toString(), erc20OwnerRinkeby, superblockSubmitterAddress, assetGUID).send({gas: 300000, from: trustedRelayerContract});
    // now check the user and superblock submitter balances reflect the mint amounts
    const superblockSubmitterFee = burnVal/10000;
    const userValue = burnVal - superblockSubmitterFee;
    assert.equal(await erc20Token.balanceOf(erc20OwnerRinkeby), userValue, `erc20Token's user balance after mint is not the expected one`);
    assert.equal(await erc20Token.balanceOf(superblockSubmitterAddress), superblockSubmitterFee, `erc20Token's superblock submitter balance after mint is not the expected one`);
  });
  it("processTransaction fail - tx already processed", async () => {
    await erc20Token.approve(erc20Manager.options.address, burnVal, {from: owner});
    await truffleAssert.reverts(erc20Manager.methods.processTransaction(txHash, amount.toString(), owner,superblockSubmitterAddress,assetGUID).send({from: trustedRelayerContract, gas: 300000}));
  });
});

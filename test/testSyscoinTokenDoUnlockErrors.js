var SyscoinToken = artifacts.require("./token/SyscoinTokenForTests.sol");
var utils = require('./utils');

contract('testSyscoinTokenDoUnlockRequires', function(accounts) {
  let syscoinToken;
  before(async () => {
      syscoinToken = await SyscoinToken.deployed();
  });
  it('doUnlock fails when it should', async () => {


    await syscoinToken.assign(accounts[0], 3000000000);
  
    // unlock an amount below min value.
    var doUnlockTxReceipt = await syscoinToken.burn(200000000, 0, 0x004322ec9eb713f37cf8d701d819c165549d53d14e);
    assert.equal(60080, doUnlockTxReceipt.logs[0].args.err, "Expected ERR_UNLOCK_MIN_UNLOCK_VALUE error");


    // unlock an amount greater than user value.
    doUnlockTxReceipt = await syscoinToken.burn(200000000000, 0, 0x004322ec9eb713f37cf8d701d819c165549d53d14e);
    assert.equal(60090, doUnlockTxReceipt.logs[0].args.err, "Expected ERR_UNLOCK_USER_BALANCE error");

  });
});

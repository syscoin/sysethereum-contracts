var SyscoinToken = artifacts.require("./token/SyscoinTokenForTests.sol");
var utils = require('./utils');


contract('testSyscoinTokenDoUnlock2', function(accounts) {
  let syscoinToken;
  before(async () => {
      syscoinToken = await SyscoinToken.deployed();
  });
  it('doUnlock whith multiple txs', async () => {
    await syscoinToken.assign(accounts[0], 5600000000);
    var balance = await syscoinToken.balanceOf(accounts[0]);

    // Unlock Request 1
    await syscoinToken.burn(1000000000, 0, "0x004322ec9eb713f37cf8d701d819c165549d53d14e").then(function(result) {
    });

    balance = await syscoinToken.balanceOf(accounts[0]);
    assert.equal(balance, 4600000000, `SyscoinToken's ${accounts[0]} balance after unlock is not the expected one`);


    // Unlock Request 2
    await syscoinToken.burn(1500000000, 0, "0x004322ec9eb713f37cf8d701d819c165549d53d14e");
    balance = await syscoinToken.balanceOf(accounts[0]);
    assert.equal(balance, 3100000000, `SyscoinToken's ${accounts[0]} balance after unlock is not the expected one`);




  });
});

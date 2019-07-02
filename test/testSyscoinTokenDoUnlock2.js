var SyscoinToken = artifacts.require("./token/SyscoinTokenForTests.sol");
var utils = require('./utils');


contract('testSyscoinTokenDoUnlock2', function(accounts) {
  it('doUnlock whith multiple txs', async () => {
    const trustedRelayerContract = accounts[0]; // Tell SyscoinToken to trust accounts[0] as it would be the relayer contract
    let syscoinToken = await SyscoinToken.new(trustedRelayerContract, 1702063431, "SyscoinToken", 8, "SYSX");
    await syscoinToken.assign(accounts[0], 5600000000);
    var balance = await syscoinToken.balanceOf(accounts[0]);

    // Unlock Request 1
    await syscoinToken.burn(1000000000, 1702063431, "0x004322ec9eb713f37cf8d701d819c165549d53d14e").then(function(result) {
    });

    balance = await syscoinToken.balanceOf(accounts[0]);
    assert.equal(balance, 4600000000, `SyscoinToken's ${accounts[0]} balance after unlock is not the expected one`);


    // Unlock Request 2
    await syscoinToken.burn(1500000000, 1702063431, "0x004322ec9eb713f37cf8d701d819c165549d53d14e");
    balance = await syscoinToken.balanceOf(accounts[0]);
    assert.equal(balance, 3100000000, `SyscoinToken's ${accounts[0]} balance after unlock is not the expected one`);




  });
});

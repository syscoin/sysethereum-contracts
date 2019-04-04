var SyscoinToken = artifacts.require("./token/SyscoinTokenForTests.sol");
var utils = require('./utils');


contract('testSyscoinTokenDoUnlock', function(accounts) {
  let syscoinToken;
  before(async () => {
      syscoinToken = await SyscoinToken.deployed();
  });
  it('doUnlock does not fail', async () => {
   

    await syscoinToken.assign(accounts[0], 2000000000);
    var balance = await syscoinToken.balanceOf(accounts[0]);
    assert.equal(balance, 2000000000, `SyscoinToken's ${accounts[0]} balance is not the expected one`);

  
    const burnResult = await syscoinToken.burn(1000000000, 0 ,"0x004322ec9eb713f37cf8d701d819c165549d53d14e");
    const burnHex = await web3.eth.getTransaction(burnResult.receipt.transactionHash);
    assert.equal(burnHex.input, "0x285c5bc6000000000000000000000000000000000000000000000000000000003b9aca00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000015004322ec9eb713f37cf8d701d819c165549d53d14e0000000000000000000000");
    

    
    balance = await syscoinToken.balanceOf(accounts[0]);
    assert.equal(balance.toNumber(), 1000000000, `SyscoinToken's user balance after unlock is not the expected one`);

  });
});

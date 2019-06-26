var SyscoinToken = artifacts.require("./token/SyscoinTokenForTests.sol");
const truffleAssert = require('truffle-assertions');
contract('testSyscoinTokenDoUnlockRequires', function(accounts) {
  let syscoinToken;
  before(async () => {
      syscoinToken = await SyscoinToken.deployed();
  });
  it('doUnlock fails when it should', async () => {


    await syscoinToken.assign(accounts[0], 3000000000);
  
    // unlock an amount below min value.
    await truffleAssert.reverts(syscoinToken.burn(200000000, 0, "0x004322ec9eb713f37cf8d701d819c165549d53d14e"));


    // unlock an amount greater than user value.
    await truffleAssert.reverts(syscoinToken.burn(200000000000, 0, "0x004322ec9eb713f37cf8d701d819c165549d53d14e"));
    
    // bad asset guid
    await truffleAssert.reverts(syscoinToken.burn(2000000000, 1, "0x004322ec9eb713f37cf8d701d819c165549d53d14e"));
    
  });
});

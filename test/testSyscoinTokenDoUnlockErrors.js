var SyscoinToken = artifacts.require("./token/SyscoinTokenForTests.sol");
const truffleAssert = require('truffle-assertions');
contract('testSyscoinTokenDoUnlockRequires', function(accounts) {

  it('doUnlock fails when it should', async () => {

    const trustedRelayerContract = accounts[0]; // Tell SyscoinToken to trust accounts[0] as it would be the relayer contract
    let syscoinToken = await SyscoinToken.new(trustedRelayerContract, 1702063431, "SyscoinTokenAsset", 8, "SYSASSETX");
    await syscoinToken.assign(accounts[0], 3000000000);
  
    // unlock an amount below min value.
    await truffleAssert.reverts(syscoinToken.burn(200000000, 1702063431, 0x004322ec9eb713f37cf8d701d819c165549d53d14e));


    // unlock an amount greater than user value.
    await truffleAssert.reverts(syscoinToken.burn(200000000000, 1702063431, 0x004322ec9eb713f37cf8d701d819c165549d53d14e));
    
    // bad asset guid
    await truffleAssert.reverts(syscoinToken.burn(2000000000, 1702063430, 0x004322ec9eb713f37cf8d701d819c165549d53d14e));
    
  });
});

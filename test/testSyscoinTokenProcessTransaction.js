var SyscoinToken = artifacts.require("./token/SyscoinTokenForTests.sol");
var utils = require('./utils');


contract('testSyscoinTokenProcessTransaction', function(accounts) {
  const trustedRelayerContract = accounts[0]; // Tell SyscoinToken to trust accounts[0] as it would be the relayer contract

  const txHash = '0x718add98dca8f54288b244dde3b0e797e8fe541477a08ef4b570ea2b07dccd3f';
  const txData = '0x020000000001014023e3c1442d54d4986464f37bb4804e19130baa67615fe9bc37380d1a8c10cd0000000000ffffffff02c09ee60500000000176a511456d82225d76ced3b03442cb2162d53e075a1cb6978370f0000000000160014763be29b909fdb7cc83a88233c5f2e0d696194cb0247304402202097af3dc28af80345221e486299603b2a4bb1345f14cec0f523ba3a67681b0502203657aa96fb712880999013f566f97171ea06c0be62fef98d9f81f9d3a4b1ba9b0121032e137cb103813687b563e9d5deabaa5787dc7c37da2d2ad800609b0ba94ba80f00000000';
  const address = '0x30d90d1dbf03aa127d58e6af83ca1da9e748c98d';
  const value = 905853205327;

  it("processTransaction success", async () => {
    let syscoinToken = await SyscoinToken.new(trustedRelayerContract, 0);
    console.log("contract address " + syscoinToken.address);
    const superblockSubmitterAddress = accounts[4];
    await syscoinToken.processTransaction(txHash, value, address, 0, superblockSubmitterAddress);

    const superblockSubmitterFee = 905853205; 
    const userValue = value - superblockSubmitterFee;

    const balance = await syscoinToken.balanceOf(address);
    assert.equal(balance.toString(10), userValue, `SyscoinToken's ${address} balance is not the expected one`);
    var superblockSubmitterTokenBalance = await syscoinToken.balanceOf(superblockSubmitterAddress);
    assert.equal(superblockSubmitterTokenBalance.toNumber(), superblockSubmitterFee, `SyscoinToken's superblock submitter balance is not the expected one`);


  });

  it("processTransaction fail - tx already processed", async () => {
    let syscoinToken = await SyscoinToken.new(trustedRelayerContract,0);
    const superblockSubmitterAddress = accounts[4];
    await syscoinToken.processTransaction(txHash, value, address, 0, superblockSubmitterAddress);

    var processTransactionTxReceipt = await syscoinToken.processTransaction(txHash, value, address, 0, superblockSubmitterAddress);
    assert.equal(60070, processTransactionTxReceipt.logs[0].args.err, "Expected ERR_PROCESS_TX_ALREADY_PROCESSED error");
  });

});

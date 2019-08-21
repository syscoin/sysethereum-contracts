var SyscoinToken = artifacts.require("./token/SyscoinTokenForTests.sol");
const SyscoinMessageLibraryForTests = artifacts.require('SyscoinMessageLibraryForTests');

contract('testRelayToSyscoinAssetToken', function(accounts) {
  before(async () => {
    syscoinMessageLibraryForTests = await SyscoinMessageLibraryForTests.new();
  });
  const trustedRelayerContract = accounts[0]; // Tell SyscoinToken to trust accounts[0] as it would be the relayer contract
  const superblockSubmitterAddress = accounts[4];
  const txHash = '0x20cc6689f9ce4fdb661341720bf33414455e0b623eaf10b1333e60fecab2ed5b';
  const txData = '0x077400000001017016f189c5594d5787d42ab53c9085e06d32a74f5d858f966f47036e799c16df0100000000ffffffff0400000000000000003b6a0465736d4708000000003b9aca00145a714c3ed4ce4f297679e733f3c476b24d8895e50100147f0618238b7a35f78a3338332822ee1c0de9636330750000000000001600147f0618238b7a35f78a3338332822ee1c0de9636330750000000000001600147f0618238b7a35f78a3338332822ee1c0de9636304eb0a54020000001600147f0618238b7a35f78a3338332822ee1c0de963630247304402203d7529bd258223c55729fa8adf417a500746aeef2730223791a45134c133a07302201dd4f7f36866865b29c71993239c0be140de43438e9f19d51637cd96b69ee731012102a1376a9732077c2432e3c50f039fdb3b7fab50871d48d36a6e34d2fc87250cc300000000';
  const value = 1000000000;
  // passed into syscoin burn function
  const address = web3.utils.toChecksumAddress('0x5a714c3ed4ce4f297679e733f3c476b24d8895e5');
  it('test mint and burn asset', async () => {
    let syscoinToken = await SyscoinToken.new(trustedRelayerContract, 1702063431, "SyscoinToken", 8, "SYSX");
    const [ ret, amount, inputEthAddress, precision, assetGUID ]  = Object.values(await syscoinMessageLibraryForTests.parseTransaction(txData));
    assert.equal(assetGUID,1702063431);
    assert.equal(inputEthAddress,address);
    await syscoinToken.processTransaction(txHash, amount, inputEthAddress, assetGUID, superblockSubmitterAddress, precision);
    const superblockSubmitterFee = value/10000; 
    const userValue = value - superblockSubmitterFee;

    const balance = await syscoinToken.balanceOf(address);
    assert.equal(balance.toString(10), userValue, `SyscoinToken's ${address} balance is not the expected one`);
    var superblockSubmitterTokenBalance = await syscoinToken.balanceOf(superblockSubmitterAddress);
    assert.equal(superblockSubmitterTokenBalance.toNumber(), superblockSubmitterFee, `SyscoinToken's superblock submitter balance is not the expected one`);

    await syscoinToken.assign(accounts[0], 2000000000);
    const balance2 = await syscoinToken.balanceOf(accounts[0])
    assert.equal(balance2, 2000000000, `SyscoinToken's ${accounts[0]} balance is not the expected one`);

    // 0x004322ec9eb713f37cf8d701d819c165549d53d14e == 0 for version and 4322ec9eb713f37cf8d701d819c165549d53d14e for witness program (20 byte p2wpkh)
    const burnResult = await syscoinToken.burn(2000000000, 1702063431, "0x004322ec9eb713f37cf8d701d819c165549d53d14e");
    const balance3 = await syscoinToken.balanceOf(accounts[0]);
    assert.equal(balance3, 0, `SyscoinToken's ${accounts[0]} balance is not the expected one`);
    const burnHex = await web3.eth.getTransaction(burnResult.receipt.transactionHash);
    assert.equal(burnHex.input, "0x285c5bc600000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000065736d4700000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000015004322ec9eb713f37cf8d701d819c165549d53d14e0000000000000000000000");
    
  });
});

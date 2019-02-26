var SyscoinToken = artifacts.require("./token/SyscoinTokenForTests.sol");
const SyscoinMessageLibraryForTests = artifacts.require('SyscoinMessageLibraryForTests');

contract('testRelayToSyscoinAssetToken', function(accounts) {
  before(async () => {
    syscoinMessageLibraryForTests = await SyscoinMessageLibraryForTests.deployed();
  });
  const trustedRelayerContract = accounts[0]; // Tell SyscoinToken to trust accounts[0] as it would be the relayer contract
  const superblockSubmitterAddress = accounts[4];
  const txHash = '0x382408d5022c639ad63892858351c7f2dde7220d4b326acbd8b436c69af0fe88';
  const txData = '0x017400000001011df3c2dab5d82b4caa9adaef8ff0aa7b7f97f10ed13591d766b0a63f5a8f4e2f0300000000ffffffff036009000000000000535252045935e2180800000002540be4001456d82225d76ced3b03442cb2162d53e075a1cb6914c47bd54a3df2273426829a7928c3526bf8f7acaa6d6d6d0014763be29b909fdb7cc83a88233c5f2e0d696194cb0000000000000000346a523118e235590014763be29b909fdb7cc83a88233c5f2e0d696194cb0100046275726e00e40b540200000000000000000000004e5c000000000000160014763be29b909fdb7cc83a88233c5f2e0d696194cb0247304402204003b735e03e6b094a11465dc4cd2de44fc8239079c96bb6932b353c4ac16ed402203194ee059ff94f86e8ec720ff1d397d74f7a7ae24a73a100697b52298a4ae8dc0121032e137cb103813687b563e9d5deabaa5787dc7c37da2d2ad800609b0ba94ba80f00000000';
  const value = 10000000000;
  // passed into syscoin burn function (call validateaddress and get the witnessprogram, should be 20 bytes for keyhash and 32 for scripthash programs)
  const address = '0xc47bD54a3Df2273426829a7928C3526BF8F7Acaa';
  it('test mint and burn asset', async () => {
    let syscoinToken = await SyscoinToken.new(trustedRelayerContract, 1496703512);
    const [ ret, amount, inputEthAddress, assetGUID, assetContractAddress ]  = await syscoinMessageLibraryForTests.parseTransaction(txData);
    await syscoinToken.processTransaction(txHash, amount, inputEthAddress, assetGUID, syscoinToken.address, superblockSubmitterAddress);
    const superblockSubmitterFee = 10000000; 
    const userValue = value - superblockSubmitterFee;

    const balance = await syscoinToken.balanceOf(address);
    assert.equal(balance.toString(10), userValue, `SyscoinToken's ${address} balance is not the expected one`);
    var superblockSubmitterTokenBalance = await syscoinToken.balanceOf(superblockSubmitterAddress);
    assert.equal(superblockSubmitterTokenBalance.toNumber(), superblockSubmitterFee, `SyscoinToken's superblock submitter balance is not the expected one`);
    await syscoinToken.assign(accounts[0], 2000000000);
    const balance2 = await syscoinToken.balanceOf(accounts[0])
    assert.equal(balance2, 2000000000, `SyscoinToken's ${accounts[0]} balance is not the expected one`);

    // 0x004322ec9eb713f37cf8d701d819c165549d53d14e == 0 for version and 4322ec9eb713f37cf8d701d819c165549d53d14e for witness program (20 byte p2wpkh)
    const burnResult = await syscoinToken.burn(2000000000, 1496703512, "0x004322ec9eb713f37cf8d701d819c165549d53d14e");
    const balance3 = await syscoinToken.balanceOf(accounts[0]);
    assert.equal(balance3, 0, `SyscoinToken's ${accounts[0]} balance is not the expected one`);
    const burnHex = await web3.eth.getTransaction(burnResult.receipt.transactionHash);
    assert.equal(burnHex.input, "0x285c5bc60000000000000000000000000000000000000000000000000000000077359400000000000000000000000000000000000000000000000000000000005935e21800000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000015004322ec9eb713f37cf8d701d819c165549d53d14e0000000000000000000000");
    
  });
});

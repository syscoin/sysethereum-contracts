const utils = require('./utils');
const SyscoinMessageLibraryForTests = artifacts.require('SyscoinMessageLibraryForTests');
const bitcoin = require('bitcoinjs-lib');

contract('testParseTransaction', (accounts) => {
  let syscoinMessageLibraryForTests;
  const keys = [
    'L43bqxCXdZ1Lp6JkBoHE8pUQKi3BBgqrmBRYnNg4adZmRSRU534a',
    'L4N2R2S2WRAnrdwnezs4kHaxsQkRNMrVwgGpHJNgJxGYT788LnGB',
  ].map(utils.syscoinKeyPairFromWIF);
  before(async () => {
    syscoinMessageLibraryForTests = await SyscoinMessageLibraryForTests.deployed();
  });
  it('Parse simple transaction with only OP_RETURN', async () => {
    const tx = utils.buildSyscoinTransaction({
      signer: keys[1],
      inputs: [['edbbd164551c8961cf5f7f4b22d7a299dd418758b611b84c23770219e427df67', 0]],
      outputs: [
        ['OP_RETURN', 1000001, bitcoin.opcodes.OP_TRUE],
      ],
    });
    const txData = `0x${tx.toHex()}`;
    const [ ret, amount, inputEthAddress, assetGUID, assetContractAddress ] = await syscoinMessageLibraryForTests.parseTransaction(txData);
    assert.equal(amount, 1000001, 'Amount burned');
    assert.equal(inputEthAddress, utils.ethAddressFromKeyPair(keys[1]), 'Sender ethereum address');
  });
  it('Parse simple transaction without OP_RETURN', async () => {
    const tx = utils.buildSyscoinTransaction({
      signer: keys[1],
      inputs: [['edbbd164551c8961cf5f7f4b22d7a299dd418758b611b84c23770219e427df67', 0]],
      outputs: [
        [utils.syscoinAddressFromKeyPair(keys[1]), 1000001],
        [utils.syscoinAddressFromKeyPair(keys[0]), 1000002],
      ],
    });
    const txData = `0x${tx.toHex()}`;
    const [ ret, amount, inputEthAddress, assetGUID, assetContractAddress ]  = await syscoinMessageLibraryForTests.parseTransaction(txData);
    assert.equal(ret.toNumber(), 10180, 'Parsed');
  });  
  it('Parse transaction with OP_RETURN in vout 1', async () => {
    const tx = utils.buildSyscoinTransaction({
      signer: keys[1],
      inputs: [['edbbd164551c8961cf5f7f4b22d7a299dd418758b611b84c23770219e427df67', 0]],
      outputs: [
        [utils.syscoinAddressFromKeyPair(keys[0]), 1000002],
        ['OP_RETURN', 1000001, bitcoin.opcodes.OP_TRUE],
      ],
    });
    const txData = `0x${tx.toHex()}`;
    const [ ret, amount, inputEthAddress, assetGUID, assetContractAddress ]  = await syscoinMessageLibraryForTests.parseTransaction(txData);
    assert.equal(ret.toNumber(), 10180, 'Parsed');
  });
  it('Parse transaction with OP_RETURN', async () => {
    const tx = utils.buildSyscoinTransaction({
      signer: keys[1],
      inputs: [['edbbd164551c8961cf5f7f4b22d7a299dd418758b611b84c23770219e427df67', 0]],
      outputs: [
        ['OP_RETURN', 1000001, bitcoin.opcodes.OP_TRUE],
        [utils.syscoinAddressFromKeyPair(keys[0]), 1000002],
      ],
    });
    const txData = `0x${tx.toHex()}`;
    
    const [ ret, amount, inputEthAddress, assetGUID, assetContractAddress ] = await syscoinMessageLibraryForTests.parseTransaction(txData);
    assert.equal(amount, 1000001, 'Amount burned');
    assert.equal(inputEthAddress, utils.ethAddressFromKeyPair(keys[1]), 'Sender ethereum address');
  });
});

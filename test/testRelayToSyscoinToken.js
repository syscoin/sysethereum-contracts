const SyscoinClaimManager = artifacts.require("./SyscoinClaimManager.sol");
const SyscoinSuperblocks = artifacts.require("./SyscoinSuperblocks.sol");
const SyscoinToken = artifacts.require("./token/SyscoinTokenForTests.sol");
const utils = require('./utils');


contract('testRelayToSyscoinToken', function(accounts) {
  let syscoinToken;
  let superblocks;
  let claimManager;
  before(async () => {
    claimManager = await SyscoinClaimManager.deployed();
    superblocks = await SyscoinSuperblocks.deployed();
    syscoinToken =  await SyscoinToken.deployed();
  });
  it('Relay tx to token', async () => {
    const superblockSubmitterAddress = accounts[4];
    const headerAndHashes = await utils.store11blocks(superblocks, claimManager, superblockSubmitterAddress);
    const txIndex = 1; // Second tx in the block
    const txHash = '337dbd9301a40576d7e1176bbcfaea049c8004ecea418c04b77bbe06a1cf6f46';
    const txData = `0x020000000102a4fc39dbe0e77264cb9a333891b02c338d98ba2e1d3fdb2736f361dcaac184010000006b4830450221008f70fb6586e75f3cd1a79c4b3c15324d90fdb9d9d8b75ee3be259235891352b2022042ac981873a6a6014e41e775130fe31b724d36f8958a97882f12f3464d14abcd01210350e35982a18e009660e38b2e7adab32d620656190b3c287e4cfe9609c9919131ffffffff02007ddaac00000000026a510ad7f505000000001976a9142df03062154b2ad0039fd78e661305b445e49be488ac00000000`;

    const siblings = utils.makeMerkleProof(headerAndHashes.hashes, txIndex)
      .map(sibling => `0x${sibling}`);

    const blockIndex = 9;
    const blockData = `0x${headerAndHashes.proposedSuperblock.blockHeaders[blockIndex].slice(0, 160)}`;
    const blockSiblings = utils.makeMerkleProof(
      headerAndHashes.proposedSuperblock.blockHashes,
      blockIndex,
    ).map(sibling => `0x${sibling}`);

    const result = await superblocks.relayTx(
      txData,
      txIndex,
      siblings,
      blockData,
      blockIndex,
      blockSiblings,
      headerAndHashes.proposedSuperblock.superblockHash,
      syscoinToken.address,
    );

    const address = '0x5A714c3ED4CE4f297679E733f3c476B24D8895e5';
    const value = '2900000000';
    const balance = await syscoinToken.balanceOf(address);

    const superblockSubmitterFee = 2900000;
    const userValue = value  - superblockSubmitterFee;
    assert.equal(balance.toString(10), userValue, `SyscoinToken's ${address} balance is not the expected one`);
    var superblockSubmitterTokenBalance = await syscoinToken.balanceOf(superblockSubmitterAddress);
    assert.equal(superblockSubmitterTokenBalance.toNumber(), superblockSubmitterFee, `SyscoinToken's superblock submitter balance is not the expected one`);


  
  });
});

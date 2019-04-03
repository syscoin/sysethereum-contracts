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
    const txHash = 'd34d59c2f93bfb2eecec5aba3d6b0783f4615298dfffdeac1f2dba186d6f20d2';
    const txData = '0x01740000000102466ac5d8ad1a1053289751e5511e5b334c040848a14bed412d008cc4d0d0d3ff0100000000ffffffffbfae5ac02e4df7e4e834997c675c2485dc261e29379dfc4f3b791b0cbdf663780100000000ffffffff02007ddaac00000000166a145a714c3ed4ce4f297679e733f3c476b24d8895e5724321830000000016001407c680ea77fcbb3bda422ab307163df13f42b37102473044022040495afea9d3429982fd95e1e8373e17e0b1ad1d33620ba96c43f436e6b82eab022065e7ac0c3e97675500ebc44e9e621c3799c4bdf4c15fa0780d66ff14385bfe1301210375ff4756252bdfa0ba423f612701fe345bdd1a907be3cfc9c157db76a423e7f80247304402206a95bb46f24616f913c4a312c702248c3533d0955f6aee4db2479854a6b7c46302203dc19bd95898d4c84aa3f031e78099411d52776d48b03d50acc6469dc86e10e101210375ff4756252bdfa0ba423f612701fe345bdd1a907be3cfc9c157db76a423e7f800000000';

    const siblings = utils.makeMerkleProof(headerAndHashes.hashes, txIndex)
      .map(sibling => `0x${sibling}`);
    const blockIndex = 9;
    console.log("hashes " + headerAndHashes.proposedSuperblock.blockHashes.length);
    const blockData = `0x${headerAndHashes.proposedSuperblock.blockHeaders[blockIndex].slice(0, 160)}`;
    console.log("txData " + txData);
    console.log("siblings " + siblings);
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

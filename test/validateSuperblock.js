const utils = require('./utils');
const truffleAssert = require('truffle-assertions');
contract('validateSuperblocks', (accounts) => {
  const owner = accounts[0];
  const submitter = accounts[1];
  const challenger = accounts[2];
  const proxyAdmin = accounts[9];
  let claimManager;
  let superblocks;
  let proposedSuperblock;
  let proposedSuperblock1;
  let genesisSuperblockHash;
  let proposedSuperblockHash;
  let battleSessionId;

  const genesisHeaders = [
    `0000003040c32bf1f3e190842b1c5e8a24428dfb8cd200023424f6cc38ec90e4e900000095d0f7925a33a31b240131a93fcdb414cb5b28045430609bf337d5a5142247048045ef5bf0ff0f1e6d720000`,
    `000000302e5c540fc89b052a6d97b3aaad50a4f5b95a9a4d92213bf22ee99bc9a80c0000ddcca38b8f7cfb8835615509a1c63cdb0e2ea184397dcf9677409ac6758fcd308045ef5bf0ff0f1e90ba0000`,
  ];
    const initParentHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const genesisSuperblock = utils.makeSuperblock(genesisHeaders, initParentHash);

  const headers = [
    `0000003071a534b46710b515806719a97a38c187624bedfaefd0e1d3d37daaa5c10b00000ffc785adb93908ce3474201293870b26820d301494dd92993ed55f5fa5a4a908145ef5bf0ff0f1e14820000`,
    `00000030c1618c8ebfc949460396c0e8956e4ed7c2609831c327c6b6018faa1b150500009db0d9a7ddf12a18c0d872f75ccb7006847be3b29c3084a85b5e723610f639228245ef5bf0ff0f1e39800000`,
    `0000003097ec998e8723beeb67b7553ca05d3e59d2ce16c84cb5370f1b2a8ac9a8080000ebb0c3a50248df21bea990761793d9036648a5feeda04493f11c692e9ce940ca8245ef5bf0ff0f1e6bdc0000`
  ];
  const headers1 = [
    `000000306f26f236d595c8c2da3e3d21c38d70a31507f1cd185047ed92f1463140070000b4740338d6b989482fb7d277ad31f34938003dce5cdc6c2122639ff7b34ee3de8345ef5bf0ff0f1e982c0000`,
    `0000003068e7376ba9e2e7dc38ff3fa060ad8a07876c574e5356d2f6d82736e90f020000af6b356754b9d70e7215179f650e7bf6133f82b89145e6643e3a4bbac21ab9cc8445ef5bf0ff0f1edb180000`,
  ];
  proposedSuperblock = utils.makeSuperblock(headers,
    genesisSuperblock.superblockHash
  );
  proposedSuperblock1 = utils.makeSuperblock(headers1,
    proposedSuperblock.superblockHash
  );
  async function initSuperblockChain() {
    ({
      superblocks,
      claimManager,
      battleManager,
    } = await utils.initSuperblockChain({
      network: utils.SYSCOIN_REGTEST,
      genesisSuperblock,
      params: utils.SUPERBLOCK_OPTIONS_LOCAL,
      from: owner,
      proxyAdmin: proxyAdmin
    }));
    genesisSuperblockHash = genesisSuperblock.superblockHash;
    const best = await superblocks.methods.getBestSuperblock().call();
    assert.equal(genesisSuperblockHash, best, 'Best superblock should match');
    await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter });
    await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger });
  }
  describe('Superblock fields validation', () => {


  before(initSuperblockChain);
    it('Confirm superblock with one header', async () => {
      
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter, gas: 300000 });
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.timestamp,
        proposedSuperblock.mtpTimestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: submitter, gas: 2100000 });
      assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
      proposedSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;
      
      claim1 = proposedSuperblockHash;
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      result = await claimManager.methods.challengeSuperblock(proposedSuperblockHash).send({ from: challenger, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
      assert.equal(claim1, result.events.SuperblockClaimChallenged.returnValues.superblockHash);

      assert.ok(result.events.VerificationGameStarted, 'Battle started');
      
      battleSessionId = result.events.VerificationGameStarted.returnValues.sessionId;
 
      result = await battleManager.methods.respondBlockHeaders(battleSessionId, Buffer.from(headers.join(""), 'hex'), headers.length).send({ from: submitter, gas: 5000000 });
      assert.ok(result.events.ChallengerConvicted, 'Challenger failed');


      // Confirm superblock
      await utils.blockchainTimeoutSeconds(2*utils.SUPERBLOCK_OPTIONS_LOCAL.TIMEOUT);
      result = await claimManager.methods.checkClaimFinished(proposedSuperblockHash).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.SuperblockClaimPending, 'Superblock semi approved');
    });

  
    it('Reject invalid timestamp', async () => {
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter, gas: 300000 });
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock1.merkleRoot,
        proposedSuperblock1.timestamp + 1,
        proposedSuperblock1.mtpTimestamp,
        proposedSuperblock1.lastHash,
        proposedSuperblock1.lastBits,
        proposedSuperblock1.parentId).send({ from: submitter, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
      
      proposedSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;
      claim1 = proposedSuperblockHash;
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      result = await claimManager.methods.challengeSuperblock(proposedSuperblockHash).send({ from: challenger, gas: 2100000 });
      assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
      assert.equal(claim1, result.events.SuperblockClaimChallenged.returnValues.superblockHash);
      assert.ok(result.events.VerificationGameStarted, 'Battle started');
      
      battleSessionId = result.events.VerificationGameStarted.returnValues.sessionId;

      result = await battleManager.methods.respondBlockHeaders(battleSessionId, Buffer.from(headers1.join(""), 'hex'), headers1.length).send({ from: submitter, gas: 5000000 });
      assert.ok(result.events.SubmitterConvicted, 'Submitter failed');
      assert.equal(result.events.SubmitterConvicted.returnValues.err, '50036');

      // Confirm superblock

      await utils.blockchainTimeoutSeconds(2*utils.SUPERBLOCK_OPTIONS_LOCAL.TIMEOUT);
      result = await claimManager.methods.checkClaimFinished(proposedSuperblockHash).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.SuperblockClaimFailed, 'Superblock rejected');
    });

    it('Reject invalid last hash', async () => {
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter, gas: 300000 });
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock1.merkleRoot,
        proposedSuperblock1.timestamp,
        proposedSuperblock1.mtpTimestamp,
        utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
        proposedSuperblock1.lastBits,
        proposedSuperblock1.parentId).send({ from: submitter, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
      
      proposedSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      result = await claimManager.methods.challengeSuperblock(proposedSuperblockHash).send({ from: challenger, gas: 2100000 });
      assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
      assert.equal(proposedSuperblockHash, result.events.SuperblockClaimChallenged.returnValues.superblockHash);

      assert.ok(result.events.VerificationGameStarted, 'Battle started');
      
      battleSessionId = result.events.VerificationGameStarted.returnValues.sessionId;
      result = await battleManager.methods.respondBlockHeaders(battleSessionId, Buffer.from(headers1.join(""), 'hex'), headers1.length).send({ from: submitter, gas: 5000000 });
      assert.ok(result.events.SubmitterConvicted, 'Submitter failed');
      assert.equal(result.events.SubmitterConvicted.returnValues.err, '50059');

      await utils.blockchainTimeoutSeconds(2*utils.SUPERBLOCK_OPTIONS_LOCAL.TIMEOUT);
      result = await battleManager.methods.timeout(battleSessionId).send({ from: challenger, gas: 300000 });
      // already convicted
      assert.ok(Object.keys(result.events).length == 0);

      result = await claimManager.methods.checkClaimFinished(proposedSuperblockHash).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.SuperblockClaimFailed, 'Superblock rejected');

      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter, gas: 300000 });
      // Submitter cannot submit same superblock
      await truffleAssert.reverts(
        claimManager.methods.proposeSuperblock(
          proposedSuperblock1.merkleRoot,
          proposedSuperblock1.timestamp,
          proposedSuperblock1.mtpTimestamp,
          utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
          proposedSuperblock1.lastBits,
          proposedSuperblock1.parentId
        ).send({ from: submitter, gas: 2100000 })
      );

      
      // challenger can submit the same block after winning
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock1.merkleRoot,
        proposedSuperblock1.timestamp,
        proposedSuperblock1.mtpTimestamp,
        utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
        proposedSuperblock1.lastBits,
        proposedSuperblock1.parentId).send({ from: challenger, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimCreated, 'New superblock reproposed');

      // cannot submit again
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      await truffleAssert.reverts(
        claimManager.methods.proposeSuperblock(
          proposedSuperblock1.merkleRoot,
          proposedSuperblock1.timestamp ,
          proposedSuperblock1.mtpTimestamp ,
          utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
          proposedSuperblock1.lastBits,
          proposedSuperblock1.parentId).send({ from: challenger, gas: 300000 })
      );
  
    });
  });
});

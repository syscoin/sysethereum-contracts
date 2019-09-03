const utils = require('./utils');
const truffleAssert = require('truffle-assertions');
contract('SyscoinClaimManager', (accounts) => {
  const owner = accounts[0];
  const submitter = accounts[1];
  const challenger = accounts[2];
  let claimManager;
  let battleManager;
  let superblocks;
  let proposedSuperblock;
  async function initSuperblockChain() {
    ({
      superblocks,
      claimManager,
      battleManager,
    } = await utils.initSuperblockChain({
      network: utils.SYSCOIN_REGTEST,
      genesisSuperblock,
      params: utils.OPTIONS_SYSCOIN_REGTEST,
      from: owner,
    }));
    await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter, gas: 300000 });
    await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
  }

  const initAccumulatedWork = 1;
  const initParentId = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const genesisHeaders = [
    `0000003040c32bf1f3e190842b1c5e8a24428dfb8cd200023424f6cc38ec90e4e900000095d0f7925a33a31b240131a93fcdb414cb5b28045430609bf337d5a5142247048045ef5bf0ff0f1e6d720000`,
    `000000302e5c540fc89b052a6d97b3aaad50a4f5b95a9a4d92213bf22ee99bc9a80c0000ddcca38b8f7cfb8835615509a1c63cdb0e2ea184397dcf9677409ac6758fcd308045ef5bf0ff0f1e90ba0000`,
  ];
  const headers = [
    `0000003071a534b46710b515806719a97a38c187624bedfaefd0e1d3d37daaa5c10b00000ffc785adb93908ce3474201293870b26820d301494dd92993ed55f5fa5a4a908145ef5bf0ff0f1e14820000`,
    `00000030c1618c8ebfc949460396c0e8956e4ed7c2609831c327c6b6018faa1b150500009db0d9a7ddf12a18c0d872f75ccb7006847be3b29c3084a85b5e723610f639228245ef5bf0ff0f1e39800000`,
    `0000003097ec998e8723beeb67b7553ca05d3e59d2ce16c84cb5370f1b2a8ac9a8080000ebb0c3a50248df21bea990761793d9036648a5feeda04493f11c692e9ce940ca8245ef5bf0ff0f1e6bdc0000`,
    `000000306f26f236d595c8c2da3e3d21c38d70a31507f1cd185047ed92f1463140070000b4740338d6b989482fb7d277ad31f34938003dce5cdc6c2122639ff7b34ee3de8345ef5bf0ff0f1e982c0000`,
    `0000003068e7376ba9e2e7dc38ff3fa060ad8a07876c574e5356d2f6d82736e90f020000af6b356754b9d70e7215179f650e7bf6133f82b89145e6643e3a4bbac21ab9cc8445ef5bf0ff0f1edb180000`,
  ];
  const hashes = headers.map(utils.calcBlockSha256Hash);
  const genesisSuperblock = utils.makeSuperblock(genesisHeaders, initParentId, initAccumulatedWork);
  describe('Confirm superblock after timeout', () => {
    let genesisSuperblockHash;
    let proposedSuperblockHash;
    let proposedForkSuperblockHash;
    let battleSessionId;
    let result;
    let proposedSuperblock;
    before(initSuperblockChain);

    it('Initialize', async () => {
      genesisSuperblockHash = genesisSuperblock.superblockHash;
      const best = await superblocks.methods.getBestSuperblock().call();
      assert.equal(genesisSuperblockHash, best, 'Best superblock should match');
    });

    it('Propose', async () => {
      proposedSuperblock = utils.makeSuperblock(
        headers.slice(0, 3),
        genesisSuperblock.superblockHash,
        genesisSuperblock.accumulatedWork
      );
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: submitter, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
      proposedSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;
    });

    it('Try to confirm without waiting', async () => {
      result = await claimManager.methods.checkClaimFinished('0x02').send({ from: challenger, gas: 300000 });
      assert.ok(result.events.ErrorClaim, 'Invalid claim');
      result = await claimManager.methods.checkClaimFinished(proposedSuperblockHash).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.ErrorClaim, 'Invalid timeout');
    });

    it('Confirm', async () => {
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await claimManager.methods.checkClaimFinished(proposedSuperblockHash).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.SuperblockClaimSuccessful, 'Superblock challenged');
      const best = await superblocks.methods.getBestSuperblock().call();
      assert.equal(proposedSuperblockHash, best, 'Best superblock should match');
    });

    it('Propose fork', async () => {
      proposedSuperblock = utils.makeSuperblock(
        headers.slice(0, 2),
        genesisSuperblock.superblockHash,
        genesisSuperblock.accumulatedWork
      );
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: submitter, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
      proposedForkSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;
    });

    it('Confirm fork', async () => {
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      const result = await claimManager.methods.checkClaimFinished(proposedForkSuperblockHash).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.SuperblockClaimSuccessful, 'Superblock challenged');
      const best = await superblocks.methods.getBestSuperblock().call();
      assert.equal(proposedSuperblockHash, best, 'Best superblock did not change');
    });
  });

  describe('Confirm superblock after block header verification', () => {
    let genesisSuperblockHash;
    let proposedSuperblockHash;
    let battleSessionId;
    let result;
    before(initSuperblockChain);
    
    it('Initialized', async () => {
      genesisSuperblockHash = genesisSuperblock.superblockHash;
      const best = await superblocks.methods.getBestSuperblock().call();
      assert.equal(genesisSuperblockHash, best, 'Best superblock should match');
    });
    
    it('Propose', async () => {
      proposedSuperblock = utils.makeSuperblock(headers.slice(0, 2), genesisSuperblock.superblockHash, genesisSuperblock.accumulatedWork);
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: submitter, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimCreated, 'SuperblockClaimCreated', 'New superblock proposed');
      proposedSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;
    });
    
    it('Challenge', async () => {

      result = await claimManager.methods.challengeSuperblock(proposedSuperblockHash).send({ from: challenger, gas: 2100000 });
      assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
      assert.equal(proposedSuperblockHash, result.events.SuperblockClaimChallenged.returnValues.superblockHash);
      assert.ok(result.events.VerificationGameStarted, 'Battle started');
      battleSessionId = result.events.VerificationGameStarted.returnValues.sessionId;
    });

    it('Query and verify hashes', async () => {

      result = await battleManager.methods.queryMerkleRootHashes(battleSessionId).send({ from: challenger, gas: 2100000 });
      assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');

      result = await battleManager.methods.respondMerkleRootHashes(battleSessionId, hashes.slice(0, 2)).send({ from: submitter, gas: 2100000 });
      assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');
    });

    it('Query and reply block header', async () => {
      result = await battleManager.methods.queryLastBlockHeader(battleSessionId, -1).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryLastBlockHeader, 'Query block header');

      result = await battleManager.methods.respondLastBlockHeader(battleSessionId, `0x${headers[1]}`, "0x").send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondLastBlockHeader, 'Respond last block header');
    });

    it('Verify superblock', async () => {
      const result = await battleManager.methods.verifySuperblock(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.ChallengerConvicted, 'Challenger failed');
    });
    
    it('Confirm', async () => {
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      const result = await claimManager.methods.checkClaimFinished(proposedSuperblockHash).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.SuperblockClaimPending, 'Superblock challenged');
    });
  });

  describe('Challenge superblock', () => {
    let genesisSuperblockHash;
    let proposedSuperblockHash;
    let battleSessionId;
    let result;
    before(initSuperblockChain);
  
    it('Initialize', async () => {
      genesisSuperblockHash = genesisSuperblock.superblockHash;
      const best = await superblocks.methods.getBestSuperblock().call();
      assert.equal(genesisSuperblockHash, best, 'Best superblock should match');
    });
  
    it('Propose', async () => {
      proposedSuperblock = utils.makeSuperblock(
        headers,
        genesisSuperblock.superblockHash,
        genesisSuperblock.accumulatedWork
      );

      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: submitter, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
      proposedSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;
    });
  
    it('Challenge', async () => {
      result = await claimManager.methods.challengeSuperblock(proposedSuperblockHash).send({ from: challenger, gas: 2100000 });
      assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
      assert.equal(proposedSuperblockHash, result.events.SuperblockClaimChallenged.returnValues.superblockHash);
      assert.ok(result.events.VerificationGameStarted, 'Battle started');
      battleSessionId = result.events.VerificationGameStarted.returnValues.sessionId;
    });
  
    it('Query hashes', async () => {
      const session = await claimManager.methods.getSession(proposedSuperblockHash, challenger).call();
      assert.equal(session, battleSessionId, 'Sessions should match');
      result = await battleManager.methods.queryMerkleRootHashes(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');
    });
    
    it('Verify hashes', async () => {
      const result = await battleManager.methods.respondMerkleRootHashes(battleSessionId, hashes).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');
    });
    it('Query block header', async () => {
      const result = await battleManager.methods.queryLastBlockHeader(battleSessionId, -1).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryLastBlockHeader, 'Query block header');
    });   
    it('Answer blocks header', async () => {

      let len = headers.length;
      result = await battleManager.methods.respondLastBlockHeader(battleSessionId, `0x${headers[len-1]}`, "0x").send({ from: submitter, gas: 2100000 });
      assert.ok(result.events.RespondLastBlockHeader, 'Respond last block header');

    });

    it('Verify superblock', async () => {
      const result = await battleManager.methods.verifySuperblock(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.ChallengerConvicted, 'Superblock verified');
    });
    
    it('Accept superblock', async () => {
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      const result = await claimManager.methods.checkClaimFinished(proposedSuperblockHash).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.SuperblockClaimPending, 'Superblock accepted');
    });
  });

  describe('Challenge timeouts', () => {
    let genesisSuperblockHash;
    let proposedSuperblockHash;
    let battleSessionId;
    const beginNewChallenge = async () => {
      let result;
      ({
        superblocks,
        claimManager,
        battleManager,
      } = await utils.initSuperblockChain({
        network: utils.SYSCOIN_REGTEST,
        genesisSuperblock,
        params: utils.OPTIONS_SYSCOIN_REGTEST,
        from: owner,
      }));
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter, gas: 300000 });
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      genesisSuperblockHash = genesisSuperblock.superblockHash;

      // Propose
      proposedSuperblock = utils.makeSuperblock(
        headers.slice(0, 2),
        genesisSuperblock.superblockHash,
        genesisSuperblock.accumulatedWork
      );
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: submitter, gas: 2100000 });
      proposedSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;

      // Challenge
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      result = await claimManager.methods.challengeSuperblock(proposedSuperblockHash).send({ from: challenger, gas: 2100000 });
      assert.ok(result.events.VerificationGameStarted, 'Battle started');
      battleSessionId = result.events.VerificationGameStarted.returnValues.sessionId;
    };

    beforeEach(async () => {
      await beginNewChallenge();
    });
    
    it('Timeout query hashes', async () => {
      let result;
      result = await battleManager.methods.timeout(battleSessionId).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.ErrorBattle, 'Timeout too early');
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await battleManager.methods.timeout(battleSessionId).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.ChallengerConvicted, 'Should convict challenger');
    });
    
    it('Timeout reply hashes', async () => {
      let result;
      result = await battleManager.methods.queryMerkleRootHashes(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');
      result = await battleManager.methods.timeout(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.ErrorBattle, 'Timeout too early');
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await battleManager.methods.timeout(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.SubmitterConvicted, 'Should convict claimant');
    });
    
    it('Timeout query block headers', async () => {
      let result;

      result = await battleManager.methods.queryMerkleRootHashes(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');

      result = await battleManager.methods.respondMerkleRootHashes(battleSessionId, hashes.slice(0, 2)).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');

      result = await battleManager.methods.timeout(battleSessionId).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.ErrorBattle, 'Timeout too early');

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);

      result = await battleManager.methods.timeout(battleSessionId).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.ChallengerConvicted, 'Should convict challenger');
    });
    
    it('Timeout reply block headers', async () => {
      let result;

      result = await battleManager.methods.queryMerkleRootHashes(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');

      result = await battleManager.methods.respondMerkleRootHashes(battleSessionId, hashes.slice(0, 2)).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');

      result = await battleManager.methods.queryLastBlockHeader(battleSessionId, -1).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryLastBlockHeader, 'Query block header');
      
      result = await battleManager.methods.timeout(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.ErrorBattle, 'Timeout too early');

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);

      result = await battleManager.methods.timeout(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.SubmitterConvicted, 'Should convict claimant');
    });

    it('Timeout verify superblock', async () => {
      let result;
      let data;

      result = await battleManager.methods.queryMerkleRootHashes(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');


      result = await battleManager.methods.respondMerkleRootHashes(battleSessionId, hashes.slice(0, 2)).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');


      result = await battleManager.methods.queryLastBlockHeader(battleSessionId, -1).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryLastBlockHeader, 'Query block header');


      result = await battleManager.methods.respondLastBlockHeader(battleSessionId, `0x${headers[1]}`, "0x").send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondLastBlockHeader, 'Respond last block header');
      
      result = await battleManager.methods.timeout(battleSessionId).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.ErrorBattle, 'Timeout too early');

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);

      result = await battleManager.methods.timeout(battleSessionId).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.ChallengerConvicted, 'Should convict challenger');
    });

    it('Verify superblock', async () => {
      let result;
      let data;


      result = await battleManager.methods.queryMerkleRootHashes(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');


      result = await battleManager.methods.respondMerkleRootHashes(battleSessionId, hashes.slice(0, 2)).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');


      result = await battleManager.methods.queryLastBlockHeader(battleSessionId, -1).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryLastBlockHeader, 'Query block header');

      result = await battleManager.methods.respondLastBlockHeader(battleSessionId, `0x${headers[1]}`, "0x").send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondLastBlockHeader, 'Respond last block header');

      result = await battleManager.methods.verifySuperblock(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.ChallengerConvicted, 'Should convict challenger');

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await claimManager.methods.checkClaimFinished(proposedSuperblockHash).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.SuperblockClaimPending, 'Superblock accepted');

      // Tried to repropose valid superblock
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter, gas: 300000 });
      await truffleAssert.reverts(claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: submitter, gas: 2100000 }));
    

      // Tried to repropose valid superblock
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 3000000 });
      await truffleAssert.reverts(claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: challenger, gas: 2100000 }));
    });
  });
});

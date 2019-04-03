const utils = require('./utils');

contract('SyscoinClaimManager', (accounts) => {
  const owner = accounts[0];
  const submitter = accounts[1];
  const challenger = accounts[2];
  let claimManager;
  let battleManager;
  let superblocks;

  async function initSuperblockChain() {
    ({
      superblocks,
      claimManager,
      battleManager,
    } = await utils.initSuperblockChain({
      network: utils.SYSCOIN_MAINNET,
      genesisSuperblock,
      params: utils.OPTIONS_SYSCOIN_REGTEST,
      from: owner,
    }));
    await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_PROPOSAL_DEPOSIT, from: submitter });
    await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_CHALLENGE_DEPOSIT, from: challenger });
  }

  const initAccumulatedWork = 0;
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
  const genesisSuperblock = utils.makeSuperblock(genesisHeaders, initParentId, initAccumulatedWork, 2);

  describe('Confirm superblock after timeout', () => {
    let genesisSuperblockHash;
    let proposedSuperblockHash;
    let proposedForkSuperblockHash;
    let battleSessionId;
    let result;
    before(initSuperblockChain);

    it('Initialize', async () => {
      genesisSuperblockHash = genesisSuperblock.superblockHash;
      const best = await superblocks.getBestSuperblock();
      assert.equal(genesisSuperblockHash, best, 'Best superblock should match');
    });

    it('Propose', async () => {
      const proposedSuperblock = utils.makeSuperblock(
        headers.slice(0, 3),
        genesisSuperblock.superblockHash,
        genesisSuperblock.accumulatedWork,
        2
      );

      result = await claimManager.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork,
        proposedSuperblock.timestamp,
        proposedSuperblock.prevTimestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId,
        proposedSuperblock.blockHeight,
        { from: submitter },
      );

      const superblockClaimCreatedEvent = utils.findEvent(result.logs, 'SuperblockClaimCreated');
      assert.ok(superblockClaimCreatedEvent, 'New superblock proposed');
      proposedSuperblockHash = superblockClaimCreatedEvent.args.superblockHash;
    });

    it('Try to confirm whitout waiting', async () => {
      result = await claimManager.checkClaimFinished('0x02', { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'ErrorClaim'), 'Invalid claim');
      result = await claimManager.checkClaimFinished(proposedSuperblockHash, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'ErrorClaim'), 'Invalid timeout');
    });

    it('Confirm', async () => {
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await claimManager.checkClaimFinished(proposedSuperblockHash, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'SuperblockClaimSuccessful'), 'Superblock challenged');
      const best = await superblocks.getBestSuperblock();
      assert.equal(proposedSuperblockHash, best, 'Best superblock should match');
    });

    it('Propose fork', async () => {
      const proposedSuperblock = utils.makeSuperblock(
        headers.slice(0, 2),
        genesisSuperblock.superblockHash,
        genesisSuperblock.accumulatedWork,
        4
      );

      result = await claimManager.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork,
        proposedSuperblock.timestamp,
        proposedSuperblock.prevTimestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId,
        proposedSuperblock.blockHeight,
        { from: submitter },
      );

      const superblockClaimCreatedEvent = utils.findEvent(result.logs, 'SuperblockClaimCreated');
      assert.ok(superblockClaimCreatedEvent, 'New superblock proposed');
      proposedForkSuperblockHash = superblockClaimCreatedEvent.args.superblockHash;
    });

    it('Confirm fork', async () => {
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      const result = await claimManager.checkClaimFinished(proposedForkSuperblockHash, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'SuperblockClaimSuccessful'), 'Superblock challenged');
      const best = await superblocks.getBestSuperblock();
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
      const best = await superblocks.getBestSuperblock();
      assert.equal(genesisSuperblockHash, best, 'Best superblock should match');
    });
    
    it('Propose', async () => {
      const proposedSuperblock = utils.makeSuperblock(headers.slice(0, 2), genesisSuperblock.superblockHash, genesisSuperblock.accumulatedWork, 4);
      result = await claimManager.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork,
        proposedSuperblock.timestamp,
        proposedSuperblock.prevTimestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId,
        proposedSuperblock.blockHeight,
        { from: submitter },
      );

      const superblockClaimCreatedEvent = utils.findEvent(result.logs, 'SuperblockClaimCreated');
      assert.ok(superblockClaimCreatedEvent, 'SuperblockClaimCreated', 'New superblock proposed');
      proposedSuperblockHash = superblockClaimCreatedEvent.args.superblockHash;
    });
    
    it('Challenge', async () => {
      await claimManager.makeDeposit({ value: utils.DEPOSITS.SUPERBLOCK_COST, from: challenger });
      result = await claimManager.challengeSuperblock(proposedSuperblockHash, { from: challenger });
      const superblockClaimChallengedEvent = utils.findEvent(result.logs, 'SuperblockClaimChallenged');
      assert.ok(superblockClaimChallengedEvent, 'Superblock challenged');
      assert.equal(proposedSuperblockHash, superblockClaimChallengedEvent.args.superblockHash);
      const verificationGameStartedEvent = utils.findEvent(result.logs, 'VerificationGameStarted');
      assert.ok(verificationGameStartedEvent, 'Battle started');
      battleSessionId = verificationGameStartedEvent.args.sessionId;
    });

    it('Query and verify hashes', async () => {
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_MERKLE_COST, from: challenger });
      result = await battleManager.queryMerkleRootHashes(proposedSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondMerkleRootHashes(proposedSuperblockHash, battleSessionId, hashes.slice(0, 2), { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondMerkleRootHashes'), 'Respond merkle root hashes');
    });

    it('Query and reply block header', async () => {
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });
      result = await battleManager.queryBlockHeader(proposedSuperblockHash, battleSessionId, hashes[0], { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryBlockHeader'), 'Query block header');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondBlockHeader(proposedSuperblockHash, battleSessionId, `0x${headers[0]}`, { from: submitter });

      assert.ok(utils.findEvent(result.logs, 'RespondBlockHeader'), 'Respond block header');
      
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });      
      result = await battleManager.queryBlockHeader(proposedSuperblockHash, battleSessionId, hashes[1], { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryBlockHeader'), 'Query block header');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondBlockHeader(proposedSuperblockHash, battleSessionId, `0x${headers[1]}`, { from: submitter });

      assert.ok(utils.findEvent(result.logs, 'RespondBlockHeader'), 'Respond block header');
    });

    it('Verify superblock', async () => {
      const result = await battleManager.verifySuperblock(battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'ChallengerConvicted'), 'Challenger failed');
    });
    
    it('Confirm', async () => {
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      const result = await claimManager.checkClaimFinished(proposedSuperblockHash, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'SuperblockClaimPending'), 'Superblock challenged');
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
      const best = await superblocks.getBestSuperblock();
      assert.equal(genesisSuperblockHash, best, 'Best superblock should match');
    });
  
    it('Propose', async () => {
      const proposeSuperblock = utils.makeSuperblock(
        headers,
        genesisSuperblock.superblockHash,
        genesisSuperblock.accumulatedWork,
        7
      );

      result = await claimManager.proposeSuperblock(
        proposeSuperblock.merkleRoot,
        proposeSuperblock.accumulatedWork,
        proposeSuperblock.timestamp,
        proposeSuperblock.prevTimestamp,
        proposeSuperblock.lastHash,
        proposeSuperblock.lastBits,
        proposeSuperblock.parentId,
        proposeSuperblock.blockHeight,
        { from: submitter },
      );

      const superblockClaimCreatedEvent = utils.findEvent(result.logs, 'SuperblockClaimCreated');
      assert.ok(superblockClaimCreatedEvent, 'New superblock proposed');
      proposedSuperblockHash = superblockClaimCreatedEvent.args.superblockHash;
    });
  
    it('Challenge', async () => {
      result = await claimManager.challengeSuperblock(proposedSuperblockHash, { from: challenger });
      const superblockClaimChallengedEvent = utils.findEvent(result.logs, 'SuperblockClaimChallenged');
      assert.ok(superblockClaimChallengedEvent, 'Superblock challenged');
      assert.equal(proposedSuperblockHash, superblockClaimChallengedEvent.args.superblockHash);
      const verificationGameStartedEvent = utils.findEvent(result.logs, 'VerificationGameStarted');
      assert.ok(verificationGameStartedEvent, 'Battle started');
      battleSessionId = verificationGameStartedEvent.args.sessionId;
    });
  
    it('Query hashes', async () => {
      const session = await claimManager.getSession(proposedSuperblockHash, challenger);
      assert.equal(session, battleSessionId, 'Sessions should match');
      result = await battleManager.queryMerkleRootHashes(proposedSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');
    });
    
    it('Verify hashes', async () => {
      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      const result = await battleManager.respondMerkleRootHashes(proposedSuperblockHash, battleSessionId, hashes, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondMerkleRootHashes'), 'Respond merkle root hashes');
    });
    
    hashes.forEach((hash, idx) => {
      it(`Query block header ${hash.slice(0, 20)}..`, async () => {
        const result = await battleManager.queryBlockHeader(proposedSuperblockHash, battleSessionId, hash, { from: challenger });
        assert.ok(utils.findEvent(result.logs, 'QueryBlockHeader'), 'Query block header');
      });

      it(`Answer blocks header ${hash.slice(0, 20)}..`, async () => {
        await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
        result = await battleManager.respondBlockHeader(proposedSuperblockHash, battleSessionId, `0x${headers[idx]}`, { from: submitter });

        assert.ok(utils.findEvent(result.logs, 'RespondBlockHeader'), 'Respond block header');
      });
    });

    it('Verify superblock', async () => {
      const result = await battleManager.verifySuperblock(battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'ChallengerConvicted'), 'Superblock verified');
    });
    
    it('Accept superblock', async () => {
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      const result = await claimManager.checkClaimFinished(proposedSuperblockHash, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'SuperblockClaimPending'), 'Superblock accepted');
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
        network: utils.SYSCOIN_MAINNET,
        genesisSuperblock,
        params: utils.OPTIONS_SYSCOIN_REGTEST,
        from: owner,
      }));
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_PROPOSAL_DEPOSIT, from: submitter });
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_CHALLENGE_DEPOSIT, from: challenger });
      genesisSuperblockHash = genesisSuperblock.superblockHash;

      // Propose
      const proposeSuperblock = utils.makeSuperblock(
        headers.slice(0, 2),
        genesisSuperblock.superblockHash,
        genesisSuperblock.accumulatedWork,
        4
      );
      result = await claimManager.proposeSuperblock(
        proposeSuperblock.merkleRoot,
        proposeSuperblock.accumulatedWork,
        proposeSuperblock.timestamp,
        proposeSuperblock.prevTimestamp,
        proposeSuperblock.lastHash,
        proposeSuperblock.lastBits,
        proposeSuperblock.parentId,
        proposeSuperblock.blockHeight,
        { from: submitter },
      );
      const superblockClaimCreatedEvent = utils.findEvent(result.logs, 'SuperblockClaimCreated');
      proposedSuperblockHash = superblockClaimCreatedEvent.args.superblockHash;

      // Challenge
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_CHALLENGE_DEPOSIT, from: challenger });
      result = await claimManager.challengeSuperblock(proposedSuperblockHash, { from: challenger });
      const verificationGameStartedEvent = utils.findEvent(result.logs, 'VerificationGameStarted');
      assert.ok(verificationGameStartedEvent, 'Battle started');
      battleSessionId = verificationGameStartedEvent.args.sessionId;
    };

    beforeEach(async () => {
      await beginNewChallenge();
    });
    
    it('Timeout query hashes', async () => {
      let result;
      result = await battleManager.timeout(battleSessionId, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'ErrorBattle'), 'Timeout too early');
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await battleManager.timeout(battleSessionId, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'ChallengerConvicted'), 'Should convict challenger');
    });
    
    it('Timeout reply hashes', async () => {
      let result;
      result = await battleManager.queryMerkleRootHashes(proposedSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');
      result = await battleManager.timeout(battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'ErrorBattle'), 'Timeout too early');
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await battleManager.timeout(battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'SubmitterConvicted'), 'Should convict claimant');
    });
    
    it('Timeout query block headers', async () => {
      let result;
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_MERKLE_COST, from: challenger });
      result = await battleManager.queryMerkleRootHashes(proposedSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondMerkleRootHashes(proposedSuperblockHash, battleSessionId, hashes.slice(0, 2), { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondMerkleRootHashes'), 'Respond merkle root hashes');

      result = await battleManager.timeout(battleSessionId, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'ErrorBattle'), 'Timeout too early');

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);

      result = await battleManager.timeout(battleSessionId, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'ChallengerConvicted'), 'Should convict challenger');
    });
    
    it('Timeout reply block headers', async () => {
      let result;
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_MERKLE_COST, from: challenger });
      result = await battleManager.queryMerkleRootHashes(proposedSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondMerkleRootHashes(proposedSuperblockHash, battleSessionId, hashes.slice(0, 2), { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondMerkleRootHashes'), 'Respond merkle root hashes');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });
      result = await battleManager.queryBlockHeader(proposedSuperblockHash, battleSessionId, hashes[0], { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryBlockHeader'), 'Query block header');
      
      result = await battleManager.timeout(battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'ErrorBattle'), 'Timeout too early');

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);

      result = await battleManager.timeout(battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'SubmitterConvicted'), 'Should convict claimant');
    });

    it('Timeout verify superblock', async () => {
      let result;
      let data;
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_MERKLE_COST, from: challenger });
      result = await battleManager.queryMerkleRootHashes(proposedSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondMerkleRootHashes(proposedSuperblockHash, battleSessionId, hashes.slice(0, 2), { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondMerkleRootHashes'), 'Respond merkle root hashes');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });
      result = await battleManager.queryBlockHeader(proposedSuperblockHash, battleSessionId, hashes[0], { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryBlockHeader'), 'Query block header');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondBlockHeader(proposedSuperblockHash, battleSessionId, `0x${headers[0]}`, { from: submitter });

      assert.ok(utils.findEvent(result.logs, 'RespondBlockHeader'), 'Respond block header');
      
      result = await battleManager.timeout(battleSessionId, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'ErrorBattle'), 'Timeout too early');

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);

      result = await battleManager.timeout(battleSessionId, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'ChallengerConvicted'), 'Should convict challenger');
    });

    it('Verify superblock', async () => {
      let result;
      let data;

    
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_MERKLE_COST, from: challenger });

      result = await battleManager.queryMerkleRootHashes(proposedSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondMerkleRootHashes(proposedSuperblockHash, battleSessionId, hashes.slice(0, 2), { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondMerkleRootHashes'), 'Respond merkle root hashes');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });
      result = await battleManager.queryBlockHeader(proposedSuperblockHash, battleSessionId, hashes[0], { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryBlockHeader'), 'Query block header');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondBlockHeader(proposedSuperblockHash, battleSessionId, `0x${headers[0]}`, { from: submitter });

      assert.ok(utils.findEvent(result.logs, 'RespondBlockHeader'), 'Respond block header');
      
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });
      result = await battleManager.queryBlockHeader(proposedSuperblockHash, battleSessionId, hashes[1], { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryBlockHeader'), 'Query block header');

      result = await battleManager.respondBlockHeader(proposedSuperblockHash, battleSessionId, `0x${headers[1]}`, { from: submitter });

      assert.ok(utils.findEvent(result.logs, 'RespondBlockHeader'), 'Respond block header');
      
      result = await battleManager.verifySuperblock(battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'ChallengerConvicted'), 'Should convict challenger');
    });
  });
});

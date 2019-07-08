const utils = require('./utils');
const truffleAssert = require('truffle-assertions');
contract('validateSuperblocks', (accounts) => {
  const owner = accounts[0];
  const submitter = accounts[1];
  const challenger = accounts[2];
  let claimManager;
  let superblocks;
  let proposedSuperblock;
  let ClaimManagerEvents;

  describe('Superblock fields validation', () => {
    let genesisSuperblockHash;
    let proposesSuperblockHash;
    let battleSessionId;

    const genesisHeaders = [
      `0000003040c32bf1f3e190842b1c5e8a24428dfb8cd200023424f6cc38ec90e4e900000095d0f7925a33a31b240131a93fcdb414cb5b28045430609bf337d5a5142247048045ef5bf0ff0f1e6d720000`,
      `000000302e5c540fc89b052a6d97b3aaad50a4f5b95a9a4d92213bf22ee99bc9a80c0000ddcca38b8f7cfb8835615509a1c63cdb0e2ea184397dcf9677409ac6758fcd308045ef5bf0ff0f1e90ba0000`
    ];
    const initAccumulatedWork = 1;
    const initParentHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const genesisSuperblock = utils.makeSuperblock(genesisHeaders, initParentHash, initAccumulatedWork);

    const headers = [
      `0000003071a534b46710b515806719a97a38c187624bedfaefd0e1d3d37daaa5c10b00000ffc785adb93908ce3474201293870b26820d301494dd92993ed55f5fa5a4a908145ef5bf0ff0f1e14820000`
    ];
    const hashes = headers.map(header => utils.calcBlockSha256Hash(header));
    proposedSuperblock = utils.makeSuperblock(headers,
      genesisSuperblock.superblockHash,
      genesisSuperblock.accumulatedWork
    );

    beforeEach(async () => {
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
      genesisSuperblockHash = genesisSuperblock.superblockHash;
      const best = await superblocks.getBestSuperblock();
      assert.equal(genesisSuperblockHash, best, 'Best superblock should match');
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_REWARD, from: submitter });
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_REWARD, from: challenger });
    });
    
    it('Confirm superblock with one header', async () => {
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_REWARD, from: submitter });
      result = await claimManager.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork,
        proposedSuperblock.timestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId,
        { from: submitter },
      );

      const superblockClaimCreatedEvent = utils.findEvent(result.logs, 'SuperblockClaimCreated');
      assert.ok(superblockClaimCreatedEvent, 'New superblock proposed');
      proposesSuperblockHash = superblockClaimCreatedEvent.args.superblockHash;
      
      claim1 = proposesSuperblockHash;
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_REWARD, from: challenger });
      result = await claimManager.challengeSuperblock(proposesSuperblockHash, { from: challenger });
      const superblockClaimChallengedEvent = utils.findEvent(result.logs, 'SuperblockClaimChallenged');
      assert.ok(superblockClaimChallengedEvent, 'Superblock challenged');
      assert.equal(claim1, superblockClaimChallengedEvent.args.superblockHash);

      const verificationGameStartedEvent = utils.findEvent(result.logs, 'VerificationGameStarted');
      assert.ok(verificationGameStartedEvent, 'Battle started');
      
      battleSessionId = verificationGameStartedEvent.args.sessionId;
 
      result = await battleManager.queryMerkleRootHashes(proposesSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');


      result = await battleManager.respondMerkleRootHashes(proposesSuperblockHash, battleSessionId, hashes, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondMerkleRootHashes'), 'Respond merkle root hashes');


      result = await battleManager.queryLastBlockHeader(battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryLastBlockHeader'), 'Query block header');


      result = await battleManager.respondLastBlockHeader(battleSessionId, `0x${headers[0]}`, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondLastBlockHeader'), 'Respond last block header');


      // Verify superblock
      result = await battleManager.verifySuperblock(battleSessionId, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'ChallengerConvicted'), 'Challenger failed');

      // Confirm superblock
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await claimManager.checkClaimFinished(proposesSuperblockHash, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'SuperblockClaimPending'), 'Superblock semi approved');
    });

  
    it('Reject invalid timestamp', async () => {
      result = await claimManager.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork,
        proposedSuperblock.timestamp + 1,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId,
        { from: submitter },
      );

      const superblockClaimCreatedEvent = utils.findEvent(result.logs, 'SuperblockClaimCreated');
      assert.ok(superblockClaimCreatedEvent, 'New superblock proposed');
      
      proposesSuperblockHash = superblockClaimCreatedEvent.args.superblockHash;
      claim1 = proposesSuperblockHash;
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_REWARD, from: challenger });
      result = await claimManager.challengeSuperblock(proposesSuperblockHash, { from: challenger });
      const superblockClaimChallengedEvent = utils.findEvent(result.logs, 'SuperblockClaimChallenged');
      assert.ok(superblockClaimChallengedEvent, 'Superblock challenged');
      assert.equal(claim1, superblockClaimChallengedEvent.args.superblockHash);
      const verificationGameStartedEvent = utils.findEvent(result.logs, 'VerificationGameStarted');
      assert.ok(verificationGameStartedEvent, 'Battle started');
      
      battleSessionId = verificationGameStartedEvent.args.sessionId;

      result = await battleManager.queryMerkleRootHashes(proposesSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');
      

      result = await battleManager.respondMerkleRootHashes(proposesSuperblockHash, battleSessionId, hashes, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondMerkleRootHashes'), 'Respond merkle root hashes');

      result = await battleManager.queryLastBlockHeader(battleSessionId,{ from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryLastBlockHeader'), 'Query block header');

 
      result = await battleManager.respondLastBlockHeader(battleSessionId, `0x${headers[0]}`, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondLastBlockHeader'), 'Respond last block header');

      // Verify superblock
      result = await battleManager.verifySuperblock(battleSessionId, { from: challenger });
      const errorBattleEvent = utils.findEvent(result.logs, 'ErrorBattle');
      assert.ok(errorBattleEvent, 'Error verifying superblock');
      assert.equal(errorBattleEvent.args.err, '50035', 'Bad timestamp');
      assert.ok(utils.findEvent(result.logs, 'SubmitterConvicted'), 'Submitter failed');

      // Confirm superblock

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await claimManager.checkClaimFinished(proposesSuperblockHash, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'SuperblockClaimFailed'), 'Superblock rejected');
    });

    it('Reject invalid last hash', async () => {
      result = await claimManager.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork,
        proposedSuperblock.timestamp + 1,
        utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId,
        { from: submitter },
      );

      const superblockClaimCreatedEvent = utils.findEvent(result.logs, 'SuperblockClaimCreated');
      assert.ok(superblockClaimCreatedEvent, 'New superblock proposed');
      
      proposesSuperblockHash = superblockClaimCreatedEvent.args.superblockHash;
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_REWARD, from: challenger });
      result = await claimManager.challengeSuperblock(proposesSuperblockHash, { from: challenger });
      const superblockClaimChallengedEvent = utils.findEvent(result.logs, 'SuperblockClaimChallenged');
      assert.ok(superblockClaimChallengedEvent, 'Superblock challenged');
      assert.equal(proposesSuperblockHash, superblockClaimChallengedEvent.args.superblockHash);

      const verificationGameStartedEvent = utils.findEvent(result.logs, 'VerificationGameStarted');
      assert.ok(verificationGameStartedEvent, 'Battle started');
      
      battleSessionId = verificationGameStartedEvent.args.sessionId;

      result = await battleManager.queryMerkleRootHashes(proposesSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');

   
      result = await battleManager.respondMerkleRootHashes(proposesSuperblockHash, battleSessionId, hashes, { from: submitter });
      const errorBattleEvent = utils.findEvent(result.logs, 'ErrorBattle');
      assert.ok(errorBattleEvent, 'Respond merkle root hashes');
      assert.equal(errorBattleEvent.args.err, '50150', 'Bad last hash');

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await battleManager.timeout(battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'SubmitterConvicted'), 'Submitter failed');

      result = await claimManager.checkClaimFinished(proposesSuperblockHash, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'SuperblockClaimFailed'), 'Superblock rejected');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_REWARD, from: submitter });
      // Submitter cannot submit same superblock
      await truffleAssert.reverts(claimManager.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork,
        proposedSuperblock.timestamp + 1,
        utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId,
        { from: submitter },
      ));

      
      // challenger can submit the same block after winning
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_REWARD, from: challenger });
      result = await claimManager.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork,
        proposedSuperblock.timestamp + 1,
        utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId,
        { from: challenger },
      );

      const superblockClaimCreatedEvent1 = utils.findEvent(result.logs, 'SuperblockClaimCreated');
      assert.ok(superblockClaimCreatedEvent1, 'New superblock reproposed');

      // cannot submit again
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_REWARD, from: challenger });
      await truffleAssert.reverts(claimManager.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork,
        proposedSuperblock.timestamp + 1,
        utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId,
        { from: challenger },
      ));

  
    });
  });
});

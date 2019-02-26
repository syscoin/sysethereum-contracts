const utils = require('./utils');

contract('validateDifficultyAdjustment', (accounts) => {
  const owner = accounts[0];
  const submitter = accounts[1];
  const challenger = accounts[2];
  let claimManager;
  let superblocks;

  let ClaimManagerEvents;

  describe('Validate difficulty adjustment algorithm', () => {
    let genesisSuperblockHash;
    let proposesSuperblockHash;
    let battleSessionId;
    const genesisHeaders = [
      `00000030ba786c787159ac087eb369807a3d680d2ebf9bf02679785bedc890c9bf010000360b8e30762229aa6c8cedef04761c085686fc2ecb20e419a5b3a9966bdecb5187eff15bf0ff0f1e4d4e0000` // 358
    ];
    const headers = [
      `0000003056b45e45891559db4ee871cd1f0deecae112717f71ba1430bd0ab8700f0e0000cbb07d8cf27e8087352664be442a4e53d1bd5bdc69265f3e602545caf0f6c8b387eff15bf0ff0f1ee1970000`, // 359
      `00000030f7219d2def242a04a793542889c73259362f6512a03bf93be2d0ad3f910800002d6bc7dbde9a45b6c02820c499939a2ad1296fcdbaa205fa15ec4c18248675c388eff15bffff0f1ec3e40000`, // 360 (adjusts)
      `00000030a98e6b68169de942a4ad47a2d306c55a1500f89fb544c34cc964d84f16000000e8fde23adf2eaff49cdc3d711dfed0d122b3fd49c4eec2b1789bfe12364f61c688eff15bffff0f1efa670000` // 361
    ];
    const initAccumulatedWork = 0;
    const initParentHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const genesisSuperblock = utils.makeSuperblock(genesisHeaders, initParentHash, initAccumulatedWork, 358);

    const hashes = headers.map(header => utils.calcBlockSha256Hash(header));
    const proposedSuperblock = utils.makeSuperblock(headers,
      genesisSuperblock.superblockHash,
      genesisSuperblock.accumulatedWork,
      361,
      1525170117
    );

    beforeEach(async () => {
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
      genesisSuperblockHash = genesisSuperblock.superblockHash;
      const best = await superblocks.getBestSuperblock();
      assert.equal(genesisSuperblockHash, best, 'Best superblock should match');
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_PROPOSAL_DEPOSIT, from: submitter });
      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_CHALLENGE_DEPOSIT, from: challenger });
    });
    it('Confirm difficulty adjusts and convicts challenger', async () => {
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
      proposesSuperblockHash = superblockClaimCreatedEvent.args.superblockHash;
      claim1 = proposesSuperblockHash;

      await claimManager.makeDeposit({ value: utils.DEPOSITS.MIN_CHALLENGE_DEPOSIT, from: challenger });
      result = await claimManager.challengeSuperblock(proposesSuperblockHash, { from: challenger });
      const superblockClaimChallengedEvent = utils.findEvent(result.logs, 'SuperblockClaimChallenged');
      assert.ok(superblockClaimChallengedEvent, 'Superblock challenged');
      assert.equal(claim1, superblockClaimChallengedEvent.args.superblockHash);

      const verificationGameStartedEvent = utils.findEvent(result.logs, 'VerificationGameStarted');
      assert.ok(verificationGameStartedEvent, 'Battle started');
      battleSessionId = verificationGameStartedEvent.args.sessionId;

      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_MERKLE_COST, from: challenger });
      result = await battleManager.queryMerkleRootHashes(proposesSuperblockHash, battleSessionId, { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondMerkleRootHashes(proposesSuperblockHash, battleSessionId, hashes, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondMerkleRootHashes'), 'Respond merkle root hashes');

      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });
      result = await battleManager.queryBlockHeader(proposesSuperblockHash, battleSessionId, hashes[0], { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryBlockHeader'), 'Query block header');
      
      await claimManager.makeDeposit({ value: utils.DEPOSITS.VERIFY_SUPERBLOCK_COST, from: submitter });
      result = await battleManager.respondBlockHeader(proposesSuperblockHash, battleSessionId, `0x${headers[0]}`, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondBlockHeader'), 'Respond block header');
      
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });
      result = await battleManager.queryBlockHeader(proposesSuperblockHash, battleSessionId, hashes[1], { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryBlockHeader'), 'Query block header');
      
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });
      result = await battleManager.respondBlockHeader(proposesSuperblockHash, battleSessionId, `0x${headers[1]}`, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondBlockHeader'), 'Respond block header');
      
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });
      result = await battleManager.queryBlockHeader(proposesSuperblockHash, battleSessionId, hashes[2], { from: challenger });
      assert.ok(utils.findEvent(result.logs, 'QueryBlockHeader'), 'Query block header');
      
      await claimManager.makeDeposit({ value: utils.DEPOSITS.RESPOND_HEADER_COST, from: challenger });
      result = await battleManager.respondBlockHeader(proposesSuperblockHash, battleSessionId, `0x${headers[2]}`, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'RespondBlockHeader'), 'Respond block header');
      // Verify diff change and challenger is at fault (its actually valid)
      result = await battleManager.verifySuperblock(battleSessionId, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'ChallengerConvicted'), 'Challenger failed');

      // Confirm superblock
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await claimManager.checkClaimFinished(proposesSuperblockHash, { from: submitter });
      assert.ok(utils.findEvent(result.logs, 'SuperblockClaimPending'), 'Superblock semi approved');
    });
    
 
 
  });
});

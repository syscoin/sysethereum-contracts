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
        proxyAdmin: proxyAdmin
      }));
      genesisSuperblockHash = genesisSuperblock.superblockHash;
      const best = await superblocks.methods.getBestSuperblock().call();
      assert.equal(genesisSuperblockHash, best, 'Best superblock should match');
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter });
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger });
    });
    
    it('Confirm superblock with one header', async () => {
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter, gas: 300000 });
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: submitter, gas: 2100000 });
      assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
      proposesSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;
      
      claim1 = proposesSuperblockHash;
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      result = await claimManager.methods.challengeSuperblock(proposesSuperblockHash).send({ from: challenger, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
      assert.equal(claim1, result.events.SuperblockClaimChallenged.returnValues.superblockHash);

      assert.ok(result.events.VerificationGameStarted, 'Battle started');
      
      battleSessionId = result.events.VerificationGameStarted.returnValues.sessionId;
 
      result = await battleManager.methods.queryMerkleRootHashes(battleSessionId).send({ from: challenger, gas: 300000 });

      assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');


      result = await battleManager.methods.respondMerkleRootHashes(battleSessionId, hashes).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');


      result = await battleManager.methods.queryLastBlockHeader(battleSessionId, 0).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryLastBlockHeader, 'Query block header');


      result = await battleManager.methods.respondLastBlockHeader(battleSessionId, `0x${headers[0]}`, "0x").send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondLastBlockHeader, 'Respond last block header');


      // Verify superblock
      result = await battleManager.methods.verifySuperblock(battleSessionId).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.ChallengerConvicted, 'Challenger failed');

      // Confirm superblock
      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await claimManager.methods.checkClaimFinished(proposesSuperblockHash).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.SuperblockClaimPending, 'Superblock semi approved');
    });

  
    it('Reject invalid timestamp', async () => {
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp + 1,
        proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: submitter, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
      
      proposesSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;
      claim1 = proposesSuperblockHash;
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      result = await claimManager.methods.challengeSuperblock(proposesSuperblockHash).send({ from: challenger, gas: 2100000 });
      assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
      assert.equal(claim1, result.events.SuperblockClaimChallenged.returnValues.superblockHash);
      assert.ok(result.events.VerificationGameStarted, 'Battle started');
      
      battleSessionId = result.events.VerificationGameStarted.returnValues.sessionId;

      result = await battleManager.methods.queryMerkleRootHashes(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');
      

      result = await battleManager.methods.respondMerkleRootHashes(battleSessionId, hashes).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');

      result = await battleManager.methods.queryLastBlockHeader(battleSessionId, 0).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryLastBlockHeader, 'Query block header');

 
      result = await battleManager.methods.respondLastBlockHeader(battleSessionId, `0x${headers[0]}`, "0x").send({ from: submitter, gas: 300000 });
      assert.ok(result.events.RespondLastBlockHeader, 'Respond last block header');

      // Verify superblock
      result = await battleManager.methods.verifySuperblock(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.ErrorBattle, 'Error verifying superblock');
      assert.equal(result.events.ErrorBattle.returnValues.err, '50035', 'Bad timestamp');
      assert.ok(result.events.SubmitterConvicted, 'Submitter failed');

      // Confirm superblock

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await claimManager.methods.checkClaimFinished(proposesSuperblockHash).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.SuperblockClaimFailed, 'Superblock rejected');
    });

    it('Reject invalid last hash', async () => {
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp + 1,
        utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: submitter, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
      
      proposesSuperblockHash = result.events.SuperblockClaimCreated.returnValues.superblockHash;
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      result = await claimManager.methods.challengeSuperblock(proposesSuperblockHash).send({ from: challenger, gas: 2100000 });
      assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
      assert.equal(proposesSuperblockHash, result.events.SuperblockClaimChallenged.returnValues.superblockHash);

      assert.ok(result.events.VerificationGameStarted, 'Battle started');
      
      battleSessionId = result.events.VerificationGameStarted.returnValues.sessionId;

      result = await battleManager.methods.queryMerkleRootHashes(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');

   
      result = await battleManager.methods.respondMerkleRootHashes(battleSessionId, hashes).send({ from: submitter, gas: 300000 });
      assert.ok(result.events.ErrorBattle, 'Respond merkle root hashes');
      assert.equal(result.events.ErrorBattle.returnValues.err, '50150', 'Bad last hash');

      await utils.blockchainTimeoutSeconds(2*utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
      result = await battleManager.methods.timeout(battleSessionId).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.SubmitterConvicted, 'Submitter failed');

      result = await claimManager.methods.checkClaimFinished(proposesSuperblockHash).send({ from: challenger, gas: 300000 });
      assert.ok(result.events.SuperblockClaimFailed, 'Superblock rejected');

      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: submitter, gas: 300000 });
      // Submitter cannot submit same superblock
      await truffleAssert.reverts(
        claimManager.methods.proposeSuperblock(
          proposedSuperblock.merkleRoot,
          proposedSuperblock.accumulatedWork.toString(),
          proposedSuperblock.timestamp + 1,
          utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
          proposedSuperblock.lastBits,
          proposedSuperblock.parentId
        ).send({ from: submitter, gas: 2100000 })
      );

      
      // challenger can submit the same block after winning
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      result = await claimManager.methods.proposeSuperblock(
        proposedSuperblock.merkleRoot,
        proposedSuperblock.accumulatedWork.toString(),
        proposedSuperblock.timestamp + 1,
        utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
        proposedSuperblock.lastBits,
        proposedSuperblock.parentId).send({ from: challenger, gas: 2100000 });

      assert.ok(result.events.SuperblockClaimCreated, 'New superblock reproposed');

      // cannot submit again
      await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD, from: challenger, gas: 300000 });
      await truffleAssert.reverts(
        claimManager.methods.proposeSuperblock(
          proposedSuperblock.merkleRoot,
          proposedSuperblock.accumulatedWork.toString(),
          proposedSuperblock.timestamp + 1,
          utils.ZERO_BYTES32, // proposedSuperblock.lastHash,
          proposedSuperblock.lastBits,
          proposedSuperblock.parentId).send({ from: challenger, gas: 300000 })
      );
  
    });
  });
});

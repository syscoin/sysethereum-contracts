const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');

/* Initialize OpenZeppelin's Web3 provider. */
ZWeb3.initialize(web3.currentProvider);

const crypto = require('crypto');
const keccak256 = require('js-sha3').keccak256;
const utils = require('./utils');
const SyscoinSuperblocks = Contracts.getFromLocal('SyscoinSuperblocks');

contract('SyscoinSuperblocks', (accounts) => {
  let superblocks;
  const randomAddress = accounts[0];
  const proxyAdmin = accounts[9];
  const claimManager = accounts[1];
  const erc20Manager = accounts[3];
  const user = accounts[2];
  describe('Utils', () => {
    let hash;
    const oneHash = [
      "0x57a8a9a8de6131bf61f5d385318c10e29a5d826eed6adbdbeedc3a0539908ed4"
    ];
    const twoHashes = [
      "0x2e6e9539f02088efe5abb7082bb6e8ba8df68e1cca543af48f5cc93523bf7209",
      "0x5db4c5556edb6dffe30eb26811327678a54f74b7a3072f2834472ea30ee17360"
    ];
    const threeHashes = [
      "0x6bbe42a26ec5af04eb16da92131ddcd87df55d629d940eaa8f88c0ceb0b9ede6",
      "0xc2213074ba6cf84780030f9dc261fa31999c039811516aaf0fb8fd1e1a9fa0c3",
      "0xde3d260197746a0b509ffa4e05cc8b042f0a0ce472c20d75e17bf58815d395e1"
    ];
    const manyHashes = [
      "0xb2d645742da1443e2439dfe1ee5901aa74680ddd2f11be203595673be5cfc396",
      "0x75520841e64a8acdd669e453d0a55caa7082a35ec6406cf5e73b30cdf34ad0b6",
      "0x6a4a7fdf807e56a39ca842d3e3807e6639af4cf1d05cf6da6154a0b5170f7690",
      "0xde3d260197746a0b509ffa4e05cc8b042f0a0ce472c20d75e17bf58815d395e1",
      "0x6bbe42a26ec5af04eb16da92131ddcd87df55d629d940eaa8f88c0ceb0b9ede6",
      "0x50ab8816b4a1ffa5700ff26bb1fbacce5e3cb93978e57410cfabbe8819a45a4e",
      "0x2e6e9539f02088efe5abb7082bb6e8ba8df68e1cca543af48f5cc93523bf7209",
      "0x57a8a9a8de6131bf61f5d385318c10e29a5d826eed6adbdbeedc3a0539908ed4",
      "0xceace0419d93c9789498de2ed1e75db53143b730f18cff88660297759c719231",
      "0x0ce3bcd684f4f795e549a2ddd1f4c539e8d80813b232a448c56d6b28b74fe3ed",
      "0x5db4c5556edb6dffe30eb26811327678a54f74b7a3072f2834472ea30ee17360",
      "0x03d7be19e9e961691712fde9fd87b706c7d0768a207b84ef6ad1f81ffa90dec5",
      "0x8e5e221b22795d96d3de1cad930d7b131f37b6b9dfcccd3f745b08e6900ef1bd",
      "0xc2213074ba6cf84780030f9dc261fa31999c039811516aaf0fb8fd1e1a9fa0c3",
      "0x38d3dffed604f5a160b327ecde5147eb1aa46e3d154b98644cd2a39f0f9ab915"
    ]
    before(async () => {
      this.project = await TestHelper({from: proxyAdmin});
      superblocks = await this.project.createProxy(SyscoinSuperblocks, {
        initMethod: 'init',
        initArgs: [erc20Manager, claimManager]
      });
    });
    it('Merkle javascript', async () => {
      hash = utils.makeMerkle(oneHash);
      assert.equal(hash, "0x57a8a9a8de6131bf61f5d385318c10e29a5d826eed6adbdbeedc3a0539908ed4", 'One hash array');
      hash = utils.makeMerkle(twoHashes);
      assert.equal(hash, "0xae1c24c61efe6b378017f6055b891dd62747deb23a7939cffe78002f1cfb79ab", 'Two hashes array');
      hash = utils.makeMerkle(threeHashes);
      assert.equal(hash, "0xe1c52ec93d4f4f83783aeede9e6b84b5ded007ec9591b521d6e5e4b6d9512d43", 'Three hashes array');
      hash = utils.makeMerkle(manyHashes);
      assert.equal(hash, "0xee712eefe9b4c9ecd39a71d45e975b83c9427070e54953559e78f45d2cbb03b3", 'Many hashes array');
    })
    it('Merkle solidity', async () => {
      hash = await superblocks.methods.makeMerkle(oneHash).call();
      assert.equal(hash, "0x57a8a9a8de6131bf61f5d385318c10e29a5d826eed6adbdbeedc3a0539908ed4", 'One hash array');
      hash = await superblocks.methods.makeMerkle(twoHashes).call();
      assert.equal(hash, "0xae1c24c61efe6b378017f6055b891dd62747deb23a7939cffe78002f1cfb79ab", 'Two hashes array');
      hash = await superblocks.methods.makeMerkle(threeHashes).call();
      assert.equal(hash, "0xe1c52ec93d4f4f83783aeede9e6b84b5ded007ec9591b521d6e5e4b6d9512d43", 'Three hashes array');
      hash = await superblocks.methods.makeMerkle(manyHashes).call();
      assert.equal(hash, "0xee712eefe9b4c9ecd39a71d45e975b83c9427070e54953559e78f45d2cbb03b3", 'Many hashes array');
    });
    it('Superblock id', async () => {
      const merkleRoot = "0xbc89818e52613f36d6cea2edba2c9417f01ee910250dbd85a8647a92e655996b";
      const timestamp = "0x000000000000000000000000000000000000000000000000000000005ada05b9";
      const mtpTimestamp = timestamp;
      const lastHash = "0xe0dd609916339ee7e12272cf5467cf5915d2d41a16816e7118116fb281337367";
      const parentId = "0xe70a134b97a4381e5b6c1f4ae0e1e3726b7284bf03506afacebf92401e255e97";
      const lastBits = "0x00000000";
      const superblockHash = utils.calcSuperblockHash(
        merkleRoot,
        timestamp,
        mtpTimestamp,
        lastHash,
        lastBits,
        parentId
      );
      const id = await superblocks.methods.calcSuperblockHash(merkleRoot, timestamp, mtpTimestamp, lastHash, lastBits, parentId).call();
      assert.equal(id, superblockHash, "Superblock hash should match");
    });
  });
  describe('Verify status transitions', () => {
    let id0;
    let id1;
    let id2;
    let id3;
    const merkleRoot = utils.makeMerkle(['0x0000000000000000000000000000000000000000000000000000000000000000']);
    const timestamp = 1;
    const mtptimestamp = 1;
    const lastBits = 0;
    const lastHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const parentHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    before(async () => {
      superblocks = await this.project.createProxy(SyscoinSuperblocks, {
        initMethod: 'init',
        initArgs: [erc20Manager, claimManager]
      });
    });
    it('Initialized', async () => {
      const result = await superblocks.methods.initialize(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits, parentHash).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'New superblock proposed');
      id0 = result.events.NewSuperblock.returnValues.superblockHash;
    });
    it('Propose', async () => {

      const result = await superblocks.methods.propose(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits,id0, utils.ZERO_ADDRESS).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'New superblock proposed');
      id1 = result.events.NewSuperblock.returnValues.superblockHash;
    });
    // re-propose works but claimmanager will reject() if validation fails
    it('Re-propose', async () => {
      const result = await superblocks.methods.propose(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits,id0, utils.ZERO_ADDRESS).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'New superblock proposed');
    });
    it('Bad parent', async () => {
      const result = await superblocks.methods.propose(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits,"0x0", utils.ZERO_ADDRESS).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ErrorSuperblock.event, 'ErrorSuperblock', 'Superblock parent does not exist');
    });
    it('Approve', async () => {
      const result = await superblocks.methods.confirm(id1, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ApprovedSuperblock.event, 'ApprovedSuperblock', 'Superblock confirmed');
    });
    it('Propose bits', async () => {
      const result = await superblocks.methods.propose(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits,id1, utils.ZERO_ADDRESS).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'New superblock proposed');
      id2 = result.events.NewSuperblock.returnValues.superblockHash;
    });
    it('Challenge', async () => {
      const result = await superblocks.methods.challenge(id2, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ChallengeSuperblock.event, 'ChallengeSuperblock', 'Superblock challenged');
    });
    it('Semi-Approve', async () => {
      const result = await superblocks.methods.semiApprove(id2, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.SemiApprovedSuperblock.event, 'SemiApprovedSuperblock', 'Superblock semi-approved');
    });
    it('Approve bis', async () => {
      const result = await superblocks.methods.confirm(id2, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ApprovedSuperblock.event, 'ApprovedSuperblock', 'Superblock confirmed');
    });
    it('Invalidate bad', async () => {
      const result = await superblocks.methods.invalidate(id2, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ErrorSuperblock.event, 'ErrorSuperblock', 'Superblock cannot invalidate');
    });
    it('Propose tris', async () => {
      const result = await superblocks.methods.propose(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits,id2, utils.ZERO_ADDRESS).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'New superblock proposed');
      id3 = result.events.NewSuperblock.returnValues.superblockHash;
    });
    it('Challenge bis', async () => {
      const result = await superblocks.methods.challenge(id3, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ChallengeSuperblock.event, 'ChallengeSuperblock', 'Superblock challenged');
    });
    it('Invalidate', async () => {
      const result = await superblocks.methods.invalidate(id3, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.InvalidSuperblock.event, 'InvalidSuperblock', 'Superblock invalidated');
    });
    it('Approve bad', async () => {
      const result = await superblocks.methods.confirm(id3, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ErrorSuperblock.event, 'ErrorSuperblock', 'Superblock cannot approve');
    });
  });
  describe('Only ClaimManager can modify', () => {
    let id0;
    let id1;
    let id2;
    let id3;
    const merkleRoot = utils.makeMerkle(['0x0000000000000000000000000000000000000000000000000000000000000000']);
    const timestamp = Math.floor((new Date()).getTime() / 1000) - 10801;
    const mtptimestamp = timestamp;
    const lastHash = '0x00';
    const lastBits = 0;
    const parentHash = '0x00';
    before(async () => {
      superblocks = await this.project.createProxy(SyscoinSuperblocks, {
        initMethod: 'init',
        initArgs: [erc20Manager, claimManager]
      });
    });
    it('Initialized', async () => {
      const result = await superblocks.methods.initialize(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits,parentHash).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'New superblock proposed');
      id0 = result.events.NewSuperblock.returnValues.superblockHash;
    });
    it('Propose', async () => {
      let result = await superblocks.methods.propose(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits, id0, utils.ZERO_ADDRESS).send({from: randomAddress, gas: 300000});
      assert.equal(result.events.ErrorSuperblock.event, 'ErrorSuperblock', 'Only claimManager can propose');

      result = await superblocks.methods.propose(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits, id0, utils.ZERO_ADDRESS).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'ClaimManager can propose');
      id1 = result.events.NewSuperblock.returnValues.superblockHash;
    });
    it('Approve', async () => {
      let result = await superblocks.methods.confirm(id1, claimManager).send({ from: randomAddress, gas: 300000 });
      assert.equal(result.events.ErrorSuperblock.event, 'ErrorSuperblock', 'Only claimManager can propose');

      result = await superblocks.methods.confirm(id1, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ApprovedSuperblock.event, 'ApprovedSuperblock', 'Only claimManager can propose');
    });
    it('Challenge', async () => {
      let result = await superblocks.methods.propose(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits,id1, utils.ZERO_ADDRESS).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'ClaimManager can propose');
      id2 = result.events.NewSuperblock.returnValues.superblockHash;

      result = await superblocks.methods.challenge(id2, claimManager).send({ from: randomAddress, gas: 300000 });
      assert.equal(result.events.ErrorSuperblock.event, 'ErrorSuperblock', 'Only claimManager can propose');

      result = await superblocks.methods.challenge(id2, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ChallengeSuperblock.event, 'ChallengeSuperblock', 'Superblock challenged');
    });
    it('Semi-Approve', async () => {
      let result = await superblocks.methods.semiApprove(id2, claimManager).send({ from: randomAddress, gas: 300000 });
      assert.equal(result.events.ErrorSuperblock.event, 'ErrorSuperblock', 'Only claimManager can semi-approve');

      result = await superblocks.methods.semiApprove(id2, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.SemiApprovedSuperblock.event, 'SemiApprovedSuperblock', 'Superblock semi-approved');

      result = await superblocks.methods.confirm(id2, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ApprovedSuperblock.event, 'ApprovedSuperblock', 'Superblock confirmed');
    });
    it('Invalidate', async () => {
      let result = await superblocks.methods.propose(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits,id2, utils.ZERO_ADDRESS).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'New superblock proposed');
      id3 = result.events.NewSuperblock.returnValues.superblockHash;

      result = await superblocks.methods.challenge(id3, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.ChallengeSuperblock.event, 'ChallengeSuperblock', 'Superblock challenged');

      result = await superblocks.methods.invalidate(id3, claimManager).send({ from: randomAddress, gas: 300000 });
      assert.equal(result.events.ErrorSuperblock.event, 'ErrorSuperblock', 'Only claimManager can invalidate');

      result = await superblocks.methods.invalidate(id3, claimManager).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.InvalidSuperblock.event, 'InvalidSuperblock', 'Superblock invalidated');
    });
  });
  describe('Test locator', () => {
    let id0;
    let id1;
    let id2;
    let id3;
    const merkleRoot = utils.makeMerkle(['0x0000000000000000000000000000000000000000000000000000000000000000']);
    const timestamp = 1;
    const mtptimestamp = 1;
    const lastBits = 0;
    const lastHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const parentHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    before(async () => {
      superblocks = await this.project.createProxy(SyscoinSuperblocks, {
        initMethod: 'init',
        initArgs: [erc20Manager, claimManager]
      });
    });
    it('Initialized', async () => {
      const result = await superblocks.methods.initialize(merkleRoot, timestamp, mtptimestamp, lastHash, lastBits,parentHash).send({ from: claimManager, gas: 300000 });
      assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'New superblock proposed');
      id0 = result.events.NewSuperblock.returnValues.superblockHash;
    });
    it('Verify locator', async () => {
      let parentId;
      parentId = id0;
      let superblockHash;
      let result;
      let prevLocator;
      let locator;
      prevLocator = locator = await superblocks.methods.getSuperblockLocator().call();
      const sblocks = {};
      sblocks[0] = id0;
      for(let work = 1; work < 30; ++work) {
        result = await superblocks.methods.propose(merkleRoot, 0, 0, lastHash, lastBits,parentId, utils.ZERO_ADDRESS).send({ from: claimManager, gas: 300000 });
        assert.equal(result.events.NewSuperblock.event, 'NewSuperblock', 'ClaimManager can propose');
        superblockHash = result.events.NewSuperblock.returnValues.superblockHash;

        result = await superblocks.methods.confirm(superblockHash, claimManager).send({ from: claimManager, gas: 300000 });
        assert.equal(result.events.ApprovedSuperblock.event, 'ApprovedSuperblock', 'Only claimManager can propose');

        locator = await superblocks.methods.getSuperblockLocator().call();
        assert.equal(locator[0], superblockHash, 'Position 0 current best superblock');
        assert.equal(locator[1], parentId, 'Position 1 parent best superblock');
        let step = 5;
        // At index i we have superblockHash of height
        // (bestSuperblock-1) - (bestSuperblock-1) % 5**(i-1)
        for (let i=2; i<=8; ++i) {
          let pos = work - 1 - (work - 1) % step;
          assert.equal(locator[i], sblocks[pos], `Invalid superblock at ${i} ${step} ${pos}`);
          step = step * 5;
        }
        if (work % 5 === 0) {
          sblocks[work] = superblockHash;
        }
        parentId = superblockHash;
        prevLocator = locator;
      }
    });
  });
});

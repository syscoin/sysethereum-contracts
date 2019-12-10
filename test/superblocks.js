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

  // raw syscon mind TX
  // 067400000001013532f20fad408fb5beadaf4e2b4afbd86d12178d6a51ad4cec2ebc0f2fce93d20100000000feffffff020000000000000000fd2e076a4d2a07020150fd9e02f9029bf851a045a99ae455983d52604ee2a850ef7548b74ea118f1012297076dbb04b5348a0780808080808080a029cff91398b0056df3adfaa20bb49d3b416a0e69ee2c3117491ab36eca8465788080808080808080f8f180a082c0e775c7a55cd7dc0887cb15c90d760d994cd4d21fe26471164a9a1cc81161a034586b91f0fbbadaf00a6b3ffeeca8500255f6e8697f522a4c3c15c0f506c31ba0efdaeb23d58fcb4a52516e6856cb5cd9b19a5540cff4013a8f1e20b20ca51f5da00edb363b44a099c43f07c57083e05c5014ff4cbf2ea6ded88c009f12c8d0795ba0c3cdf1761eb751ff912eebb22b785e66976c159c193d7a4eb509e37d98c1bfc0a0595feaf2bbd299d9608f6c8533f9fbf0c34542ae423b35b8e89c432ea7645d61a07193d4763528c975c662910c5ca38424794bc8458e5102d8910f87e3edcbfab3808080808080808080f9015220b9014ef9014b8204ce843b9aca008307a1209438945d8004cf4671c45686853452a6510812117c80b8e45f959b690000000000000000000000000000000000000000000000000000000008f0d180000000000000000000000000000000000000000000000000000000002b7d3c01000000000000000000000000fbf4411309e690a6209b7f0d70ea304f8b40ac20000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000015002d68d3fe66b558010a3fa3ebf424bf1b8a59102400000000000000000000002ba01d91266755bdfe30c3b53a485afae06843bf21fb307b9f1947463002ce991f6ca06bdd1b6acc6016bf71e7ad4012e4e38d6552169e5d7148dbf0deca014794fd9e21a0f7b6f97b29bb3b107a1d1378f46f00750c4dacaa479369e4d599273ded5d98cd0105020150fd1304f90410f851a087ce28043d98064d651ec747b0ad1424857abda5ebe33cb512394893d0dacaa680808080808080a07965dbc2e42fbbaa7e6b24a3b93068513bea5a0c43a558dddefc2ae33b52f2898080808080808080f8f180a042f337f63d327f55f6c1498506df6bef6cc468107f163fcf9cb20d09a710ecf5a0991789340b01cd84de5499517a62d90a59eb0e44fe076be58b06704d87e0fbfaa0bd5a74c21752411a4442d5bbe4ffd0ecddcf3dee4a9b6166ee8e22b27fce0c7fa0ddf71b73d27d7bd2c06a734dda7505d590151177142905bf1169aed9cb09121da00b46675c3124c8235ba46d8d946f489f9e7e370b586edd3fdfa155cba6da02b0a0bad056ccfa51a0e98c05a8eaee60400170583e31b257bcf84b6db65db0a23e82a0ff2dcf5e1ec682c011fc64bce7e27b78061f2f899b2af4e8b3b9e0ef2ce2409b808080808080808080f902c720b902c3f902c0018305244eb9010000000000000000000000000000000000000000000000000000000000000100020000000000000000010000000000000000000000000000000000000000200000000000000000080001000008000000000000000000000000340000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000020000000000000000000000000000000000000000008120000000000000010000000002000000000000000000000000000000800000000000000000000000800010000000000000000000000000000000000000000000000000000000000000f901b5f89b94fbf4411309e690a6209b7f0d70ea304f8b40ac20f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c144053a000000000000000000000000038945d8004cf4671c45686853452a6510812117ca00000000000000000000000000000000000000000000000000000000008f0d180f89b94fbf4411309e690a6209b7f0d70ea304f8b40ac20f863a08c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925a0000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c144053a000000000000000000000000038945d8004cf4671c45686853452a6510812117ca00000000000000000000000000000000000000000000000000000000000000000f8799438945d8004cf4671c45686853452a6510812117ce1a07def9f73ac6a7ac8fe4dc55f5257d48aed7e3f9d5247b0020598b87a5c369d82b840000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c1440530000000000000000000000000000000000000000000000000000000008f0d18021a06759019d118f4f19694ee8ed58167d2f460834bbb7dac5a0c5fd8ade3816e66f00a8ff530032401b060014ced26f5a296f082540c8f9cffee8015ecef6ad2c80d1f00800000000d40a9a3b00000000160014ced26f5a296f082540c8f9cffee8015ecef6ad2c02473044022034f3e994ff3c507217111664139236ec43a1b92895841cfffe91036afdb3018c022008bc2875f297bd9b2afa659db87af3b75a2a4d1f1845bc974b57c2e0b41f279a0121033e295585b49b152f0bdc61f10c8bfb6695d87e9eb7b1e1120ea2660b5d086cff00000000

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
});

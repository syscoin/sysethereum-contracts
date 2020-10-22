const truffleAssert = require('truffle-assertions');

const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');

/* Initialize OpenZeppelin's Web3 provider. */
ZWeb3.initialize(web3.currentProvider);

const utils = require('./utils');
const SyscoinSuperblocks = Contracts.getFromLocal('SyscoinSuperblocks');
const SyscoinSuperblocksForTests = Contracts.getFromLocal('SyscoinSuperblocksForTests');
const SyscoinERC20Manager = Contracts.getFromLocal('SyscoinERC20Manager');

var SyscoinERC20 = artifacts.require("./token/SyscoinERC20.sol");


contract('SyscoinSuperblocks', (accounts) => {
  let superblocks, superblocksForChallange;

  const randomAddress = accounts[0];
  const claimManager = accounts[1];
  const erc20Manager = accounts[3];
  const cancelAddress = accounts[5];
  const challangerAddress = accounts[6];
  const proxyAdmin = accounts[9];
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
  describe("Test bridge transfer cancellation challange", () => {
    let erc20Manager, erc20Asset;
    const burnVal = 1000000000;
    const value =   burnVal * 4;
    const assetGUID = 1702063431;
    const syscoinAddress = "004322ec9eb713f37cf8d701d819c165549d53d14e";
    const CANCEL_MINT_TIMEOUT = 1814400; // 3 weeks in seconds

    const _txBytes = "0x067400000135ebf6de64a8ddd28496b348faa986a0eb7a6795a9a3c2a8fec18bf1653b877a0100000000feffffff020000000000000000fd4e076a4d4a07020150fd9e02f9029bf851a0ed0c568512b08aeb4fa1450c49d8c734d73ec58a0e9bf942501f876d237d3b2180808080808080a01c9f2481b288d727091763a550b91d05f126550c0b8cb884bbb89355f058d6988080808080808080f8f180a00b155cfa825eebd4387141f1b0a1d453aa6c2e8c94e8808a03471025f2bf5bfba0bcc27a49107da1358cbc8e31ece77258891772a85b0c7d98c9878c01604fe105a011894c8f86ab7d6101ebc095659c0fb0b6c1e7f2610f8c2a69b1ec76e1bdb35ca0185130c892d44c00e863b80d24ddace2a56e02153a699157d6de44580f918af2a0e0ffdce895c771f709e8818d9b4f66e077fb623dd9a625dfae5d16e6ac2f48cba02a7b90367226b15a5edeb8f8ef9e5812ea518811a3b18bfc37ed1326f23d9f96a0e89fbf1ad4fd4e0ec02ab07ae317865a4900d996046dbf9930b9b90fcd6263e2808080808080808080f9015220b9014ef9014b82050a843b9aca008307a12094443d9a14fb6ba2a45465bec3767186f404ccea2580b8e45f959b69000000000000000000000000000000000000000000000000000000003b9aca0000000000000000000000000000000000000000000000000000000000752cbd74000000000000000000000000e3d9ccbaedabd8fd4401aab7752f6f224a7ef1c8000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000150073c237a0171e48890a824abbda619de705c0c21f00000000000000000000002ca084d8ef69c57da181d2f0dc0e86830767d222a42ed6531bbcc21562d2e3dd9dc2a011471be2af053fc149433c524e25c79413f5d485f9cd47be41f3b30015a72d2921a0e665cfa707a6f3820cf78d14e597c6556b12cf09a3896f6c66fffcc618e1d3a60107020150fd3304f90430f851a05d4c1a63bc12acf469503af1a25046dd2f6f2faf96eeb5deaa547271fed3f12280808080808080a0c834b4a2888a435cb287243862478dc45905129c248c513e78fd9d76fec2c2658080808080808080f8f180a0c5909feb6833c293c9de41a100e6554e834d9d94818349ff77bf6645cea7301da0ef8a863bcf92b3b842f5657d14d1baef04f1eaa9e7fbe0d68e669064ee164d50a02410b760fb2c88a831a942aeb8ce8e3d36914350d68da8ee070c8bacb2b140b5a0ba300fc6f3ef67d0a806666a94ad1576c007a4be28d4915f71cc4c27ecb1d3e8a00b16db3783fecc599a946427b92ea7afb90776f74491d5e66f2385a532103fb7a004a51819e2122ca287480ce5d2f368052159d8238f5ca6fe5fd433d23ecf550da01e8a038b50c67cafca122694ea945cf0df5c3687da4db0af8d94487037385930808080808080808080f902e720b902e3f902e001836c0f56b901000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000021000008000000000000000000000a000000000004000000000000200000000000000000000000000000000000000100000000000000000000000000000010040000000000000000000010000000000000000000000000000000000000001000000000020000000000000000000000000000000000000000008000000000000000000000000002000000000000020000000000000000000000000000000000000000000010000100000000800000000000000000000000000080000000000000000000f901d5f89b94e3d9ccbaedabd8fd4401aab7752f6f224a7ef1c8f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c144053a0000000000000000000000000443d9a14fb6ba2a45465bec3767186f404ccea25a0000000000000000000000000000000000000000000000000000000003b9aca00f89b94e3d9ccbaedabd8fd4401aab7752f6f224a7ef1c8f863a08c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925a0000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c144053a0000000000000000000000000443d9a14fb6ba2a45465bec3767186f404ccea25a00000000000000000000000000000000000000000000000000000000000000000f89994443d9a14fb6ba2a45465bec3767186f404ccea25e1a0aabab1db49e504b5156edf3f99042aeecb9607a08f392589571cd49743aaba8db860000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c144053000000000000000000000000000000000000000000000000000000003b9aca00000000000000000000000000000000000000000000000000000000000000000a21a085d0066a7f89763d0a6e1247217cfad6f1444fe658a9490cc96ca66dd9bcad40004693550074bd2c75001473c237a0171e48890a824abbda619de705c0c21f00ca9a3b0000000088f79b292608000016001473c237a0171e48890a824abbda619de705c0c21f00000000";
    const _txIndex = 1;
    const _txSiblings = ["0x32e215184078eb14a938a4e56b4cc2fc64192d47154ea084b1eab4d54c43dc71"];
    const _syscoinBlockHeader = "0x04000010b468f821da3134b536c952051ad24a0fde9ef36bc93903367645b2e18a01000040c9343ebdfaae0aa821c3816971bac55d8a163c87b58cdc233355a17f51f5bb01ecf35dccb7011ea60e0a00";
    const _syscoinBlockIndex = 33
    const _syscoinBlockSiblings = [
      "0x0000018ae1b24576360339c96bf39ede0f4ad21a0552c936b53431da21f868b4",
      "0x5cfe747092abc286feafabdaf12387b62979b62f0c54c166229e611e7af3f1e8",
      "0x08b411894a459d5c8041402f99bb0adfd2f74b62f68330d419f0022b9815878a",
      "0x754df7d4fa0b0cff9ab50ea1dca6aba2826281df4b6b4d21b2a79f965bc69fdf",
      "0xa9bc14f12bd5a427335fe549eff4d0280ee8f6428b7190bb0458da589b60d81a",
      "0xeb54ed956b34aba774a7da40da5c43e60d049f6a432b7c0addf2d1a7a612a278"
    ]
    const _superblockHash = "0x2498bf70b6b28a7dafdb99efc059e94ae6fc346269307516188ff09c0924efd0";
    const blocksMerkleRoot = "0xcc6fe14508bca9cd7e364313a4cee8bbf3f7ceb4b6810b1c3d5d80b176fa0110";

    beforeEach("Setup env for cancellation challange", async () => {
      superblocksForChallange = await this.project.createProxy(SyscoinSuperblocksForTests);
      erc20Asset = await SyscoinERC20.new("SyscoinToken", "SYSX", 8, {from: claimManager});
      erc20Manager = await this.project.createProxy(SyscoinERC20Manager, {
        initMethod: 'init',
        initArgs: [utils.SYSCOIN_REGTEST, superblocksForChallange.options.address, assetGUID, erc20Asset.address, 8]
      });

      await superblocksForChallange.methods.init(erc20Manager.options.address, claimManager).send({from: claimManager, gas: 300000});

      

      let tx, bridgeTransferId;
      // generate transfer for given bridgeTransferId
      while(bridgeTransferId != 10) {
        await erc20Asset.assign(cancelAddress, value);
        await erc20Asset.approve(erc20Manager.options.address, burnVal, {from: cancelAddress});
        tx = await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, syscoinAddress).send({from: cancelAddress, gas: 300000});
        bridgeTransferId = tx.events.TokenFreeze.returnValues.transferIdAndPrecisions & 0xFFFFFFFF;
      }

      // travel in time 3 weeks forward
      await utils.blockchainTimeoutSeconds(CANCEL_MINT_TIMEOUT+1);
      tx = await erc20Manager.methods.cancelTransferRequest(bridgeTransferId).send({from: cancelAddress, value: web3.utils.toWei('3', 'ether')});
      assert.equal(cancelAddress, tx.events.CancelTransferRequest.returnValues.canceller, "msg.sender incorrect");
      assert.equal(10, tx.events.CancelTransferRequest.returnValues.bridgetransferid, "bridgetransferid incorrect");
    })

    describe("should fail when", () => {
      it("txBytes is corrupted", async () => {
        const _txBytesCorrupted = "0x067400000135ebf6de64a8ddd28496b348faa986a0eb7a6795a9a3c2a8fec18bf1653b877a0100000000feffffff020000000000000000fd4e076a4d4a07020150fd9e02f9029bf851a0ed0c568512b08aeb4fa1450c49d8c734d73ec58a0e9bf942501f876d237d3b2180808080808080a01c9f2481b288d727091763a550b91d05f126550c0b8cb884bbb89355f058d6988080808080808080f8f180a00b155cfa825eebd4387141f1b0a1d453aa6c2e8c94e8808a03471025f2bf5bfba0bcc27a49107da1358cbc8e31ece77258891772a85b0c7d98c9878c01604fe105a011894c8f86ab7d6101ebc095659c0fb0b6c1e7f2610f8c2a69b1ec76e1bdb35ca0185130c892d44c00e863b80d24ddace2a56e02153a699157d6de44580f918af2a0e0ffdce895c771f709e8818d9b4f66e077fb623dd9a625dfae5d16e6ac2f48cba02a7b90367226b15a5edeb8f8ef9e5812ea518811a3b18bfc37ed1326f23d9f96a0e89fbf1ad4fd4e0ec02ab07ae317865a4900d996046dbf9930b9b90fcd6263e2808080808080808080f9015220b9014ef9014b82050a843b9aca008307a12094443d9a14fb6ba2a45465bec3767186f404ccea2580b8e45f959b69000000000000000000000000000000000000000000000000000000003b9aca0000000000000000000000000000000000000000000000000000000000752cbd74000000000000000000000000e3d9ccbaedabd8fd4401aab7752f6f224a7ef1c8000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000150073c237a0171e48890a824abbda619de705c0c21f00000000000000000000002ca084d8ef69c57da181d2f0dc0e86830767d222a42ed6531bbcc21562d2e3dd9dc2a011471be2af053fc149433c524e25c79413f5d485f9cd47be41f3b30015a72d2921a0e665cfa707a6f3820cf78d14e597c6556b12cf09a3896f6c66fffcc618e1d3a60107020150fd3304f90430f851a05d4c1a63bc12acf469503af1a25046dd2f6f2faf96eeb5deaa547271fed3f12280808080808080a0c834b4a2888a435cb287243862478dc45905129c248c513e78fd9d76fec2c2658080808080808080f8f180a0c5909feb6833c293c9de41a100e6554e834d9d94818349ff77bf6645cea7301da0ef8a863bcf92b3b842f5657d14d1baef04f1eaa9e7fbe0d68e669064ee164d50a02410b760fb2c88a831a942aeb8ce8e3d36914350d68da8ee070c8bacb2b140b5a0ba300fc6f3ef67d0a806666a94ad1576c007a4be28d4915f71cc4c27ecb1d3e8a00b16db3783fecc599a946427b92ea7afb90776f74491d5e66f2385a532103fb7a004a51819e2122ca287480ce5d2f368052159d8238f5ca6fe5fd433d23ecf550da01e8a038b50c67cafca122694ea945cf0df5c3687da4db0af8d94487037385930808080808080808080f902e720b902e3f902e001836c0f56b901000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000021000008000000000000000000000a000000000004000000000000200000000000000000000000000000000000000100000000000000000000000000000010040000000000000000000010000000000000000000000000000000000000001000000000020000000000000000000000000000000000000000008000000000000000000000000002000000000000020000000000000000000000000000000000000000000010000100000000800000000000000000000000000080000000000000000000f901d5f89b94e3d9ccbaedabd8fd4401aab7752f6f224a7ef1c8f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c144053a0000000000000000000000000443d9a14fb6ba2a45465bec3767186f404ccea25a0000000000000000000000000000000000000000000000000000000003b9aca00f89b94e3d9ccbaedabd8fd4401aab7752f6f224a7ef1c8f863a08c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925a0000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c144053a0000000000000000000000000443d9a14fb6ba2a45465bec3767186f404ccea25a00000000000000000000000000000000000000000000000000000000000000000f89994443d9a14fb6ba2a45465bec3767186f404ccea25e1a0aabab1db49e504b5156edf3f99042aeecb9607a08f392589571cd49743aaba8db860000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c144053000000000000000000000000000000000000000000000000000000003b9aca00000000000000000000000000000000000000000000000000000000000000000921a085d0066a7f89763d0a6e1247217cfad6f1444fe658a9490cc96ca66dd9bcad40004693550074bd2c75001473c237a0171e48890a824abbda619de705c0c21f00ca9a3b0000000088f79b292608000016001473c237a0171e48890a824abbda619de705c0c21f00000000";
        
        await superblocksForChallange.methods.addSuperblock(_superblockHash, blocksMerkleRoot, 0, 0, "0x", "0x",randomAddress, 0, 0, 4).send({from: randomAddress, gas: 5000000});
        
        let tx = await superblocksForChallange.methods.challengeCancelTransfer(_txBytesCorrupted, _txIndex, _txSiblings, _syscoinBlockHeader, _syscoinBlockIndex, _syscoinBlockSiblings, _superblockHash).send({from: challangerAddress, gas: 5000000});
        assert.equal(tx.events.VerifyTransaction.returnValues.returnCode, 20050, "20050 expected");
        assert.equal(tx.events.ChallengeCancelTransferRequest.returnValues.returnCode, 30020, "30020 expected");
      });

      it("transaction is not found in superblock", async () => {
        let tx = await superblocksForChallange.methods.challengeCancelTransfer(_txBytes, _txIndex, _txSiblings, _syscoinBlockHeader, _syscoinBlockIndex, _syscoinBlockSiblings, _superblockHash).send({from: challangerAddress, gas: 3000000});
        assert.equal(tx.events.VerifyTransaction.returnValues.returnCode, 20070, "20070 expected");
        assert.equal(tx.events.ChallengeCancelTransferRequest.returnValues.returnCode, 30020, "30020 expected");
      })
    })


    it("challengeCancelTransfer()", async () => {
      let tx1 = await superblocksForChallange.methods.addSuperblock(_superblockHash, blocksMerkleRoot, 0, 0, "0x", "0x",randomAddress, 0, 0, 4).send({from: randomAddress, gas: 5000000});

      const startingErc20Bal = await erc20Asset.balanceOf(cancelAddress);
      const startingAssetGUIDBal = await erc20Manager.methods.assetBalances(assetGUID).call();
      const startingEthBal = web3.utils.toBN(await web3.eth.getBalance(challangerAddress));

      let tx2 = await superblocksForChallange.methods.challengeCancelTransfer(_txBytes, _txIndex, _txSiblings, _syscoinBlockHeader, _syscoinBlockIndex, _syscoinBlockSiblings, _superblockHash).send({from: challangerAddress, gas: 5000000});
  
      let finalErc20Bal = await erc20Asset.balanceOf(cancelAddress);
      let finalAssetGUIDBal = await erc20Manager.methods.assetBalances(assetGUID).call();
      let finalEthBal = web3.utils.toBN(await web3.eth.getBalance(challangerAddress));

      assert.equal(finalErc20Bal.toNumber(), startingErc20Bal.toNumber(), "ERC20 balance should be the same");
      assert.equal(startingAssetGUIDBal, finalAssetGUIDBal, "assetBalances should be the same");
      // we are doing 2.99 ETH because some ether got used for TX fees
      
      let newBalance = startingEthBal.add(web3.utils.toBN(web3.utils.toWei('2.99', 'ether')));
      // TODO: fix this test by fixing _txdata + block data from real chain
      //assert(newBalance.lt(finalEthBal), "Ether balance incorrect");
      

      let bridgeTransferId = 10;
      // CancelTransferFailed(bridgeTransfer.tokenFreezerAddress, bridgeTransferId)
      //assert.equal(web3.utils.toChecksumAddress("0x" + tx2.events[0].raw.data.slice(26,66)), cancelAddress, "tokenFreezerAddress incorrect");
      //assert.equal(web3.utils.toBN("0x" + tx2.events[0].raw.data.slice(-64)), bridgeTransferId, "bridgeTransferId incorrect");

      //const bt = await erc20Manager.methods.getBridgeTransfer(bridgeTransferId).call();
      //assert.equal(bt._status, 3, "Status should be 3");
    });
  })

  describe("Test pure/view computation functions", () => {
    it("bytesToUint32", async () => {
      const result = await superblocks.methods.bytesToUint32("0x01020304", 0).call();
      assert.equal(result, 16909060, "converted bytes are not the expected ones");
    });
    it("parseMintTx()", async () => {
      const txBytes = "0x85000000000101fe6998c2d2dc8d07518f1c187e9d15631224d163ac80f022e755c1bed88be50f0200000000feffffff036c460f24010000001600144b2ce5497e4a71d9ab1d76fb59bac05e12760361d403000000000000160014d58b22017b3e325ee4d0e4cbf236f26c90fdeccf0000000000000000fd58096a4d5409014b89e89b0101640002000000c10268007102fd9f03f9039cf871a04442f3f69add48df0531fe3c0025103b53fcf3fe38060e5f29366caec8855e4fa0229f7b7e69c0b5793f8a61c06f5cc09b0f4938561856c632ee56c3b2c4d6d153808080808080a07720fff5e8eabef55fa129ee55b3b0d82875e2b25b8f26e22cf6b5c4f9cec7ab8080808080808080f901f180a03ee147749c5b769bc5d1a53e4f37567506d417de4ec4e67722130eda4638427da043caa62b40dad61bce4d50fb62ea485729a6687c3aa13895cf4ba234b92afe82a0b79958e4aa63104da4599ebb91e712375e6adfc89abc14b9533c5778f107e7d8a01bc7f80f81a8d281253ac882bb89aca6131e5794bfcbdccde990bb6d5be6cb2fa0aedad62f1426b68e395a59e06bf242fb28b882af67589bce3495a99650058ec4a0c21a7e0b9d0948bb6b65a5e73f5f01173064d20e4819ca4884d1eabc22bf737da090087708c533b10af8925eebf398c005fc16cb6a515111f2be4f328f762949d0a02827daacd6a52ae6c74a78791ff0c5e33a7a85f5ca0a47cdfbcd5219f75f705ca0af7ecf31d56575155d272cd813bf7d7ac435f62b0538c31771e407dafef6be53a09b74707c3abdbfa305cb61f23c940f063f553f17d0bd3013126aad357193353ea067a52ed59820bb48f8010d2b2bb0ee92803b1a00a8341fd4c3269b065ed070d9a0bf0e9b45955283e6e04b71eda63bfc7b55d9f54527943aa1c159b4161b1e1daea0ecabd4c00deacf9a7ff25be942c9f468628eb776fbec23a9ca0d8fc256f14a31a0df406c7ac7f38c2ea1d9bdb06c2e51db3de8cf0e655a8e0e683e19ca1ddf83d3a08360ec6c5e26614f144520ed9d0b577640381f0f38b5429b67422f75d603ad5a80f9013220b9012ef9012b82051f843b9aca008307a120940765efb302d504751c652c5b1d65e8e9edf2e70f80b8c454c988ff00000000000000000000000000000000000000000000000000000002540be400000000000000000000000000000000000000000000000000000000009be8894b0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000002c62637274317130667265323430737939326d716b386b6b377073616561366b74366d3537323570377964636a00000000000000000000000000000000000000002ca0dccb6e077c3f6252d199202113893407119d4ba09667113f2d20c63a31487b87a01e0a059e50f08f2772781691f2c9e43a9503a167c98cf467b1afc177b74d84e6010b7102fd5405f90551f871a0cab13def05783d763febde31920bd234d0486c26955c2937e0486db909a28eeea09cf564a668a29a5f1cc5d6ef8e19988dfd2b30d290672f0ffc4200e608cb65ac808080808080a029b8ed2258c53562954c87bcd7f60671029680d2a19ef8bcd3ad470ea48d57d18080808080808080f901f180a07c21ca39872e6b8f611bc6b1b295c24f988b5cf944625eabf5236b37ea3b9f01a0edb9e63fdc31ba41f11a8b2fb8000ad1357b3c0b27a8483968d75e93e7b488a1a02231847aa3c5dde2f2a1851a66aabec65e5eaae8c28110756f122c72be1fba05a08fa87809e5b7f989e78ccbe1a6bc4924115d5747529af879f2fe196f959b64fca091f1bf748061eba21a413b72d70afccb8daebb5906d5cd9dda06d5f877065d5ba0d7e6c82dd1c25eb2f90b02f038beaff98c260d46992d0b3c1eac7d51552c7417a01d5c43deb2e3794292cdffb04f82ab25bc4e75f5e0cab928b66582e08026f5b1a0d7323a87dc8fbc66c7b34810d2cad92fc0da168d962b4556e825a3266a148b74a0af31f0b7cdcd6a855ac7678ef2b8fcb1afeda918b0c8e4696a4013f2b75ca402a0f9d63f2db8ab6d3c3e12073ac2910ee575832bde3e4586f18e59dd26a16adb7ca0f0c91e059c43780617d304fe8992511f096ccc35232da1f25127db53ba4fb05aa052030932d0a9026efd2a3ada67f33d401cd9a97ddb24c606af3a0a0c24e432aba0142af9b4686c6ca30b0ac39133fa76d8682b7bbbec488e62e652d3f25419777da0940f31617e91cfbabaa9d0d1638949f8125f80a43027122778522675194a4e65a0edc4c7d2cf30150fdf7e502d0ef06c80c85fc37260134a112493c6183f62f4b580f902e720b902e3f902e00183192ee2b9010000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000200000000000000008000000000000000000000100200000000000000000010000000000000200000000000000000000000000000000000010000000000000000000000000000004000000000000000000000000400004001000000000020000000000000000000000000080000000000000408000000040000000000000000002000000000000000000000000000000000000000000000000000000000010000000000000000010000000000000000000000000000000000000000000f901d5f89b94f2bb7bfa19e7c4b6bb333ee1afdf8e5e8f9b3561f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c144053a00000000000000000000000000765efb302d504751c652c5b1d65e8e9edf2e70fa000000000000000000000000000000000000000000000000000000002540be400f89b94f2bb7bfa19e7c4b6bb333ee1afdf8e5e8f9b3561f863a08c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925a0000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c144053a00000000000000000000000000765efb302d504751c652c5b1d65e8e9edf2e70fa00000000000000000000000000000000000000000000000000000000000000000f899940765efb302d504751c652c5b1d65e8e9edf2e70fe1a09c6dea23fe3b510bb5d170df49dc74e387692eaa3258c691918cd3aa94f5fb74b860000000000000000000000000b0ea8c9ee8aa87efd28a12de8c034f947c14405300000000000000000000000000000000000000000000000000000002540be400000000000000000000000000000000000000000000000000000008080000000221a0842ab40a9c4770c8ec74158aadcf943e8158128fdd1ba8cef9c7cb8eda73269221a0a958499bf48fcce17672b58aa9037bd3dafeb6231880722d909c60bacfaaa8d402473044022074484a737b65d886060f0592aa6d77abc16454ec516f372d0f851a0251fd020302202fffa477c5731b5e8ab82615c227280845fdb62ab2f197ae8e16107d51f5ae75012103aa2eaba716a587873258e3861bd8aa4daeb0f26f32cc420dc95f0a2a1623a10400000000";
      let result = await superblocks.methods.parseMintTx(txBytes).call();
      assert.equal(result.errorCode, '0', "errorCode should be 0");
      assert.equal(result.bridgeTransferId, '2', "bridgeTransferId should be 2");
    });
    it("parseAssetTx() no contract", async () => {
      const txBytes = "0x82000000048488982a149b5ac96bef6be131e0b2f0ad9269ba66c9b4216901c0b81523123e000000006a473044022049d1eeec8c4f1b9e6414339bc9de8d466d2c0f0cf799eab4b5879f52883307c702201d0575c7dbdf18020da6df8a41e379b50ed62984604df2fab84df0aeb4ff4d5a01210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff034e10cf7e5158f62fe2674c89e8fc4ee94d2da62d81c0ffc8a237e8dfcb3e21000000006a473044022016dda88ddebc1d741a856854462b9d86391a1ec103979115eed96a7d388569c50220599583f7e35a06b620d49ca711ffd5582f96491fa6861a7aba89f242e504593c01210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffffc45be9fa19a24d90a3180a562bdd8b8a5b71d4c2e0a9f84b6c55c439ebf2f22a000000006a473044022026995ec771b58cb7f1f4ecda54535671b564e1fcdf319572be89ee9c8571203a02203c37487de9930b371f6b73cbeac34c7274176cbf013c0396ab54b513ee97395401210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff961fb68ada366165b25199757ce8a527f11d0744bbcbaad402815e09623dae04000000006a4730440220312bb832dd38f46d20f2090495590882a672f0fe21deefad007af211e62ac97d022008f71cd61edb96293dc194afcccb9331d148f8050bf5ce8b83a40c37ad64d24601210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff030011102401000000160014e36467f9c303ae5af94f528b87489cacdc3ffbd220a8f50500000000160014b5e11a429cb584ba30fc3db957e7346bc7540ef300d6117e030000003b6a39018488982a0101000008c10456464e55cd10237b2264657363223a2259584e7a5a5851675a47567a59334a70634852706232343d227d007f7f00000000";
      await truffleAssert.reverts(superblocks.methods.parseAssetTx(txBytes).call());
    });
    it("parseAssetTx()", async () => {
      const txBytes = "0x8200000004f0b8a1a4c993ffd133335d84b9aba6159bb8129384a253131d1998f28c3d371b000000006a47304402203b497eb7acb0d47f18c6fef336a3eebc630c6030bc4427b0bdd5337b76ff5eb502205d40f64e47c209d5462af18913aae3f66b1c95176d3cd0a44dd81f19f3dac18601210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff043cd5b1662309701440c7941d61cfb95d0c98e22ff8ff8b5994149e988ab179000000006a473044022070611022e52796a5dfeca1544612d01261191712e6064cce1d2b1c2599f37b2002200e93e391676ca6ba73d2248ff6364184ebd5a23944b0c77570b5e99e1b37e4f301210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff18e806cd5aa13974beb89d41c5040a48242c24bffa8e65e9fdf3bc35e2a7c1b4000000006a473044022036764ec65e5f1d447eb407dde9ec1a6ae3ff649f7c1c6247987c0e6ca6eab06e0220725e4de336c471dadaf610df5c97f1120a3753f53548f4db06c35985506c697001210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff33b5d4b94367acd8ef20e10678a75de3c02e143a3f9bb0b0f0c31ed0396454c3000000006a4730440220438e681501363363be3fce907956f0ef781aaf997605708a8f6db9a9e160e1cd02201defe48b376a6b8e8b48892edb101172970bceca85dc0e6890a73bcd4a4ee0db01210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff0394a2f5050000000016001446e3b0ae31039f42ff58148692e100d591c6a04300d6117e03000000826a4c7f014b89e89b0100000008e30456464e55cd10149f90b5093f35aeac5fbaeb591f9c9de8e2844a4600237b2264657363223a2259584e7a5a5851675a47567a59334a70634852706232343d227d00147dd27c8ac82d7fa798da2634a144ee1dc2b4a6050600e8030a9001807ac8009244460080c22807008ea010000000007f7f0011102401000000160014537882dc26d202f2b3149ee731af4f544a34e9ef00000000";
      let result = await superblocks.methods.parseAssetTx(txBytes).call();
      assert.equal(result.errorCode, '0', "errorCode should be 0");
      assert.equal(result.assetGuid, '2615707979', "Asset GUID should be 2615707979");
      assert.equal(result.erc20Address, '0x9F90B5093F35AeaC5fbAeB591F9c9de8e2844A46', "Asset ERC20 Contract should be 0x9f90b5093f35aeac5fbaeb591f9c9de8e2844a46");
    });
    it("scanAssetTx", async () => {
      const expectedJson = '{"0":"2615707979","1":"0x9F90B5093F35AeaC5fbAeB591F9c9de8e2844A46","2":"8"}';
      const txBytes = "0x8200000004f0b8a1a4c993ffd133335d84b9aba6159bb8129384a253131d1998f28c3d371b000000006a47304402203b497eb7acb0d47f18c6fef336a3eebc630c6030bc4427b0bdd5337b76ff5eb502205d40f64e47c209d5462af18913aae3f66b1c95176d3cd0a44dd81f19f3dac18601210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff043cd5b1662309701440c7941d61cfb95d0c98e22ff8ff8b5994149e988ab179000000006a473044022070611022e52796a5dfeca1544612d01261191712e6064cce1d2b1c2599f37b2002200e93e391676ca6ba73d2248ff6364184ebd5a23944b0c77570b5e99e1b37e4f301210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff18e806cd5aa13974beb89d41c5040a48242c24bffa8e65e9fdf3bc35e2a7c1b4000000006a473044022036764ec65e5f1d447eb407dde9ec1a6ae3ff649f7c1c6247987c0e6ca6eab06e0220725e4de336c471dadaf610df5c97f1120a3753f53548f4db06c35985506c697001210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff33b5d4b94367acd8ef20e10678a75de3c02e143a3f9bb0b0f0c31ed0396454c3000000006a4730440220438e681501363363be3fce907956f0ef781aaf997605708a8f6db9a9e160e1cd02201defe48b376a6b8e8b48892edb101172970bceca85dc0e6890a73bcd4a4ee0db01210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3ffeffffff0394a2f5050000000016001446e3b0ae31039f42ff58148692e100d591c6a04300d6117e03000000826a4c7f014b89e89b0100000008e30456464e55cd10149f90b5093f35aeac5fbaeb591f9c9de8e2844a4600237b2264657363223a2259584e7a5a5851675a47567a59334a70634852706232343d227d00147dd27c8ac82d7fa798da2634a144ee1dc2b4a6050600e8030a9001807ac8009244460080c22807008ea010000000007f7f0011102401000000160014537882dc26d202f2b3149ee731af4f544a34e9ef00000000";
      const resultPos = await superblocks.methods.getOpReturnPos(txBytes, 4).call();
      var pos = parseInt(resultPos[1]);
      
      const result = await superblocks.methods.scanAssetTx(txBytes, pos).call();
      assert.equal(JSON.stringify(result), expectedJson, "converted asset tx bytes are not the expected ones");
    });
  });
});

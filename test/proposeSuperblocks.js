// 140 = 128 + 12 = 16*8 + 12 = 0x8c
const fs = require('fs');
const utils = require('./utils');
const SyscoinSuperblocks = artifacts.require('SyscoinSuperblocks');
const SyscoinClaimManager = artifacts.require('SyscoinClaimManager');

let superblock1MerkleRoot = "0xdb7aea0bb3c1c5eef58997bf75de93173fb914b807b85df50671790627471e99";
let superblock1ChainWork = "0x7c";
let superblock1LastSyscoinBlockTime = 1522097078;
let superblock1LastSyscoinBlockHash = "0x1ff78c993a7de8bf6c5e3f4a81c715adde8220ea8dcca51e01ba706943303c53";
let superblock1ParentId = "0x381be106bf5ac501957c128936ada535c863dcdb1f34180346979650df9f3e76";
let superblock1Id = "0x398606391a81540afb940578239699ebfb94383f7655c707b28ff7d9d57790e7";

let superblock2MerkleRoot = "0x07a69fef21fcd59b92ca1824ebcd91412bd39c7c6d1f8d754a7a84b0e05b8897";
let superblock2ChainWork = "0x8c";
let superblock2LastSyscoinBlockTime = 1522097137;
let superblock2LastSyscoinBlockHash = "0x31ef1f22a3a22838c4ada500b8240e9ca773d9d1da811c0210c7afce9bd7a46e";
let superblock2ParentId = superblock1Id;
let superblock2Id = "0x6da6692f4f3003c764548d380c50be19cf3f9cc25238edf6e26350b6ddb84afc";

let superblock3MerkleRoot = "0x49c9fee33f814e654979094f3694ebe109993c2f999b5141d425af28f93893f0";
let superblock3ChainWork = "0x90";
let superblock3LastSyscoinBlockTime = 1524766665;
let superblock3LastSyscoinBlockHash = "0x49c9fee33f814e654979094f3694ebe109993c2f999b5141d425af28f93893f0";
let superblock3ParentId = superblock2Id;
let superblock3Id = "0xd2a92b0e691fddd3413d4c07e548b629a5655572a27337c0994728969ba1e086";

contract('proposeSuperblocks', (accounts) => {
    describe.skip('Superblock proposal integration test', function() {
        let syscoinSuperblocks;
        let claimManager;

        let syscoinSuperblocksJSON = fs.readFileSync('./build/contracts/SyscoinSuperblocks.json', 'utf8');
        let syscoinSuperblocksParsedJSON = JSON.parse(syscoinSuperblocksJSON);
        let networks = syscoinSuperblocksParsedJSON['networks'];
        let networkKey = Object.keys(networks)[0];
        let syscoinSuperblocksAddress = typeof networks[networkKey] !== 'undefined' ? networks[networkKey].address : '0x0';

        // let syscoinClaimManagerJSON = fs.readFileSync('./build/contracts/SyscoinClaimManager.json', 'utf8');
        // let syscoinClaimManagerParsedJSON = JSON.parse(syscoinClaimManagerJSON);
        // networks = syscoinClaimManagerParsedJSON['networks'];
        // let claimManagerAddress = networks[networkKey].address;
        let claimManagerAddress;

        before(async() => {
            syscoinSuperblocks = await SyscoinSuperblocks.at(syscoinSuperblocksAddress);
            claimManagerAddress = await syscoinSuperblocks.claimManager.call();
            claimManager = await SyscoinClaimManager.at(claimManagerAddress);

            // console.log(syscoinSuperblocksAddress, claimManagerAddress);
            // await syscoinSuperblocks.setClaimManager(claimManagerAddress);
        });

        let merkleRoot;
        let chainWork;
        let lastSyscoinBlockTime;
        let lastSyscoinBlockHash;
        let parentId;
        let superblockHash;

        let bestSuperblock;
        let syscoinSuperblocksClaimManager;

        it('Superblock 1', async() => {
            syscoinSuperblocksClaimManager = await syscoinSuperblocks.claimManager;

            await utils.mineBlocks(web3, 5);
            await claimManager.checkClaimFinished(superblock1Id);
            await utils.mineBlocks(web3, 5);

            merkleRoot = await syscoinSuperblocks.getSuperblockMerkleRoot(superblock1Id);
            chainWork = await syscoinSuperblocks.getSuperblockAccumulatedWork(superblock1Id);
            lastSyscoinBlockTime = await syscoinSuperblocks.getSuperblockTimestamp(superblock1Id);
            lastSyscoinBlockHash = await syscoinSuperblocks.getSuperblockLastHash(superblock1Id);
            parentId = await syscoinSuperblocks.getSuperblockParentId(superblock1Id);

            assert.equal(merkleRoot, superblock1MerkleRoot, "Superblock 1 Merkle root does not match");
            assert.equal(chainWork.toNumber(), superblock1ChainWork, "Superblock 1 chain work does not match");
            assert.equal(lastSyscoinBlockTime, superblock1LastSyscoinBlockTime, "Superblock 1 last Syscoin block time does not match");
            assert.equal(lastSyscoinBlockHash, superblock1LastSyscoinBlockHash, "Superblock 1 last Syscoin block hash does not match");
            assert.equal(parentId, superblock1ParentId, "Superblock 1 parent ID does not match");
        });

        it('Superblock 2', async() => {
            syscoinSuperblocksClaimManager = await syscoinSuperblocks.claimManager;

            await utils.mineBlocks(web3, 5);
            await claimManager.checkClaimFinished(superblock2Id);
            await utils.mineBlocks(web3, 5);

            merkleRoot = await syscoinSuperblocks.getSuperblockMerkleRoot(superblock2Id);
            chainWork = await syscoinSuperblocks.getSuperblockAccumulatedWork(superblock2Id);
            lastSyscoinBlockTime = await syscoinSuperblocks.getSuperblockTimestamp(superblock2Id);
            lastSyscoinBlockHash = await syscoinSuperblocks.getSuperblockLastHash(superblock2Id);
            parentId = await syscoinSuperblocks.getSuperblockParentId(superblock2Id);

            assert.equal(merkleRoot, superblock2MerkleRoot, "Superblock 2 Merkle root does not match");
            assert.equal(chainWork.toNumber(), superblock2ChainWork, "Superblock 2 chain work does not match");
            assert.equal(lastSyscoinBlockTime, superblock2LastSyscoinBlockTime, "Superblock 2 last Syscoin block time does not match");
            assert.equal(lastSyscoinBlockHash, superblock2LastSyscoinBlockHash, "Superblock 2 last Syscoin block hash does not match");
            assert.equal(parentId, superblock2ParentId, "Superblock 2 parent ID does not match");
        });

        // it('Superblock 3', async() => {
        //     syscoinSuperblocksClaimManager = await syscoinSuperblocks.claimManager;

        //     await utils.mineBlocks(web3, 5);
        //     await claimManager.checkClaimFinished(superblock3Id);
        //     await utils.mineBlocks(web3, 5);

        //     merkleRoot = await syscoinSuperblocks.getSuperblockMerkleRoot(superblock3Id);
        //     chainWork = await syscoinSuperblocks.getSuperblockAccumulatedWork(superblock3Id);
        //     lastSyscoinBlockTime = await syscoinSuperblocks.getSuperblockTimestamp(superblock3Id);
        //     lastSyscoinBlockHash = await syscoinSuperblocks.getSuperblockLastHash(superblock3Id);
        //     parentId = await syscoinSuperblocks.getSuperblockParentId(superblock3Id);

        //     assert.equal(merkleRoot, superblock3MerkleRoot, "Superblock 3 Merkle root does not match");
        //     assert.equal(chainWork.toNumber(), superblock3ChainWork, "Superblock 3 chain work does not match");
        //     assert.equal(lastSyscoinBlockTime, superblock3LastSyscoinBlockTime, "Superblock 3 last Syscoin block time does not match");
        //     assert.equal(lastSyscoinBlockHash, superblock3LastSyscoinBlockHash, "Superblock 3 last Syscoin block hash does not match");
        //     assert.equal(parentId, superblock3ParentId, "Superblock 3 parent ID does not match");
        // });

        before(async() => {
            bestSuperblock = await syscoinSuperblocks.getBestSuperblock();
            console.log("Best superblock:", bestSuperblock);
        });

    });
});

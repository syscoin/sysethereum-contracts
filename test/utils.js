const fs = require('fs');
const readline = require('readline');
const btcProof = require('bitcoin-proof');
const sha256 = require('js-sha256').sha256;
const keccak256 = require('js-sha3').keccak256;
const bitcoreLib = require('bitcore-lib');
const ECDSA = bitcoreLib.crypto.ECDSA;
const bitcoreMessage = require('bitcore-message');
const bitcoin = require('bitcoinjs-lib');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_BYTES32 = '0x00000000000000000000000000000000000000000000000000000000000000'

const OPTIONS_SYSCOIN_REGTEST = {
  DURATION: 600,           // 10 minute
  DELAY: 60,               // 1 minute
  TIMEOUT: 15,             // 15 seconds
  CONFIRMATIONS: 1,        // Superblocks required to confirm semi approved superblock
  REWARD: 3                // Monetary reward for opponent in case battle is lost
};


const SYSCOIN_MAINNET = 0;
const SYSCOIN_TESTNET = 1;
const SYSCOIN_REGTEST = 2;

const DEPOSITS = {
    MIN_REWARD: 1000000000000000000,
    SUPERBLOCK_COST: 440000,
    CHALLENGE_COST: 34000,
    MIN_PROPOSAL_DEPOSIT: 34000+1000000000000000000,
    MIN_CHALLENGE_DEPOSIT: 440000+1000000000000000000,
    RESPOND_MERKLE_COST: 378000, // TODO: measure this with 60 hashes
    RESPOND_HEADER_PROOF_COST: 40000,
    VERIFY_SUPERBLOCK_COST: 220000
};


async function parseDataFile(filename) {
  const headers = [];
  const hashes = [];
  return new Promise((resolve, reject) => {
    const lineReader = readline.createInterface({
      input: fs.createReadStream(filename)
    });
    lineReader.on('line', function (line) {
      const [header, hash] = line.split("|");
      headers.push(header);
      hashes.push(hash);
    });
    lineReader.on('close', function () {
      resolve({ headers, hashes });
    });
  });
}

// Calculates the merkle root from an array of hashes
// The hashes are expected to be 32 bytes in hexadecimal
function makeMerkle(hashes) {
  if (hashes.length == 0) {
    throw new Error('Cannot compute merkle tree of an empty array');
  }

  return `0x${btcProof.getMerkleRoot(
    hashes.map(x => module.exports.formatHexUint32(module.exports.remove0x(x)) )
  )}`;
}

// Format an array of hashes to bytes array
// Hashes are expected to be 32 bytes in hexadecimal
function hashesToData(hashes) {
  let result = '';
  hashes.forEach(hash => {
    result += `${module.exports.formatHexUint32(module.exports.remove0x(hash))}`;
  });
  return `0x${result}`;
}

// Calculates the Syscoin hash from block header
// Block header is expected to be in hexadecimal
// Return the concatenated hash and block header
function headerToData(blockHeader) {
  const powHash = module.exports.formatHexUint32(module.exports.calcHeaderPoW(blockHeader));
  return `0x${powHash}${blockHeader}`;
}

// Calculates the double sha256 of a block header
// Block header is expected to be in hexadecimal
function calcBlockSha256Hash(blockHeader) {
  const headerBin = module.exports.fromHex(blockHeader).slice(0, 80);
  return `0x${Buffer.from(sha256.array(sha256.arrayBuffer(headerBin))).reverse().toString('hex')}`;
}

// Get timestamp from syscoin block header
function getBlockTimestamp(blockHeader) {
  const headerBin = module.exports.fromHex(blockHeader).slice(0, 80);
  const timestamp = headerBin[68] + 256 * headerBin[69] + 256 * 256 * headerBin[70] + 256 * 256 * 256 * headerBin[71];
  return timestamp;
}

// Get difficulty bits from block header
function getBlockDifficultyBits(blockHeader) {
  const headerBin = module.exports.fromHex(blockHeader).slice(0, 80);
  const bits = headerBin[72] + 256 * headerBin[73] + 256 * 256 * headerBin[74] + 256 * 256 * 256 * headerBin[75];
  return bits;
}

// Get difficulty from syscoin block header
function getBlockDifficulty(blockHeader) {
  const headerBin = module.exports.fromHex(blockHeader).slice(0, 80);
  const exp = web3.utils.toBN(headerBin[75]);
  const mant = web3.utils.toBN(headerBin[72] + 256 * headerBin[73] + 256 * 256 * headerBin[74]);
  const target = mant.mul(web3.utils.toBN(256).pow(exp.sub(web3.utils.toBN(3))));
  const difficulty1 = web3.utils.toBN(0x00FFFFF).mul(web3.utils.toBN(256).pow(web3.utils.toBN(0x1e-3)));
  const difficulty = difficulty1.div(target);
  return difficulty;
} 

const timeout = async (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms));

const blockchainTimeoutSeconds = async (s) => {
  await web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_increaseTime',
    params: [s],
    id: 0,
  }, (err, result) => {
    // adding callback to fix "callback is not a function" in web3 1.0 implementation
  });
};

const mineBlocks = async (web3, n) => {
  for (let i = 0; i < n; i++) {
    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      params: [],
      id: 0,
    });
    await timeout(100);
  }
}

const getBlockNumber = () => new Promise((resolve, reject) => {
  web3.eth.getBlockNumber((err, res) => {
    if (err) {
      reject(err);
    } else {
      resolve(res);
    }
  });
});

// Helper to assert a promise failing
async function verifyThrow(P, cond, message) {
  let e;
  try {
    await P();
  } catch (ex) {
    e = ex;
  }
  assert.throws(() => {
    if (e) {
      throw e;
    }
  }, cond, message);
}

// Format a numeric or hexadecimal string to solidity uint256
function toUint256(value) {
  if (typeof value === 'string') {
    // Assume data is hex formatted
    value = module.exports.remove0x(value);
  } else {
    // Number or BignNumber
    value = value.toString(16);
  }
  return module.exports.formatHexUint32(value);
}

// Format a numeric or hexadecimal string to solidity uint32
function toUint32(value) {
  if (typeof value === 'string') {
    // Assume data is hex formatted
    value = module.exports.remove0x(value);
  } else {
    // Number or BignNumber
    value = value.toString(16);
  }
  // Format as 4 bytes = 8 hexadecimal chars
  return module.exports.formatHexUint(value, 8);
}
  // make a merkle proof map of indices to prove that all block hashes commit to a superblock merkle root
function makeMerkleProofMap (blockHashes) {
    var merkleIndexMap = [];
    for(var i =0;i< blockHashes.length;i++){
      var proofOfFirstTx = btcProof.getProof(blockHashes, i);
      for(var j = 0;j<proofOfFirstTx.sibling.length;j++){
        merkleIndexMap.push(`0x${proofOfFirstTx.sibling[j]}`);
      }
    }
    return merkleIndexMap;
  }
  
// Calculate a superblock id
function calcSuperblockHash(merkleRoot, accumulatedWork, timestamp, retargetPeriod, lastHash, lastBits, parentId, blockHeight) {
  return `0x${Buffer.from(keccak256.arrayBuffer(
    Buffer.concat([
      module.exports.fromHex(merkleRoot),
      module.exports.fromHex(toUint256(accumulatedWork)),
      module.exports.fromHex(toUint256(timestamp)),
      module.exports.fromHex(toUint256(retargetPeriod)),
      module.exports.fromHex(lastHash),
      module.exports.fromHex(toUint32(lastBits)),
      module.exports.fromHex(parentId),
      module.exports.fromHex(toUint32(blockHeight))
    ])
  )).toString('hex')}`;
}

// Construct a superblock from an array of block headers
function makeSuperblock(headers, parentId, parentAccumulatedWork, _blockHeight, _retargetPeriod=1) {
  if (headers.length < 1) {
    throw new Error('Requires at least one header to build a superblock');
  }
  const blockHashes = headers.map(header => calcBlockSha256Hash(header));
  const strippedHashes =  blockHashes.map(x => x.slice(2)); // <- remove prefix '0x'
  const accumulatedWork = headers.reduce((work, header) => work.add(getBlockDifficulty(header)), web3.utils.toBN(parentAccumulatedWork));
  const merkleRoot = makeMerkle(blockHashes);
  const timestamp = getBlockTimestamp(headers[headers.length - 1]);
  const retargetPeriod = _retargetPeriod;
  const lastBits = getBlockDifficultyBits(headers[headers.length - 1]);
  const lastHash = calcBlockSha256Hash(headers[headers.length - 1]);
  let blockSiblingsMap = makeMerkleProofMap(strippedHashes);
  if(blockSiblingsMap.length == 0){
    blockSiblingsMap.push(merkleRoot);
  }
  return {
    merkleRoot,
    accumulatedWork,
    timestamp,
    retargetPeriod,
    lastHash,
    lastBits,
    parentId,
    superblockHash: calcSuperblockHash(
      merkleRoot,
      accumulatedWork,
      timestamp,
      retargetPeriod,
      lastHash,
      lastBits,
      parentId,
      _blockHeight
    ),
    blockHeaders: headers,
    blockHashes: strippedHashes, 
    blockSiblingsMap: blockSiblingsMap,
    blockHeight: _blockHeight
  };
}

function forgeSyscoinBlockHeader(prevHash, time) {
  const version = "30000100";
  const merkleRoot = "0".repeat(56) + "deadbeef";
  const bits = "ffff7f20";
  const nonce = "feedbeef";
  return version + prevHash + merkleRoot + time + bits + nonce;
}

function formatHexUint(str, length) {
  while (str.length < length) {
    str = "0" + str;
  }
  return str;
}

function base58ToBytes20(str) {
    let decoded = bitcoreLib.encoding.Base58Check.decode(str);
    return "0x" + decoded.toString('hex').slice(2, 42);
}

function findEvent(logs, name) {
  const index = logs.findIndex(log => log.event === name);
  return index >= 0 ? logs[index] : undefined;
}

async function initSuperblockChain(options) {
  const SyscoinClaimManager = artifacts.require('SyscoinClaimManager');
  const SyscoinBattleManager = artifacts.require('SyscoinBattleManager');
  const SyscoinSuperblocks = artifacts.require('SyscoinSuperblocks');

  const superblocks = await SyscoinSuperblocks.new({ from: options.from });
  const battleManager = await SyscoinBattleManager.new(
    options.network,
    superblocks.address,
    options.params.DURATION,
    options.params.TIMEOUT,
    { from: options.from },
  );
  const claimManager = await SyscoinClaimManager.new(
    superblocks.address,
    battleManager.address,
    options.params.DELAY,
    options.params.TIMEOUT,
    options.params.CONFIRMATIONS,
    options.params.REWARD,
    { from: options.from },
  );

  await superblocks.setClaimManager(claimManager.address, { from: options.from });
  await battleManager.setSyscoinClaimManager(claimManager.address, { from: options.from });
  await superblocks.initialize(
    options.genesisSuperblock.merkleRoot,
    options.genesisSuperblock.accumulatedWork,
    options.genesisSuperblock.timestamp,
    options.genesisSuperblock.retargetPeriod,
    options.genesisSuperblock.lastHash,
    options.genesisSuperblock.lastBits,
    options.genesisSuperblock.parentId,
    options.genesisSuperblock.blockHeight,
    { from: options.from },
  );
  return {
    superblocks,
    claimManager,
    battleManager
  };
}

const SYSCOIN = {
  messagePrefix: '\x19Bitcoin Signed Message:\n',
  bip32: {
    public: 0x0499b21e,
    private: 0x0488ade4
  },
  pubKeyHash: 0x3f,
  scriptHash: 0x05,
  wif: 0x80
};/*
const SYSCOIN = {
  messagePrefix: '\x19Syscoin Signed Message:\n',
  bip32: {
    public: 0x02facafd,
    private: 0x02fac398
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e
};*/
function syscoinKeyPairFromWIF(wif) {
  return bitcoin.ECPair.fromWIF(wif, SYSCOIN);
}

function syscoinAddressFromKeyPair(keyPair) {
  return bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: SYSCOIN }).address;
}

function publicKeyHashFromKeyPair(keyPair) {
  return `0x${bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(keyPair.publicKey)).toString('hex')}`;
}

function ethAddressFromKeyPair(keyPair) {
  const uncompressedPublicKey = bitcoin.ECPair.fromPublicKey(keyPair.publicKey, { compressed: false });
  return web3.utils.toChecksumAddress(`0x${Buffer.from(keccak256.arrayBuffer(uncompressedPublicKey.publicKey.slice(1))).slice(12).toString('hex')}`);
}
function ethAddressFromKeyPairRaw(keyPair) {
  const uncompressedPublicKey = bitcoin.ECPair.fromPublicKey(keyPair.publicKey, { compressed: false });
  return Buffer.from(keccak256.arrayBuffer(uncompressedPublicKey.publicKey.slice(1))).slice(12);
}
function buildSyscoinTransaction({ signer, inputs, outputs }) {
  const txBuilder = new bitcoin.TransactionBuilder(SYSCOIN);
  txBuilder.setVersion(0x7407);
  inputs.forEach(([ txid, index ]) => txBuilder.addInput(txid, index));
  outputs.forEach(([address, amount, data]) => {
    if (address === 'OP_RETURN') {
      address = bitcoin.script.compile(
        [
          bitcoin.opcodes.OP_RETURN,
          data
        ])
    }
    txBuilder.addOutput(address, amount);
  });
  txBuilder.sign(0, signer);
  return txBuilder.build();
}

module.exports = {
  OPTIONS_SYSCOIN_REGTEST,
  SYSCOIN_MAINNET,
  SYSCOIN_TESTNET,
  SYSCOIN_REGTEST,
  DEPOSITS,
  ZERO_ADDRESS,
  ZERO_BYTES32,

  formatHexUint32: function (str) {
    // To format 32 bytes is 64 hexadecimal characters
    return formatHexUint(str, 64);
  },
  remove0x: function (str) {
    return (str.indexOf("0x")==0) ? str.substring(2) : str;
  }
  ,
  store11blocks: async function (superblocks, claimManager, sender) {

    const { headers, hashes } = await parseDataFile('test/headers/store11blocks.txt');

    const genesisSuperblock = makeSuperblock(
      headers.slice(0, 1), // header 120
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      1,            // accumulated work block 120
      1553880473,    // timestamp block 120,
      120
    );

    await superblocks.initialize(
      genesisSuperblock.merkleRoot,
      genesisSuperblock.accumulatedWork,
      genesisSuperblock.timestamp,
      genesisSuperblock.retargetPeriod,
      genesisSuperblock.lastHash,
      genesisSuperblock.lastBits,
      genesisSuperblock.parentId,
      genesisSuperblock.blockHeight,
      { from: sender },
    );

    const proposedSuperblock = makeSuperblock(
      headers.slice(1),
      genesisSuperblock.superblockHash,
      genesisSuperblock.accumulatedWork,
      130
    );

    await claimManager.makeDeposit({ value: DEPOSITS.MIN_PROPOSAL_DEPOSIT, from: sender });

    let result;

    result = await claimManager.proposeSuperblock(
      proposedSuperblock.merkleRoot,
      proposedSuperblock.accumulatedWork,
      proposedSuperblock.timestamp,
      proposedSuperblock.retargetPeriod,
      proposedSuperblock.lastHash,
      proposedSuperblock.lastBits,
      proposedSuperblock.parentId,
      proposedSuperblock.blockHeight,
      { from: sender },
    );

    assert.equal(result.logs[1].event, 'SuperblockClaimCreated', 'New superblock proposed');
    const superblockHash = result.logs[1].args.superblockHash;

    await blockchainTimeoutSeconds(3*OPTIONS_SYSCOIN_REGTEST.TIMEOUT);

    result = await claimManager.checkClaimFinished(superblockHash, { from: sender });
    assert.equal(result.logs[1].event, 'SuperblockClaimSuccessful', 'Superblock challenged');

    const headerAndHashes = {
      header: {
        nonce: 0,
        hash: '245bd0337365034bd68d352315d5723ea8dd00e24fddf504df31183387df1b5a',
        timestamp: 1554271190,
        merkle_root: 'c71174f829d001bd5a5c70ac40e5ef967bf30bc7afa813bde8db62bc7cc6af1e',
        version: 268435716,
        prevhash: '36137727331051290595ddc8d3f8fa00d100f0a309e3e373e3ee5392afea5230',
        bits: 504365040,
        auxpow: 'realValueShouldBePutHere'
      },
      hashes: [
        '122f5db2eefed5bd9ce566673b0f22298286ae72dc576227d74dda89b5c32023', 
        'd34d59c2f93bfb2eecec5aba3d6b0783f4615298dfffdeac1f2dba186d6f20d2',
      ],
      genesisSuperblock,
      proposedSuperblock,
    };
    return headerAndHashes;
  }
  ,
  // the inputs to makeMerkleProof can be computed by using pybitcointools:
  // header = get_block_header_data(blocknum)
  // hashes = get_txs_in_block(blocknum)
  makeMerkleProof: function (hashes, txIndex) {
      var proofOfFirstTx = btcProof.getProof(hashes, txIndex);
      return proofOfFirstTx.sibling;
  },
  // Adds the size of the hex string in bytes.
  // For input "111111" will return "00000003111111"
  addSizeToHeader: function (input) {
    var size = input.length / 2; // 2 hex characters represent a byte
    size = size.toString(16);
    while (size.length < 8) {
      size = "0" + size;
    }
    return size + input;
  },
  // Convert an hexadecimal string to buffer
  fromHex: function (data) {
    return Buffer.from(module.exports.remove0x(data), 'hex');
  },
  // Calculate the pow hash from a buffer
  // hash = powHash(data, start, length)
  powHash: function (data, start = 0, length = 80) {
    let buff = Buffer.from(data, start, length);
    return `0x${Buffer.from(sha256.array(sha256.arrayBuffer(buff))).reverse().toString('hex')}`;
  },
  // Parse a data file returns a struct with headers and hashes
  parseDataFile,
  // Calculate PoW hash from syscoin header
  calcHeaderPoW: function (header) {
    const headerBin = module.exports.fromHex(header);
    const length = headerBin.length;
    if(length > 80){
      return module.exports.powHash(headerBin.slice(0, 80)).toString('hex');
    }
    else{
      return module.exports.powHash(headerBin).toString('hex');
    }
  },
  bigNumberArrayToNumberArray: function (input) {
    var output = [];
    input.forEach(function(element) {
      output.push(element.toNumber());
    });
    return output;
  },
  formatHexUint,
  makeMerkle,
  hashesToData,
  headerToData,
  calcBlockSha256Hash,
  getBlockTimestamp,
  getBlockDifficultyBits,
  getBlockDifficulty,
  timeout,
  blockchainTimeoutSeconds,
  mineBlocks,
  getBlockNumber,
  verifyThrow,
  calcSuperblockHash,
  makeSuperblock,
  forgeSyscoinBlockHeader,
  base58ToBytes20,
  findEvent,
  initSuperblockChain,
  syscoinKeyPairFromWIF,
  syscoinAddressFromKeyPair,
  publicKeyHashFromKeyPair,
  buildSyscoinTransaction,
  ethAddressFromKeyPair,
  ethAddressFromKeyPairRaw,
};

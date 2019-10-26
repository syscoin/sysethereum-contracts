const { TestHelper } = require('@openzeppelin/cli');
const { Contracts } = require('@openzeppelin/upgrades');

const fs = require('fs');
const readline = require('readline');
const btcProof = require('bitcoin-proof');
const sha256 = require('js-sha256').sha256;
const keccak256 = require('js-sha3').keccak256;
const bitcoreLib = require('bitcore-lib');
const bitcoin = require('bitcoinjs-lib');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_BYTES32 = '0x00000000000000000000000000000000000000000000000000000000000000'

const SUPERBLOCK_OPTIONS_LOCAL = {
  DURATION: 60,     // 60 blocks per superblock
  DELAY: 60,        // 1 minute
  TIMEOUT: 15,      // 15 seconds
  CONFIRMATIONS: 1 // Superblocks required to confirm semi approved superblock
};


const SYSCOIN_MAINNET = 0;
const SYSCOIN_TESTNET = 1;
const SYSCOIN_REGTEST = 2;

const DEPOSITS = {
    MIN_REWARD: 3000000000000000000
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
function sort_array(arr) {
  for(var i = 0; i < 11; i++) {
    for(var j = i+1; j < 11 ;j++) {
        if(arr[i] > arr[j]) {
            let temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
  }
  return arr;
}

// Gets the median timestamp of the last 11 blocks
function getBlockMedianTimestamp(headers){
  var timestamps = [];
  // timestamps 0->10 = headers 49->59
  for(var i=0;i<11;i++){
      timestamps[10 - i] = getBlockTimestamp(headers[headers.length - i - 1]);
  }
  timestamps = sort_array(timestamps);
  return timestamps[5];
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
    }, (err, result) => {
      // adding callback to fix "callback is not a function" in web3 1.0 implementation
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
function calcSuperblockHash(merkleRoot, timestamp, mtpTimestamp, lastHash, lastBits, parentId) {
  return `0x${Buffer.from(keccak256.arrayBuffer(
    Buffer.concat([
      module.exports.fromHex(merkleRoot),
      module.exports.fromHex(toUint256(timestamp)),
      module.exports.fromHex(toUint256(mtpTimestamp)),
      module.exports.fromHex(lastHash),
      module.exports.fromHex(toUint32(lastBits)),
      module.exports.fromHex(parentId)
    ])
  )).toString('hex')}`;
}

// Construct a superblock from an array of block headers
function makeSuperblock(headers, parentId) {
  if (headers.length < 1) {
    throw new Error('Requires at least one header to build a superblock');
  }
  const blockHashes = headers.map(header => calcBlockSha256Hash(header));
  const strippedHashes =  blockHashes.map(x => x.slice(2)); // <- remove prefix '0x'
  const merkleRoot = makeMerkle(blockHashes);
  const timestamp = getBlockTimestamp(headers[headers.length - 1]);
  let mtpTimestamp = timestamp;
  if(headers.length >= 11){
    mtpTimestamp = getBlockMedianTimestamp(headers);
  }
  const lastHash = calcBlockSha256Hash(headers[headers.length - 1]);
  const lastBits = getBlockDifficultyBits(headers[headers.length - 1]);
  return {
    merkleRoot,
    timestamp,
    mtpTimestamp,
    lastHash,
    lastBits,
    parentId,
    superblockHash: calcSuperblockHash(
      merkleRoot,
      timestamp,
      mtpTimestamp,
      lastHash,
      lastBits,
      parentId
    ),
    blockHeaders: headers,
    blockHashes: strippedHashes, 
  };
}

// use only for gas profiling. This function is faking a lot of data. Don't use for other testing
function makeSuperblockFromHashes(blockHashes, parentId) {
  const strippedHashes =  blockHashes.map(x => x.slice(2)); // <- remove prefix '0x'
  const merkleRoot = makeMerkle(blockHashes);
  const timestamp = 1563155885;
  const mtptimestamp = timestamp;
  const lastHash = blockHashes[blockHashes.length - 1];
  const lastBits = 108428188075
  return {
    merkleRoot,
    timestamp,
    mtptimestamp,
    lastHash,
    lastBits,
    parentId,
    superblockHash: calcSuperblockHash(
      merkleRoot,  
      timestamp,
      mtptimestamp,
      lastHash,
      lastBits,
      parentId
    ),
    blockHeaders: blockHashes,
    blockHashes: strippedHashes, 
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
  // fix for magically failing tests
  Contracts.artifactDefaults = {
    data: undefined,
    from: undefined,
    gasPrice: undefined,
    gas: undefined 
  };
  const SyscoinClaimManager = Contracts.getFromLocal('SyscoinClaimManager');
  const SyscoinBattleManager = Contracts.getFromLocal('SyscoinBattleManager');
  const SyscoinSuperblocks = Contracts.getFromLocal('SyscoinSuperblocks');

  let project = await TestHelper({from: options.proxyAdmin});

  superblocks = await project.createProxy(SyscoinSuperblocks);
  battleManager = await project.createProxy(SyscoinBattleManager, {
    initMethod: 'init',
    initArgs: [
      options.network,
      superblocks.options.address,
      options.params.DURATION,
      options.params.TIMEOUT,
    ]
  });
  claimManager = await project.createProxy(SyscoinClaimManager, {
    initMethod: 'init',
    initArgs: [
      superblocks.options.address,
      battleManager.options.address,
      options.params.DELAY,
      options.params.TIMEOUT,
      options.params.CONFIRMATIONS,
    ]
  });

  // random address
  let syscoinERC20Manager = "0x08c8856a2424e1d58399d05bc6deac788b2fae9b";
  await superblocks.methods.init(syscoinERC20Manager, claimManager.options.address).send({ from: options.from, gas: 300000 });

  await battleManager.methods.setSyscoinClaimManager(claimManager.options.address).send({ from: options.from, gas: 300000 });

  await superblocks.methods.initialize(
    options.genesisSuperblock.merkleRoot,
    options.genesisSuperblock.timestamp,
    options.genesisSuperblock.mtpTimestamp,
    options.genesisSuperblock.lastHash,
    options.genesisSuperblock.lastBits,
    options.genesisSuperblock.parentId
  ).send({ from: options.from, gas: 300000 });

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

function printGas(txReceipt, msg, margin = 8) {
  if (process.stdout.clearLine){
    process.stdout.clearLine()
    process.stdout.cursorTo(margin)
    process.stdout.cursorTo(margin + 2)
    let gas = new Number(txReceipt.receipt.gasUsed)
    process.stdout.write(msg + " - gasUsed: " + gas.toLocaleString() + '\n');
  }
}


module.exports = {
  SUPERBLOCK_OPTIONS_LOCAL,
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
      genesisSuperblock.timestamp,
      genesisSuperblock.mtpTimestamp,
      genesisSuperblock.lastHash,
      genesisSuperblock.lastBits,
      genesisSuperblock.parentId,
      { from: sender },
    );

    const proposedSuperblock = makeSuperblock(
      headers.slice(1),
      genesisSuperblock.superblockHash,
      130
    );

    await claimManager.makeDeposit({ value: DEPOSITS.MIN_REWARD, from: sender });

    let result;

    result = await claimManager.proposeSuperblock(
      proposedSuperblock.merkleRoot,
      proposedSuperblock.timestamp,
      proposedSuperblock.mtpTimestamp,
      proposedSuperblock.lastHash,
      proposedSuperblock.lastBits,
      proposedSuperblock.parentId,
      { from: sender },
    );

    assert.equal(result.logs[1].event, 'SuperblockClaimCreated', 'New superblock proposed');
    const superblockHash = result.logs[1].args.superblockHash;

    await blockchainTimeoutSeconds(3*SUPERBLOCK_OPTIONS_LOCAL.TIMEOUT);

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
  getBlockMedianTimestamp,
  getBlockDifficultyBits,
  getBlockDifficulty,
  timeout,
  blockchainTimeoutSeconds,
  mineBlocks,
  getBlockNumber,
  verifyThrow,
  calcSuperblockHash,
  makeSuperblock,
  makeSuperblockFromHashes,
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
  printGas
};

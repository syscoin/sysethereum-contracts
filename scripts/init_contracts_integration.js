var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await Superblocks.deployed();

  var blocksMerkleRoot = "0x00000fcf12e4746e1e13ebcbd156dce74a48d6a3e0148250bf47a172a2d26d6a";
  var accumulatedWork = web3.toBigNumber("0");
  var timestamp = 1557607987;
  var prevTimestamp = 0;
  var lastHash = "0x00000fcf12e4746e1e13ebcbd156dce74a48d6a3e0148250bf47a172a2d26d6a";
  var lastBits = 0x1e0ffff0;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

   console.log("init_contracts_integration end");
}
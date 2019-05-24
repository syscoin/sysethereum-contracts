var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await Superblocks.deployed();

  var blocksMerkleRoot = "0x00000448444b0b3ddf48863024870d158bf48ce7f02a1d3093b01a84c1c1da42";
  var accumulatedWork = web3.toBigNumber(0x100001);
  var timestamp = 1552606661;
  var prevTimestamp = 0;
  var lastHash = "0x00000448444b0b3ddf48863024870d158bf48ce7f02a1d3093b01a84c1c1da42";
  var lastBits = 0x1e0fffff;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

   console.log("init_contracts_integration end");
}
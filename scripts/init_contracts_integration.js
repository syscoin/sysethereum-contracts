var SyscoinSuperblocks = artifacts.require("./SyscoinSuperblocks.sol");

module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await SyscoinSuperblocks.deployed();
  console.log("beginning deployment...");
  var blocksMerkleRoot = "0x000004fd0a684f4ce4d5e254f7230e7a620b3d5dc88a3facf555b8bab0a63f4b";
  var accumulatedWork = web3.utils.toBN("0x0000000000000000000000000000000000000000000000000000000016800168");
  var timestamp = 1566534575;
  var mtptimestamp = 1566534575;
  var lastHash = "0x000004fd0a684f4ce4d5e254f7230e7a620b3d5dc88a3facf555b8bab0a63f4b"; // 359
  var parentId = "0x0";
  var lastBits = 504365055; // 0x1E0FFFFF
  console.log("Initializing...");
  res = await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, mtptimestamp, lastHash, lastBits, parentId);
  console.log("init_contracts_integration end");
  process.exit()
}
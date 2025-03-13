const SyscoinVaultManager = artifacts.require("SyscoinVaultManager");
const MockERC20 = artifacts.require("MockERC20");
const MockERC721 = artifacts.require("MockERC721");
const MockERC1155 = artifacts.require("MockERC1155");

const SYSCOIN_TESTNET_ADDRESS = "tsys1qw8n9zq4ynqn94spk0vqsqpfukrn2sjuqf5aecp";

module.exports = async function (callback) {
  try {
    console.log("🔄 Loading deployed contracts...");

    const vault = await SyscoinVaultManager.deployed();
    const erc20 = await MockERC20.deployed();
    const erc721 = await MockERC721.deployed();
    const erc1155 = await MockERC1155.deployed();
    const accounts = await web3.eth.getAccounts();
    const owner = accounts[0];
    console.log("✅ Using owner:", owner);
    console.log("✅ Using ERC20 at:", erc20.address);
    console.log("✅ Using ERC721 at:", erc721.address);
    console.log("✅ Using ERC1155 at:", erc1155.address);
    console.log("✅ Using Vault at:", vault.address);

    // 🔹 FreezeBurn SYS (Native Syscoin)
    console.log("\n🔥 Freezing Native SYS...");
    let tx = await vault.freezeBurn(
      web3.utils.toWei("0.1"), // 0.1 SYS
      "0x0000000000000000000000000000000000000000", // Use zero address for SYS
      0,
      SYSCOIN_TESTNET_ADDRESS,
      { from: owner, value: web3.utils.toWei("0.1") } // Sending 0.1 SYS
    );
    console.log("✅ SYS FreezeBurn TXID:", tx.tx);

    // 🔹 FreezeBurn ERC20
    console.log("\n🔥 Freezing ERC20 Tokens...");
    await erc20.mint(owner, web3.utils.toWei("100"));
    await erc20.approve(vault.address, web3.utils.toWei("5"), { from: owner });

    tx = await vault.freezeBurn(
      web3.utils.toWei("5"),
      erc20.address,
      0,
      SYSCOIN_TESTNET_ADDRESS,
      { from: owner }
    );
    console.log("✅ ERC20 FreezeBurn TXID:", tx.tx);

    let vaultBalance = await erc20.balanceOf(vault.address);
    console.log("🏦 Vault ERC20 Balance:", web3.utils.fromWei(vaultBalance.toString()), "MCK");

    // 🔹 FreezeBurn ERC721
    console.log("\n🔥 Freezing ERC721 NFT...");
    await erc721.mint(owner, 1);
    await erc721.approve(vault.address, 1, { from: owner });

    tx = await vault.freezeBurn(
      1,
      erc721.address,
      1,
      SYSCOIN_TESTNET_ADDRESS,
      { from: owner }
    );
    console.log("✅ ERC721 FreezeBurn TXID:", tx.tx);

    let ownerOfNft = await erc721.ownerOf(1);
    console.log("🏦 Vault now owns ERC721 TokenID=1:", ownerOfNft === vault.address);

    // 🔹 FreezeBurn ERC1155
    console.log("\n🔥 Freezing ERC1155 Tokens...");
    await erc1155.mint(owner, 777, 10);
    await erc1155.setApprovalForAll(vault.address, true, { from: owner });

    tx = await vault.freezeBurn(
      10,
      erc1155.address,
      777,
      SYSCOIN_TESTNET_ADDRESS,
      { from: owner }
    );
    console.log("✅ ERC1155 FreezeBurn TXID:", tx.tx);

    let vault1155Balance = await erc1155.balanceOf(vault.address, 777);
    console.log("🏦 Vault ERC1155 Balance for TokenID=777:", vault1155Balance.toString());

    console.log("\n🎉 All FreezeBurn transactions completed successfully!");

    callback();
  } catch (error) {
    console.error("❌ Error running script:", error);
    callback(error);
  }
};

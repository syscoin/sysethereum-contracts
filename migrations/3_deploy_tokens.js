const MockERC20 = artifacts.require("MockERC20");
const MockERC721 = artifacts.require("MockERC721");
const MockERC1155 = artifacts.require("MockERC1155");

module.exports = async function (deployer, network, accounts) {
  // Only deploy mocks on test networks, not on mainnet
  if (network === "development" || network === "tanenbaum") {
    console.log(`Deploying mocks on ${network} network`);

    await deployer.deploy(MockERC20, "MockERC20", "M20");
    const erc20 = await MockERC20.deployed();
    console.log("MockERC20 deployed at:", erc20.address);

    await deployer.deploy(MockERC721, "MockERC721", "MNFT");
    const erc721 = await MockERC721.deployed();
    console.log("MockERC721 deployed at:", erc721.address);

    await deployer.deploy(MockERC1155, "https://test.api/");
    const erc1155 = await MockERC1155.deployed();
    console.log("MockERC1155 deployed at:", erc1155.address);
  } else {
    console.log(`Skipped deploying mocks on ${network}`);
  }
};

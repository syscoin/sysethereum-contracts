import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log(`Deploying contracts to ${network.name}...`);

    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);

    const syscoinRelay = await ethers.deployContract("SyscoinRelay");
    await syscoinRelay.waitForDeployment();
    const syscoinRelayAddress = await syscoinRelay.getAddress();
    console.log(`SyscoinRelay deployed at: ${syscoinRelayAddress}`);

    const SYS_ASSET_GUID = 123456n;
    
    const syscoinVaultManager = await ethers.deployContract("SyscoinVaultManager", [
        syscoinRelayAddress,
        SYS_ASSET_GUID,
        deployer.address
    ]);
    await syscoinVaultManager.waitForDeployment();
    const syscoinVaultManagerAddress = await syscoinVaultManager.getAddress();
    console.log(`SyscoinVaultManager deployed at: ${syscoinVaultManagerAddress}`);
    // Confirm setup
    const configuredVaultAddress = await syscoinRelay.syscoinVaultManager();
    console.log("Relay configured VaultManager address:", configuredVaultAddress);

    if(configuredVaultAddress !== syscoinVaultManagerAddress) {
        throw new Error('SyscoinRelay initialization failed: VaultManager address mismatch');
    }
    const deploymentsPath = path.resolve(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsPath)) {
        fs.mkdirSync(deploymentsPath);
    }

    fs.writeFileSync(
        path.join(deploymentsPath, `${network.name}.json`),
        JSON.stringify({
            SyscoinRelay: syscoinRelayAddress,
            SyscoinVaultManager: syscoinVaultManagerAddress,
            deployer: deployer.address,
            SYS_ASSET_GUID,
        }, null, 4)
    );

    console.log("Deployment completed!");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

import { ethers, run, network } from "hardhat";

async function main() {
    console.log(`Deploying contracts to ${network.name}...`);

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);

    // Define SYS Asset GUID
    const SYS_ASSET_GUID = 123456n;

    // Deploy SyscoinRelay
    console.log("Deploying SyscoinRelay...");
    const SyscoinRelayFactory = await ethers.getContractFactory("SyscoinRelay");
    const syscoinRelay = await SyscoinRelayFactory.deploy();
    await syscoinRelay.waitForDeployment();
    const syscoinRelayAddress = await syscoinRelay.getAddress();
    console.log(`SyscoinRelay deployed at: ${syscoinRelayAddress}`);

    // Deploy SyscoinVaultManager
    console.log("Deploying SyscoinVaultManager...");
    const SyscoinVaultManagerFactory = await ethers.getContractFactory("SyscoinVaultManager");
    const syscoinVaultManager = await SyscoinVaultManagerFactory.deploy(
        syscoinRelayAddress,  // trusted relayer
        SYS_ASSET_GUID,       // SYS asset GUID
        deployer.address      // initial owner
    );
    await syscoinVaultManager.waitForDeployment();
    const syscoinVaultManagerAddress = await syscoinVaultManager.getAddress();
    console.log(`SyscoinVaultManager deployed at: ${syscoinVaultManagerAddress}`);

    // Initialize SyscoinRelay
    console.log("Initializing SyscoinRelay...");
    const initTx = await syscoinRelay.init(syscoinVaultManagerAddress);
    await initTx.wait();
    console.log("SyscoinRelay initialized successfully");

    // Verify contracts if not on a local network
    if (network.name !== "localhost" && network.name !== "hardhat") {
        console.log("Waiting for verification...");
        await new Promise(r => setTimeout(r, 10000)); // Wait 10 seconds

        try {
            console.log("Verifying SyscoinRelay...");
            await run("verify:verify", {
                address: syscoinRelayAddress,
                constructorArguments: []
            });

            console.log("Verifying SyscoinVaultManager...");
            await run("verify:verify", {
                address: syscoinVaultManagerAddress,
                constructorArguments: [syscoinRelayAddress, SYS_ASSET_GUID, deployer.address]
            });
        } catch (error) {
            console.error(`Verification error: ${error}`);
        }
    }

    console.log("\nDeployment Summary:");
    console.log(`SyscoinRelay: ${syscoinRelayAddress}`);
    console.log(`SyscoinVaultManager: ${syscoinVaultManagerAddress}`);
    console.log("Deployment completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
import { run, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const deploymentsPath = path.resolve(__dirname, "../deployments", `${network.name}.json`);

    if (!fs.existsSync(deploymentsPath)) {
        throw new Error(`Deployments file not found: ${deploymentsPath}`);
    }

    const { SyscoinRelay, SyscoinVaultManager, SYS_ASSET_GUID, deployer } = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

    try {
        console.log("Verifying SyscoinRelay...");
        await run("verify:verify", {
            address: SyscoinRelay,
            constructorArguments: [],
        });
        console.log("SyscoinRelay verified successfully.");
    } catch (error) {
        console.error("Verification of SyscoinRelay failed:", error);
    }

    try {
        console.log("Verifying SyscoinVaultManager...");
        await run("verify:verify", {
            address: SyscoinVaultManager,
            constructorArguments: [SyscoinRelay, SYS_ASSET_GUID, deployer],
        });
        console.log("SyscoinVaultManager verified successfully.");
    } catch (error) {
        console.error("Verification of SyscoinVaultManager failed:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

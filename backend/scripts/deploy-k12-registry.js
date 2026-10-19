// scripts/deploy-k12-registry.js
const hre = require("hardhat");

async function main() {
    console.log("=== Deploying K12CredentialRegistry ===");
    console.log("Network:", hre.network.name);

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

    const Registry = await hre.ethers.getContractFactory("K12CredentialRegistry");
    const registry = await Registry.deploy();

    await registry.waitForDeployment();
    const address = await registry.getAddress();

    console.log("\n✅ K12CredentialRegistry deployed to:", address);
    console.log("   Initial minKpiScore:", await registry.minKpiScore());
    console.log("\n📋 Cap nhat backend/.env:");
    console.log(`   K12_CREDENTIAL_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

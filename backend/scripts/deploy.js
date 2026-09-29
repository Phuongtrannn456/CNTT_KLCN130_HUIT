const hre = require("hardhat");

async function main() {
  const K12CredentialRegistry = await hre.ethers.getContractFactory("K12CredentialRegistry");
  // Limit gas to avoid exceed cap bug in newer ethers
  const registry = await K12CredentialRegistry.deploy({ gasLimit: 3000000 });
  await registry.waitForDeployment();
  console.log("K12CredentialRegistry deployed to:", await registry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

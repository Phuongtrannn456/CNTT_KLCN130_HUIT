const crypto = require("crypto");
const { ethers } = require("ethers");

const ABI = [
  "function recordSubmission(string reportId,string ipfsCid,string fileHash,uint256 submittedAt) external",
  "function getSubmission(string reportId) external view returns (string ipfsCid,string fileHash,uint256 submittedAt,address recordedBy)"
];

function deterministicMockTx(reportId, cid, submittedAt) {
  const raw = `${reportId}|${cid}|${submittedAt}`;
  return "0x" + crypto.createHash("sha256").update(raw).digest("hex");
}

function getRealContract() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const address = process.env.THESIS_CONTRACT_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY;
  if (!rpcUrl || !address || !privateKey) {
    throw new Error("Thiếu BLOCKCHAIN_RPC_URL, THESIS_CONTRACT_ADDRESS hoặc PRIVATE_KEY");
  }
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(address, ABI, wallet);
}

async function recordSubmission({ reportId, cid, fileHash, submittedAt }) {
  const mode = (process.env.BLOCKCHAIN_MODE || "mock").toLowerCase();
  const unixTime = Math.floor(new Date(submittedAt).getTime() / 1000);

  if (mode === "real") {
    const contract = getRealContract();
    const tx = await contract.recordSubmission(reportId, cid, fileHash, unixTime);
    const receipt = await tx.wait();
    return { transactionHash: receipt.hash, provider: "HARDHAT_ETHERS" };
  }

  return {
    transactionHash: deterministicMockTx(reportId, cid, unixTime),
    provider: "MOCK_BLOCKCHAIN"
  };
}

async function verifySubmission({ reportId, cid, fileHash, submittedAt, transactionHash }) {
  const mode = (process.env.BLOCKCHAIN_MODE || "mock").toLowerCase();
  const unixTime = Math.floor(new Date(submittedAt).getTime() / 1000);

  if (mode === "real") {
    const contract = getRealContract();
    const record = await contract.getSubmission(reportId);
    return {
      valid:
        record.ipfsCid === cid &&
        record.fileHash === fileHash &&
        Number(record.submittedAt) === unixTime,
      onChain: {
        ipfsCid: record.ipfsCid,
        fileHash: record.fileHash,
        submittedAt: Number(record.submittedAt),
        recordedBy: record.recordedBy
      },
      provider: "HARDHAT_ETHERS"
    };
  }

  const expectedTx = deterministicMockTx(reportId, cid, unixTime);
  return {
    valid: expectedTx === transactionHash,
    onChain: { ipfsCid: cid, fileHash, submittedAt: unixTime, recordedBy: "mock" },
    provider: "MOCK_BLOCKCHAIN"
  };
}

async function blockchainHealth() {
  const mode = (process.env.BLOCKCHAIN_MODE || "mock").toLowerCase();
  if (mode !== "real") return { mode, reachable: true, note: "Demo mock mode" };
  try {
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    return { mode, reachable: true, blockNumber };
  } catch (error) {
    return { mode, reachable: false, error: error.message };
  }
}

module.exports = {
  recordSubmission,
  verifySubmission,
  blockchainHealth
};

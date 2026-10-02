const { blockchainHealth } = require("../services/blockchainService");
const { asyncHandler } = require("../utils/asyncHandler");

const web3Status = asyncHandler(async (req, res) => {
  const chain = await blockchainHealth();
  res.json({
    ipfs: {
      mode: (process.env.IPFS_MODE || "mock").toLowerCase(),
      configured: (process.env.IPFS_MODE || "mock").toLowerCase() !== "real" || Boolean(process.env.IPFS_API_URL)
    },
    blockchain: chain
  });
});

module.exports = {
  web3Status
};

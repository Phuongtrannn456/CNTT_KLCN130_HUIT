const { PinataSDK } = require('pinata-web3');
const logger = require('../config/logger');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function uploadToIPFS(buffer, filename = "report.bin") {
  const fileHash = sha256(buffer);
  const mode = (process.env.IPFS_MODE || "mock").toLowerCase();

  if (mode === "real") {
    const apiUrl = process.env.IPFS_API_URL;
    if (!apiUrl) throw new Error("IPFS_MODE=real nhưng IPFS_API_URL chưa được cấu hình");

    const form = new FormData();
    form.append("file", buffer, { filename });
    const endpoint = apiUrl.replace(/\/$/, "") + "/api/v0/add?pin=true";
    const { data } = await axios.post(endpoint, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 30000
    });
    const cid = data.Hash || data.cid || data.Cid;
    if (!cid) throw new Error("IPFS không trả về CID");
    return { cid, fileHash, provider: "IPFS" };
  }

  return {
    cid: `mock-cid-${fileHash.slice(0, 32)}`,
    fileHash,
    provider: "MOCK_IPFS"
  };
}

function gatewayUrl(cid) {
  if (!cid || cid.startsWith("mock-cid-")) return "";
  const gateway = process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs/";
  return gateway.replace(/\/$/, "") + "/" + cid;
}

const uploadFile = async (filePath, fileName) => {
    try {
        logger.info(`[IPFS] Uploading ${fileName} to Pinata...`);
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);
        const file = new File([blob], fileName, { type: 'application/octet-stream' });
        const upload = await pinata.upload.file(file);
        logger.info(`[IPFS] Upload success | CID=${upload.IpfsHash} | file=${fileName}`);
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            logger.warn(`[IPFS] Không thể xóa file tạm: ${err.message}`);
        }
        return { IpfsHash: upload.IpfsHash };
    } catch (error) {
        logger.error(`[IPFS] Upload failed: ${error.message}`);
        throw error;
    }
};

module.exports = {
  sha256,
  uploadToIPFS,
  gatewayUrl,
  uploadFile
};

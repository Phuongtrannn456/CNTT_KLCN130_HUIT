const { ethers } = require('ethers');
const logger = require('../config/logger');

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
const RELAYER_PK = process.env.RELAYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const CONTRACT_ADDRESS = process.env.K12_CREDENTIAL_CONTRACT_ADDRESS;

const ABI = [
  "function issueCredential(bytes32 _credentialId, bytes32 _metadataHash, address _studentWallet, address _issuerWallet) external",
  "function verifyCredential(bytes32 _credentialId) external view returns (bytes32 metadataHash, address studentWallet, address issuerWallet, uint256 issuedAt, bool isValid)",
  "function revokeCredential(bytes32 _credentialId) external",
  "function authorizedIssuers(address) external view returns (bool)",
  "function owner() external view returns (address)"
];

const uuidToBytes32 = (uuid) => {
  if (!uuid) return ethers.ZeroHash;
  // If already bytes32 hex
  if (typeof uuid === 'string' && uuid.startsWith('0x') && uuid.length === 66) {
    return uuid;
  }
  return ethers.keccak256(ethers.toUtf8Bytes(String(uuid)));
};

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
  }

  getReadOnlyContract() {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, this.provider);
  }

  getSignerContract() {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000' || !RELAYER_PK) {
      return null;
    }
    const relayer = new ethers.Wallet(RELAYER_PK, this.provider);
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, relayer);
  }

  /**
   * Xác minh chứng thực Giáo viên trên On-chain thông qua credentialId
   * @param {string} credentialId - UUID hoặc string ID định danh chứng thực
   * @param {string} expectedWallet - Địa chỉ ví của giáo viên cần kiểm tra
   * @returns {Promise<{ ok: boolean, isValid: boolean, metadataHash?: string, error?: string }>}
   */
  async verifyTeacherCredentialOnChain(credentialId, expectedWallet) {
    try {
      const contract = this.getReadOnlyContract();
      if (!contract) {
        // Nếu chưa cấu hình contract on-chain trong môi trường dev, trả về flag rành mạch
        return { ok: false, isValid: false, code: 'NO_CONTRACT_CONFIGURED', error: 'Chưa cấu hình Smart Contract K-12' };
      }

      const bytes32Id = uuidToBytes32(credentialId);
      const cred = await contract.verifyCredential(bytes32Id);

      const studentWallet = (cred.studentWallet || '').toLowerCase();
      const targetWallet = (expectedWallet || '').toLowerCase();
      const isValid = Boolean(cred.isValid) && studentWallet === targetWallet;

      return {
        ok: true,
        isValid,
        metadataHash: cred.metadataHash,
        studentWallet: cred.studentWallet,
        issuerWallet: cred.issuerWallet,
        issuedAt: Number(cred.issuedAt)
      };
    } catch (err) {
      logger.error(`[BLOCKCHAIN] verifyTeacherCredentialOnChain error: ${err.message}`);
      return { ok: false, isValid: false, code: 'RPC_ERROR', error: err.message };
    }
  }

  /**
   * Phát hành Teacher Credential lên Smart Contract
   * @param {string} credentialId
   * @param {string} teacherWallet
   * @param {string} metadataHash
   * @param {string} issuerWallet
   * @returns {Promise<{ success: boolean, txHash?: string, receipt?: any, error?: string }>}
   */
  async issueTeacherCredentialOnChain(credentialId, teacherWallet, metadataHash, issuerWallet) {
    try {
      const contract = this.getSignerContract();
      if (!contract) {
        return { success: false, error: 'Blockchain relayer / contract chưa sẵn sàng' };
      }

      const bytes32Id = uuidToBytes32(credentialId);
      const hash = metadataHash || ethers.keccak256(ethers.toUtf8Bytes(`TEACHER_ROLE:${credentialId}:${teacherWallet.toLowerCase()}`));
      const issuer = issuerWallet || contract.runner.address;

      const tx = await contract.issueCredential(bytes32Id, hash, teacherWallet, issuer);
      logger.info(`[BLOCKCHAIN] issueTeacherCredential tx sent: ${tx.hash}`);

      const receipt = await tx.wait(1);
      if (receipt.status !== 1) {
        return { success: false, error: 'Giao dịch on-chain bị reverted', txHash: tx.hash };
      }

      return { success: true, txHash: tx.hash, receipt };
    } catch (err) {
      logger.error(`[BLOCKCHAIN] issueTeacherCredential failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Thu hồi Teacher Credential trên Smart Contract
   * @param {string} credentialId
   * @returns {Promise<{ success: boolean, txHash?: string, receipt?: any, error?: string }>}
   */
  async revokeTeacherCredentialOnChain(credentialId) {
    try {
      const contract = this.getSignerContract();
      if (!contract) {
        return { success: false, error: 'Blockchain relayer / contract chưa sẵn sàng' };
      }

      const bytes32Id = uuidToBytes32(credentialId);
      const tx = await contract.revokeCredential(bytes32Id);
      logger.info(`[BLOCKCHAIN] revokeTeacherCredential tx sent: ${tx.hash}`);

      const receipt = await tx.wait(1);
      if (receipt.status !== 1) {
        return { success: false, error: 'Giao dịch revoke on-chain bị reverted', txHash: tx.hash };
      }

      return { success: true, txHash: tx.hash, receipt };
    } catch (err) {
      logger.error(`[BLOCKCHAIN] revokeTeacherCredential failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new BlockchainService();

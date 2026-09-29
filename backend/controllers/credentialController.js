const EducationalCredential = require('../models/EducationalCredential');
const Achievement = require('../models/Achievement');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { createCanonicalHash } = require('../utils/canonicalCredential');
const { ethers } = require('ethers');
const logger = require('../config/logger');

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
const RELAYER_PK = process.env.RELAYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; 
const CONTRACT_ADDRESS = process.env.K12_CREDENTIAL_CONTRACT_ADDRESS;

const abi = [
  "function issueCredential(bytes32 _credentialId, bytes32 _metadataHash, address _studentWallet, address _issuerWallet) external",
  "function verifyCredential(bytes32 _credentialId) external view returns (bytes32 metadataHash, address studentWallet, address issuerWallet, uint256 issuedAt, bool isValid)",
  "function revokeCredential(bytes32 _credentialId) external"
];

const getContract = () => {
  if (!CONTRACT_ADDRESS) return null;
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const relayer = new ethers.Wallet(RELAYER_PK, provider);
  return new ethers.Contract(CONTRACT_ADDRESS, abi, relayer);
};

const uuidToBytes32 = (uuid) => ethers.keccak256(ethers.toUtf8Bytes(uuid));

exports.getMyCredentials = async (req, res) => {
  try {
    const query = req.user.role_id === 'STUDENT_ROLE' 
      ? { student: req.user.id } 
      : { issuer: req.user.id };
    
    const credentials = await EducationalCredential.find(query)
      .populate('challenge', 'title subject challengeType')
      .populate('issuer', 'fullName')
      .populate('student', 'fullName');
    
    res.status(200).json({ success: true, credentials });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.generateClaimMessage = async (req, res) => {
  try {
    const { achievementId } = req.params;
    const studentId = req.user.id;

    const achievement = await Achievement.findById(achievementId).populate('challenge').populate('issuer');
    if (!achievement) return res.status(404).json({ success: false, message: 'Achievement không tồn tại' });
    if (achievement.student.toString() !== studentId) return res.status(403).json({ success: false, message: 'Không có quyền' });

    let credential = await EducationalCredential.findOne({ achievement: achievementId });
    
    // FIX: Allow retry if FAILED
    if (credential && !['PENDING_CLAIM', 'DRAFT', 'FAILED'].includes(credential.status)) {
      return res.status(400).json({ success: false, message: 'Đã nhận hoặc đang chờ xử lý' });
    }

    if (!credential) {
      credential = new EducationalCredential({
        student: studentId,
        achievement: achievementId,
        challenge: achievement.challenge._id,
        issuer: achievement.issuer._id,
        metadata: {
          achievementType: achievement.achievementType
        }
      });
      await credential.save();
    } else if (credential.status === 'FAILED') {
      credential.status = 'PENDING_CLAIM';
      await credential.save();
    }

    const message = `Yêu cầu cấp Web3 Credential cho thành tích: ${achievement.achievementType}\nCredential ID: ${credential.credentialId}\nNonce: ${credential.nonce}`;
    
    res.status(200).json({ success: true, messageToSign: message, credentialId: credential.credentialId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.claimCredential = async (req, res) => {
  try {
    const { credentialId, signature } = req.body;
    const student = await Student.findById(req.user.id);
    
    const credential = await EducationalCredential.findOne({ credentialId, student: student._id })
      .populate('issuer')
      .populate('challenge');
      
    if (!credential) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    if (credential.status !== 'PENDING_CLAIM') return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });

    const expectedMessage = `Yêu cầu cấp Web3 Credential cho thành tích: ${credential.metadata.achievementType}\nCredential ID: ${credential.credentialId}\nNonce: ${credential.nonce}`;
    const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);
    
    if (recoveredAddress.toLowerCase() !== student.walletAddress.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Chữ ký không hợp lệ' });
    }

    // Increment nonce to prevent replay
    credential.nonce += 1;
    credential.status = 'PENDING_CHAIN';

    const hashData = createCanonicalHash({
      credentialId: credential.credentialId,
      metadata: credential.metadata,
      challenge: credential.challenge._id,
      issuerWallet: credential.issuer.walletAddress || '0x0000000000000000000000000000000000000000',
      studentWallet: student.walletAddress
    });

    credential.canonicalHash = hashData.hash;
    await credential.save();

    const contract = getContract();
    if (!contract) {
      credential.status = 'FAILED';
      await credential.save();
      return res.status(500).json({ success: false, message: 'Blockchain unavailable' });
    }

    try {
      const tx = await contract.issueCredential(
        uuidToBytes32(credential.credentialId),
        hashData.hash,
        student.walletAddress,
        credential.issuer.walletAddress || '0x0000000000000000000000000000000000000000'
      );
      
      const receipt = await tx.wait();
      
      credential.status = 'ANCHORED';
      credential.blockchain = {
        network: process.env.BLOCKCHAIN_NETWORK || 'Hardhat',
        contractAddress: CONTRACT_ADDRESS,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
      await credential.save();

      return res.status(200).json({ success: true, credential });
    } catch (txError) {
      logger.error('Tx Error:', txError);
      // FIX: Mark as FAILED so they can retry
      credential.status = 'FAILED';
      await credential.save();
      return res.status(500).json({ success: false, message: 'Blockchain transaction failed' });
    }
  } catch (err) {
    logger.error('Claim Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.verifyCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;
    
    // Privacy Fix: Only populate what is strictly non-PII
    const credential = await EducationalCredential.findOne({ credentialId })
      .populate('challenge', 'title') 
      .populate('issuer', 'walletAddress')
      .populate('student', 'walletAddress'); 

    if (!credential) return res.status(404).json({ success: false, message: 'Credential không tồn tại' });
    
    // DO NOT expose fullName, email, school, gpa, studentId, or submission content.
    const publicData = {
      credentialId: credential.credentialId,
      status: credential.status,
      challenge: credential.challenge.title, // Only public title
      achievementType: credential.metadata.achievementType,
      issuerWallet: credential.issuer.walletAddress,
      studentWallet: credential.student.walletAddress,
      issuedAt: credential.metadata.issuedAt,
      blockchain: credential.blockchain
    };

    if (credential.status !== 'ANCHORED') {
      return res.status(200).json({ success: true, verified: false, data: publicData, reason: 'Chưa được ghi lên Blockchain hoặc đã bị hủy' });
    }

    const contract = getContract();
    if (!contract) return res.status(200).json({ success: true, verified: false, data: publicData, reason: 'Blockchain không kết nối được' });

    try {
      const onChainData = await contract.verifyCredential(uuidToBytes32(credentialId));
      const hashMatch = onChainData.metadataHash === credential.canonicalHash;
      const ownershipMatch = onChainData.studentWallet.toLowerCase() === credential.student.walletAddress.toLowerCase();
      const isValid = onChainData.isValid;

      // Ensure that revoked is strictly failed
      const verified = hashMatch && ownershipMatch && isValid && credential.status !== 'REVOKED';

      return res.status(200).json({
        success: true,
        verified,
        data: publicData,
        details: {
          hashMatch,
          ownershipMatch,
          onChainValid: isValid,
          dbHash: credential.canonicalHash,
          onChainHash: onChainData.metadataHash
        }
      });
    } catch (e) {
      return res.status(200).json({ success: true, verified: false, data: publicData, reason: 'Không tìm thấy trên Blockchain' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.revokeCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;
    
    const credential = await EducationalCredential.findOne({ credentialId }).populate('challenge');
    if (!credential) return res.status(404).json({ success: false, message: 'Not found' });
    
    // Auth: Only creator of challenge can revoke
    if (credential.challenge.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to revoke' });
    }

    if (credential.status === 'REVOKED') {
      return res.status(400).json({ success: false, message: 'Already revoked' });
    }

    const contract = getContract();
    if (!contract) return res.status(500).json({ success: false, message: 'Blockchain unavailable' });

    const tx = await contract.revokeCredential(uuidToBytes32(credentialId));
    await tx.wait();

    credential.status = 'REVOKED';
    await credential.save();

    res.status(200).json({ success: true, message: 'Revoked successfully' });
  } catch (err) {
    logger.error('Revoke error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

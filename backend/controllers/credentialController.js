const EducationalCredential = require('../models/EducationalCredential');
const Achievement = require('../models/Achievement');
const HocSinh = require('../models/HocSinh');
const GiaoVien = require('../models/GiaoVien');
const { createCanonicalHash } = require('../utils/canonicalCredential');
const { ethers } = require('ethers');
const logger = require('../config/logger');

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || 'http://127.0.0.1:8545';
const RELAYER_PK = process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; 
const CONTRACT_ADDRESS = process.env.K12_CREDENTIAL_CONTRACT_ADDRESS;

const abi = [
  "function minKpiScore() external view returns (uint8)",
  "function setMinKpiScore(uint8 _minKpiScore) external",
  "function issueCredential(bytes32 _credentialId, bytes32 _metadataHash, address _studentWallet, address _issuerWallet) external",
  "function issueCredentialWithKPI(bytes32 _credentialId, bytes32 _metadataHash, address _studentWallet, address _issuerWallet, uint8 _kpiScore) external",
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
    let studentIds = [req.user.id];
    let issuerIds = [req.user.id];
    if (req.user.walletAddress) {
      const lowerWallet = req.user.walletAddress.toLowerCase();
      const hs = await HocSinh.findOne({ WalletAddress: lowerWallet });
      if (hs && !studentIds.some(id => id.toString() === hs._id.toString())) {
        studentIds.push(hs._id);
      }

      const gv = await GiaoVien.findOne({ WalletAddress: lowerWallet });
      if (gv && !issuerIds.some(id => id.toString() === gv._id.toString())) {
        issuerIds.push(gv._id);
      }
    }

    const query = req.user.role_id === 'STUDENT_ROLE' 
      ? { student: { $in: studentIds } } 
      : { issuer: { $in: issuerIds } };
    
    const credentials = await EducationalCredential.find(query)
      .populate('challenge', 'title subject challengeType')
      .populate('issuer', 'HoTen fullName WalletAddress walletAddress')
      .populate('student', 'HoTen fullName WalletAddress walletAddress');
    
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

    let isStudentOwner = achievement.student.toString() === studentId;
    if (!isStudentOwner && req.user?.walletAddress) {
      const currentHs = await HocSinh.findOne({ WalletAddress: req.user.walletAddress.toLowerCase() });
      if (currentHs && currentHs._id.toString() === achievement.student.toString()) {
        isStudentOwner = true;
      }
    }
    if (!isStudentOwner) return res.status(403).json({ success: false, message: 'Không có quyền' });

    let credential = await EducationalCredential.findOne({ achievement: achievementId });
    
    // FIX: Allow retry if FAILED
    if (credential && !['PENDING_CLAIM', 'DRAFT', 'FAILED'].includes(credential.status)) {
      return res.status(400).json({ success: false, message: 'Đã nhận hoặc đang chờ xử lý' });
    }

    if (!credential) {
      credential = new EducationalCredential({
        student: achievement.student,
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
    let student = await HocSinh.findById(req.user.id);
    if (!student && req.user?.walletAddress) {
      student = await HocSinh.findOne({ WalletAddress: req.user.walletAddress.toLowerCase() });
    }
    if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin học sinh' });
    
    const credential = await EducationalCredential.findOne({
      credentialId,
      $or: [{ student: student._id }, { student: req.user.id }]
    })
      .populate('issuer')
      .populate('challenge');
      
    if (!credential) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    if (credential.status !== 'PENDING_CLAIM') return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });

    const studentWallet = (student.walletAddress || student.WalletAddress || '').toLowerCase();

    const expectedMessage = `Yêu cầu cấp Web3 Credential cho thành tích: ${credential.metadata.achievementType}\nCredential ID: ${credential.credentialId}\nNonce: ${credential.nonce}`;
    const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);
    
    if (recoveredAddress.toLowerCase() !== studentWallet) {
      return res.status(400).json({ success: false, message: 'Chữ ký không hợp lệ' });
    }

    // Increment nonce to prevent replay
    credential.nonce += 1;
    credential.status = 'PENDING_CHAIN';

    const issuerWallet = (credential.issuer?.walletAddress || credential.issuer?.WalletAddress || '0x0000000000000000000000000000000000000000').toLowerCase();

    const hashData = createCanonicalHash({
      credentialId: credential.credentialId,
      metadata: credential.metadata,
      challenge: credential.challenge._id,
      issuerWallet,
      studentWallet
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
        studentWallet,
        issuerWallet
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
      .populate('issuer', 'WalletAddress walletAddress')
      .populate('student', 'WalletAddress walletAddress'); 

    if (!credential) return res.status(404).json({ success: false, message: 'Credential không tồn tại' });
    
    let challengeTitle = credential.challenge?.title;
    if (!challengeTitle && credential.challenge) {
      const Challenge = require('../models/Challenge');
      const c = await Challenge.findById(credential.challenge);
      if (c) challengeTitle = c.title;
    }

    let issuerWallet = credential.issuer?.WalletAddress || credential.issuer?.walletAddress;
    if (!issuerWallet && credential.issuer) {
      const gv = await GiaoVien.findById(credential.issuer);
      if (gv) issuerWallet = gv.WalletAddress || gv.walletAddress;
    }

    let studentWallet = credential.student?.WalletAddress || credential.student?.walletAddress;
    if (!studentWallet && credential.student) {
      const hs = await HocSinh.findById(credential.student);
      if (hs) studentWallet = hs.WalletAddress || hs.walletAddress;
    }

    // DO NOT expose fullName, email, school, gpa, studentId, or submission content.
    const publicData = {
      credentialId: credential.credentialId,
      status: credential.status,
      challenge: challengeTitle || 'N/A', // Only public title
      achievementType: credential.metadata?.achievementType || 'N/A',
      issuerWallet: (issuerWallet || '').toLowerCase(),
      studentWallet: (studentWallet || '').toLowerCase(),
      issuedAt: credential.metadata?.issuedAt,
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
      const ownershipMatch = onChainData.studentWallet.toLowerCase() === (studentWallet || '').toLowerCase();
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
    let isOwner = credential.challenge.createdBy.toString() === req.user.id;
    if (!isOwner && req.user?.walletAddress) {
      const creator = await GiaoVien.findById(credential.challenge.createdBy);
      if (creator) {
        const cw = (creator.walletAddress || creator.WalletAddress || '').toLowerCase();
        if (cw && cw === req.user.walletAddress.toLowerCase()) isOwner = true;
      }
    }
    if (!isOwner && req.user?.role_id !== 'ADMIN_ROLE') {
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

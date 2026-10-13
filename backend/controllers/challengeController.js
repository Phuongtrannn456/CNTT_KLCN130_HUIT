const Challenge = require('../models/Challenge');
const GiaoVien = require('../models/GiaoVien');
const logger = require('../config/logger');

exports.createChallenge = async (req, res) => {
  try {
    const teacherId = req.user.id; 
    const { title, description, eligibleGrades, deadline, maxTeamSize, subject, challengeType, rubrics, useRubrics } = req.body;
    
    const challenge = new Challenge({
      challengeId: `CHL-${Date.now()}`,
      title,
      description,
      eligibleGrades,
      deadline,
      maxTeamSize,
      createdBy: teacherId,
      subject,
      challengeType,
      rubrics,
      useRubrics
    });
    
    await challenge.save();
    res.status(201).json({ success: true, challenge });
  } catch (error) {
    logger.error('Lỗi tạo Challenge:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find().populate('createdBy', 'fullName department');
    res.status(200).json({ success: true, challenges });
  } catch (error) {
    logger.error('Lỗi lấy danh sách Challenge:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Challenge' });
    }
    
    let isOwner = challenge.createdBy.toString() === teacherId;
    if (!isOwner && req.user?.walletAddress) {
      const creator = await GiaoVien.findById(challenge.createdBy);
      if (creator) {
        const cw = (creator.WalletAddress || '').toLowerCase();
        if (cw && cw === req.user.walletAddress.toLowerCase()) isOwner = true;
      }
    }

    if (!isOwner && req.user?.role_id !== 'ADMIN_ROLE') {
      return res.status(403).json({ success: false, message: 'Không có quyền sửa Challenge này' });
    }
    
    const updated = await Challenge.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({ success: true, challenge: updated });
  } catch (error) {
    logger.error('Lỗi cập nhật Challenge:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Challenge' });
    }
    
    let isOwner = challenge.createdBy.toString() === teacherId;
    if (!isOwner && req.user?.walletAddress) {
      const creator = await GiaoVien.findById(challenge.createdBy);
      if (creator) {
        const cw = (creator.WalletAddress || '').toLowerCase();
        if (cw && cw === req.user.walletAddress.toLowerCase()) isOwner = true;
      }
    }

    if (!isOwner && req.user?.role_id !== 'ADMIN_ROLE') {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa Challenge này' });
    }

    const ChallengeParticipation = require('../models/ChallengeParticipation');
    const participantsCount = await ChallengeParticipation.countDocuments({ challenge: id });
    if (participantsCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Không thể xóa Challenge này vì đã có ${participantsCount} học sinh tham gia. Bạn có thể cập nhật trạng thái sang 'Closed' thay vì xóa.` 
      });
    }
    
    await Challenge.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Đã xóa Challenge' });
  } catch (error) {
    logger.error('Lỗi xóa Challenge:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
exports.getChallengeById = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id).populate('createdBy', 'fullName department');
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found' });
    res.status(200).json({ success: true, challenge });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

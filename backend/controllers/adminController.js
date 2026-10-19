const User = require('../models/User');
const RoleRequest = require('../models/RoleRequest');

// Lấy danh sách tất cả tài khoản (có thể lọc theo role: guest, student, teacher, admin)
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người dùng.' });
  }
};

// Admin thay đổi vai trò (role) và cập nhật thông tin định danh cho tài khoản
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, schoolId, fullName, gradeLevel, department } = req.body;

    const validRoles = ['guest', 'student', 'teacher', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    if (role) user.role = role;
    if (schoolId) user.schoolId = schoolId;
    if (fullName) user.fullName = fullName;
    
    if (role === 'student' && gradeLevel) user.gradeLevel = gradeLevel;
    if (role === 'teacher' && department) user.department = department;

    user.profileUpdated = true;
    await user.save();

    res.json({ success: true, message: 'Cập nhật tài khoản thành công.', user });
  } catch (error) {
    console.error('updateUserRole error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật tài khoản.' });
  }
};

// Admin khoá hoặc mở khoá tài khoản
const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, message: user.isActive ? 'Đã mở khoá tài khoản.' : 'Đã khoá tài khoản.', user });
  } catch (error) {
    console.error('toggleUserActive error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thay đổi trạng thái tài khoản.' });
  }
};

// Lấy danh sách yêu cầu chờ duyệt (Pending Requests)
const getPendingRequests = async (req, res) => {
  try {
    let requests = await RoleRequest.find({ status: 'pending' }).sort({ createdAt: -1 });

    // Neu chua co request nao, tu dong sync cac user guest vao thanh request cho duyet
    if (requests.length === 0) {
      const guests = await User.find({ role: 'guest' });
      for (const g of guests) {
        const shortAddr = (g.walletAddress || '').slice(2, 8).toLowerCase();
        await RoleRequest.create({
          walletAddress: g.walletAddress,
          hoTen: `Teacher_DID#${shortAddr}`,
          email: `did_${shortAddr}@k12.did`,
          chuyenNganh: 'Tổ STEM & Tin Học',
          requestedRole: 'TEACHER_ROLE',
          schoolToken: 'STEM_TEACHER_2026',
          status: 'pending'
        });
      }
      requests = await RoleRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
    }

    res.json({ success: true, requests });
  } catch (error) {
    console.error('getPendingRequests error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách yêu cầu chờ duyệt.' });
  }
};

// Lấy lịch sử yêu cầu đã xử lý (Approved / Rejected)
const getRequestHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;

    let filter = { status: { $in: ['approved', 'rejected'] } };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { hoTen: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { walletAddress: { $regex: search, $options: 'i' } },
        { chuyenNganh: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await RoleRequest.countDocuments(filter);
    const requests = await RoleRequest.find(filter)
      .populate('reviewedBy', 'fullName HoTen hoTen')
      .sort({ reviewedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('getRequestHistory error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch sử yêu cầu.' });
  }
};

// Lấy chi tiết 1 yêu cầu
const getRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RoleRequest.findById(id).populate('reviewedBy', 'fullName HoTen hoTen');
    if (!request) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu.' });

    res.json({ success: true, request });
  } catch (error) {
    console.error('getRequestDetail error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết yêu cầu.' });
  }
};

// Admin phê duyệt yêu cầu (Approve)
const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RoleRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu.' });

    request.status = 'approved';
    request.reviewedAt = new Date();
    request.reviewedBy = req.user ? req.user.id : null;
    await request.save();

    // Nâng role cho user tương ứng
    const user = await User.findOne({ walletAddress: request.walletAddress.toLowerCase() });
    if (user) {
      user.role = 'teacher';
      user.department = request.chuyenNganh || 'Tổ STEM & Tin Học';
      await user.save();
    }

    // Phat socket thong bao neu co
    const io = req.app.get('io');
    if (io) {
      io.to(`pending:${request.walletAddress.toLowerCase()}`).emit('admin:approved', {
        walletAddress: request.walletAddress
      });
    }

    res.json({ success: true, message: 'Đã phê duyệt yêu cầu thành công.', request });
  } catch (error) {
    console.error('approveRequest error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi phê duyệt yêu cầu.' });
  }
};

// Admin từ chối yêu cầu (Reject)
const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await RoleRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu.' });

    request.status = 'rejected';
    request.rejectReason = reason || 'Thông tin xác thực chưa hợp lệ';
    request.reviewedAt = new Date();
    request.reviewedBy = req.user ? req.user.id : null;
    await request.save();

    res.json({ success: true, message: 'Đã từ chối yêu cầu.', request });
  } catch (error) {
    console.error('rejectRequest error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi từ chối yêu cầu.' });
  }
};

// Lấy danh sách Giáo viên (cho Admin Dashboard)
const getLecturers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).sort({ createdAt: -1 });
    const lecturers = teachers.map(t => ({
      _id: t._id,
      MaGV: t.schoolId || `GV_${t.walletAddress.slice(2, 8).toUpperCase()}`,
      HoTen: t.fullName || `Teacher_DID#${t.walletAddress.slice(2, 8).toLowerCase()}`,
      Email: t.email || `did_${t.walletAddress.slice(2, 8).toLowerCase()}@k12.did`,
      WalletAddress: t.walletAddress,
      ChuyenNganh: t.department || 'Tổ STEM & Tin Học',
      CreatedAt: t.createdAt
    }));

    res.json({ success: true, lecturers });
  } catch (error) {
    console.error('getLecturers error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách giáo viên.' });
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  toggleUserActive,
  getPendingRequests,
  getRequestHistory,
  getRequestDetail,
  approveRequest,
  rejectRequest,
  getLecturers
};

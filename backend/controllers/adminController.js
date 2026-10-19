const Admin = require('../models/Admin');
const RoleRequest = require('../models/RoleRequest');
const GiaoVien = require('../models/GiaoVien');
const HocSinh = require('../models/HocSinh');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const getPendingRequests = async (req, res) => {
  try {
    const requests = await RoleRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    console.error('getPendingRequests error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách yêu cầu.' });
  }
};

const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const request = await RoleRequest.findById(id);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu không tồn tại hoặc đã được xử lý.' });
    }

    // Update request
    request.status = 'approved';
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    await request.save();

    const lowerWallet = request.walletAddress.toLowerCase();

    // Check if GiaoVien already exists (Idempotent handling)
    let existingGV = await GiaoVien.findOne({ WalletAddress: lowerWallet });
    let gvId;
    let gvHoTen = request.hoTen;

    if (existingGV) {
      gvId = existingGV._id;
      gvHoTen = existingGV.HoTen;
    } else {
      // Create GiaoVien
      const newGiaoVien = new GiaoVien({
        MaGV: `GV${uuidv4().substring(0, 6).toUpperCase()}`,
        HoTen: request.hoTen,
        Email: request.email,
        ToBoMon: request.toBoMon || request.chuyenNganh || 'Giáo Dục Phổ Thông',
        ChuyenNganh: request.chuyenNganh || request.toBoMon || 'Giáo Dục Phổ Thông',
        WalletAddress: lowerWallet
      });
      await newGiaoVien.save();
      gvId = newGiaoVien._id;
      gvHoTen = newGiaoVien.HoTen;
    }

    // Dọn dẹp bản ghi HocSinh trùng ví (nếu có do auto-creation trước đó)
    await HocSinh.deleteOne({ WalletAddress: lowerWallet });

    // Generate Token
    const token = jwt.sign(
      { id: gvId, role_id: 'TEACHER_ROLE', walletAddress: lowerWallet },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Emit Socket
    const io = req.app.get('io');
    if (io) {
      io.to(`pending:${lowerWallet}`).emit('request_result', {
        success: true,
        status: 'approved',
        token,
        user: {
          id: gvId,
          walletAddress: lowerWallet,
          role_id: 'TEACHER_ROLE',
          name: gvHoTen
        }
      });
    }

    res.json({ success: true, message: 'Đã phê duyệt yêu cầu thành công.' });
  } catch (error) {
    console.error('approveRequest error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi phê duyệt yêu cầu.' });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối.' });
    }

    const request = await RoleRequest.findById(id);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu không tồn tại hoặc đã được xử lý.' });
    }

    // Update request
    request.status = 'rejected';
    request.rejectReason = reason;
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    await request.save();

    // Emit Socket
    const io = req.app.get('io');
    if (io) {
      io.to(`pending:${request.walletAddress.toLowerCase()}`).emit('request_result', {
        success: false,
        status: 'rejected',
        reason
      });
    }

    res.json({ success: true, message: 'Đã từ chối yêu cầu.' });
  } catch (error) {
    console.error('rejectRequest error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi từ chối yêu cầu.' });
  }
};

const getProcessedRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status; // 'approved' | 'rejected' | undefined (both)
    const search = req.query.search?.trim();
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    const filter = { status: { $in: ['approved', 'rejected'] } };
    if (statusFilter && ['approved', 'rejected'].includes(statusFilter)) {
      filter.status = statusFilter;
    }

    // Search by name, email or chuyenNganh
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { hoTen: searchRegex },
        { email: searchRegex },
        { chuyenNganh: searchRegex }
      ];
    }

    // Date range filter on reviewedAt
    if (fromDate || toDate) {
      filter.reviewedAt = {};
      if (fromDate) {
        filter.reviewedAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        // Set to end of day
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        filter.reviewedAt.$lte = endDate;
      }
    }

    const [requests, total] = await Promise.all([
      RoleRequest.find(filter)
        .sort({ reviewedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reviewedBy', 'HoTen')
        .lean(),
      RoleRequest.countDocuments(filter)
    ]);

    res.json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getProcessedRequests error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch sử yêu cầu.' });
  }
};

const getRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RoleRequest.findById(id)
      .populate('reviewedBy', 'HoTen')
      .lean();

    if (!request) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu.' });
    }

    res.json({ success: true, request });
  } catch (error) {
    console.error('getRequestDetail error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết yêu cầu.' });
  }
};

const getAllLecturers = async (req, res) => {
  try {
    const teachers = await GiaoVien.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, lecturers: teachers, teachers, giaoViens: teachers });
  } catch (error) {
    console.error('getAllLecturers error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách Giáo viên.' });
  }
};

// --- Quản Lý Học Sinh (K-12 Student Management & Bulk Import) ---

const generate6DigitPin = () => Math.floor(100000 + Math.random() * 900000).toString();

const getAllStudents = async (req, res) => {
  try {
    const { search, khoiLop, status } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [{ MaHS: reg }, { HoTen: reg }, { Email: reg }];
    }

    if (khoiLop && !isNaN(khoiLop) && Number(khoiLop) > 0) {
      filter.KhoiLop = Number(khoiLop);
    }

    if (status === 'activated') {
      filter.IsActivated = true;
    } else if (status === 'unactivated') {
      filter.$or = [{ IsActivated: false }, { IsActivated: { $exists: false } }];
    }

    const students = await HocSinh.find(filter).sort({ KhoiLop: 1, MaHS: 1 }).lean();

    // Thống kê tổng quan
    const totalAll = await HocSinh.countDocuments();
    const totalActivated = await HocSinh.countDocuments({ IsActivated: true });
    const totalUnactivated = totalAll - totalActivated;

    res.json({
      success: true,
      students,
      stats: {
        total: totalAll,
        activated: totalActivated,
        unactivated: totalUnactivated,
        activationRate: totalAll > 0 ? Math.round((totalActivated / totalAll) * 100) : 0
      }
    });
  } catch (error) {
    console.error('getAllStudents error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách Học sinh.' });
  }
};

const createStudent = async (req, res) => {
  try {
    const { maHS, hoTen, khoiLop, email } = req.body;
    if (!maHS || !hoTen) {
      return res.status(400).json({ success: false, message: 'Mã học sinh và Họ tên là bắt buộc.' });
    }

    const cleanMaHS = maHS.trim().toUpperCase();
    const exist = await HocSinh.findOne({ MaHS: { $regex: new RegExp(`^${cleanMaHS}$`, 'i') } });
    if (exist) {
      return res.status(400).json({ success: false, message: `Mã học sinh ${cleanMaHS} đã tồn tại trong hệ thống.` });
    }

    const pin = generate6DigitPin();
    const cleanEmail = (email && email.trim()) ? email.trim() : `${cleanMaHS.toLowerCase()}@school.edu.vn`;
    const dummyWallet = `0x0000000000000000000000000000000000000000_${cleanMaHS.toLowerCase()}`;

    const newStudent = new HocSinh({
      MaHS: cleanMaHS,
      HoTen: hoTen.trim(),
      KhoiLop: khoiLop ? Number(khoiLop) : 10,
      Email: cleanEmail,
      WalletAddress: dummyWallet,
      ActivationPin: pin,
      IsActivated: false,
      DaCapNhatHoSo: false
    });

    await newStudent.save();
    res.status(201).json({
      success: true,
      message: `Đã tạo học sinh ${cleanMaHS} thành công. Mã PIN kích hoạt: ${pin}`,
      student: newStudent
    });
  } catch (error) {
    console.error('createStudent error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thêm học sinh: ' + error.message });
  }
};

const bulkImportStudents = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách học sinh không hợp lệ hoặc rỗng.' });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];
    const results = [];

    for (let i = 0; i < students.length; i++) {
      const item = students[i];
      const rawMaHS = item.maHS || item.MaHS || item['Mã HS'] || item['Mã Học Sinh'] || item.studentId;
      const rawHoTen = item.hoTen || item.HoTen || item['Họ và Tên'] || item['Họ Tên'] || item.fullName;
      const rawKhoiLop = item.khoiLop || item.KhoiLop || item['Khối Lớp'] || item['Lớp'] || item.grade;
      const rawEmail = item.email || item.Email || item['Email'];

      if (!rawMaHS || !rawHoTen) {
        errors.push(`Dòng ${i + 1}: Thiếu Mã HS hoặc Họ Tên.`);
        continue;
      }

      const cleanMaHS = String(rawMaHS).trim().toUpperCase();
      const cleanHoTen = String(rawHoTen).trim();
      const parsedKhoi = parseInt(rawKhoiLop, 10) || 10;
      const cleanEmail = rawEmail ? String(rawEmail).trim() : `${cleanMaHS.toLowerCase()}@school.edu.vn`;

      let student = await HocSinh.findOne({ MaHS: { $regex: new RegExp(`^${cleanMaHS}$`, 'i') } });

      if (student) {
        student.HoTen = cleanHoTen;
        student.KhoiLop = parsedKhoi;
        if (!student.IsActivated) {
          if (!student.ActivationPin) student.ActivationPin = generate6DigitPin();
        }
        await student.save();
        updatedCount++;
        results.push({ maHS: cleanMaHS, hoTen: cleanHoTen, pin: student.ActivationPin, isActivated: student.IsActivated, status: 'updated' });
      } else {
        const pin = generate6DigitPin();
        const dummyWallet = `0x0000000000000000000000000000000000000000_${cleanMaHS.toLowerCase()}`;
        student = new HocSinh({
          MaHS: cleanMaHS,
          HoTen: cleanHoTen,
          KhoiLop: parsedKhoi,
          Email: cleanEmail,
          WalletAddress: dummyWallet,
          ActivationPin: pin,
          IsActivated: false,
          DaCapNhatHoSo: false
        });
        await student.save();
        createdCount++;
        results.push({ maHS: cleanMaHS, hoTen: cleanHoTen, pin, isActivated: false, status: 'created' });
      }
    }

    res.json({
      success: true,
      message: `Import hoàn tất: ${createdCount} học sinh mới, ${updatedCount} học sinh cập nhật.`,
      stats: {
        total: students.length,
        created: createdCount,
        updated: updatedCount,
        errorCount: errors.length
      },
      errors,
      results
    });
  } catch (error) {
    console.error('bulkImportStudents error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi import học sinh: ' + error.message });
  }
};

const resetStudentPin = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await HocSinh.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh.' });
    }

    const newPin = generate6DigitPin();
    const dummyWallet = `0x0000000000000000000000000000000000000000_${student.MaHS.toLowerCase()}`;

    student.WalletAddress = dummyWallet;
    student.ActivationPin = newPin;
    student.IsActivated = false;
    student.ActivatedAt = null;
    student.DaCapNhatHoSo = false;
    await student.save();

    res.json({
      success: true,
      message: `Đã mở khóa ví & cấp lại mã PIN mới cho học sinh ${student.HoTen} (${student.MaHS}) thành công!`,
      newPin,
      student
    });
  } catch (error) {
    console.error('resetStudentPin error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi reset mã PIN học sinh.' });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await HocSinh.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh.' });
    }
    res.json({ success: true, message: `Đã xóa học sinh ${student.HoTen} (${student.MaHS}) khỏi hệ thống.` });
  } catch (error) {
    console.error('deleteStudent error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa học sinh.' });
  }
};

// --- Quản Lý Giáo Viên (K-12 Teacher Management) ---

const createTeacher = async (req, res) => {
  try {
    const { maGV, hoTen, toBoMon, chuyenNganh, email } = req.body;
    if (!maGV || !hoTen) {
      return res.status(400).json({ success: false, message: 'Mã giáo viên và Họ tên là bắt buộc.' });
    }

    const cleanMaGV = maGV.trim().toUpperCase();
    const exist = await GiaoVien.findOne({ MaGV: { $regex: new RegExp(`^${cleanMaGV}$`, 'i') } });
    if (exist) {
      return res.status(400).json({ success: false, message: `Mã giáo viên ${cleanMaGV} đã tồn tại trong hệ thống.` });
    }

    const pin = generate6DigitPin();
    const cleanEmail = (email && email.trim()) ? email.trim() : `${cleanMaGV.toLowerCase()}@school.edu.vn`;
    const dummyWallet = `0x0000000000000000000000000000000000000000_${cleanMaGV.toLowerCase()}`;

    const newTeacher = new GiaoVien({
      MaGV: cleanMaGV,
      HoTen: hoTen.trim(),
      ToBoMon: toBoMon || chuyenNganh || 'Bộ Môn STEM / K-12',
      ChuyenNganh: chuyenNganh || toBoMon || 'Bộ Môn STEM / K-12',
      Email: cleanEmail,
      WalletAddress: dummyWallet,
      ActivationPin: pin,
      IsActivated: false,
      IsActive: true
    });

    await newTeacher.save();
    res.status(201).json({
      success: true,
      message: `Đã thêm giáo viên ${cleanMaGV} thành công. Mã PIN kích hoạt: ${pin}`,
      teacher: newTeacher
    });
  } catch (error) {
    console.error('createTeacher error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thêm giáo viên: ' + error.message });
  }
};

const resetTeacherPin = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await GiaoVien.findById(id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giáo viên.' });
    }

    const newPin = generate6DigitPin();
    const dummyWallet = `0x0000000000000000000000000000000000000000_${teacher.MaGV.toLowerCase()}`;

    teacher.WalletAddress = dummyWallet;
    teacher.ActivationPin = newPin;
    teacher.IsActivated = false;
    teacher.ActivatedAt = null;
    await teacher.save();

    res.json({
      success: true,
      message: `Đã mở khóa ví & cấp lại mã PIN mới cho giáo viên ${teacher.HoTen} (${teacher.MaGV}) thành công!`,
      newPin,
      teacher
    });
  } catch (error) {
    console.error('resetTeacherPin error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi reset mã PIN giáo viên.' });
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await GiaoVien.findByIdAndDelete(id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giáo viên.' });
    }
    res.json({ success: true, message: `Đã xóa giáo viên ${teacher.HoTen} (${teacher.MaGV}) khỏi hệ thống.` });
  } catch (error) {
    console.error('deleteTeacher error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa giáo viên.' });
  }
};

const bulkImportTeachers = async (req, res) => {
  try {
    const { teachers } = req.body;
    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách giáo viên không hợp lệ hoặc rỗng.' });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];
    const results = [];

    for (let i = 0; i < teachers.length; i++) {
      const item = teachers[i];
      const rawMaGV = item.maGV || item.MaGV || item['Mã GV'] || item['Mã Giáo Viên'];
      const rawHoTen = item.hoTen || item.HoTen || item['Họ và Tên'] || item['Họ Tên'];
      const rawToBoMon = item.toBoMon || item.ToBoMon || item['Tổ Bộ Môn'] || item['Bộ Môn'] || 'Bộ Môn K-12';
      const rawEmail = item.email || item.Email || item['Email'];

      if (!rawMaGV || !rawHoTen) {
        errors.push(`Dòng ${i + 1}: Thiếu Mã GV hoặc Họ Tên.`);
        continue;
      }

      const cleanMaGV = String(rawMaGV).trim().toUpperCase();
      const cleanHoTen = String(rawHoTen).trim();
      const cleanEmail = rawEmail ? String(rawEmail).trim() : `${cleanMaGV.toLowerCase()}@school.edu.vn`;

      let teacher = await GiaoVien.findOne({ MaGV: { $regex: new RegExp(`^${cleanMaGV}$`, 'i') } });

      if (teacher) {
        teacher.HoTen = cleanHoTen;
        teacher.ToBoMon = rawToBoMon;
        if (!teacher.IsActivated) {
          if (!teacher.ActivationPin) teacher.ActivationPin = generate6DigitPin();
        }
        await teacher.save();
        updatedCount++;
        results.push({ maGV: cleanMaGV, hoTen: cleanHoTen, pin: teacher.ActivationPin, isActivated: teacher.IsActivated, status: 'updated' });
      } else {
        const pin = generate6DigitPin();
        const dummyWallet = `0x0000000000000000000000000000000000000000_${cleanMaGV.toLowerCase()}`;
        teacher = new GiaoVien({
          MaGV: cleanMaGV,
          HoTen: cleanHoTen,
          ToBoMon: rawToBoMon,
          ChuyenNganh: rawToBoMon,
          Email: cleanEmail,
          WalletAddress: dummyWallet,
          ActivationPin: pin,
          IsActivated: false,
          IsActive: true
        });
        await teacher.save();
        createdCount++;
        results.push({ maGV: cleanMaGV, hoTen: cleanHoTen, pin, isActivated: false, status: 'created' });
      }
    }

    res.json({
      success: true,
      message: `Import hoàn tất: ${createdCount} giáo viên mới, ${updatedCount} giáo viên cập nhật.`,
      stats: { total: teachers.length, created: createdCount, updated: updatedCount, errorCount: errors.length },
      errors,
      results
    });
  } catch (error) {
    console.error('bulkImportTeachers error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi import giáo viên: ' + error.message });
  }
};

module.exports = {
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getProcessedRequests,
  getRequestDetail,
  getAllLecturers,
  getAllGiaoVien: getAllLecturers,
  getAllStudents,
  createStudent,
  bulkImportStudents,
  resetStudentPin,
  deleteStudent,
  createTeacher,
  resetTeacherPin,
  deleteTeacher,
  bulkImportTeachers
};

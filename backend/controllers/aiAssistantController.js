const axios = require('axios');
const HocSinh = require('../models/HocSinh');
const GiaoVien = require('../models/GiaoVien');
const Nhom = require('../models/Nhom');
const DangKyDeTai = require('../models/DangKyDeTai');
const DeTai = require('../models/DeTai');
const KetQuaTest = require('../models/KetQuaTest');
const BaiTest = require('../models/BaiTest');
const MonHoc = require('../models/MonHoc');
const LopHoc = require('../models/LopHoc');
const deTaiController = require('./deTaiController');
const logger = require('../config/logger');

/**
 * Danh sách công cụ (Function Declarations) dành riêng cho Giáo viên (TEACHER_ROLE)
 * Cho phép AI tự động thực hiện Thêm / Sửa / Xóa Đề tài STEM và Bài test đầu vào
 */
const TEACHER_TOOLS = [
  {
    name: 'createTopic',
    description: 'Tạo một đề tài nghiên cứu khoa học STEM K-12 mới do Giáo viên hướng dẫn.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tenDeTai: { type: 'STRING', description: 'Tên đề tài STEM đầy đủ' },
        moTa: { type: 'STRING', description: 'Mô tả tóm tắt nội dung đề tài' },
        moTaChiTiet: { type: 'STRING', description: 'Mô tả chi tiết mục tiêu, giải pháp và kết quả dự kiến' },
        yeuCau: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Danh sách các yêu cầu kỹ thuật hoặc kiến thức đối với học sinh'
        },
        soLuongHocSinh: { type: 'INTEGER', description: 'Số lượng học sinh tối đa mỗi nhóm (mặc định 3)' },
        deadlineDays: { type: 'INTEGER', description: 'Số ngày từ lúc tạo đến hạn nộp báo cáo (mặc định 60)' },
        khoiLop: {
          type: 'ARRAY',
          items: { type: 'INTEGER' },
          description: 'Các khối lớp phù hợp (VD: [10, 11, 12])'
        }
      },
      required: ['tenDeTai']
    }
  },
  {
    name: 'updateTopic',
    description: 'Cập nhật thông tin, mô tả, hạn chót, số lượng học sinh hoặc trạng thái của một đề tài STEM đang có do Giáo viên quản lý.',
    parameters: {
      type: 'OBJECT',
      properties: {
        identifier: { type: 'STRING', description: 'Mã đề tài (VD: STEM_123456) hoặc tên đề tài cần sửa' },
        tenDeTai: { type: 'STRING', description: 'Tên mới của đề tài (nếu muốn đổi)' },
        moTa: { type: 'STRING', description: 'Mô tả tóm tắt mới' },
        moTaChiTiet: { type: 'STRING', description: 'Mô tả chi tiết mới' },
        soLuongHocSinh: { type: 'INTEGER', description: 'Số lượng học sinh tối đa cho mỗi nhóm' },
        deadline: { type: 'STRING', description: 'Thời hạn hoàn thành đề tài định dạng YYYY-MM-DD' },
        yeuCau: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Danh sách các yêu cầu kiến thức/kỹ năng'
        },
        trangThai: {
          type: 'STRING',
          enum: ['MoDangKy', 'DaChot', 'HoanThanh'],
          description: 'Trạng thái đề tài: MoDangKy (mở tiếp nhận), DaChot (đã đủ nhóm), HoanThanh (kết thúc)'
        }
      },
      required: ['identifier']
    }
  },
  {
    name: 'deleteTopic',
    description: 'Xóa hoặc đóng đề tài STEM do Giáo viên quản lý.',
    parameters: {
      type: 'OBJECT',
      properties: {
        identifier: { type: 'STRING', description: 'Mã đề tài hoặc tên đề tài cần xóa' }
      },
      required: ['identifier']
    }
  },
  {
    name: 'createEntranceTest',
    description: 'Tạo bài test cạnh tranh đầu vào (trắc nghiệm và code) cho một đề tài STEM.',
    parameters: {
      type: 'OBJECT',
      properties: {
        identifier: { type: 'STRING', description: 'Mã đề tài hoặc tên đề tài cần gán bài test' },
        tieuDe: { type: 'STRING', description: 'Tiêu đề bài kiểm tra' },
        thoiGianLam: { type: 'INTEGER', description: 'Thời gian làm bài tính bằng phút (mặc định 30)' },
        nguongDat: { type: 'INTEGER', description: 'Ngưỡng điểm đạt % để tự động duyệt hồ sơ (mặc định 75)' },
        cauHoi: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              loaiCauHoi: { type: 'STRING', enum: ['TracNghiem', 'Code'], description: 'Loại câu hỏi' },
              noiDung: { type: 'STRING', description: 'Nội dung câu hỏi' },
              luaChon: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description: 'Danh sách 4 phương án cho trắc nghiệm (VD: ["A. ...", "B. ..."])'
              },
              dapAnDung: { type: 'STRING', description: 'Đáp án đúng: A, B, C hoặc D' },
              ngonNgu: { type: 'STRING', description: 'Ngôn ngữ lập trình (VD: python)' },
              dapAnMau: { type: 'STRING', description: 'Mã nguồn mẫu đáp án' },
              diem: { type: 'NUMBER', description: 'Điểm số câu này' }
            },
            required: ['loaiCauHoi', 'noiDung']
          },
          description: 'Danh sách câu hỏi trắc nghiệm hoặc lập trình'
        }
      },
      required: ['identifier', 'tieuDe']
    }
  },
  {
    name: 'deleteEntranceTest',
    description: 'Xóa bài test đầu vào của một đề tài STEM.',
    parameters: {
      type: 'OBJECT',
      properties: {
        identifier: { type: 'STRING', description: 'Mã đề tài hoặc tên đề tài cần xóa bài test' }
      },
      required: ['identifier']
    }
  }
];

async function findTopicForUser(identifier, user) {
  const matchIdentifier = {
    $or: [
      { MaDeTai: identifier.trim() },
      { TenDeTai: { $regex: new RegExp(identifier.trim(), 'i') } }
    ]
  };
  if (user.role === 'ADMIN_ROLE') {
    return await DeTai.findOne(matchIdentifier);
  }
  return await DeTai.findOne({
    $and: [
      { $or: [{ GiaoVienHuongDan: user.id }, { GiaoVien: user.id }] },
      matchIdentifier
    ]
  });
}

/**
 * Thực thi công cụ CRUD khi Gemini kích hoạt Function Call cho Giáo viên
 */
async function executeTeacherTool(toolName, args, user) {
  logger.info(`[AI Assistant] Executing Teacher Tool: ${toolName} with args: ${JSON.stringify(args)} by user ${user.id}`);

  if (toolName === 'createTopic') {
    const { tenDeTai, moTa, moTaChiTiet, yeuCau, soLuongHocSinh, deadlineDays = 60, khoiLop } = args;
    if (!tenDeTai || !tenDeTai.trim()) {
      throw new Error('Tên đề tài không được để trống.');
    }

    const maDeTai = `STEM_${Date.now().toString().slice(-6)}`;
    const deadline = new Date(Date.now() + (deadlineDays || 60) * 24 * 60 * 60 * 1000);
    const reqList = Array.isArray(yeuCau) && yeuCau.length > 0
      ? yeuCau
      : (yeuCau ? [yeuCau] : ['Nắm vững kiến thức khoa học K-12', 'Kỹ năng làm việc nhóm & nghiên cứu']);
    const grades = Array.isArray(khoiLop) && khoiLop.length > 0 ? khoiLop : [10, 11, 12];

    let gvId = user.id;
    const gvDoc = await GiaoVien.findById(user.id);
    if (!gvDoc) {
      const firstGv = await GiaoVien.findOne();
      if (firstGv) gvId = firstGv._id;
    }

    const teacherClasses = await LopHoc.find({ GiaoVien: gvId }).select('_id MonHoc');
    const lopHocIds = teacherClasses.map(c => c._id);
    const defaultMonHoc = teacherClasses.find(c => c.MonHoc)?.MonHoc || undefined;

    const newTopic = await DeTai.create({
      MaDeTai: maDeTai,
      TenDeTai: tenDeTai.trim(),
      MoTa: moTa || 'Dự án nghiên cứu khoa học kỹ thuật STEM chuẩn K-12',
      MoTaChiTiet: moTaChiTiet || moTa || '',
      YeuCau: reqList,
      SoLuongHocSinh: soLuongHocSinh || 3,
      Deadline: deadline,
      HanDangKy: deadline,
      GiaoVienHuongDan: gvId,
      LopHoc: lopHocIds,
      ...(defaultMonHoc && { MonHoc: defaultMonHoc }),
      TrangThai: 'MoDangKy',
      LoaiDeTai: 'DU_AN_STEM',
      KhoiLopYeuCau: grades
    });

    if (deTaiController.invalidateDeTaiCache) {
      deTaiController.invalidateDeTaiCache();
    }

    return `**Đã tạo thành công đề tài STEM mới!**\n\n` +
      `* **Tên đề tài:** **${newTopic.TenDeTai}**\n` +
      `* **Mã đề tài:** \`${newTopic.MaDeTai}\`\n` +
      `* **Trạng thái:** Mở đăng ký\n` +
      `* **Số lượng học sinh tối đa:** ${newTopic.SoLuongHocSinh} học sinh/nhóm\n` +
      `* **Thời hạn hoàn thành:** ${new Date(newTopic.Deadline).toLocaleDateString('vi-VN')}\n` +
      `* **Mô tả:** ${newTopic.MoTa}\n\n` +
      `Thầy/Cô có thể vào [Quản Lý Đề Tài](/teacher/topics) để xem hoặc tạo thêm Bài test đầu vào cho đề tài này.`;
  }

  if (toolName === 'updateTopic') {
    const { identifier, tenDeTai, moTa, moTaChiTiet, soLuongHocSinh, deadline, yeuCau, trangThai } = args;
    if (!identifier) throw new Error('Vui lòng chỉ định Mã đề tài hoặc Tên đề tài cần sửa.');

    const topic = await findTopicForUser(identifier, user);

    if (!topic) {
      throw new Error(`Không tìm thấy đề tài nào khớp với "${identifier}".`);
    }

    if (tenDeTai && tenDeTai.trim()) topic.TenDeTai = tenDeTai.trim();
    if (moTa !== undefined) topic.MoTa = moTa;
    if (moTaChiTiet !== undefined) topic.MoTaChiTiet = moTaChiTiet;
    if (soLuongHocSinh) topic.SoLuongHocSinh = Number(soLuongHocSinh);
    if (deadline) topic.Deadline = new Date(deadline);
    if (yeuCau) {
      topic.YeuCau = Array.isArray(yeuCau) ? yeuCau : [yeuCau];
    }
    if (trangThai && ['MoDangKy', 'DaChot', 'HoanThanh'].includes(trangThai)) {
      topic.TrangThai = trangThai;
    }
    await topic.save();
    if (deTaiController.invalidateDeTaiCache) {
      deTaiController.invalidateDeTaiCache();
    }

    return `**Đã cập nhật thông tin đề tài thành công!**\n\n` +
      `* **Tên đề tài:** **${topic.TenDeTai}**\n` +
      `* **Mã đề tài:** \`${topic.MaDeTai}\`\n` +
      `* **Trạng thái hiện tại:** **${topic.TrangThai}**\n` +
      `* **Số lượng học sinh tối đa:** ${topic.SoLuongHocSinh} học sinh/nhóm\n` +
      `* **Hạn hoàn thành:** ${new Date(topic.Deadline).toLocaleDateString('vi-VN')}\n` +
      `* **Mô tả cập nhật:** ${topic.MoTa}\n\n` +
      `[Xem Trang Quản Lý Đề Tài](/teacher/topics)`;
  }

  if (toolName === 'deleteTopic') {
    const { identifier } = args;
    if (!identifier) throw new Error('Vui lòng chỉ định Mã đề tài hoặc Tên đề tài cần xóa.');

    const topic = await findTopicForUser(identifier, user);

    if (!topic) {
      throw new Error(`Không tìm thấy đề tài nào khớp với "${identifier}".`);
    }

    // Kiểm tra an toàn: ngăn xóa nếu đã có học sinh đăng ký tham gia
    const regCount = await DangKyDeTai.countDocuments({ DeTai: topic._id });
    if (regCount > 0) {
      return `[Cảnh báo an toàn] Đề tài "${topic.TenDeTai}" (\`${topic.MaDeTai}\`) hiện đã có **${regCount} nhóm học sinh đăng ký tham gia**.\n\n` +
        `Để bảo toàn dữ liệu học tập và hồ sơ của học sinh, hệ thống không thể xóa vĩnh viễn đề tài này. Thầy/Cô chỉ có thể chỉnh sửa thông tin mô tả/yêu cầu hoặc liên hệ học sinh hủy đăng ký trước khi xóa.`;
    }

    await BaiTest.deleteMany({ DeTai: topic._id });
    await DeTai.deleteOne({ _id: topic._id });
    if (deTaiController.invalidateDeTaiCache) {
      deTaiController.invalidateDeTaiCache();
    }

    return `**Đã xóa thành công đề tài:** **${topic.TenDeTai}** (\`${topic.MaDeTai}\`) cùng toàn bộ bài test liên quan.`;
  }

  if (toolName === 'createEntranceTest') {
    const { identifier, tieuDe, thoiGianLam = 30, nguongDat = 75, cauHoi = [] } = args;
    if (!identifier) throw new Error('Vui lòng chỉ định Mã đề tài hoặc Tên đề tài muốn gán bài test.');

    const topic = await findTopicForUser(identifier, user);

    if (!topic) {
      throw new Error(`Không tìm thấy đề tài nào khớp với "${identifier}".`);
    }

    let formattedQuestions = [];
    if (Array.isArray(cauHoi) && cauHoi.length > 0) {
      formattedQuestions = cauHoi.map((q, idx) => ({
        LoaiCauHoi: q.loaiCauHoi === 'Code' ? 'Code' : 'TracNghiem',
        NoiDung: q.noiDung || `Câu hỏi ${idx + 1}`,
        LuaChon: Array.isArray(q.luaChon) && q.luaChon.length > 0
          ? q.luaChon
          : ['A. Đúng', 'B. Sai', 'C. Có thể', 'D. Không xác định'],
        DapAnDung: (q.dapAnDung || 'A').toUpperCase(),
        NgonNgu: q.ngonNgu || 'python',
        DapAnMau: q.dapAnMau || '',
        Diem: q.diem || (q.loaiCauHoi === 'Code' ? 5 : 2)
      }));
    } else {
      formattedQuestions = [
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: `Nguyên lý khoa học cốt lõi nào sau đây được ứng dụng trong đề tài "${topic.TenDeTai}"?`,
          LuaChon: [
            'A. Tuân thủ phương pháp nghiên cứu thực nghiệm định lượng',
            'B. Phỏng đoán không qua kiểm chứng',
            'C. Bỏ qua các yếu tố sai số đo đạc',
            'D. Tùy ý thay đổi dữ liệu kết quả'
          ],
          DapAnDung: 'A',
          Diem: 5
        },
        {
          LoaiCauHoi: 'Code',
          NoiDung: 'Viết hàm Python tính toán hoặc xử lý tín hiệu cảm biến IoT cho dự án.',
          NgonNgu: 'python',
          DapAnMau: 'def xu_ly_tin_hieu(val):\n    return round(val * 1.02, 2)',
          Diem: 5
        }
      ];
    }

    let test = await BaiTest.findOne({ DeTai: topic._id });
    if (test) {
      test.TieuDe = tieuDe || test.TieuDe;
      test.ThoiGianLam = thoiGianLam || test.ThoiGianLam;
      test.NguongDat = nguongDat || test.NguongDat;
      test.CauHoi = formattedQuestions;
      test.TrangThai = 'MoNop';
      await test.save();
    } else {
      test = await BaiTest.create({
        DeTai: topic._id,
        TieuDe: tieuDe || `Đánh giá năng lực đầu vào - ${topic.TenDeTai}`,
        MoTa: `Bài test năng lực trực tuyến 1 màn hình cho đề tài ${topic.TenDeTai}.`,
        CauHoi: formattedQuestions,
        ThoiGianLam: thoiGianLam || 30,
        NguongDat: nguongDat || 75,
        TrangThai: 'MoNop'
      });
    }

    topic.CoBaiTest = true;
    await topic.save();

    return `**Đã tạo/cập nhật Bài test đầu vào thành công!**\n\n` +
      `* **Đề tài áp dụng:** **${topic.TenDeTai}** (\`${topic.MaDeTai}\`)\n` +
      `* **Tiêu đề bài test:** **${test.TieuDe}**\n` +
      `* **Số lượng câu hỏi:** ${test.CauHoi.length} câu (Gồm Trắc nghiệm & Lập trình)\n` +
      `* **Thời gian làm bài:** ${test.ThoiGianLam} phút\n` +
      `* **Ngưỡng điểm đạt:** ≥ ${test.NguongDat}%\n` +
      `* **Chế độ phòng thi:** Giám sát AI 1 màn hình duy nhất chống gian lận\n\n` +
      `[Kiểm Tra Bài Test Trong Quản Lý Đề Tài](/teacher/topics)`;
  }

  if (toolName === 'deleteEntranceTest') {
    const { identifier } = args;
    if (!identifier) throw new Error('Vui lòng chỉ định Mã đề tài hoặc Tên đề tài cần xóa bài test.');

    const topic = await findTopicForUser(identifier, user);

    if (!topic) {
      throw new Error(`Không tìm thấy đề tài nào khớp với "${identifier}".`);
    }

    await BaiTest.deleteMany({ DeTai: topic._id });
    topic.CoBaiTest = false;
    await topic.save();

    return `**Đã gỡ bỏ bài test đầu vào của đề tài:** **${topic.TenDeTai}** (\`${topic.MaDeTai}\`). Học sinh đăng ký sẽ không cần làm bài test cạnh tranh.`;
  }

  throw new Error(`Công cụ "${toolName}" không được hỗ trợ.`);
}

/**
 * Intelligent Role-Based K-12 Educational Copilot Engine
 * 100% powered by Google Gemini API with Function Calling & Guardrails
 */
exports.chatWithAssistant = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const user = req.user;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống.' });
    }

    const cleanMsg = message.trim();
    const role = user.role_id;
    let userInfo = { name: 'Người dùng', role: role, id: user.id };
    let liveContext = {};

    if (role === 'STUDENT_ROLE') {
      // 1. Kiểm tra nếu HS đang trong phòng thi -> KHÓA NGAY CHỐNG GIAN LẬN
      const inTest = await DangKyDeTai.findOne({
        $or: [{ HocSinh: user.id }, { TruongNhom: user.id }],
        TrangThai: 'DangLamTest'
      });
      if (inTest) {
        return res.status(403).json({
          success: false,
          reply: '[CANH BAO BAO MAT]: Ban dang trong thoi gian lam bai thi kiem tra. Tro ly AI bi khoa hoan toan nham dam bao tinh cong bang va chong gian lan.',
          inExam: true
        });
      }

      // 2. Tra cứu thông tin cá nhân học sinh
      const hs = await HocSinh.findById(user.id);
      if (hs) {
        userInfo = {
          id: user.id,
          name: hs.HoTen || hs.fullName || 'Học sinh',
          role: 'STUDENT_ROLE',
          grade: hs.KhoiLop || 11,
          school: hs.TruongHoc || 'THPT',
          wallet: hs.walletAddress || hs.ViBlockchain
        };
      }

      // 3. Tra cứu nhóm học sinh tham gia
      const myNhom = await Nhom.findOne({
        $or: [{ TruongNhom: user.id }, { 'ThanhVien.HocSinh': user.id }]
      }).populate('TruongNhom', 'HoTen Email').populate('ThanhVien.HocSinh', 'HoTen Email');

      // 4. Tra cứu đăng ký đề tài
      const myDangKy = await DangKyDeTai.findOne({
        $or: [{ HocSinh: user.id }, { TruongNhom: user.id }, { Nhom: myNhom?._id }]
      }).populate('DeTai').sort({ createdAt: -1 });

      // 5. Tra cứu kết quả thi gần nhất
      const myTestResult = await KetQuaTest.findOne({
        HocSinh: user.id
      }).populate('BaiTest', 'TieuDe ThoiGianLam NguongDat').sort({ createdAt: -1 });

      // 6. Danh sách đề tài đang mở
      const openTopics = await DeTai.find({
        TrangThai: 'MoDangKy'
      }).limit(5).select('TenDeTai MaDeTai MoTa MonHoc').populate('MonHoc', 'TenMonHoc');

      liveContext = { myNhom, myDangKy, myTestResult, openTopics };

    } else if (role === 'TEACHER_ROLE') {
      const gv = await GiaoVien.findById(user.id);
      if (gv) {
        userInfo = {
          id: user.id,
          name: gv.HoTen || gv.fullName || 'Thầy/Cô',
          role: 'TEACHER_ROLE',
          department: gv.ToBoMon || 'Khoa học tự nhiên & Công nghệ'
        };
      }

      // Tra cứu đề tài giáo viên quản lý
      const myTopics = await DeTai.find({
        $or: [{ GiaoVienHuongDan: user.id }, { GiaoVien: user.id }]
      }).select('TenDeTai MaDeTai TrangThai CoBaiTest SoLuongHocSinh Deadline');
      const topicIds = myTopics.map(t => t._id);

      const totalRegistrations = await DangKyDeTai.countDocuments({ DeTai: { $in: topicIds } });
      const approvedRegistrations = await DangKyDeTai.countDocuments({ DeTai: { $in: topicIds }, TrangThai: 'DaDuyet' });
      const pendingRegistrations = await DangKyDeTai.countDocuments({ DeTai: { $in: topicIds }, TrangThai: { $in: ['ChoDuyet', 'ChoTest', 'DangLamTest'] } });

      const recentResults = await KetQuaTest.find({ DeTai: { $in: topicIds } })
        .populate('HocSinh', 'HoTen MaHS')
        .populate('DeTai', 'TenDeTai')
        .sort({ createdAt: -1 })
        .limit(8);

      const violations = await KetQuaTest.find({
        DeTai: { $in: topicIds },
        $or: [{ BiHuyKetQua: true }, { AI_CheatScore: { $gte: 50 } }, { SoLanThoatFullscreen: { $gte: 1 } }, { SoLanChuyenTab: { $gte: 1 } }]
      }).populate('HocSinh', 'HoTen MaHS').populate('DeTai', 'TenDeTai').sort({ createdAt: -1 }).limit(10);

      liveContext = { myTopics, totalRegistrations, approvedRegistrations, pendingRegistrations, recentResults, violations };
    }

    // Gọi Google Gemini API 100%
    const canManage = role === 'TEACHER_ROLE' || role === 'ADMIN_ROLE';
    const aiResult = await callGeminiApi({
      prompt: cleanMsg,
      user: userInfo,
      liveContext,
      history,
      isTeacher: canManage
    });

    return res.status(200).json({
      success: true,
      reply: aiResult.reply,
      provider: aiResult.provider || 'GEMINI_AI',
      model: aiResult.model,
      toolCall: aiResult.toolCall || null,
      userRole: role,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error(`[AI Assistant] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      reply: `Không thể kết nối với Trợ lý AI: ${error.message}`,
      message: error.message
    });
  }
};

/**
 * Gọi Jev AI hoặc Google Gemini API với hệ thống Prompt phân quyền theo Role & Function Calling
 */
async function callGeminiApi({ prompt, user, liveContext, history, isTeacher }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const jevApiKey = process.env.JEV_AI_API_KEY;
  if ((!apiKey || !apiKey.trim() || apiKey.trim() === 'YOUR_GEMINI_API_KEY_HERE') && (!jevApiKey || !jevApiKey.trim())) {
    throw new Error('Chưa cấu hình JEV_AI_API_KEY hoặc GEMINI_API_KEY trong file backend/.env. Vui lòng thêm API Key để sử dụng tính năng Chatbox AI.');
  }

  // Danh sách candidate models tự động fallback khi gặp tải cao 503
  const candidateModels = [
    process.env.GEMINI_MODEL,
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash'
  ].filter(Boolean);

  // Chuẩn bị dữ liệu ngữ cảnh thực tế từ Database
  let contextInfo = `[DỮ LIỆU THỰC TẾ HỆ THỐNG KLCN130]:\n- Người dùng: ${user.name || 'Người dùng'} (Vai trò: ${user.role === 'STUDENT_ROLE' ? 'Học sinh K-12' : user.role === 'TEACHER_ROLE' ? 'Giáo viên K-12' : user.role})\n`;

  if (user.role === 'STUDENT_ROLE') {
    contextInfo += `- Trường: ${user.school || 'THPT'}, Khối: ${user.grade || 11}\n`;
    if (liveContext.myNhom) {
      const n = liveContext.myNhom;
      const isLeader = String(n.TruongNhom?._id || n.TruongNhom) === String(user.id);
      const memberNames = (n.ThanhVien || []).map(m => m.HocSinh?.HoTen || 'Thành viên').join(', ');
      contextInfo += `- Nhóm nghiên cứu: "${n.TenNhom || 'Nhóm STEM'}" | Trưởng nhóm: ${n.TruongNhom?.HoTen || 'N/A'} (${isLeader ? 'chính là bạn' : 'bạn là thành viên'}) | Đã chốt danh sách: ${n.DaChot ? 'Có' : 'Chưa'} | Thành viên: ${memberNames}\n`;
    } else {
      contextInfo += `- Nhóm: Hiện tại chưa tham gia nhóm nào.\n`;
    }

    if (liveContext.myDangKy) {
      const dk = liveContext.myDangKy;
      contextInfo += `- Đề tài đã đăng ký: "${dk.DeTai?.TenDeTai || 'Đề tài STEM'}" (Mã: ${dk.DeTai?.MaDeTai || 'N/A'}, Trạng thái duyệt: ${dk.TrangThai})\n`;
    } else {
      contextInfo += `- Đề tài đã đăng ký: Chưa đăng ký đề tài nào.\n`;
    }

    if (liveContext.myTestResult) {
      const tr = liveContext.myTestResult;
      contextInfo += `- Kết quả test đầu vào: ${tr.TongDiem}/${tr.DiemToiDa} điểm | Vi phạm/Hủy bài: ${tr.BiHuyKetQua ? 'BỊ HỦY DO VI PHẠM' : 'Hợp lệ'} | Chỉ số AI Cheat: ${tr.AI_CheatScore || 0}%\n`;
    }

    if (liveContext.openTopics && liveContext.openTopics.length > 0) {
      const topics = liveContext.openTopics.map(t => `"${t.TenDeTai}" (Mã: ${t.MaDeTai || 'STEM'})`).join('; ');
      contextInfo += `- Đề tài STEM đang mở: ${topics}\n`;
    }
  } else if (user.role === 'TEACHER_ROLE') {
    contextInfo += `- Tổ bộ môn: ${user.department || 'Tự nhiên & Công nghệ'}\n`;
    const topicSummary = (liveContext.myTopics || []).map(t => `"${t.TenDeTai}" (Mã: ${t.MaDeTai}, Trạng thái: ${t.TrangThai}, Có bài test: ${t.CoBaiTest ? 'Có' : 'Chưa'})`).join('; ');
    contextInfo += `- Đề tài phụ trách (${liveContext.myTopics?.length || 0} đề tài): ${topicSummary || 'Chưa tạo đề tài nào'}\n`;
    contextInfo += `- Thống kê lượt đăng ký: ${liveContext.totalRegistrations || 0} lượt (Đã duyệt: ${liveContext.approvedRegistrations || 0}, Đang chờ: ${liveContext.pendingRegistrations || 0})\n`;
    contextInfo += `- Số ca nghi vấn gian lận phòng thi: ${liveContext.violations?.length || 0} ca\n`;
  }

  // System instruction phân quyền theo Role
  let systemInstructionText = '';
  if (isTeacher) {
    systemInstructionText = `Bạn là Trợ lý AI Trợ Giảng Chuyên Môn & Quản Lý K-12 trên Nền tảng Giáo dục Web3 KLCN130 (chuẩn GDPT 2018 Việt Nam).
Bạn phục vụ Thầy/Cô: ${user.name}.

QUYỀN HẠN ĐẶC BIỆT DÀNH CHO GIÁO VIÊN:
1. Bạn có công cụ (Tools) để trực tiếp THÊM / SỬA / XÓA Đề tài STEM và Bài test đầu vào trong hệ thống.
   - Khi Thầy/Cô yêu cầu tạo đề tài, thêm đề tài mới: Hãy gọi ngay tool 'createTopic'.
   - Khi Thầy/Cô yêu cầu sửa, đổi tên, cập nhật đề tài: Hãy gọi ngay tool 'updateTopic'.
   - Khi Thầy/Cô yêu cầu xóa hoặc đóng đề tài:
     * Nếu Thầy/Cô chưa xác nhận rõ ràng (ví dụ mới chỉ nói 'Xóa đề tài XYZ' hoặc 'Xóa giúp tôi đề tài STEM_...'): Bạn KHÔNG được gọi tool xóa ngay. Hãy tra cứu tên/mã đề tài và trả lời hỏi lại để xác nhận an toàn 2 lớp: "Bạn có chắc chắn muốn xóa vĩnh viễn đề tài **[Tên đề tài]** (Mã: \`[Mã đề tài]\`) không? Thao tác này sẽ xóa toàn bộ bài test liên quan và không thể hoàn tác. Thầy/Cô vui lòng gõ **'Xác nhận xóa [Mã đề tài]'** để tiến hành."
     * Khi Thầy/Cô đã gõ 'Xác nhận xóa' hoặc có từ ngữ xác nhận dứt khoát: Hãy gọi ngay tool 'deleteTopic'.
   - Khi Thầy/Cô yêu cầu tạo bài test, tạo câu hỏi kiểm tra cho đề tài: Hãy gọi tool 'createEntranceTest'.
   - Khi Thầy/Cô yêu cầu xóa bài test: Hãy gọi tool 'deleteEntranceTest'.
2. Nếu Thầy/Cô hỏi đáp hoặc yêu cầu tư vấn chuyên môn:
   - Trả lời ngắn gọn, chuẩn xác dựa trên dữ liệu thật [DỮ LIỆU THỰC TẾ HỆ THỐNG KLCN130].
   - Hỗ trợ xây dựng tiêu chí Rubrics 100% chuẩn K-12, dự án STEM liên môn GDPT 2018.
3. Phong cách trả lời: Đi thẳng vào trọng tâm, lịch sự, tôn trọng nhà giáo, định dạng Markdown sạch đẹp.`;
  } else {
    systemInstructionText = `Bạn là Trợ lý AI Cố vấn Học tập & STEM K-12 chuyên nghiệp trên Nền tảng Giáo dục Web3 KLCN130 (chuẩn GDPT 2018 Việt Nam).
Bạn đang đồng hành cùng học sinh: ${user.name}.

GIỚI HẠN PHẠM VI (GUARDRAILS BẮT BUỘC CHO HỌC SINH):
1. BẠN CHỈ HỖ TRỢ TRONG PHẠM VI HỌC TẬP VÀ HỆ THỐNG KLCN130:
   - Tra cứu dữ liệu cá nhân trong hệ thống KLCN130 (thông tin nhóm, thành viên, tiến độ đề tài đã đăng ký, kết quả bài test, chứng chỉ Web3 SBT). Luôn trả lời CHÍNH XÁC dựa trên mục [DỮ LIỆU THỰC TẾ HỆ THỐNG KLCN130].
   - Hướng dẫn phương pháp nghiên cứu khoa học STEM, cấu trúc báo cáo IMRaD, kỹ thuật/lập trình (Python, Arduino, cảm biến IoT) phục vụ trực tiếp cho đề tài/dự án học tập K-12.
   - Giải thích quy chế phòng thi 1 màn hình và liêm chính học thuật.
2. TỪ CHỐI CÁC CÂU HỎI NGOÀI LUỒNG:
   - Nếu học sinh hỏi về các chủ đề phi học thuật, không liên quan đến đề tài/hệ thống KLCN130 (như chơi game, phim ảnh, giải trí, chính trị, buôn bán ngoài lề, spam, làm hộ bài tập không thuộc STEM/dự án...):
     Lịch sự từ chối và nhắc học sinh: "Mình là AI Cố vấn Học tập & STEM của hệ thống KLCN130. Câu hỏi này nằm ngoài phạm vi học tập và dự án nghiên cứu. Bạn hãy đặt các câu hỏi về đề tài, nhóm, kết quả thi hoặc kỹ thuật STEM nhé."
3. HỌC SINH KHÔNG CÓ QUYỀN THÊM/SỬA/XÓA ĐỀ TÀI HAY ĐIỂM SỐ:
   - Tuyệt đối không cho phép học sinh can thiệp sửa điểm, xóa dữ liệu hay duyệt đề tài.`;
  }

  // Chuẩn bị Chat History
  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const h of history.slice(-6)) {
      if (h.content && typeof h.content === 'string') {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content.substring(0, 1000) }]
        });
      }
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: `${contextInfo}\n[CÂU HỎI/YÊU CẦU]: ${prompt}` }]
  });

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstructionText }]
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048
    }
  };

  // Nếu là Giáo viên, cấp quyền Function Calling
  if (isTeacher) {
    payload.tools = [{ functionDeclarations: TEACHER_TOOLS }];
  }

  // Ưu tiên gọi Jev AI nếu có cấu hình JEV_AI_API_KEY
  if (jevApiKey && jevApiKey.trim()) {
    try {
      const jevBaseUrl = process.env.JEV_AI_BASE_URL || 'https://api.jev.ai/v1/chat/completions';
      const jevModel = process.env.JEV_AI_MODEL || 'jev-chat-v1';
      const oaMessages = [
        { role: 'system', content: systemInstructionText },
        ...contents.map(c => ({
          role: c.role === 'model' ? 'assistant' : 'user',
          content: c.parts?.[0]?.text || ''
        }))
      ];
      const jevRes = await axios.post(
        jevBaseUrl,
        { model: jevModel, messages: oaMessages, temperature: 0.3, max_tokens: 2048 },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jevApiKey.trim()}`
          },
          timeout: 20000
        }
      );
      const replyText = jevRes.data?.choices?.[0]?.message?.content;
      if (replyText && replyText.trim()) {
        return {
          reply: replyText.trim(),
          provider: 'JEV_AI',
          model: jevModel
        };
      }
    } catch (jevErr) {
      logger.warn(`[AI Assistant] Jev AI fallback to Gemini: ${jevErr.message}`);
    }
  }

  let lastError = null;
  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    try {
      const res = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const candidate = res.data?.candidates?.[0];
      if (!candidate) continue;

      // 1. Kiểm tra nếu Gemini gọi Tool / Function Call
      const functionCallPart = candidate.content?.parts?.find(p => p.functionCall);
      if (functionCallPart && functionCallPart.functionCall) {
        const { name, args } = functionCallPart.functionCall;
        const toolResultText = await executeTeacherTool(name, args || {}, user);
        return {
          reply: toolResultText,
          model,
          toolCall: { name, args }
        };
      }

      // 2. Trả về câu trả lời dạng văn bản thông thường
      const textPart = candidate.content?.parts?.find(p => p.text);
      if (textPart && textPart.text && textPart.text.trim()) {
        return {
          reply: textPart.text.trim(),
          model
        };
      }
    } catch (err) {
      const status = err.response?.status;
      const errMsg = err.response?.data?.error?.message || err.message;
      logger.warn(`[AI Assistant] Model ${model} returned status ${status}: ${errMsg}`);
      lastError = new Error(errMsg);
      // Nếu 503 (quá tải), 404 (model cũ), hoặc timeout, tiếp tục thử model tiếp theo trong danh sách candidate
      if (status === 503 || status === 404 || err.code === 'ECONNABORTED' || !status) {
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Không thể nhận phản hồi từ dịch vụ Google Gemini.');
}

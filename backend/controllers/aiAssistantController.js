const HocSinh = require('../models/HocSinh');
const GiaoVien = require('../models/GiaoVien');
const Nhom = require('../models/Nhom');
const DangKyDeTai = require('../models/DangKyDeTai');
const DeTai = require('../models/DeTai');
const KetQuaTest = require('../models/KetQuaTest');
const logger = require('../config/logger');

/**
 * Helper: Chuẩn hóa chuỗi văn bản không dấu phục vụ so khớp ngữ nghĩa linh hoạt
 */
function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intelligent Context-Aware K-12 Educational Copilot Engine
 * Dynamically queries real database records to answer personalized questions for Students and Teachers
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
          reply: '⚠️ CẢNH BÁO BẢO MẬT: Bạn đang trong thời gian làm bài thi kiểm tra. Trợ lý AI bị khóa hoàn toàn nhằm đảm bảo tính công bằng và chống gian lận.',
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
      }).select('TenDeTai MaDeTai TrangThai');
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

    const reply = await generateContextAwareResponse(cleanMsg, userInfo, liveContext, history);

    return res.status(200).json({
      success: true,
      reply,
      userRole: role,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error(`[AI Assistant] Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Lỗi trợ lý AI: ' + error.message });
  }
};

/**
 * Advanced Multi-Layer Knowledge & Context Synthesis Engine
 */
async function generateContextAwareResponse(question, user, ctx, history) {
  const qRaw = question.toLowerCase();
  const qNorm = normalizeText(question);

  // Helper kiểm tra từ khóa linh hoạt (cả có dấu và không dấu)
  const has = (...keywords) => {
    return keywords.some(kw => {
      const kwNorm = normalizeText(kw);
      return qRaw.includes(kw.toLowerCase()) || qNorm.includes(kwNorm);
    });
  };

  // ==========================================
  // 1. CHÀO HỎI & XÃ GIAO (GREETINGS)
  // ==========================================
  if (has('xin chao', 'chao ban', 'hello', 'hi robot', 'chao bot', 'em chao thay', 'chao co') && qNorm.length < 30) {
    if (user.role === 'STUDENT_ROLE') {
      return `Chào bạn **${user.name}**! 👋\n\nMình là **AI STEM Mentor** của bạn trên hệ thống Web3 Giáo Dục K-12. Hôm nay mình có thể hỗ trợ gì cho bạn?\n\n* 👥 Tra cứu thành viên và trạng thái nhóm của bạn\n* 📌 Theo dõi tiến độ duyệt đề tài STEM\n* 📊 Xem kết quả bài test đầu vào & chỉ số liêm chính\n* 💡 Hướng dẫn cấu trúc bài báo cáo chuẩn IMRaD\n* 🐍 Hỗ trợ lập trình Python / Arduino / IoT\n* 🛡️ Hướng dẫn nhận Huy hiệu Web3 SBT vào ví MetaMask`;
    } else {
      return `Kính chào Thầy/Cô **${user.name}**! 👋\n\nTôi là **AI Trợ Giảng Chuyên Môn K-12**. Tôi có thể hỗ trợ Thầy/Cô:\n\n* 📊 Thống kê tình hình các nhóm đăng ký đề tài\n* 🚨 Báo cáo danh sách thí sinh vi phạm quy chế phòng thi\n* 🎯 Gợi ý cấu trúc đề tài STEM tích hợp chuẩn GDPT 2018\n* ⚖️ Xây dựng bộ tiêu chí Rubrics 100% chuẩn K-12\n* 🖨️ Hướng dẫn xuất Biên bản kỷ luật & Cấp quyền thi lại`;
    }
  }

  // ==========================================
  // 2. CẢM ƠN & PHẢN HỒI TÍCH CỰC
  // ==========================================
  if (has('cam on', 'thank you', 'thanks', 'tuyet voi', 'hay qua') && qNorm.length < 25) {
    return `Rất vui vì đã hỗ trợ được cho bạn **${user.name}**! 😊\n\nNếu trong quá trình làm đề tài nghiên cứu hoặc thi test gặp bất kỳ thắc mắc nào, bạn cứ hỏi mình bất cứ lúc nào nhé. Chúc bạn gặt hái kết quả xuất sắc! 🚀`;
  }

  // ==========================================
  // A. HỌC SINH COPILOT (STUDENT ASSISTANT)
  // ==========================================
  if (user.role === 'STUDENT_ROLE') {

    // --- A1. NHÓM & THÀNH VIÊN ---
    if (has('nhom', 'thanh vien', 'truong nhom', 'ban cung nhom')) {
      // Hướng dẫn tạo nhóm / mời bạn
      if (has('tao nhom', 'cach tao', 'moi ban', 'nhan loi moi', 'ma hs', 'cho nhom')) {
        return `Chào bạn **${user.name}**! Dưới đây là hướng dẫn quy trình làm việc nhóm:\n\n### 👥 Hướng Dẫn Quản Lý Nhóm Học Tập:\n1. **Tạo nhóm mới:** Vào mục **Quản lý nhóm**, bấm nút **"Tạo Nhóm Mới"**, đặt tên nhóm và chọn số lượng thành viên dự kiến (từ 2 - 5 học sinh).\n2. **Mời thành viên:** Trưởng nhóm nhập **Mã Học Sinh (Mã HS)** của bạn học để gửi lời mời.\n3. **Chấp nhận lời mời:** Thành viên được mời sẽ thấy thông báo trong mục nhóm và bấm **"Chấp nhận"**.\n4. **Chốt nhóm (Bắt buộc):** Sau khi đủ thành viên, trưởng nhóm bấm **"Chốt nhóm"** để cố định danh sách và bắt đầu đăng ký đề tài.\n\n👉 [Xem Trang Quản Lý Nhóm](/student/group)`;
      }

      // Tra cứu thông tin nhóm hiện tại
      if (!ctx.myNhom) {
        return `Chào bạn **${user.name}**! Hiện tại bạn **chưa tham gia nhóm nào** trên hệ thống.\n\n👉 Bạn hãy vào mục **Quản lý nhóm** để tạo nhóm mới hoặc liên hệ trưởng nhóm gửi lời mời qua Mã HS của bạn nhé!\n\n👉 [Đến Trang Quản Lý Nhóm](/student/group)`;
      }

      const n = ctx.myNhom;
      const isTruongNhom = String(n.TruongNhom?._id || n.TruongNhom) === String(user.id);
      const members = (n.ThanhVien || []).map((tv, idx) => {
        const roleLabel = tv.VaiTro === 'TruongNhom' ? '👑 Trưởng nhóm' : 'Thành viên';
        const statusLabel = tv.TrangThai === 'DaChapNhan' ? '✅ Đã tham gia' : '⏳ Chờ chấp nhận';
        return `${idx + 1}. **${tv.HocSinh?.HoTen || 'Thành viên'}** (${roleLabel} - ${statusLabel})`;
      }).join('\n');

      return `Chào bạn **${user.name}**! Dưới đây là thông tin chi tiết nhóm nghiên cứu của bạn:

### 👥 Nhóm: **${n.TenNhom || 'Nhóm Nghiên Cứu'}**
* **Trạng thái nhóm:** **${n.DaChot ? '🔒 Đã chốt danh sách' : '📝 Đang mở tuyển thành viên'}**
* **Trưởng nhóm:** **${n.TruongNhom?.HoTen || 'Chưa xác định'}** ${isTruongNhom ? '*(Chính là bạn)*' : ''}
* **Vai trò của bạn:** ${isTruongNhom ? '👑 **Trưởng nhóm** *(Có quyền đại diện nhóm đăng ký đề tài & làm bài test)*' : 'Thành viên'}
* **Danh sách thành viên (${n.ThanhVien?.length || 0}/${n.SoLuong || 3}):**
${members}

${!n.DaChot && isTruongNhom ? '⚠️ **Lưu ý:** Bạn cần bấm **"Chốt nhóm"** trong trang quản lý nhóm sau khi đủ bạn để có thể đăng ký đề tài cạnh tranh.' : ''}
👉 [Đến Trang Quản Lý Nhóm](/student/group)`;
    }

    // --- A2. ĐỀ TÀI & TIẾN ĐỘ DUYỆT ---
    if (has('de tai', 'du an', 'tien do', 'trang thai', 'duyet chua', 'dang ky')) {
      // Gợi ý đề tài mở
      if (has('goi y', 'y tuong', 'mo dang ky', 'con trong', 'chua co ai', 'linh vuc')) {
        const topicList = (ctx.openTopics || []).map((t, idx) => `• **${t.TenDeTai}** (\`${t.MaDeTai || 'STEM'}\`) - Môn/Lĩnh vực: *${t.MonHoc?.TenMonHoc || t.MoTa || 'Công nghệ & Kỹ thuật'}*`).join('\n');
        return `Chào bạn **${user.name}**! Dưới đây là các đề tài STEM đang mở tiếp nhận đăng ký trên hệ thống:

### 🔬 Danh Sách Đề Tài Đang Mở:
${topicList || 'Hiện tại tất cả đề tài đã đủ nhóm đăng ký. Em hãy theo dõi đợt mở đề tài tiếp theo nhé!'}

💡 *Lời khuyên chiến thuật:*
* Chọn đề tài đúng thế mạnh của nhóm: Lập trình (Tin học), Lắp ráp cảm biến (Vật lý/IoT), hoặc Thí nghiệm (Hóa sinh).
* Đọc kỹ yêu cầu đề tài trước khi làm bài test đầu vào cạnh tranh!

👉 [Xem & Đăng Ký Đề Tài](/student/register)`;
      }

      // Thông tin đề tài của học sinh
      if (!ctx.myDangKy) {
        return `Chào bạn **${user.name}**! Nhóm của bạn **chưa đăng ký đề tài nào** trên hệ thống.\n\n👉 Bạn hãy vào mục **"Đăng Ký Đề Tài"** để duyệt qua các dự án STEM phù hợp và nộp đăng ký nhé!\n\n👉 [Xem Danh Sách Đề Tài](/student/register)`;
      }

      const dk = ctx.myDangKy;
      const dt = dk.DeTai;
      const statusMap = {
        ChoDuyet: '⏳ Chờ Giáo viên phụ trách duyệt hồ sơ',
        ChoTest: '📝 Chờ làm bài test cạnh tranh đầu vào (1 màn hình duy nhất)',
        DangLamTest: '✍️ Đang trong thời gian làm bài test',
        DaSubmit: '📊 Đã nộp bài test - Đang chờ AI đối soát & ghi Blockchain',
        ChoDoi: '⏳ Đạt ngưỡng điểm! Đang chờ đối chiếu với nhóm nộp trước',
        DaDuyet: '🎉 ĐÃ DUYỆT CHÍNH THỨC! Nhóm bạn đã giành được đề tài',
        TuChoi: '❌ Không đạt ngưỡng điểm hoặc hồ sơ bị từ chối',
        Thua: '😞 Đã có nhóm khác hoàn thành trước và giành được đề tài'
      };

      return `Chào bạn **${user.name}**! Tiến độ đăng ký đề tài hiện tại của nhóm:

### 📌 Đề Tài: **${dt?.TenDeTai || 'Đề tài STEM'}**
* **Mã đề tài:** \`${dt?.MaDeTai || 'N/A'}\`
* **Trạng thái duyệt:** **${statusMap[dk.TrangThai] || dk.TrangThai}**
* **Thời gian nộp hồ sơ:** ${new Date(dk.createdAt).toLocaleString('vi-VN')}

${dk.TrangThai === 'ChoTest' ? '👉 **Hành động ngay:** Trưởng nhóm cần vào phòng thi để hoàn thành bài test kiểm tra năng lực trực tuyến.' : ''}
${dk.TrangThai === 'DaDuyet' ? '🏆 **Chúc mừng:** Đề tài đã được giao chính thức cho nhóm bạn! Hãy bắt đầu thực hiện sản phẩm và nộp báo cáo tiến độ tuần.' : ''}

👉 [Xem Chi Tiết Đề Tài](/student/register)`;
    }

    // --- A3. ĐIỂM SỐ & PHÒNG THI AI & GIAN LẬN ---
    if (has('diem', 'ket qua', 'bai test', 'vi pham', 'gian lan', 'dinh chi', 'thi lai', 'lam lai')) {
      // Hướng dẫn xin thi lại
      if (has('thi lai', 'lam lai', 'reset', 'xin thi')) {
        return `Chào bạn **${user.name}**! Về quy chế **Làm lại bài test / Thi lại**:\n\n* Theo quy chế bảo mật, học sinh **không thể tự ý xóa điểm để thi lại** nhằm chống gian lận lặp lại.\n* Nếu bạn gặp sự cố kỹ thuật chính đáng (mất mạng, cúp điện, máy tính tắt đột ngột), bạn hãy **liên hệ Giáo viên phụ trách đề tài**.\n* Giáo viên có nút **"Cấp quyền thi lại"** trên hệ thống để mở lại bài test cho bạn.\n\n👉 [Xem Bảng Kết Quả](/student/register)`;
      }

      if (!ctx.myTestResult) {
        return `Chào bạn **${user.name}**! Bạn **chưa làm bài test nào** trên hệ thống.\n\nKhi nhóm bạn đăng ký một đề tài có bài test đầu vào, hệ thống sẽ mở phòng thi giám sát AI để kiểm tra kiến thức và tính liêm chính học thuật nhé!\n\n👉 [Xem Danh Sách Đề Tài](/student/register)`;
      }

      const r = ctx.myTestResult;
      const percent = r.DiemToiDa > 0 ? Math.round((r.TongDiem / r.DiemToiDa) * 100) : 0;
      const isDisqualified = r.BiHuyKetQua;

      return `Chào bạn **${user.name}**! Dưới đây là kết quả kiểm tra phòng thi gần nhất của bạn:

### 📊 Bài Test: **${r.BaiTest?.TieuDe || 'Đánh giá năng lực đầu vào'}**
* **Tổng điểm đạt được:** **${r.TongDiem} / ${r.DiemToiDa}** (${percent}%) ${isDisqualified ? '🛑 *(ĐÃ BỊ HỦY DO VI PHẠM)*' : ''}
* **Đánh giá liêm chính AI:** **${r.AI_CheatAssessment || 'Liêm chính'}** (Chỉ số nghi vấn: ${r.AI_CheatScore || 0}%)
* **Nhật ký giám sát:** ${r.SoLanThoatFullscreen || 0} lần thoát toàn màn hình, ${r.SoLanChuyenTab || 0} lần đổi tab.
* **Thời gian nộp bài:** ${new Date(r.ThoiGianNop || r.createdAt).toLocaleString('vi-VN')}
${r.TxHash ? `* **Chứng thực Blockchain:** \`${r.TxHash.substring(0, 20)}...\`` : ''}

${isDisqualified ? `⚠️ **Lý do đình chỉ:** ${r.LyDoHuy || 'Vi phạm quy chế 1 màn hình duy nhất hoặc mở công cụ DevTools / F12.'}\n\n👉 *Khắc phục:* Hãy nhắn tin cho Giáo viên hướng dẫn đề tài để xin cấp quyền thi lại.` : percent >= 75 ? '🎉 **Đạt chuẩn:** Bạn đã vượt qua ngưỡng yêu cầu của đề tài (≥75%)!' : '⚠️ **Chưa đạt:** Điểm số chưa đạt ngưỡng yêu cầu của đề tài (≥75%).'}`;
    }

    // --- A4. DÀN Ý BÁO CÁO KHOA HỌC IMRAD ---
    if (has('bao cao', 'dan y', 'imrad', 'cau truc bai', 'viet bao cao', 'nop bao cao')) {
      return `Chào bạn **${user.name}**! Cấu trúc bài báo cáo nghiên cứu khoa học kỹ thuật chuẩn IMRaD (chuẩn Bộ GD&ĐT):

### 📑 Cấu Trúc Báo Cáo Chuẩn IMRaD (100% Tiêu Chí Rubrics):
1. **Trang bìa & Tóm tắt (Abstract):**
   - Tên đề tài, nhóm thực hiện, trường **${user.school || 'THPT'}**, giáo viên hướng dẫn.
   - Abstract: 150-250 từ tóm tắt bài toán, phương pháp áp dụng và kết quả đạt được.
2. **1. Đặt vấn đề (Introduction):**
   - Lý do chọn đề tài, tính cấp thiết trong đời sống, mục tiêu nghiên cứu và giới hạn đề tài.
3. **2. Cơ sở lý thuyết & Phương pháp (Methodology):**
   - Sơ đồ khối nguyên lý hoạt động, sơ đồ mạch cảm biến / cơ khí.
   - Thuật toán xử lý (Lưu đồ giải thuật / Mã nguồn chính).
4. **3. Kết quả & Thảo luận (Results & Discussion):**
   - Bảng đo đạc số liệu thực nghiệm ở các điều kiện khác nhau.
   - Hình ảnh sản phẩm chạy thực tế, phân tích sai số và so sánh với giải pháp hiện có.
5. **4. Kết luận & Hướng phát triển (Conclusion):**
   - Đánh giá mức độ hoàn thành so với mục tiêu ban đầu.
   - Các cải tiến dự kiến nâng cấp trong tương lai.
6. **5. Tài liệu tham khảo:** Trích dẫn các bài báo khoa học, datasheet linh kiện.

👉 [Đến Mục Nộp Báo Cáo](/student/upload)`;
    }

    // --- A5. HỖ TRỢ LẬP TRÌNH STEM & IOT ---
    if (has('python', 'code', 'lap trinh', 'arduino', 'cam bien', 'dht11', 'esp32', 'iot', 'thuat toan')) {
      return `Chào bạn **${user.name}**! Đây là mẫu code Python đọc và xử lý dữ liệu cảm biến IoT chuẩn phòng Lab:

\`\`\`python
import time
import random

# Giả lập đọc dữ liệu cảm biến nhiệt độ & độ ẩm DHT22
def read_sensor_data():
    temperature = round(random.uniform(25.0, 32.5), 2)  # Độ C
    humidity = round(random.uniform(55.0, 85.0), 2)     # %
    return temperature, humidity

print("=== HỆ THỐNG GIÁM SÁT MÔI TRƯỜNG K-12 STEM ===")
for cycle in range(1, 6):
    temp, hum = read_sensor_data()
    print(f"Chu kỳ {cycle}: Nhiệt độ = {temp}°C | Độ ẩm = {hum}%")
    
    # Cảnh báo ngưỡng an toàn
    if temp > 31.0:
        print("  -> CẢNH BÁO: Nhiệt độ vượt ngưỡng an toàn!")
    time.sleep(1)
\`\`\`

💡 *Mẹo cho đề tài STEM:* Khi làm báo cáo, bạn nên trích dẫn đoạn code quan trọng nhất vào phần **"2. Cơ sở lý thuyết & Phương pháp"** và đưa kết quả chạy vào phần **"3. Kết quả & Thảo luận"** để đạt điểm tối đa!`;
    }

    // --- A6. CHỨNG CHỈ WEB3 & SOULBOUND TOKEN (SBT) ---
    if (has('web3', 'sbt', 'soulbound', 'chung chi', 'bang khen', 'vi', 'metamask', 'blockchain')) {
      return `Chào bạn **${user.name}**! Về chứng chỉ số Web3 trên hệ thống:

### 🛡️ Bằng Khen & Chứng Chỉ Web3 (Soulbound Token - SBT):
1. **Chứng chỉ SBT là gì?** Là huy hiệu thành tích điện tử bất biến được đúc (mint) trực tiếp trên mạng blockchain Sepolia. Khác với NFT thông thường, SBT **không thể chuyển nhượng hoặc bán**, gắn liền vĩnh viễn với danh tính học sinh.
2. **Điều kiện nhận:** Hoàn thành đề tài STEM và được giáo viên chấm điểm đạt yêu cầu (từ 5.0 trở lên).
3. **Cách nhận vào ví cá nhân:**
   - Cài đặt tiện ích ví **MetaMask** trên trình duyệt.
   - Vào mục **"Thành tích & Chứng nhận"** trên menu bên trái.
   - Bấm **"Nhận Huy Hiệu Web3"** $\rightarrow$ Ký xác thực trên MetaMask (hoàn toàn miễn phí, trường tài trợ gas).
4. **Công nhận quốc tế:** Chứng chỉ có TxHash xác thực công khai, bạn có thể đính kèm vào hồ sơ xét tuyển Đại học hoặc du học!

👉 [Xem Trang Thành Tích Web3](/student/achievements)`;
    }

    // --- A7. QUY CHẾ PHÒNG THI 1 MÀN HÌNH ---
    if (has('quy che', 'tai sao bi cam', 'f12', 'toan man hinh', 'che camera', 'chuot phai')) {
      return `Chào bạn **${user.name}**! Quy chế thi trực tuyến 1 màn hình duy nhất được thiết kế để đảm bảo sự công bằng tuyệt đối:

### 🛑 Các Hành Vi Bị Nghiêm Cấm Trong Phòng Thi:
1. **Thoát chế độ toàn màn hình (Fullscreen):** Vi phạm lần 1 cảnh báo 5 giây khẩn cấp; vi phạm lần 2 sẽ **hủy bài thi ngay lập tức**.
2. **Chuyển tab hoặc mở ứng dụng khác (Alt+Tab):** Hệ thống phát hiện ngay tức khắc.
3. **Sử dụng 2 màn hình (Dual monitor):** Bất kỳ thao tác click chuột nào ra ngoài cửa sổ thi đều bị tính là vi phạm nghiêm trọng.
4. **Mở phím F12, Ctrl+Shift+I, Chuột phải:** Bị khóa ở cấp độ trình duyệt; cố tình bấm sẽ bị đình chỉ thi vì nghi vấn soi mã nguồn.
5. **Che tối camera hoặc tắt webcam:** Camera AI theo dõi khuôn mặt liên tục. Nếu bị che tối quá 12 giây, bài thi sẽ tự động kết thúc với điểm 0.

💡 *Lời khuyên:* Hãy chuẩn bị máy tính có webcam rõ nét, mạng ổn định và tập trung 100% vào bài thi!`;
    }

    // --- FALLBACK HỌC SINH TỔNG HỢP ---
    return `Chào bạn **${user.name}**! Mình là **AI STEM Mentor** đồng hành cùng bạn 🤖. Bạn có thể hỏi mình:
* 👥 *"Nhóm của em hiện tại gồm những ai?"* $\rightarrow$ Tra cứu danh sách thành viên.
* 📌 *"Đề tài của em đã được duyệt chưa?"* $\rightarrow$ Kiểm tra trạng thái hồ sơ.
* 📊 *"Điểm bài test và vi phạm của em thế nào?"* $\rightarrow$ Xem chi tiết điểm số & blockchain.
* 🔬 *"Gợi ý các đề tài STEM đang mở?"* $\rightarrow$ Xem danh sách dự án tiếp nhận.
* 💡 *"Dàn ý báo cáo khoa học chuẩn IMRaD?"* $\rightarrow$ Hướng dẫn viết bài điểm cao.
* 🐍 *"Code Python đọc cảm biến IoT thế nào?"* $\rightarrow$ Mẫu lập trình thực tế.
* 🛡️ *"Cách nhận chứng chỉ số Web3 vào ví?"* $\rightarrow$ Hướng dẫn nhận Soulbound Token.`;
  }

  // ==========================================
  // B. GIÁO VIÊN COPILOT (TEACHER ASSISTANT)
  // ==========================================
  if (user.role === 'TEACHER_ROLE') {

    // --- B1. THỐNG KÊ ĐĂNG KÝ ĐỀ TÀI ---
    if (has('thong ke', 'dang ky', 'bao nhieu nhom', 'tinh hinh', 'so luong', 'bao cao chung')) {
      const topicSummary = (ctx.myTopics || []).map(t => `• **${t.TenDeTai}** (\`${t.MaDeTai || 'N/A'}\`) - Trạng thái: *${t.TrangThai || 'Bình thường'}*`).join('\n');

      return `Kính chào Thầy/Cô **${user.name}**! Dưới đây là báo cáo tổng hợp tình hình các đề tài do Thầy/Cô phụ trách:

### 📊 Báo Cáo Tổng Quan:
* **Tổng số đề tài quản lý:** **${ctx.myTopics?.length || 0} đề tài**
* **Tổng lượt nhóm đăng ký:** **${ctx.totalRegistrations || 0} lượt nhóm**
* **Số nhóm đã duyệt chính thức:** **${ctx.approvedRegistrations || 0} nhóm**
* **Số nhóm đang chờ làm test / chờ duyệt:** **${ctx.pendingRegistrations || 0} nhóm**

### 📑 Chi Tiết Đề Tài:
${topicSummary || 'Thầy/Cô chưa tạo đề tài nào trên hệ thống.'}

👉 [Đến Mục Quản Lý Đề Tài](/teacher/topics)`;
    }

    // --- B2. AN NINH PHÒNG THI & XỬ LÝ VI PHẠM ---
    if (has('vi pham', 'gian lan', 'phong thi', 'dinh chi', 'bien ban', 'cap quyen', 'thi lai', 'camera')) {
      const vList = (ctx.violations || []).map((v, idx) => {
        return `${idx + 1}. Thí sinh **${v.HocSinh?.HoTen || 'Học sinh'}** (\`${v.HocSinh?.MaHS || 'N/A'}\`)\n   • Đề tài: *${v.DeTai?.TenDeTai || 'Bài test'}*\n   • Kết luận AI: **${v.BiHuyKetQua ? '🛑 ĐÌNH CHỈ THI (ĐIỂM 0)' : v.AI_CheatAssessment}** (Điểm nghi vấn: ${v.AI_CheatScore || 0}%)\n   • Chi tiết: ${v.SoLanThoatFullscreen || 0} lần thoát FS, ${v.SoLanChuyenTab || 0} lần đổi tab.\n   • Lý do: *${v.LyDoHuy || 'Nghi vấn thoát toàn màn hình hoặc click màn hình thứ 2'}*`;
      }).join('\n\n');

      return `Kính chào Thầy/Cô **${user.name}**! Báo cáo an ninh phòng thi AI:

### 🚨 Danh Sách Các Ca Nghi Vấn / Đình Chỉ Thi:
* **Tổng số trường hợp ghi nhận vi phạm:** **${ctx.violations?.length || 0} trường hợp**

${vList || '✅ **An toàn tuyệt đối!** Hiện tại không có trường hợp học sinh nào vi phạm quy chế thi.'}

### 🛠️ Các Thao Tác Giám Sát Dành Cho Thầy/Cô:
1. **In Biên Bản Kỷ Luật:** Vào mục **Quản lý đề tài** $\rightarrow$ chọn đề tài $\rightarrow$ tab **Kết quả test** $\rightarrow$ bấm nút **"In BB"** để trích xuất văn bản xử lý chuẩn Bộ GD&ĐT.
2. **Cấp Quyền Thi Lại:** Bấm nút **"Thi lại"** bên cạnh tên học sinh để xóa lịch sử vi phạm và cho phép em làm lại bài nếu có lý do chính đáng.

👉 [Đến Trang Quản Lý Đề Tài](/teacher/topics)`;
    }

    // --- B3. SOẠN THẢO ĐỀ TÀI STEM GDPT 2018 ---
    if (has('soan de tai', 'tao de tai', 'y tuong stem', 'gdpt 2018', 'lien mon', 'du an mau')) {
      return `Kính chào Thầy/Cô **${user.name}**! Trợ lý xin đề xuất 3 dự án STEM tích hợp liên môn chuẩn Chương trình GDPT 2018:

### 🌟 Dự Án 1: "Thùng Rác Thông Minh Phân Loại Rác Tự Động Bằng AI & Cảm Biến"
* **Môn tích hợp:** Tin học (Lập trình vi điều khiển / Python nhận diện hình ảnh), Vật lý (Động cơ servo, cảm biến siêu âm), Sinh học - Môi trường (Phân loại rác hữu cơ/vô cơ).
* **Sản phẩm:** Mô hình thùng rác tự mở nắp và điều hướng rác vào đúng ngăn.

### 🌟 Dự Án 2: "Hệ Thống Trồng Cây Thủy Canh Hồi Lưu Tự Động IoT"
* **Môn tích hợp:** Công nghệ (Kỹ thuật thủy canh), Hóa học (Độ pH, nồng độ dung dịch dinh dưỡng PPM), Tin học (Gửi cảnh báo qua Telegram/Web Dashboard).
* **Sản phẩm:** Giàn thủy canh tự bơm tuần hoàn và bật đèn quang hợp quang phổ khi thiếu sáng.

### 🌟 Dự Án 3: "Robot Cứu Hộ & Dò Tìm Khí Độc Trong Phòng Thí Nghiệm"
* **Môn tích hợp:** Vật lý (Cơ học chuyển động bánh xe Omni, sóng Radio), Tin học (C++ Arduino), Hóa học (Cảm biến khí Gas/CO2 MQ-2).

👉 [Đến Trang Tạo Đề Tài Mới](/teacher/topics)`;
    }

    // --- B4. KHUNG RUBRICS & ĐÁNH GIÁ ---
    if (has('rubric', 'tieu chi', 'trong so', 'cham diem', 'thang diem')) {
      return `Kính chào Thầy/Cô **${user.name}**! Khung tiêu chí Rubrics đánh giá nghiên cứu khoa học kỹ thuật chuẩn (Tổng trọng số 100%):

### ⚖️ Bảng Phân Bổ Tiêu Chí Rubrics Chuẩn:
1. **Kiến thức khoa học & Ý tưởng mới (Trọng số: 30%):**
   - Xác định rõ vấn đề nghiên cứu thực tiễn.
   - Ứng dụng đúng nguyên lý khoa học liên môn.
2. **Kỹ thuật chế tạo sản phẩm & Thực nghiệm (Trọng số: 40%):**
   - Sản phẩm/mô hình hoạt động ổn định, có độ bền cơ khí và an toàn điện.
   - Thu thập đầy đủ bảng số liệu thực nghiệm đo đạc định lượng.
3. **Kỹ năng giải quyết vấn đề & Sáng tạo (Trọng số: 15%):**
   - Khả năng phân tích nguyên nhân khi gặp lỗi kỹ thuật và phương án cải tiến.
4. **Báo cáo khoa học & Kỹ năng trình bày (Trọng số: 15%):**
   - Trình bày bài viết theo chuẩn IMRaD, lập luận logic, hình ảnh minh chứng rõ ràng.

👉 [Xem Bảng Điểm & Rubrics](/teacher/rubrics)`;
    }

    // --- FALLBACK GIÁO VIÊN TỔNG HỢP ---
    return `Kính chào Thầy/Cô **${user.name}**! Tôi là **AI Trợ Giảng Chuyên Môn** đồng hành cùng Thầy/Cô 🤖. Thầy/Cô có thể hỏi tôi:
* 📊 *"Thống kê tình hình các nhóm đăng ký đề tài?"* $\rightarrow$ Báo cáo tổng thể đề tài.
* 🚨 *"Báo cáo các trường hợp học sinh vi phạm phòng thi?"* $\rightarrow$ Tra cứu gian lận & đình chỉ.
* 🎯 *"Gợi ý cấu trúc đề tài STEM liên môn GDPT 2018?"* $\rightarrow$ Ý tưởng dự án khoa học.
* ⚖️ *"Xây dựng bộ tiêu chí Rubrics 100% chuẩn K-12?"* $\rightarrow$ Khung chấm điểm sư phạm.
* 📝 *"Cách thiết kế bài test đầu vào & câu hỏi code?"* $\rightarrow$ Hướng dẫn ra đề cạnh tranh.`;
  }

  // ==========================================
  // C. FALLBACK HỆ THỐNG CHUNG
  // ==========================================
  return `Chào bạn! Tôi là **Trợ lý AI Giáo dục Web3 K-12** 🤖.

Hệ thống được thiết kế để hỗ trợ học sinh và giáo viên theo quy trình nghiên cứu khoa học toàn diện:
1. **Thành lập nhóm:** Ghép đội học sinh cùng lớp hoặc liên khối.
2. **Đăng ký đề tài:** Lựa chọn đề tài STEM và làm bài test cạnh tranh đầu vào 1 màn hình duy nhất.
3. **Thực hiện & Báo cáo:** Nộp báo cáo tuần định dạng PDF để AI PhoBERT phân tích và chấm điểm.
4. **Nhận chứng chỉ số Web3:** Đúc (mint) Bằng khen Soulbound Token (SBT) vĩnh viễn trên blockchain!

Bạn cần tôi hỗ trợ chi tiết về bước nào trong quy trình trên?`;
}

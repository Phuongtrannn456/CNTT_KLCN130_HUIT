/**
 * Seed du lieu demo K-12 cho kich ban: Hoc sinh -> Giao vien -> Admin -> Phu huynh.
 * Idempotent: chay lai nhieu lan khong nhan ban (upsert theo ma co dinh).
 * Chay: node scripts/seed_beautiful_demo_k12.js
 *
 * ponytail: khong tao TxHash gia. Diem/tien do de trang thai 'ChuaGhi' de khi demo
 * giao vien bam ghi Blockchain that (neu Hardhat/Sepolia dang chay).
 */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const HocSinh = require('../models/HocSinh');
const GiaoVien = require('../models/GiaoVien');
const MonHoc = require('../models/MonHoc');
const LopHoc = require('../models/LopHoc');
const Nhom = require('../models/Nhom');
const DeTai = require('../models/DeTai');
const DangKyDeTai = require('../models/DangKyDeTai');
const BaoCao = require('../models/BaoCao');
const DiemSo = require('../models/DiemSo');
const TienDo = require('../models/TienDo');
const Challenge = require('../models/Challenge');
const ChallengeParticipation = require('../models/ChallengeParticipation');
const Submission = require('../models/Submission');
const Evaluation = require('../models/Evaluation');
const LearningResult = require('../models/LearningResult');
const Achievement = require('../models/Achievement');
const EducationalCredential = require('../models/EducationalCredential');
const RubricsTemplate = require('../models/RubricsTemplate');
const BaiTest = require('../models/BaiTest');
const KetQuaTest = require('../models/KetQuaTest');
const QrCode = require('../models/QrCode');
const Admin = require('../models/Admin');
const User = require('../models/User');
const AILog = require('../models/AILog');
const AITrainingData = require('../models/AITrainingData');
const RoleRequest = require('../models/RoleRequest');
const LoiMoiLopHoc = require('../models/LoiMoiLopHoc');

const { ObjectId } = mongoose.Types;
const ID = {
  HS1001: new ObjectId('6ae94aebd294387715a38afb'),
  GV_TOAN: new ObjectId('6ae94aec66feaeb5607c91cd'), // tai khoan nut demo "Giao Vien"
  GV_MAI: new ObjectId('6ae94aec66feaeb5607c91ce'),
  LOP_10A1_STEM: new ObjectId('6abdc9014fe364197052fd2e'),
  LOP_11A2: new ObjectId('6abdc9014fe364197052fd30'),
  CHL_PYTHON: new ObjectId('6abdc9014fe364197052fd61'),
  CHL_AIR: new ObjectId('6abdc9014fe364197052fd5b'),
  PART_AIR_HS1001: new ObjectId('6ae94de14ef0d2b8c8ba9565')
};

const SCHOOL = 'THPT Thực Nghiệm HUIT';
const now = Date.now();
const daysAgo = d => new Date(now - d * 86400000);
const daysLater = d => new Date(now + d * 86400000);
const up = (Model, filter, doc) =>
  Model.findOneAndUpdate(filter, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });

// Sua ten bi loi ma hoa (UTF-8 bi doc nham thanh Latin-1), vd "Nguyá»…n" -> "Nguyễn"
const fixMojibake = s => {
  if (!s || !/[ÃÄÆáº»]/.test(s) || [...s].some(c => c.charCodeAt(0) > 255)) return s;
  const fixed = Buffer.from(s, 'latin1').toString('utf8');
  return fixed.includes('\uFFFD') ? s : fixed;
};

const STUDENTS = [
  ['HS1001', 'Trần Thị Phương'], ['HS1002', 'Nguyễn Gia Bảo'], ['HS1003', 'Lê Bảo Châu'],
  ['HS1004', 'Phạm Minh Khôi'], ['HS1005', 'Võ Ngọc Hân'], ['HS1006', 'Đặng Quốc Huy'],
  ['HS1007', 'Bùi Thanh Tâm'], ['HS1008', 'Hoàng Gia Linh'], ['HS1009', 'Ngô Đức Anh']
];

const STEM_RUBRICS = [
  { TenTieuChi: 'Ý tưởng và tính sáng tạo', MoTa: 'Tính mới, tính thực tiễn và khả năng áp dụng trong trường học', TrongSo: 25, DiemToiDa: 10, GoiYChoAI: ['sáng tạo', 'ý tưởng', 'thực tiễn'] },
  { TenTieuChi: 'Thiết kế kỹ thuật và mạch điện', MoTa: 'Sơ đồ khối, lựa chọn cảm biến, lập trình vi điều khiển', TrongSo: 30, DiemToiDa: 10, GoiYChoAI: ['ESP32', 'cảm biến', 'mạch', 'lập trình'] },
  { TenTieuChi: 'Kết quả thực nghiệm và số liệu', MoTa: 'Quy trình đo, bảng số liệu, phân tích sai số', TrongSo: 25, DiemToiDa: 10, GoiYChoAI: ['đo', 'dữ liệu', 'thực nghiệm', 'sai số'] },
  { TenTieuChi: 'Trình bày báo cáo và thuyết trình', MoTa: 'Cấu trúc báo cáo, ngôn ngữ khoa học, kết luận', TrongSo: 20, DiemToiDa: 10, GoiYChoAI: ['báo cáo', 'kết luận', 'đề xuất'] }
];

const REPORT_STEM_01 = `BÁO CÁO DỰ ÁN STEM LỚP 10A1
Đề tài: Hệ thống tưới cây thông minh cho vườn trường sử dụng ESP32 và cảm biến độ ẩm đất
Nhóm thực hiện: Nhóm Sáng Tạo STEM 10A1 (Trần Thị Phương - trưởng nhóm, Nguyễn Gia Bảo, Lê Bảo Châu)
Giáo viên hướng dẫn: Thầy Nguyễn Văn Toàn

1. Lý do chọn đề tài
Vườn rau của trường thường bị héo vào cuối tuần vì không có người tưới. Nhóm đề xuất một hệ thống tưới tự động, tiết kiệm nước, giá thành dưới 500.000 đồng để học sinh có thể tự lắp đặt.

2. Thiết kế kỹ thuật
Hệ thống gồm vi điều khiển ESP32, cảm biến độ ẩm đất điện dung, cảm biến nhiệt độ DHT22, rơ-le điều khiển máy bơm mini 5V và tấm pin năng lượng mặt trời 6V. Chương trình viết bằng Arduino C, đọc độ ẩm mỗi 10 phút; khi độ ẩm thấp hơn 40% thì bật bơm trong 20 giây. Dữ liệu được gửi lên ứng dụng điện thoại qua Wi-Fi.

3. Thực nghiệm và số liệu
Nhóm thử nghiệm trong 14 ngày trên 2 luống rau cải: luống A tưới tự động, luống B tưới tay. Lượng nước tiêu thụ luống A giảm 32% so với luống B, độ ẩm đất duy trì ổn định trong khoảng 45-60%. Rau ở luống A cao trung bình 18,4 cm so với 16,9 cm ở luống B. Sai số cảm biến khoảng 3% sau khi hiệu chuẩn với mẫu đất khô và đất bão hòa nước.

4. Kết luận và đề xuất
Hệ thống hoạt động ổn định, tiết kiệm nước và phù hợp nhân rộng cho vườn trường. Hướng phát triển: bổ sung cảnh báo qua tin nhắn và lưu nhật ký tưới để phục vụ môn Sinh học.`;

const REPORT_STEM_02 = `BÁO CÁO DỰ ÁN STEM LỚP 10A1
Đề tài: Trạm quan trắc chất lượng không khí lớp học bằng cảm biến bụi mịn PMS7003
Mã phách bài nộp: [ĐÃ RỌC PHÁCH TỰ ĐỘNG ZERO-PII - Group_DID]

1. Mục tiêu
Đo nồng độ bụi mịn PM2.5, nhiệt độ và độ ẩm trong 5 phòng học khối 10 để đề xuất thời điểm mở cửa thông gió hợp lý.

2. Thiết kế
Trạm đo dùng ESP32, cảm biến PMS7003, cảm biến DHT22 và màn hình OLED. Dữ liệu được ghi mỗi 5 phút lên bảng tính trực tuyến. Vỏ hộp in 3D có khe thông gió để cảm biến hút khí ổn định.

3. Kết quả đo
Trong 10 ngày đo, PM2.5 trung bình là 28 µg/m3 vào buổi sáng và tăng lên 41 µg/m3 vào giờ tan học buổi chiều do xe cộ trước cổng trường. Phòng học tầng 1 có chỉ số cao hơn tầng 3 khoảng 22%. Khi mở cửa sổ phía sau 15 phút đầu giờ, nồng độ bụi giảm trung bình 18%.

4. Đề xuất
Lắp thêm cây xanh ở dãy phòng tầng 1, hạn chế mở cửa chính vào giờ cao điểm và hiển thị chỉ số không khí trên bảng tin điện tử của trường.`;

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected:', mongoose.connection.db.databaseName);

  // 1. Sua ten loi ma hoa trong danh ba
  for (const M of [HocSinh, GiaoVien]) {
    for (const d of await M.find({}, 'HoTen').lean()) {
      const fixed = fixMojibake(d.HoTen);
      if (fixed !== d.HoTen) await M.updateOne({ _id: d._id }, { $set: { HoTen: fixed } });
    }
  }

  // 2. Xoa ban ghi hoc sinh & giao vien trung lap cu, chuan hoa danh ba hoc sinh
  await HocSinh.deleteMany({ MaHS: { $in: ['ST_1001', 'ST_1102', 'ST_1203', 'HS1098', 'HS1099'] } });
  await GiaoVien.deleteMany({ _id: { $in: [new ObjectId('6ae94aebd294387715a38b0e'), new ObjectId('6ae94aebd294387715a38b11')] } });

  const hs = {};
  for (const [idx, [ma, ten]] of STUDENTS.entries()) {
    const base = {
      HoTen: ten, KhoiLop: 10, TruongHoc: SCHOOL, HanhKiem: 'Tốt',
      ToHopMon: 'Tổ hợp Khoa học Tự nhiên & STEM', DaCapNhatHoSo: true,
      Email: `${ma.toLowerCase()}@thucnghiemhuit.edu.vn`,
      IsActivated: true, ActivationPin: '123456'
    };
    if (ma === 'HS1001') {
      Object.assign(base, {
        DiemTongKet: 8.9,
        WalletAddress: '0x71c529966141a2f643e99e2886c99c7247194a2b',
        KyNang: ['Lập trình Python', 'Vi điều khiển ESP32', 'Tư duy thuật toán', 'Thí nghiệm Vật lý'],
        BangDiemKyNang: [
          { TenKyNang: 'Lập trình Python', Diem: 9.2 }, { TenKyNang: 'Vi điều khiển ESP32', Diem: 9.0 },
          { TenKyNang: 'Tư duy thuật toán', Diem: 8.8 }, { TenKyNang: 'Thí nghiệm Vật lý', Diem: 8.6 }
        ]
      });
      hs[ma] = await up(HocSinh, { _id: ID.HS1001 }, base);
    } else {
      Object.assign(base, {
        DiemTongKet: [8.4, 8.6, 7.9, 8.2, 8.1, 7.6, 8.3, 7.8][idx - 1],
        KyNang: ['Làm việc nhóm', 'Thuyết trình', 'Tin học văn phòng'],
        BangDiemKyNang: [
          { TenKyNang: 'Làm việc nhóm', Diem: 8.5 }, { TenKyNang: 'Thuyết trình', Diem: 8.2 }
        ],
        WalletAddress: `0x71c529966141a2f643e99e2886c99c724719100${idx + 1}`
      });
      hs[ma] = await up(HocSinh, { MaHS: ma }, base);
    }
  }
  const hs1101 = await up(HocSinh, { MaHS: 'HS1101' }, {
    HoTen: 'Võ Minh Trí', KhoiLop: 11, TruongHoc: SCHOOL, HanhKiem: 'Tốt', DiemTongKet: 9.0,
    ToHopMon: 'Tổ hợp Khoa học Tự nhiên & STEM', DaCapNhatHoSo: true,
    Email: 'hs1101@thucnghiemhuit.edu.vn', WalletAddress: '0x71c529966141a2f643e99e2886c99c7247191101',
    KyNang: ['Robotics', 'Lập trình C++', 'Thiết kế 3D'],
    BangDiemKyNang: [{ TenKyNang: 'Robotics', Diem: 9.1 }, { TenKyNang: 'Lập trình C++', Diem: 8.9 }],
    IsActivated: true, ActivationPin: '123456'
  });
  const hs1201 = await up(HocSinh, { MaHS: 'HS1201' }, {
    HoTen: 'Đặng Hoàng Nam', KhoiLop: 12, TruongHoc: SCHOOL, HanhKiem: 'Tốt', DiemTongKet: 9.2,
    ToHopMon: 'Tổ hợp Khoa học Tự nhiên & STEM', DaCapNhatHoSo: true,
    Email: 'hs1201@thucnghiemhuit.edu.vn', WalletAddress: '0x71c529966141a2f643e99e2886c99c7247191201',
    KyNang: ['Học máy cơ bản', 'Phân tích dữ liệu', 'Lập trình Python'],
    BangDiemKyNang: [{ TenKyNang: 'Học máy cơ bản', Diem: 9.3 }, { TenKyNang: 'Lập trình Python', Diem: 9.2 }],
    IsActivated: true, ActivationPin: '123456'
  });

  const allIds = STUDENTS.map(([ma]) => hs[ma]._id);
  const groupA = ['HS1001', 'HS1002', 'HS1003'].map(m => hs[m]._id);
  const groupB = ['HS1004', 'HS1005', 'HS1006'].map(m => hs[m]._id);
  const groupC = ['HS1007', 'HS1008', 'HS1009'].map(m => hs[m]._id);

  // 3. Giao vien (4 giao vien chuan K-12, khong trung lap)
  await up(GiaoVien, { _id: ID.GV_TOAN }, {
    MaGV: 'GV_TOAN_01', HoTen: 'Thầy Nguyễn Văn Toàn', ChuNhiemLop: '10A1',
    ToBoMon: 'Tổ Toán - Tin học', Email: 'toan.nv@thucnghiemhuit.edu.vn',
    WalletAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    ActivationPin: '888888', IsActivated: true, IsActive: true
  });
  await up(GiaoVien, { _id: ID.GV_MAI }, {
    MaGV: 'GV_STEM_02', HoTen: 'Cô Trần Thị Mai', ChuNhiemLop: '11A2',
    ToBoMon: 'Tổ Khoa học Tự nhiên & STEM', Email: 'mai.tt@thucnghiemhuit.edu.vn',
    WalletAddress: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
    ActivationPin: '888888', IsActivated: true, IsActive: true
  });
  const gvVan = await up(GiaoVien, { MaGV: 'GV_VAN_03' }, {
    HoTen: 'Cô Lê Thị Thu Hà', ChuNhiemLop: '10A2', ToBoMon: 'Tổ Ngữ văn',
    Email: 'ha.ltt@thucnghiemhuit.edu.vn', WalletAddress: '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
    ActivationPin: '888888', IsActivated: true, IsActive: true
  });
  const gvAnh = await up(GiaoVien, { MaGV: 'GV_ANH_04' }, {
    HoTen: 'Thầy Đỗ Minh Khang', ChuNhiemLop: '12A1', ToBoMon: 'Tổ Ngoại ngữ',
    Email: 'khang.dm@thucnghiemhuit.edu.vn', WalletAddress: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    ActivationPin: '888888', IsActivated: true, IsActive: true
  });

  // Gan lai giao vien cho du lieu cu dang tro toi giao vien khong ton tai (tranh hien "N/A")
  const validGv = new Set((await GiaoVien.find({}, '_id').lean()).map(g => String(g._id)));
  let flip = 0;
  const pickGv = () => (flip++ % 2 ? ID.GV_MAI : ID.GV_TOAN);
  for (const d of await DeTai.find({}, 'GiaoVienHuongDan').lean())
    if (!validGv.has(String(d.GiaoVienHuongDan))) await DeTai.updateOne({ _id: d._id }, { $set: { GiaoVienHuongDan: pickGv() } });
  for (const m of await MonHoc.find({}, 'GiaoVien').lean())
    if (!validGv.has(String(m.GiaoVien))) await MonHoc.updateOne({ _id: m._id }, { $set: { GiaoVien: ID.GV_TOAN } });

  // 4. Mon hoc + lop hoc 10A1 (7 mon cho hoc ba)
  const mh = {};
  const SUBJECTS = [
    ['MH_STEM', 'Hoạt Động Giáo Dục STEM', ID.GV_TOAN],
    ['MH_TOAN', 'Toán Học Phổ Thông', ID.GV_TOAN],
    ['MH_VATLY', 'Vật Lý Thực Nghiệm', ID.GV_MAI],
    ['MH_HOA', 'Hóa Học', ID.GV_MAI],
    ['MH_SINH', 'Sinh Học', ID.GV_MAI],
    ['MH_VAN', 'Ngữ Văn', gvVan._id],
    ['MH_ANH', 'Tiếng Anh', gvAnh._id]
  ];
  for (const [ma, ten, gv] of SUBJECTS) mh[ma] = await up(MonHoc, { MaMonHoc: ma }, { TenMonHoc: ten, GiaoVien: gv, MoTa: `${ten} - Chương trình GDPT 2018` });
  await MonHoc.updateOne({ MaMonHoc: 'MH_TIN' }, { $set: { GiaoVien: ID.GV_TOAN } });

  const lop = {};
  lop.MH_STEM = await up(LopHoc, { _id: ID.LOP_10A1_STEM }, { MaLopHoc: 'LOP_10A1', TenLopHoc: 'Lớp 10A1 - STEM KHTN', MonHoc: mh.MH_STEM._id, GiaoVien: ID.GV_TOAN, HocSinh: allIds });
  for (const [ma, ten, gv] of SUBJECTS.slice(1))
    lop[ma] = await up(LopHoc, { MaLopHoc: 'LOP_10A1', MonHoc: mh[ma]._id }, { TenLopHoc: `Lớp 10A1 - ${ten}`, GiaoVien: gv, HocSinh: allIds });
  await LopHoc.updateOne({ _id: ID.LOP_11A2 }, { $set: { GiaoVien: ID.GV_MAI, HocSinh: [hs1101._id, hs1201._id] } });

  // 5. Nhom hoc sinh (chi giu 3 nhom chuan cua lop 10A1)
  const mkNhom = (ten, ids) => up(Nhom, { TenNhom: ten }, {
    LopHoc: ID.LOP_10A1_STEM, TruongNhom: ids[0], SoLuong: 3, DaChot: true,
    ThanhVien: ids.map((id, i) => ({ HocSinh: id, VaiTro: i ? 'ThanhVien' : 'TruongNhom', TrangThai: 'DaChapNhan', NgayThamGia: daysAgo(40) }))
  });
  const nhomA = await mkNhom('Nhóm Sáng Tạo STEM 10A1', groupA);
  const nhomB = await mkNhom('Nhóm Eco-Tech 10A1', groupB);
  const nhomC = await mkNhom('Nhóm Green Future 10A1', groupC);
  await Nhom.deleteMany({ _id: { $nin: [nhomA._id, nhomB._id, nhomC._id] } });

  // 6. De tai STEM lop 10A1 (GV Toan huong dan)
  const stemTopic = (ma, ten, moTa, yeuCau, extra = {}) => up(DeTai, { MaDeTai: ma }, {
    TenDeTai: ten, MoTa: moTa, YeuCau: yeuCau, Rubrics: STEM_RUBRICS, SuDungRubrics: true, HienThiChiTietChoHS: true,
    SoLuongHocSinh: 3, Deadline: daysLater(30), HanDangKy: daysLater(10), HanNopBaoCao: daysLater(30),
    GiaoVienHuongDan: ID.GV_TOAN, MonHoc: mh.MH_STEM._id, LopHoc: [ID.LOP_10A1_STEM],
    LoaiDeTai: 'DU_AN_STEM', KhoiLopYeuCau: [10], TrangThai: 'MoDangKy', ...extra
  });
  const dt1 = await stemTopic('DEMO_STEM_01', 'Hệ thống tưới cây thông minh cho vườn trường sử dụng ESP32 và cảm biến độ ẩm đất',
    'Thiết kế hệ thống tưới tự động tiết kiệm nước, dùng năng lượng mặt trời cho vườn rau của trường.',
    ['Vi điều khiển ESP32', 'Cảm biến độ ẩm đất', 'Lập trình Arduino C', 'Đo đạc và xử lý số liệu']);
  const dt2 = await stemTopic('DEMO_STEM_02', 'Trạm quan trắc chất lượng không khí lớp học bằng cảm biến bụi mịn PMS7003',
    'Đo PM2.5, nhiệt độ, độ ẩm tại các phòng học khối 10 và đề xuất giải pháp thông gió.',
    ['ESP32', 'Cảm biến PMS7003', 'Phân tích dữ liệu môi trường']);
  const dt3 = await stemTopic('DEMO_STEM_03', 'Ứng dụng AI nhận diện và phân loại rác thải tái chế tại căng tin trường',
    'Huấn luyện mô hình nhận diện ảnh để phân loại chai nhựa, lon nhôm và giấy tại thùng rác thông minh.',
    ['Python', 'Học máy cơ bản', 'Camera và xử lý ảnh']);
  await stemTopic('DEMO_STEM_04', 'Robot dò line phân loại bưu kiện mini theo màu sắc',
    'Lắp ráp robot dò line dùng cảm biến hồng ngoại và cảm biến màu TCS3200 để phân loại hộp theo màu.',
    ['Arduino', 'Cảm biến màu', 'Cơ khí lắp ráp']);
  await stemTopic('DEMO_STEM_05', 'Hệ thống điểm danh học sinh bằng thẻ RFID kết hợp bảng tin điện tử',
    'Điểm danh đầu giờ bằng thẻ RFID, tự động tổng hợp chuyên cần gửi giáo viên chủ nhiệm.',
    ['RFID RC522', 'ESP32', 'Google Sheets API']);

  // 7. Dang ky de tai
  const mkReg = (dt, nhom, ids, trangThai) => up(DangKyDeTai, { DeTai: dt._id, Nhom: nhom._id }, {
    TruongNhom: ids[0], HocSinh: ids[0], TrangThai: trangThai,
    ThanhVien: ids.map((id, i) => ({ HocSinh: id, VaiTro: i ? 'ThanhVien' : 'TruongNhom', TrangThaiTV: 'DaChapNhan', NgayThamGia: daysAgo(35) }))
  });
  const regA = await mkReg(dt1, nhomA, groupA, 'DaDuyet');
  const regB = await mkReg(dt2, nhomB, groupB, 'DaDuyet');
  await mkReg(dt3, nhomC, groupC, 'ChoDuyet'); // giao vien bam duyet truc tiep khi demo
  await DeTai.updateOne({ _id: dt1._id }, { $set: { TrangThai: 'DaChot', NhomThang: nhomA._id, DangKyThang: regA._id } });
  await DeTai.updateOne({ _id: dt2._id }, { $set: { TrangThai: 'DaChot', NhomThang: nhomB._id, DangKyThang: regB._id } });

  // 8. Bao cao + diem du an STEM chinh (nhom A da cham, nhom B cho cham)
  const CID_A = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
  const CID_B = 'bafybeihkoviema7g3gxyt6la7vd5ho32ictqbilu3wnlo3rs7ewhnp7lly';
  const rubricsA = [[9.0, 9.5], [9.3, 9.5], [9.0, 9.2], [9.1, 9.4]].map(([ai, gv], i) => ({
    TenTieuChi: STEM_RUBRICS[i].TenTieuChi, TrongSo: STEM_RUBRICS[i].TrongSo, DiemToiDa: 10,
    AI_DiemTieuChi: ai, GV_DiemTieuChi: gv, AI_NhanXetTieuChi: 'Nội dung đáp ứng tốt tiêu chí, có minh chứng số liệu cụ thể.'
  }));
  for (const id of groupA) {
    const bc = await up(BaoCao, { DeTai: dt1._id, HocSinh: id }, {
      Nhom: nhomA._id, TieuDe: 'Báo cáo tổng kết dự án tưới cây thông minh ESP32', IPFS_CID: CID_A,
      NgayNop: daysAgo(5), ExtractedText: REPORT_STEM_01, ExtractedAt: daysAgo(5), PageCount: 12, ExtractionMethod: 'native'
    });
    await up(DiemSo, { BaoCao: bc._id }, {
      GiaoVienCham: ID.GV_TOAN, GiaoVienCam: ID.GV_TOAN, HocSinh: id, DeTai: dt1._id, Nhom: nhomA._id,
      Diem: 9.4, DiemGoc: 9.4, AI_Score: 9.1, RubricsResult: rubricsA, TrangThaiBlockchain: 'ChuaGhi',
      AI_Feedback: 'Báo cáo có cấu trúc rõ ràng, số liệu thực nghiệm 14 ngày thuyết phục, phân tích sai số cảm biến hợp lý.',
      NhanXet: 'Dự án xuất sắc, có tính ứng dụng cao cho vườn trường. Nhóm làm việc chủ động, trình bày tự tin.'
    });
  }
  for (const id of groupB) {
    await up(BaoCao, { DeTai: dt2._id, HocSinh: id }, {
      Nhom: nhomB._id, TieuDe: 'Báo cáo trạm quan trắc không khí lớp học', IPFS_CID: CID_B,
      NgayNop: daysAgo(1), ExtractedText: REPORT_STEM_02, ExtractedAt: daysAgo(1), PageCount: 9, ExtractionMethod: 'native'
    });
  }

  // 9. Nhat ky tien do theo tuan
  const weekly = (ids, scores) => scores.map((s, i) => s == null ? null : ({ ...ids, i, s }));
  const RUB = ['DUNG_HAN|Đúng hạn và đầy đủ|15', 'HOAN_THANH|Mức độ hoàn thành mục tiêu tuần|30', 'CHAT_LUONG|Chất lượng nội dung và minh chứng|25', 'KHO_KHAN|Xử lý khó khăn và tư duy phản hồi|15', 'KE_HOACH|Kế hoạch tuần sau|15'];
  const WEEKS_A = [
    { muc: 'Khảo sát vườn trường, lập sơ đồ khối và danh mục linh kiện', lam: 'Đo diện tích 2 luống rau, vẽ sơ đồ khối ESP32 - cảm biến - rơ-le - bơm, lập bảng dự toán 465.000 đồng.', kho: 'Chưa chọn được loại cảm biến độ ẩm bền khi ngâm nước.', ke: 'Lắp mạch thử nghiệm trên breadboard và viết chương trình đọc cảm biến.', pt: 35, diem: 9.0 },
    { muc: 'Lắp mạch, lập trình và hiệu chuẩn cảm biến', lam: 'Hoàn thành mạch, viết chương trình tưới theo ngưỡng 40%, hiệu chuẩn cảm biến với đất khô và đất bão hòa nước.', kho: 'Bơm chạy liên tục khi nguồn pin yếu, đã thêm tụ lọc và mạch hạ áp.', ke: 'Lắp đặt tại vườn trường và bắt đầu thu thập số liệu 14 ngày.', pt: 70, diem: 9.3 },
    { muc: 'Thực nghiệm 14 ngày và viết báo cáo', lam: 'Thu thập số liệu 2 luống, so sánh lượng nước tiêu thụ (giảm 32%) và chiều cao cây, hoàn thiện báo cáo và slide.', kho: 'Mưa 2 ngày làm nhiễu số liệu, nhóm đã ghi chú và loại khỏi phân tích.', ke: 'Nộp báo cáo, chuẩn bị thuyết trình trước hội đồng.', pt: 100, diem: 9.5 }
  ];
  for (const [i, w] of WEEKS_A.entries()) {
    await up(TienDo, { DeTai: dt1._id, HocSinh: ID.HS1001, TuanSo: i + 1, LanNopLai: 0 }, {
      Nhom: nhomA._id, NoiDung: w.lam, PhanTramHoanThanh: w.pt, LoaiCapNhat: 'BaoCaoTuan',
      NgayBatDauTuan: daysAgo(28 - i * 7), NgayKetThucTuan: daysAgo(22 - i * 7),
      MucTieuTuan: w.muc, NoiDungDaLam: w.lam, KhoKhan: w.kho, KeHoachTuanSau: w.ke,
      MinhChung: [{ TenFile: `minh_chung_tuan_${i + 1}.jpg`, Url: `https://gateway.pinata.cloud/ipfs/${CID_A}`, GhiChu: 'Ảnh chụp mô hình và bảng số liệu' }],
      TrangThaiDanhGia: 'Dat', DiemTienDo: w.diem, GiaoVienDanhGia: ID.GV_TOAN, NgayDanhGia: daysAgo(21 - i * 7),
      NhanXetGV: ['Kế hoạch rõ ràng, dự toán hợp lý.', 'Xử lý sự cố nguồn điện tốt, cần ghi lại nhật ký hiệu chuẩn.', 'Số liệu đầy đủ, phân tích có so sánh đối chứng. Rất tốt.'][i],
      RubricsTuan: RUB.map(r => { const [MaTieuChi, TenTieuChi, TrongSo] = r.split('|'); return { MaTieuChi, TenTieuChi, TrongSo: +TrongSo, DiemToiDa: 10, DiemGV: w.diem }; }),
      TrangThaiBlockchain: 'ChuaGhi'
    });
  }
  const WEEKS_B = [
    { lam: 'Lắp trạm đo đầu tiên tại phòng 10A1, kiểm tra cảm biến PMS7003 và DHT22 hoạt động ổn định.', pt: 40, dat: true },
    { lam: 'Lắp thêm 4 trạm đo tại các phòng khối 10, thu thập số liệu 10 ngày và lập biểu đồ PM2.5 theo giờ.', pt: 80, dat: false }
  ];
  for (const [i, w] of WEEKS_B.entries()) {
    await up(TienDo, { DeTai: dt2._id, HocSinh: groupB[0], TuanSo: i + 1, LanNopLai: 0 }, {
      Nhom: nhomB._id, NoiDung: w.lam, NoiDungDaLam: w.lam, PhanTramHoanThanh: w.pt, LoaiCapNhat: 'BaoCaoTuan',
      MucTieuTuan: i ? 'Mở rộng điểm đo và phân tích số liệu' : 'Lắp đặt và kiểm tra trạm đo mẫu',
      KhoKhan: i ? 'Wi-Fi tầng 1 yếu, phải lưu tạm vào thẻ nhớ.' : 'Vỏ hộp in 3D bị cong, đã in lại.',
      KeHoachTuanSau: i ? 'Viết báo cáo và đề xuất giải pháp thông gió.' : 'Lắp đặt thêm 4 trạm đo.',
      NgayBatDauTuan: daysAgo(14 - i * 7), NgayKetThucTuan: daysAgo(8 - i * 7),
      TrangThaiDanhGia: w.dat ? 'Dat' : 'ChoDanhGia', ...(w.dat ? { DiemTienDo: 8.5, GiaoVienDanhGia: ID.GV_TOAN, NgayDanhGia: daysAgo(6), NhanXetGV: 'Tiến độ đúng kế hoạch.' } : {}),
      TrangThaiBlockchain: 'ChuaGhi'
    });
  }

  // 10. Bai mon hoc ca nhan cho hoc ba 7 mon cua HS1001
  const SUBJECT_WORK = [
    ['MH_TOAN', 'DEMO_TOAN_01', 'Mô hình hóa quỹ đạo ném bóng rổ bằng hàm số bậc hai', 9.0, 8.7, ID.GV_TOAN, 'Vận dụng hàm số bậc hai chính xác, có đo đạc thực tế bằng video.'],
    ['MH_VATLY', 'DEMO_LY_01', 'Đo gia tốc rơi tự do bằng cổng quang điện và ESP32', 8.8, 8.5, ID.GV_MAI, 'Thí nghiệm chuẩn, sai số 1,8% so với giá trị lý thuyết.'],
    ['MH_HOA', 'DEMO_HOA_01', 'Khảo sát độ pH nước mưa khu vực quanh trường', 8.6, 8.9, ID.GV_MAI, 'Lấy mẫu đúng quy trình, cần bổ sung thêm số lần đo lặp.'],
    ['MH_SINH', 'DEMO_SINH_01', 'Mô hình thủy canh rau mầm tuần hoàn trong lớp học', 9.2, 9.0, ID.GV_MAI, 'Mô hình đẹp, theo dõi sinh trưởng 21 ngày rất chi tiết.'],
    ['MH_VAN', 'DEMO_VAN_01', 'Số hóa tuyển tập ca dao Nam Bộ thành sách điện tử có minh họa', 8.5, 8.2, gvVan._id, 'Bài viết giàu cảm xúc, phần bình giảng còn có thể sâu hơn.'],
    ['MH_ANH', 'DEMO_ANH_01', 'Thuyết trình dự án STEM tưới cây thông minh bằng tiếng Anh', 8.7, 8.8, gvAnh._id, 'Phát âm tốt, dùng thuật ngữ kỹ thuật chính xác.']
  ];
  for (const [maMh, maDt, ten, diem, ai, gv, nx] of SUBJECT_WORK) {
    const dt = await up(DeTai, { MaDeTai: maDt }, {
      TenDeTai: ten, MoTa: ten, YeuCau: [], SoLuongHocSinh: 1, Deadline: daysAgo(3), HanNopBaoCao: daysAgo(3),
      GiaoVienHuongDan: gv, MonHoc: mh[maMh]._id, LopHoc: [lop[maMh]._id], LoaiDeTai: 'MonHoc', KhoiLopYeuCau: [10], TrangThai: 'HoanThanh'
    });
    await up(DangKyDeTai, { DeTai: dt._id, HocSinh: ID.HS1001 }, {
      TruongNhom: ID.HS1001, TrangThai: 'DaDuyet',
      ThanhVien: [{ HocSinh: ID.HS1001, VaiTro: 'TruongNhom', TrangThaiTV: 'DaChapNhan', NgayThamGia: daysAgo(30) }]
    });
    const bc = await up(BaoCao, { DeTai: dt._id, HocSinh: ID.HS1001 }, {
      TieuDe: `Bài nộp: ${ten}`, IPFS_CID: CID_A, NgayNop: daysAgo(6), ExtractedText: `${ten}. Báo cáo cá nhân của học sinh Trần Thị Phương, lớp 10A1.`, ExtractionMethod: 'native', PageCount: 4
    });
    await up(DiemSo, { BaoCao: bc._id }, {
      GiaoVienCham: gv, GiaoVienCam: gv, HocSinh: ID.HS1001, DeTai: dt._id, Diem: diem, DiemGoc: diem,
      AI_Score: ai, AI_Feedback: 'Bài làm đáp ứng yêu cầu, trình bày mạch lạc.', NhanXet: nx, TrangThaiBlockchain: 'ChuaGhi'
    });
  }

  // 11. Thu thach "Giai toan bang lap trinh Python": 4 bai nop, HS1001 da chot diem
  await Challenge.updateOne({ _id: ID.CHL_PYTHON }, { $set: { deadline: daysLater(20), status: 'Open', eligibleGrades: [10], subject: 'Tin học', challengeType: 'STEM' } });
  const CONTENT = {
    HS1001: 'Bài giải: Viết chương trình Python tìm các số nguyên tố trong đoạn [1, 10000] bằng thuật toán Sàng Eratosthenes với độ phức tạp thời gian O(n log log n). Chương trình khởi tạo mảng đánh dấu boolean kích thước n+1, chỉ duyệt ước từ 2 đến căn bậc hai của n và loại bỏ các bội số bắt đầu từ i*i. Thực nghiệm đo bằng thư viện time cho thấy Sàng Eratosthenes tìm ra đúng 1229 số nguyên tố trong 1.2 mili giây, nhanh hơn khoảng 40 lần so với cách kiểm tra từng số. Em đã kiểm chứng với 5 bộ test biên: n = 1, 2, 3, 9973 và 10000.',
    HS1002: 'Bài giải: Em xây dựng hàm is_prime(k) trong Python sử dụng vòng lặp kiểm tra các ước số từ 2 đến int(math.isqrt(k)) để xác định tính nguyên tố của từng số nguyên trong đoạn [1, 10000]. Nếu số k chia hết cho bất kỳ ước nào thì kết luận hợp số và thoát vòng lặp sớm bằng lệnh break để tiết kiệm phép chia. Kết quả chạy chương trình in ra đầy đủ danh sách các số nguyên tố nhỏ hơn hoặc bằng 10000, đếm được chính xác 1229 số nguyên tố với thời gian thực thi trung bình khoảng 45 mili giây.',
    HS1003: 'Bài giải: Em cài đặt chương trình Python duyệt tuần tự từng số tự nhiên từ 2 đến 10000 và kiểm tra điều kiện chia hết trong khoảng từ 2 đến căn bậc hai của n. Để cải thiện tốc độ so với cách duyệt mọi số, em bỏ qua toàn bộ các số chẵn lớn hơn 2 và chỉ kiểm tra các ước số lẻ theo bước nhảy 2 đơn vị. Chương trình xuất ra màn hình danh sách các số nguyên tố tìm được trong đoạn [1, 10000], tổng cộng thu được 1229 số nguyên tố khớp với bảng đối chiếu toán học.',
    HS1004: 'Bài giải: Em giải bài toán tính số hạng thứ n của dãy Fibonacci kết hợp kiểm tra tính chất số học bằng phương pháp Quy hoạch động (Dynamic Programming) trong Python. Thay vì gọi đệ quy gây tràn bộ nhớ và lặp lại phép tính với độ phức tạp hàm mũ, em lưu kết quả các số hạng trước vào mảng trạng thái dp[i] = dp[i-1] + dp[i-2]. Thực nghiệm cho thấy chương trình tính chính xác giá trị F(90) = 2880067194370816120 trong thời gian dưới 1 mili giây và không xảy ra lỗi quá tải đệ quy.'
  };
  for (const ma of Object.keys(CONTENT)) {
    const p = await up(ChallengeParticipation, { student: hs[ma]._id, challenge: ID.CHL_PYTHON }, { status: ma === 'HS1001' ? 'COMPLETED' : 'JOINED', joinedAt: daysAgo(12) });
    const s = await up(Submission, { participation: p._id, version: 1 }, {
      student: hs[ma]._id, challenge: ID.CHL_PYTHON, content: CONTENT[ma], status: ma === 'HS1001' ? 'Evaluated' : 'Submitted',
      attachments: [{ fileName: `${ma}_bai_giai.py`, fileUrl: `https://gateway.pinata.cloud/ipfs/${CID_A}`, fileType: 'text/x-python' }]
    });
    if (ma === 'HS1001') {
      const ev = await up(Evaluation, { submission: s._id }, {
        evaluator: ID.GV_TOAN, status: 'FINAL', aiTotalScore: 9.2, teacherTotalScore: 9.5,
        aiFeedback: 'Thuật toán tối ưu, có phân tích độ phức tạp và bộ test biên đầy đủ.',
        teacherFeedback: 'Lời giải xuất sắc, trình bày khoa học. Em nên chia sẻ cách làm cho cả lớp.',
        rubricScores: [
          { criteriaName: 'Tính đúng đắn của thuật toán', maxScore: 10, aiScore: 9.5, teacherScore: 10 },
          { criteriaName: 'Tối ưu và độ phức tạp', maxScore: 10, aiScore: 9.0, teacherScore: 9.5 },
          { criteriaName: 'Kiểm thử và trình bày', maxScore: 10, aiScore: 9.0, teacherScore: 9.0 }
        ]
      });
      const lr = await up(LearningResult, { student: ID.HS1001, challenge: ID.CHL_PYTHON }, { evaluation: ev._id, finalGrade: 'Xuất sắc', completedAt: daysAgo(2) });
      await up(Achievement, { student: ID.HS1001, challenge: ID.CHL_PYTHON, achievementType: 'Challenge Completed' }, { learningResult: lr._id, issuer: ID.GV_TOAN, issuedAt: daysAgo(2) });
    }
  }
  // Noi lai bai nop cu (thu thach khong khi) dang tro toi participation bi mat
  if (!(await ChallengeParticipation.findById(ID.PART_AIR_HS1001)) && !(await ChallengeParticipation.findOne({ student: ID.HS1001, challenge: ID.CHL_AIR }))) {
    await ChallengeParticipation.create({ _id: ID.PART_AIR_HS1001, student: ID.HS1001, challenge: ID.CHL_AIR, status: 'JOINED', joinedAt: daysAgo(20) });
  }
  await Submission.updateMany(
    { challenge: ID.CHL_AIR },
    {
      $set: {
        content: 'Báo cáo khảo sát chất lượng không khí tại khuôn viên trường THPT Thực hành Sư phạm trong 7 ngày liên tiếp bằng cảm biến bụi mịn PM2.5 và cảm biến khí CO2. Kết quả đo tại 3 khung giờ (7h00, 11h30, 16h30) cho thấy nồng độ PM2.5 tại cổng trường giờ cao điểm đạt 42 ug/m3, cao hơn 1.8 lần so với khu vực vườn thực nghiệm sinh học (23 ug/m3). Nhóm đề xuất giải pháp trồng bổ sung dải cây lưỡi hổ, trầu bà tại hành lang tầng 1 và phân luồng tắt máy xe chờ đón học sinh.'
      }
    }
  );
  // Chuan hoa toan bo cac bai nop thu thach khac de dam bao du do dai phan tich PhoBERT (> 350 ky tu) va khong con tieng Anh
  const allSubs = await Submission.find({ challenge: { $nin: [ID.CHL_PYTHON, ID.CHL_AIR] } }).populate('challenge', 'title subject');
  for (const sub of allSubs) {
    const title = sub.challenge?.title || 'Thử thách STEM cấp THPT';
    let richContent = `Báo cáo thực nghiệm: ${title}. Nhóm học sinh đã thiết kế sơ đồ nguyên lý, lắp ráp mô hình thực nghiệm tại phòng bộ môn và tiến hành đo đạc 15 lượt dữ liệu độc lập để kiểm chứng sai số. Kết quả thực nghiệm bám sát yêu cầu cần đạt của Chương trình Giáo dục phổ thông 2018, có bảng số liệu đối chứng và đề xuất phương án tối ưu hóa chi phí vật liệu cho học sinh phổ thông.`;
    if (/mạch điện|ánh sáng/i.test(title)) {
      richContent = 'Báo cáo thiết kế mạch điện cảm biến ánh sáng tiết kiệm năng lượng (Vật lý 11): Nhóm sử dụng quang trở LDR kết hợp transistor NPN BC547 và rơ-le 5V để tự động bật tắt hệ thống đèn hành lang lớp học khi cường độ sáng môi trường giảm xuống dưới 120 lux. Thực nghiệm đo dòng tiêu thụ trong 5 ngày tại dãy nhà B cho thấy mạch phản hồi ổn định dưới 0.3 giây và giúp giảm 34% điện năng tiêu thụ so với bật công tắc thủ công.';
    } else if (/chỉ thị màu|pH/i.test(title)) {
      richContent = 'Báo cáo chế tạo bộ chỉ thị màu pH tự nhiên từ thực vật (Hóa học 10): Nhóm chiết xuất dịch антоцианин (anthocyanin) từ bắp cải tím và hoa đậu biếc bằng phương pháp ngâm chiết nước ấm 60 độ C, sau đó tẩm lên giấy lọc định lượng để tạo thang đo pH từ 1 đến 14. Thử nghiệm đối chứng trên 8 mẫu dung dịch sinh hoạt (nước chanh, giấm ăn, nước máy, nước vôi trong, nước xà phòng) cho dải chuyển màu rõ nét từ đỏ tươi, tím, xanh lam sang vàng lục.';
    } else if (/Robotics|xe tự hành/i.test(title)) {
      richContent = 'Báo cáo mô hình xe tự hành dò đường và tránh vật cản siêu âm (Robotics 11): Nhóm lập trình vi điều khiển Arduino Uno kết hợp 3 mắt cảm biến hồng ngoại TCRT5000 để bám vạch đen và cảm biến siêu âm HC-SR04 để đo khoảng cách chướng ngại vật phía trước. Thuật toán điều khiển xung PWM giúp xe giữ tốc độ ổn định qua khúc cua 90 độ và tự động giảm tốc, dừng an toàn ở khoảng cách 15 cm với độ chính xác đạt 96% sau 20 lần chạy thử.';
    } else if (/nhận diện sâu bệnh|lá lúa/i.test(title)) {
      richContent = 'Báo cáo ứng dụng học máy nhận diện sâu bệnh lá lúa qua hình ảnh (Tin học 12): Nhóm thu thập và tiền xử lý bộ dữ liệu 600 ảnh lá lúa gồm 3 nhóm (lá khỏe mạnh, bệnh đạo ôn, bệnh bạc lá), chuẩn hóa kích thước 224x224 pixel và huấn luyện mô hình phân loại ảnh bằng thư viện Python. Kết quả kiểm thử trên tập dữ liệu độc lập đạt độ chính xác 91.5%, thời gian dự đoán trung bình 0.18 giây mỗi ảnh, hỗ trợ tra cứu nhanh triệu chứng bệnh ngoài đồng ruộng.';
    } else if (/lọc nước mưa/i.test(title)) {
      richContent = 'Báo cáo thiết kế hệ thống lọc nước mưa sinh hoạt đa tầng (Môi trường K-12): Nhóm chế tạo cột lọc hình trụ 5 tầng vật liệu tự nhiên gồm sỏi thạch anh, cát vàng hạt lớn, than hoạt tính gáo dừa, cát mangan và màng bông vi lọc. Kết quả đo chỉ số tổng chất rắn hòa tan (TDS) và độ đục trước và sau khi lọc cho thấy độ đục giảm 92%, độ pH ổn định ở mức 6.8 - 7.2, đáp ứng tiêu chuẩn nước tưới tiêu vườn trường và vệ sinh thực hành.';
    }
    await Submission.updateOne({ _id: sub._id }, { $set: { content: richContent } });
  }

  // 12. Yeu cau cap quyen giao vien (Admin duyet) - doi ten DID thanh ten that
  const REQS = [
    ['Cô Phạm Thu Hằng', 'hang.pt@thucnghiemhuit.edu.vn', 'Tổ Sinh học - Công nghệ'],
    ['Thầy Lê Quang Huy', 'huy.lq@thucnghiemhuit.edu.vn', 'Tổ Vật lý - Kỹ thuật'],
    ['Cô Nguyễn Thảo Vy', 'vy.nt@thucnghiemhuit.edu.vn', 'Tổ Ngoại ngữ'],
    ['Thầy Trịnh Văn Đức', 'duc.tv@thucnghiemhuit.edu.vn', 'Tổ Hóa học']
  ];
  const reqs = await RoleRequest.find({}).sort({ createdAt: 1 });
  for (const [i, r] of reqs.entries()) {
    if (!REQS[i] || !/_DID#/.test(r.hoTen)) continue;
    const [hoTen, email, to] = REQS[i];
    await RoleRequest.updateOne({ _id: r._id }, { $set: { hoTen, email, toBoMon: to, chuyenNganh: to } });
  }

  // 13. Loi moi lop hoc cho HS1001 (hien tren Dashboard hoc sinh)
  await up(LoiMoiLopHoc, { LopHoc: ID.LOP_11A2, HocSinh: ID.HS1001 }, { GiaoVien: ID.GV_TOAN, TrangThai: 'ChoChapNhan' });

  // 14. Chuan hoa toan ven tham chieu (Foreign Keys) & xoa sach ten gia DID# tren toan bo 27 collections
  const validHsIds = await HocSinh.distinct('_id');
  const validGvIds = await GiaoVien.distinct('_id');
  const validDtIds = await DeTai.distinct('_id');
  const validNhomIds = [nhomA._id, nhomB._id, nhomC._id];
  const validHsSet = new Set(validHsIds.map(String));
  const validGvSet = new Set(validGvIds.map(String));
  const validNhomSet = new Set(validNhomIds.map(String));

  // Xoa DangKyDeTai mo coi
  await DangKyDeTai.deleteMany({ $or: [{ HocSinh: { $nin: validHsIds } }, { DeTai: { $nin: validDtIds } }] });

  // Sua BaoCao, DiemSo, TienDo
  for (const bc of await BaoCao.find({}).lean()) {
    const patch = {};
    if (!validHsSet.has(String(bc.HocSinh))) patch.HocSinh = ID.HS1001;
    if (bc.Nhom && !validNhomSet.has(String(bc.Nhom))) patch.Nhom = nhomA._id;
    if (bc.ExtractedText && /DID#|Trường Phổ Thông Web3/.test(bc.ExtractedText)) {
      patch.ExtractedText = bc.ExtractedText
        .replace(/Student_DID#[a-z0-9]+/gi, 'HS1001 - Trần Thị Phương')
        .replace(/Trường Phổ Thông Web3/g, SCHOOL);
    }
    if (Object.keys(patch).length) await BaoCao.updateOne({ _id: bc._id }, { $set: patch });
  }
  for (const ds of await DiemSo.find({}).lean()) {
    const patch = {};
    if (!validGvSet.has(String(ds.GiaoVienCham))) { patch.GiaoVienCham = ID.GV_TOAN; patch.GiaoVienCam = ID.GV_TOAN; }
    if (ds.Nhom && !validNhomSet.has(String(ds.Nhom))) patch.Nhom = nhomA._id;
    if (!validHsSet.has(String(ds.HocSinh))) patch.HocSinh = ID.HS1001;
    if (Object.keys(patch).length) await DiemSo.updateOne({ _id: ds._id }, { $set: patch });
  }
  for (const td of await TienDo.find({}).lean()) {
    const patch = {};
    if (td.TrangThaiDanhGia === 'Dat' && !validGvSet.has(String(td.GiaoVienDanhGia))) patch.GiaoVienDanhGia = ID.GV_TOAN;
    if (td.Nhom && !validNhomSet.has(String(td.Nhom))) patch.Nhom = nhomA._id;
    if (!validHsSet.has(String(td.HocSinh))) patch.HocSinh = ID.HS1001;
    if (Object.keys(patch).length) await TienDo.updateOne({ _id: td._id }, { $set: patch });
  }

  // Sua RubricsTemplate
  const rTemplates = await RubricsTemplate.find({}).sort({ createdAt: 1 });
  const rMeta = [
    ['Mẫu Rubrics Dự án STEM & IoT K-12', ID.GV_TOAN, true],
    ['Mẫu Rubrics Nghiên cứu Khoa học Kỹ thuật THPT', ID.GV_TOAN, false],
    ['Mẫu Rubrics Thực hành Thí nghiệm KHTN', ID.GV_MAI, false]
  ];
  for (const [i, rt] of rTemplates.entries()) {
    const [TenMau, GiaoVienId, MacDinh] = rMeta[i % rMeta.length];
    await RubricsTemplate.updateOne({ _id: rt._id }, { $set: { TenMau, GiaoVien: GiaoVienId, MacDinh } });
  }

  // Sua BaiTest va KetQuaTest
  await BaiTest.deleteMany({ DeTai: { $nin: validDtIds } });
  await BaiTest.updateMany({}, { $set: { GiaoVien: ID.GV_TOAN } });
  await KetQuaTest.deleteMany({ DeTai: { $nin: validDtIds } });
  const kqTests = await KetQuaTest.find({}).sort({ createdAt: 1 });
  for (const [i, kq] of kqTests.entries()) {
    if (!validHsSet.has(String(kq.HocSinh))) {
      await KetQuaTest.updateOne({ _id: kq._id }, { $set: { HocSinh: allIds[i % allIds.length], DiemSo: kq.TongDiem || 8.5, TrangThai: 'HoanThanh' } });
    }
  }

  // Remap IDs cu (6ac7051...) trong ChallengeParticipation, Submission, Evaluation, LearningResult, Achievement, EducationalCredential
  const OLD_HS_B = new ObjectId('6ac7051e155af812fde50e3b');
  const OLD_HS_C = new ObjectId('6ac7051f155af812fde50e3c');
  await ChallengeParticipation.updateMany({ student: OLD_HS_B }, { $set: { student: hs1101._id } });
  await ChallengeParticipation.updateMany({ student: OLD_HS_C }, { $set: { student: hs1201._id } });
  await Submission.updateMany({ student: OLD_HS_B }, { $set: { student: hs1101._id } });
  await Submission.updateMany({ student: OLD_HS_C }, { $set: { student: hs1201._id } });
  await Evaluation.updateMany({ evaluator: { $nin: validGvIds } }, { $set: { evaluator: ID.GV_MAI } });
  await LearningResult.updateMany({ student: OLD_HS_C }, { $set: { student: hs1201._id } });
  await Achievement.deleteMany({ issuer: { $exists: false } });
  await Achievement.deleteMany({ issuer: null });
  await Achievement.updateMany({ student: OLD_HS_C }, { $set: { student: hs1201._id } });
  await Achievement.updateMany({ issuer: { $nin: validGvIds } }, { $set: { issuer: ID.GV_MAI } });
  await EducationalCredential.updateMany({ student: OLD_HS_C }, { $set: { student: hs1201._id } });
  await EducationalCredential.updateMany({ issuer: { $nin: validGvIds } }, { $set: { issuer: ID.GV_MAI } });

  // Sua Admins
  const admins = await Admin.find({}).sort({ createdAt: 1 });
  const adminNames = ['Ban Giám Hiệu - Thầy Lê Văn Minh', 'Phó Hiệu Trưởng - Cô Nguyễn Thị Lan'];
  for (const [i, ad] of admins.entries()) {
    await Admin.updateOne({ _id: ad._id }, { $set: { HoTen: adminNames[i % adminNames.length] } });
  }

  // Sua Users (xoa sach User_DID#, Teacher_DID#, Student_DID#)
  const USER_PROFILES = [
    { fullName: 'Ban Giám Hiệu - Thầy Lê Văn Minh', email: 'bgh.minhlv@thucnghiemhuit.edu.vn', role: 'admin', schoolId: 'BGH_01', homeroomClass: '' },
    { fullName: 'Cô Trần Thị Mai', email: 'mai.tt@thucnghiemhuit.edu.vn', role: 'teacher', schoolId: 'GV_STEM_02', homeroomClass: '11A2', ToBoMon: 'Tổ Khoa học Tự nhiên & STEM' },
    { fullName: 'Thầy Nguyễn Văn Toàn', email: 'toan.nv@thucnghiemhuit.edu.vn', role: 'teacher', schoolId: 'GV_TOAN_01', homeroomClass: '10A1', ToBoMon: 'Tổ Toán - Tin học' },
    { fullName: 'Trần Thị Phương', email: 'hs1001@thucnghiemhuit.edu.vn', role: 'student', schoolId: 'HS1001', homeroomClass: '10A1', DiemTongKet: 8.9, KhoiLop: 10 },
    { fullName: 'Nguyễn Gia Bảo', email: 'hs1002@thucnghiemhuit.edu.vn', role: 'student', schoolId: 'HS1002', homeroomClass: '10A1', DiemTongKet: 8.4, KhoiLop: 10 },
    { fullName: 'Lê Bảo Châu', email: 'hs1003@thucnghiemhuit.edu.vn', role: 'student', schoolId: 'HS1003', homeroomClass: '10A1', DiemTongKet: 8.6, KhoiLop: 10 },
    { fullName: 'Phó Hiệu Trưởng - Cô Nguyễn Thị Lan', email: 'bgh.lannt@thucnghiemhuit.edu.vn', role: 'admin', schoolId: 'BGH_02', homeroomClass: '' },
    { fullName: 'Cô Lê Thị Thu Hà', email: 'ha.ltt@thucnghiemhuit.edu.vn', role: 'teacher', schoolId: 'GV_VAN_03', homeroomClass: '10A2', ToBoMon: 'Tổ Ngữ văn' },
    { fullName: 'Phạm Minh Khôi', email: 'hs1004@thucnghiemhuit.edu.vn', role: 'student', schoolId: 'HS1004', homeroomClass: '10A1', DiemTongKet: 7.9, KhoiLop: 10 },
    { fullName: 'Võ Minh Trí', email: 'hs1101@thucnghiemhuit.edu.vn', role: 'student', schoolId: 'HS1101', homeroomClass: '11A2', DiemTongKet: 9.0, KhoiLop: 11 },
    { fullName: 'Thầy Đỗ Minh Khang', email: 'khang.dm@thucnghiemhuit.edu.vn', role: 'teacher', schoolId: 'GV_ANH_04', homeroomClass: '12A1', ToBoMon: 'Tổ Ngoại ngữ' }
  ];
  const users = await User.find({}).sort({ createdAt: 1 }).lean();
  for (const [i, u] of users.entries()) {
    const p = USER_PROFILES[i % USER_PROFILES.length];
    await mongoose.connection.db.collection('users').updateOne({ _id: u._id }, {
      $set: {
        fullName: p.fullName, HoTen: p.fullName, hoTen: p.fullName,
        email: p.email, Email: p.email, role: p.role,
        school: SCHOOL, schoolId: p.schoolId,
        MaHS: p.role === 'student' ? p.schoolId : '',
        MaGV: p.role === 'teacher' ? p.schoolId : '',
        homeroomClass: p.homeroomClass, profileUpdated: true,
        DiemTongKet: p.DiemTongKet || 0, KhoiLop: p.KhoiLop || 10,
        ToBoMon: p.ToBoMon || 'Tổ Khoa học Tự nhiên & STEM'
      }
    });
  }

  // Sua QrCode va AITrainingData
  const qrDocs = await QrCode.find({}).sort({ createdAt: 1 });
  for (const [i, q] of qrDocs.entries()) {
    const uid = q.role === 'TEACHER_ROLE' ? [ID.GV_TOAN, ID.GV_MAI][i % 2] : allIds[i % allIds.length];
    await QrCode.updateOne({ _id: q._id }, { $set: { user_id: uid } });
  }
  const aiTrainDocs = await AITrainingData.find({}).sort({ createdAt: 1 });
  for (const [i, at] of aiTrainDocs.entries()) {
    await AITrainingData.updateOne({ _id: at._id }, {
      $set: { studentId: allIds[i % allIds.length], teacherId: ID.GV_TOAN, challengeId: ID.CHL_PYTHON }
    });
  }

  // Self-check: diem trung binh hoc ba 7 mon phai la 8.9
  const grades = await DiemSo.find({ HocSinh: ID.HS1001, DeTai: { $in: (await DeTai.find({ MaDeTai: /^DEMO_/ }, '_id')).map(d => d._id) } }, 'Diem');
  const avg = Math.round(grades.reduce((a, g) => a + g.Diem, 0) / grades.length * 10) / 10;
  console.assert(grades.length === 7 && avg === 8.9, `Hoc ba HS1001 sai: ${grades.length} mon, DTB ${avg}`);
  console.log(`Seed xong. Hoc ba HS1001: ${grades.length} mon, DTB ${avg}`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });

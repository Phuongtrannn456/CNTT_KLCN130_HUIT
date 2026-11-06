/**
 * Script chuan hoa toan dien CSDL MongoDB sang 100% Giao duc Pho thong K-12 (GDPT 2018)
 * va xuat lai tron bo du lieu ra /Volumes/Hybridd06/Hoc_Tap/KLTN/data_export
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const EXPORT_DIR = '/Volumes/Hybridd06/Hoc_Tap/KLTN/data_export';
const JSON_DIR = path.join(EXPORT_DIR, 'json');
const CSV_DIR = path.join(EXPORT_DIR, 'csv');

// 50 de tai Du an STEM & Nghien cuu KHKT cap THPT (Khoi 10, 11, 12) thay the cho DT001..DT050
const K12_STEM_TOPICS = [
  { title: 'Nghiên cứu chế tạo trạm quan trắc bụi mịn PM2.5 và cảnh báo chất lượng không khí lớp học', field: 'Vật lý & IoT', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Ứng dụng thị giác máy tính phân loại rác thải nhựa tái chế tại trường THPT', field: 'Tin học & AI', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Thiết kế hệ thống tưới cây nhỏ giọt tự động sử dụng năng lượng mặt trời cho vườn trường', field: 'Công nghệ & Sinh học', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Chế tạo giấy chỉ thị pH sinh học từ dịch chiết hoa đậu biếc và bắp cải tím', field: 'Hóa học thực nghiệm', grade: [10], type: 'MonHoc' },
  { title: 'Mô hình cánh tay robot phân loại nông sản theo màu sắc sử dụng vi điều khiển Arduino', field: 'Vật lý & Robotics', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Xây dựng sổ tay điện tử nhận diện các loài thực vật hạt kín trong khuôn viên nhà trường', field: 'Sinh học & Tin học', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Thiết kế gậy thông minh hỗ trợ người khiếm thị phát hiện vật cản và cảnh báo âm thanh', field: 'Vật lý & Công nghệ', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Ứng dụng mô hình toán học thống kê phân tích thói quen sử dụng thiết bị số của học sinh THPT', field: 'Toán học ứng dụng', grade: [10, 11, 12], type: 'MonHoc' },
  { title: 'Nghiên cứu quy trình sản xuất màng bọc thực phẩm phân hủy sinh học từ tinh bột vỏ sắn', field: 'Hóa học & Môi trường', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Hệ thống điểm danh học sinh tự động kết hợp đo thân nhiệt tại cổng trường phổ thông', field: 'Tin học & IoT', grade: [10, 11, 12], type: 'DU_AN_STEM' },
  { title: 'Chế tạo mô hình máy lọc nước nhiễm phèn quy mô hộ gia đình từ phụ phẩm nông nghiệp', field: 'Hóa học & Sinh học', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Phần mềm mô phỏng chuyển động ném xiên và dao động điều hòa hỗ trợ học tập môn Vật lý', field: 'Vật lý & Tin học', grade: [10, 12], type: 'MonHoc' },
  { title: 'Thiết kế mũ bảo hiểm thông minh cảnh báo buồn ngủ và phát hiện va chạm cho học sinh đi xe điện', field: 'Công nghệ & IoT', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Nghiên cứu ảnh hưởng của ánh sáng đèn LED đơn sắc đến sự sinh trưởng của rau mầm thủy canh', field: 'Sinh học thực nghiệm', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Xây dựng trợ lý học tập môn Lịch sử Việt Nam bằng sơ đồ tư duy tương tác số hóa', field: 'Tin học ứng dụng', grade: [10, 11, 12], type: 'MonHoc' },
  { title: 'Hệ thống cảnh báo sớm rò rỉ khí gas và tự động ngắt van an toàn trong phòng thí nghiệm hóa học', field: 'Vật lý & Hóa học', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Ứng dụng mạng nơ-ron tích chập nhận diện sớm bệnh đốm lá và đạo ôn trên cây lúa', field: 'Sinh học & AI', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Chế tạo dung dịch rửa tay kháng khuẩn sinh học từ tinh dầu vỏ bưởi và sả chanh tự nhiên', field: 'Hóa học & Sinh học', grade: [10], type: 'MonHoc' },
  { title: 'Thiết kế mô hình nhà nổi chống lũ tự cân bằng thích ứng biến đổi khí hậu vùng đồng bằng', field: 'Vật lý & Công nghệ', grade: [10, 11], type: 'STEM_KHKT' },
  { title: 'Ứng dụng thuật toán đồ thị tìm đường đi ngắn nhất cho xe buýt đưa đón học sinh THPT', field: 'Toán học & Tin học', grade: [11, 12], type: 'DU_AN_STEM' },
  { title: 'Nghiên cứu chế tạo gạch không nung thân thiện môi trường kết hợp vỏ trấu và tro bay', field: 'Hóa học & Vật liệu', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Hệ thống điều khiển chiếu sáng và quạt thông gió tiết kiệm điện thông minh cho phòng học', field: 'Vật lý & IoT', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Xây dựng bộ học liệu thực tế ảo tăng cường (AR) trực quan hóa cấu trúc phân tử hữu cơ lớp 11', field: 'Hóa học & Tin học', grade: [11], type: 'MonHoc' },
  { title: 'Thiết kế phao cứu sinh tự động phát tín hiệu định vị GPS hỗ trợ phòng chống đuối nước học đường', field: 'Công nghệ & Vật lý', grade: [10, 11, 12], type: 'STEM_KHKT' },
  { title: 'Khảo sát và xây dựng bản đồ số chất lượng tiếng ồn học đường theo khung giờ học tập', field: 'Vật lý & Môi trường', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Nghiên cứu lên men chế phẩm sinh học EM từ rác thải hữu cơ nhà ăn trường học làm phân bón', field: 'Sinh học & Hóa học', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Thiết kế thiết bị đeo tay theo dõi nhịp tim và cảnh báo vận động quá sức trong giờ Thể dục', field: 'Sinh học & IoT', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Ứng dụng hình học không gian và in 3D chế tạo bộ mô hình đa diện đều phục vụ dạy học Toán 11', field: 'Toán học & STEM', grade: [11], type: 'MonHoc' },
  { title: 'Hệ thống giám sát độ ẩm đất và tự động phun sương cho vườn lan nhà lưới trường THPT', field: 'Công nghệ & Sinh học', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Phát triển ứng dụng chuyển đổi ngôn ngữ ký hiệu tay sang văn bản tiếng Việt hỗ trợ học sinh hòa nhập', field: 'Tin học & AI', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Nghiên cứu tách chiết sắc tố анtocyanin từ vỏ quả thanh long ruột đỏ làm màu thực phẩm an toàn', field: 'Hóa học ứng dụng', grade: [10, 11], type: 'MonHoc' },
  { title: 'Chế tạo mô hình thuyền thu gom rác mặt nước điều khiển từ xa bằng sóng vô tuyến và năng lượng mặt trời', field: 'Vật lý & Robotics', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Xây dựng cổng tra cứu bảng tuần hoàn các nguyên tố hóa học tích hợp video thí nghiệm mô phỏng', field: 'Hóa học & Tin học', grade: [10], type: 'MonHoc' },
  { title: 'Thiết kế thiết bị nhắc nhở tư thế ngồi học chống gù lưng và cận thị sử dụng cảm biến siêu âm', field: 'Vật lý & Sinh học', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Nghiên cứu sản xuất giấy nghệ thuật và hộp đựng bút phân hủy sinh học từ sợi thân cây chuối', field: 'Sinh học & Công nghệ', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Ứng dụng học máy dự báo nguy cơ ngập úng cục bộ khu vực trường học dựa trên dữ liệu lượng mưa', field: 'Tin học & Địa lý', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Thiết kế bộ thí nghiệm quang hình học giá rẻ từ đèn laser bán dẫn và vật liệu tái chế', field: 'Vật lý thực nghiệm', grade: [11], type: 'MonHoc' },
  { title: 'Hệ thống tủ thuốc y tế học đường thông minh tự động kiểm kê hạn sử dụng và hướng dẫn sơ cứu', field: 'Sinh học & Tin học', grade: [10, 11, 12], type: 'DU_AN_STEM' },
  { title: 'Nghiên cứu chế tạo viên nén đuổi muỗi sinh học từ bã cà phê, tinh dầu tràm và vỏ cam', field: 'Hóa học & Sinh học', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Mô hình trạm sạc xe đạp điện thông minh sử dụng kết hợp năng lượng gió và pin mặt trời', field: 'Vật lý & Công nghệ', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Xây dựng phần mềm luyện tập trắc nghiệm thuật toán và cấu trúc dữ liệu cho đội tuyển Tin học trẻ', field: 'Tin học phổ thông', grade: [10, 11, 12], type: 'MonHoc' },
  { title: 'Nghiên cứu khả năng hấp phụ kim loại nặng trong nước thải phòng thí nghiệm bằng than hoạt tính vỏ dừa', field: 'Hóa học môi trường', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Thiết kế hệ thống phân loại và đếm số lượng sách trả tự động tại thư viện trường THPT', field: 'Tin học & IoT', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Ứng dụng định lý lượng giác và cảm biến gia tốc chế tạo thước đo chiều cao cây xanh điện tử', field: 'Toán học & Vật lý', grade: [10], type: 'MonHoc' },
  { title: 'Nghiên cứu bảo quản trái cây tươi sau thu hoạch bằng màng phủ chitosan chiết xuất từ vỏ tôm', field: 'Hóa học & Sinh học', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Chế tạo mô hình cầu nâng thủy lực và khảo sát định luật Pascal bằng xi-lanh y tế', field: 'Vật lý & STEM', grade: [10], type: 'MonHoc' },
  { title: 'Hệ thống lồng ấp trứng gia cầm tự động đảo trứng và cân bằng nhiệt ẩm điều khiển qua điện thoại', field: 'Công nghệ & Sinh học', grade: [10, 11], type: 'DU_AN_STEM' },
  { title: 'Phát triển công cụ kiểm tra độ tương đồng báo cáo nghiên cứu khoa học cho học sinh phổ thông', field: 'Tin học & AI', grade: [11, 12], type: 'STEM_KHKT' },
  { title: 'Thiết kế mô hình kính thiên văn khúc xạ nghiệp dư phục vụ câu lạc bộ Vật lý thiên văn trường THPT', field: 'Vật lý & Quang học', grade: [10, 11, 12], type: 'DU_AN_STEM' },
  { title: 'Ứng dụng công nghệ chuỗi khối lưu trữ nhật ký thực hành thí nghiệm Khoa học tự nhiên K-12', field: 'Tin học & Web3', grade: [11, 12], type: 'STEM_KHKT' }
];

const CHALLENGE_UPDATES = {
  'CHL-1791345479056': {
    challengeId: 'CHL-BIO-005',
    title: 'Thực hành Sinh học 10: Quan sát và làm tiêu bản tế bào thực vật',
    description: 'Học sinh chuẩn bị mẫu biểu bì vảy hành, nhuộm tiêu bản và chụp ảnh hiển vi kèm báo cáo giải phẫu tế bào thực vật.',
    detailedDescription: 'Thử thách thực hành môn Sinh học lớp 10 theo chương trình GDPT 2018. Học sinh làm việc cá nhân hoặc nhóm đôi tại phòng thí nghiệm.'
  },
  'CHL-1792377184505': {
    challengeId: 'CHL-PHYS-006',
    title: 'Thử thách Vật lý 11: Thiết kế mạch điện cảm biến ánh sáng tiết kiệm năng lượng',
    description: 'Chế tạo mạch bật/tắt đèn hành lang lớp học tự động theo cường độ ánh sáng môi trường sử dụng quang trở LDR.',
    detailedDescription: 'Ứng dụng kiến thức dòng điện không đổi và linh kiện bán dẫn môn Vật lý 11 để giải quyết bài toán tiết kiệm điện học đường.'
  },
  'CHL-1792377318366': {
    challengeId: 'CHL-CHEM-007',
    title: 'Thử thách Hóa học 10: Chế tạo bộ chỉ thị màu pH tự nhiên từ thực vật',
    description: 'Chiết xuất dịch màu từ bắp cải tím và hoa đậu biếc để lập thang đo pH kiểm tra các dung dịch sinh hoạt hàng ngày.',
    detailedDescription: 'Thử thách STEM Hóa học giúp học sinh nắm vững khái niệm axit - bazơ và phương pháp chuẩn độ màu an toàn.'
  },
  'CHL-1792377375559': {
    challengeId: 'CHL-ROB-008',
    title: 'Thử thách Robotics 11: Mô hình xe tự hành dò đường và tránh vật cản siêu âm',
    description: 'Lắp ráp và lập trình xe robot giáo dục sử dụng cảm biến hồng ngoại kết hợp cảm biến siêu âm HC-SR04.',
    detailedDescription: 'Rèn luyện tư duy thuật toán điều khiển tự động và kỹ năng lắp ráp cơ điện tử dành cho câu lạc bộ STEM khối 11.'
  },
  'CHL-1792377590815': {
    challengeId: 'CHL-TIN-009',
    title: 'Thử thách Tin học 12: Ứng dụng học máy nhận diện sâu bệnh lá lúa qua hình ảnh',
    description: 'Huấn luyện mô hình phân loại ảnh lá lúa khỏe mạnh và lá nhiễm bệnh bạc lá hỗ trợ nông nghiệp địa phương.',
    detailedDescription: 'Thử thách ứng dụng Trí tuệ nhân tạo cấp THPT kết hợp lưu trữ bộ trọng số và báo cáo thực nghiệm trên mạng IPFS.'
  },
  'CHL-1792377602746': {
    challengeId: 'CHL-ENV-010',
    title: 'Thử thách Môi trường K-12: Thiết kế hệ thống lọc nước mưa sinh hoạt đa tầng',
    description: 'Xây dựng mô hình cột lọc nước sử dụng cát thạch anh, sỏi, than hoạt tính gáo dừa và kiểm nghiệm độ trong của nước.',
    detailedDescription: 'Dự án học tập liên môn Hóa học - Sinh học - Công nghệ giáo dục ý thức bảo vệ nguồn nước sạch trong nhà trường.'
  },
  'CHL-DEMO-001': {
    challengeId: 'CHL-STEM-011',
    title: 'Thử thách KHKT Cấp Trường: Hệ thống nhà màng nông nghiệp thông minh IoT & AI',
    description: 'Dự án nghiên cứu chế tạo nhà màng thông minh, thu thập độ ẩm đất và điều khiển chiếu sáng tự động cho vườn trường.',
    detailedDescription: 'Thử thách nghiên cứu khoa học kỹ thuật dành cho học sinh THPT tích hợp cảm biến IoT và xác thực nhật ký thực nghiệm trên Blockchain.'
  }
};

function toCsvValue(val) {
  if (val === null || val === undefined) return '""';
  let str;
  if (typeof val === 'object') {
    str = JSON.stringify(val);
  } else {
    str = String(val);
  }
  return `"${str.replace(/"/g, '""')}"`;
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Missing MONGODB_URI in backend/.env');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log('Connected to MongoDB:', db.databaseName);

  // --export-only: chi xuat du lieu, khong chuan hoa/xoa seed lai (giu nguyen du lieu demo)
  if (!process.argv.includes('--export-only')) {
  // 1. Xoa 6 bang thua tu he thong Dai hoc cu
  const legacyCollections = ['sinhviens', 'giangviens', 'students', 'teachers', 'dangkyDetais', 'participations'];
  const existingCols = (await db.listCollections().toArray()).map(c => c.name);
  for (const colName of legacyCollections) {
    if (existingCols.includes(colName)) {
      await db.collection(colName).drop();
      console.log(`Dropped legacy collection: ${colName}`);
    }
    const jf = path.join(JSON_DIR, `${colName}.json`);
    const cf = path.join(CSV_DIR, `${colName}.csv`);
    if (fs.existsSync(jf)) fs.unlinkSync(jf);
    if (fs.existsSync(cf)) fs.unlinkSync(cf);
  }

  // Lay danh sach giao vien, hoc sinh, lop hoc, mon hoc de gan lien ket chuan
  const giaoViens = await db.collection('giaoviens').find({}).toArray();
  const hocSinhs = await db.collection('hocsinhs').find({}).toArray();
  const lopHocs = await db.collection('lophocs').find({}).toArray();
  const monHocs = await db.collection('monhocs').find({}).toArray();

  // 2. Chuan hoa bang hocsinhs (bo GPA, ChuyenNganh -> dung DiemTongKet, ToHopMon)
  for (const hs of hocSinhs) {
    const diem = hs.DiemTongKet && hs.DiemTongKet > 0 ? hs.DiemTongKet : (hs.GPA || 8.5);
    let toHop = hs.ToHopMon || hs.ChuyenNganh || 'Tổ hợp Khoa học Tự nhiên & STEM';
    if (toHop === 'Khoa Học Tự Nhiên & STEM') toHop = 'Tổ hợp Khoa học Tự nhiên & STEM';
    if (toHop === 'Toán & KHTN') toHop = 'Tổ hợp Toán - Khoa học Tự nhiên';
    await db.collection('hocsinhs').updateOne(
      { _id: hs._id },
      {
        $set: {
          DiemTongKet: diem,
          ToHopMon: toHop,
          KhoiLop: hs.KhoiLop || 10,
          HanhKiem: hs.HanhKiem || 'Tốt',
          TruongHoc: (hs.TruongHoc || 'Trường THPT Chuyên KHTN & STEM').replace(/Khoa Học/g, 'KHTN')
        },
        $unset: { GPA: '', ChuyenNganh: '' }
      }
    );
  }
  console.log('Normalized collection: hocsinhs');

  // 3. Chuan hoa bang giaoviens (bo ChuyenNganh -> dung ToBoMon)
  for (const gv of giaoViens) {
    const toBoMon = (gv.ToBoMon || gv.ChuyenNganh || 'Tổ Toán - Tin học').replace(/Khoa Học Tự Nhiên/g, 'KHTN');
    await db.collection('giaoviens').updateOne(
      { _id: gv._id },
      {
        $set: { ToBoMon: toBoMon },
        $unset: { ChuyenNganh: '' }
      }
    );
  }
  console.log('Normalized collection: giaoviens');

  // 4. Chuan hoa bang users & rolerequests
  const users = await db.collection('users').find({}).toArray();
  for (const u of users) {
    const diem = u.DiemTongKet || u.GPA || u.gpa || 0;
    const toBoMon = (u.ToBoMon || u.department || u.ChuyenNganh || u.chuyenNganh || 'Tổ STEM & Tin học').replace(/Khoa Học Tự Nhiên/g, 'KHTN');
    await db.collection('users').updateOne(
      { _id: u._id },
      {
        $set: {
          DiemTongKet: diem,
          ToBoMon: toBoMon,
          KhoiLop: u.KhoiLop || u.gradeLevel || 10
        },
        $unset: { GPA: '', gpa: '', ChuyenNganh: '', chuyenNganh: '', department: '' }
      }
    );
  }
  await db.collection('rolerequests').updateMany(
    {},
    [
      {
        $set: {
          toBoMon: { $ifNull: ['$toBoMon', 'Tổ STEM & Tin học'] }
        }
      },
      {
        $unset: ['chuyenNganh', 'ChuyenNganh']
      }
    ]
  );
  console.log('Normalized collections: users, rolerequests');

  // 5. Chuan hoa lophocs, monhocs, baocaos, dangkydetais (xoa GiangVien, SinhVien)
  for (const lh of lopHocs) {
    const tenLop = (lh.TenLopHoc || '').replace(/Khoa Học Tự Nhiên/g, 'KHTN');
    await db.collection('lophocs').updateOne(
      { _id: lh._id },
      {
        $set: { TenLopHoc: tenLop },
        $unset: { GiangVien: '', SinhVien: '' }
      }
    );
  }
  for (const mh of monHocs) {
    const tenMh = (mh.TenMonHoc || '').replace(/Khoa Học Tự Nhiên/g, 'KHTN');
    const moTaMh = (mh.MoTa || '').replace(/Khoa học/gi, 'KHTN');
    await db.collection('monhocs').updateOne(
      { _id: mh._id },
      {
        $set: { TenMonHoc: tenMh, MoTa: moTaMh },
        $unset: { GiangVien: '' }
      }
    );
  }
  await db.collection('baocaos').updateMany({}, { $unset: { SinhVien: '' } });

  const dkList = await db.collection('dangkydetais').find({}).toArray();
  for (const dk of dkList) {
    const cleanedMembers = (dk.ThanhVien || []).map(tv => {
      const copy = { ...tv };
      delete copy.SinhVien;
      return copy;
    });
    await db.collection('dangkydetais').updateOne(
      { _id: dk._id },
      {
        $set: { ThanhVien: cleanedMembers },
        $unset: { SinhVien: '' }
      }
    );
  }
  console.log('Normalized collections: lophocs, monhocs, baocaos, dangkydetais');

  // 6. Chuan hoa toan bo 55 ban ghi trong bang detais
  const deTais = await db.collection('detais').find({}).sort({ createdAt: 1 }).toArray();
  let dtIdx = 0;
  for (const dt of deTais) {
    const isAutoUniTopic = /^DT\d{3}$/.test(dt.MaDeTai || '');
    let updateFields = {
      HienThiChiTietChoHS: dt.HienThiChiTietChoHS !== undefined ? dt.HienThiChiTietChoHS : Boolean(dt.HienThiChiTietChoSV),
      SoLuongHocSinh: dt.SoLuongHocSinh || dt.SoLuongSinhVien || 2,
      LoaiDeTai: dt.LoaiDeTai === 'KhoaLuan' ? 'DU_AN_STEM' : (dt.LoaiDeTai || 'DU_AN_STEM')
    };

    if (isAutoUniTopic && dtIdx < K12_STEM_TOPICS.length) {
      const tpl = K12_STEM_TOPICS[dtIdx];
      const numStr = String(dtIdx + 1).padStart(3, '0');
      const mhObj = monHocs[dtIdx % monHocs.length];
      updateFields = {
        ...updateFields,
        MaDeTai: `STEM_${numStr}`,
        TenDeTai: tpl.title,
        MoTa: `Dự án học tập ${tpl.field} dành cho học sinh THPT (Khối ${tpl.grade.join(', ')}): ${tpl.title}.`,
        MoTaChiTiet: `Nhóm học sinh vận dụng kiến thức liên môn ${tpl.field} theo chương trình GDPT 2018 để thiết kế mô hình, thu thập số liệu thực nghiệm và nộp báo cáo kết quả lên hệ thống Web3 của nhà trường.`,
        YeuCau: [
          `Nắm vững kiến thức nền tảng môn ${tpl.field}`,
          'Kỹ năng làm việc nhóm và thực hành thí nghiệm an toàn',
          'Ghi chép nhật ký tiến độ hàng tuần trung thực'
        ],
        ChiTietBoSung: [
          {
            TieuDe: 'Địa điểm & Thiết bị thực hành',
            NoiDung: 'Học sinh thực hiện tại Phòng thực hành STEM nhà trường dưới sự hướng dẫn của giáo viên bộ môn',
            _id: dt.ChiTietBoSung?.[0]?._id || new mongoose.Types.ObjectId()
          }
        ],
        LoaiDeTai: tpl.type,
        KhoiLopYeuCau: tpl.grade,
        SoLuongHocSinh: (dtIdx % 3) + 2,
        MonHoc: mhObj ? mhObj._id : dt.MonHoc
      };
      dtIdx++;
    } else {
      // Cac de tai DA_STEM_01, DA_AI_02, DA_KHKT_03, DEMO_HD_SBERT_01, STEM_111039
      let cleanTitle = (dt.TenDeTai || '')
        .replace('[DEMO HỘI ĐỒNG]', '[DỰ ÁN STEM MẪU]')
        .replace('Hệ thống quan trắc chất lượng nước ao nuôi tôm IoTHệ thống cảnh báo cháy rừng sớm IoT', 'Hệ thống quan trắc chất lượng nước ao nuôi và cảnh báo sớm môi trường IoT');
      let cleanMoTa = (dt.MoTa || '').replace(/sinh viên/gi, 'học sinh').replace(/giảng viên/gi, 'giáo viên').replace(/khóa luận/gi, 'dự án STEM');
      let cleanMoTaChiTiet = (dt.MoTaChiTiet || '').replace(/sinh viên/gi, 'học sinh').replace(/giảng viên/gi, 'giáo viên');
      updateFields.TenDeTai = cleanTitle;
      updateFields.MoTa = cleanMoTa;
      updateFields.MoTaChiTiet = cleanMoTaChiTiet;
      if (!dt.KhoiLopYeuCau || dt.KhoiLopYeuCau.length === 0) {
        updateFields.KhoiLopYeuCau = [10, 11, 12];
      }
    }

    // Lam sach tu "khoa học" neu bi quet nham hoac giu chuan KHTN
    await db.collection('detais').updateOne(
      { _id: dt._id },
      {
        $set: updateFields,
        $unset: {
          GiangVienHuongDan: '',
          SoLuongSinhVien: '',
          HienThiChiTietChoSV: ''
        }
      }
    );
  }
  console.log(`Normalized collection: detais (${deTais.length} records, converted ${dtIdx} DTxxx topics to K-12 STEM)`);

  // 7. Chuan hoa challenges, submissions, evaluations
  const challenges = await db.collection('challenges').find({}).toArray();
  for (const ch of challenges) {
    const up = CHALLENGE_UPDATES[ch.challengeId];
    if (up) {
      await db.collection('challenges').updateOne(
        { _id: ch._id },
        {
          $set: {
            challengeId: up.challengeId,
            title: up.title,
            description: up.description,
            detailedDescription: up.detailedDescription,
            subject: ch.subject || 'STEM & KHTN',
            eligibleGrades: ch.eligibleGrades?.length ? ch.eligibleGrades : [10, 11, 12]
          }
        }
      );
    }
  }

  const evals = await db.collection('evaluations').find({}).toArray();
  for (const ev of evals) {
    if (ev.teacherFeedback === 'T?t' || ev.teacherFeedback === 'Excellent work!') {
      await db.collection('evaluations').updateOne(
        { _id: ev._id },
        {
          $set: {
            teacherFeedback: ev.teacherFeedback === 'T?t'
              ? 'Báo cáo dự án STEM của nhóm học sinh đạt yêu cầu tốt, số liệu thực nghiệm rõ ràng.'
              : 'Nhóm học sinh hoàn thành xuất sắc thử thách STEM, mô hình hoạt động ổn định và sáng tạo.'
          }
        }
      );
    }
  }

  const subs = await db.collection('submissions').find({}).toArray();
  for (const sub of subs) {
    if (sub.content && sub.content.length < 30) {
      await db.collection('submissions').updateOne(
        { _id: sub._id },
        {
          $set: {
            content: 'Báo cáo kết quả thực hành dự án STEM cấp THPT: Nhóm học sinh đã hoàn thiện mô hình cảm biến, đo đạc số liệu thực nghiệm tại phòng thực hành và đối chiếu chuẩn đầu ra chương trình GDPT 2018.'
          }
        }
      );
    }
  }
  console.log('Normalized collections: challenges, evaluations, submissions');

  // 8. Bo sung du lieu mau chuan K-12 cho baocaos va 4 bang: tiendos, diemsos, ailogs, loimoilophocs
  const nhoms = await db.collection('nhoms').find({}).toArray();
  const primaryDeTai = deTais[0];
  const secondDeTai = deTais[1] || deTais[0];
  const thirdDeTai = deTais[2] || deTais[0];
  const primaryNhom = nhoms[0];
  const secondNhom = nhoms[1] || nhoms[0];
  const thirdNhom = nhoms[2] || nhoms[0];
  const hs1 = hocSinhs[0];
  const hs2 = hocSinhs[1] || hocSinhs[0];
  const hs3 = hocSinhs[2] || hocSinhs[0];
  const gv1 = giaoViens[0];
  const gv2 = giaoViens[1] || giaoViens[0];
  const lop1 = lopHocs[0];
  const lop2 = lopHocs[1] || lopHocs[0];
  const now = new Date('2026-10-25T08:30:00.000Z');

  // Dam bao co du 3 BaoCao K-12 de lien ket 1-1 voi DiemSo va AILog
  let baoCaos = await db.collection('baocaos').find({}).toArray();
  if (baoCaos.length < 3) {
    const extraBaoCaos = [
      {
        DeTai: secondDeTai._id,
        HocSinh: hs2._id,
        Nhom: secondNhom._id,
        TieuDe: 'Báo cáo dự án STEM: Ứng dụng Trí tuệ nhân tạo phân loại rác thải tại nguồn trong trường phổ thông',
        IPFS_CID: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        SubmitTxHash: '0x5a22b0d394f82c350e16d7b992f8a4530b1c2d3e4f5a6b7c8d9e0f1a2b3c4d55',
        ExtractedText: 'BÁO CÁO NGHIÊN CỨU KHOA HỌC KỸ THUẬT CẤP THPT\nĐỀ TÀI: ỨNG DỤNG TRÍ TUỆ NHÂN TẠO PHÂN LOẠI RÁC THẢI TẠI NGUỒN TRONG TRƯỜNG PHỔ THÔNG\nNhóm thực hiện: Nhóm STEM Ưu Tú - Khối 10\n1. Tính mới và sáng tạo: Xây dựng thùng rác thông minh sử dụng camera nhận diện vỏ chai nhựa, lon nhôm và giấy vụn tại hành lang lớp học.\n2. Phương pháp thực nghiệm: Thu thập 500 mẫu ảnh thực tế tại trường THPT, độ chính xác phân loại đạt 94.2%.\n3. Kết luận: Góp phần giáo dục ý thức bảo vệ môi trường xanh - sạch - đẹp cho học sinh phổ thông.',
        ExtractedAt: now,
        PageCount: 6,
        ExtractionMethod: 'native',
        ExtractionWarnings: [],
        NgayNop: now,
        createdAt: now,
        updatedAt: now
      },
      {
        DeTai: thirdDeTai._id,
        HocSinh: hs3._id,
        Nhom: thirdNhom._id,
        TieuDe: 'Báo cáo KHKT Học sinh: Sổ tay theo dõi tiến độ hoạt động sáng tạo số hóa Web3',
        IPFS_CID: 'QmZTR5bcpQD7cFgTorqxZDYaew1Wqgfbd2ud9QqGPAkK2V',
        SubmitTxHash: '0x6b33c1e405a93d461f27e8c003a9b5641c2d3e4f5a6b7c8d9e0f1a2b3c4d5e66',
        ExtractedText: 'BÁO CÁO DỰ ÁN KHOA HỌC KỸ THUẬT HỌC SINH THPT\nĐỀ TÀI: SỔ TAY THEO DÕI TIẾN ĐỘ HOẠT ĐỘNG SÁNG TẠO SỐ HÓA WEB3\nNhóm thực hiện: Nhóm Sáng Tạo Trẻ - Khối 11\n1. Mục tiêu đề tài: Số hóa nhật ký thực hành thí nghiệm Vật lý - Hóa học - Sinh học của học sinh THPT theo chương trình GDPT 2018.\n2. Thực nghiệm: Triển khai thử nghiệm cho 2 lớp 10A1 và 11A2 với cơ chế xác thực chữ ký số không tốn phí Gas.\n3. Kết quả: Minh bạch hóa đánh giá quá trình và lưu trữ minh chứng học tập lâu dài.',
        ExtractedAt: now,
        PageCount: 5,
        ExtractionMethod: 'native',
        ExtractionWarnings: [],
        NgayNop: now,
        createdAt: now,
        updatedAt: now
      }
    ];
    await db.collection('baocaos').insertMany(extraBaoCaos);
    baoCaos = await db.collection('baocaos').find({}).toArray();
  }

  // 8a. tiendos (khop 100% schema TienDo.js)
  await db.collection('tiendos').deleteMany({});
  await db.collection('tiendos').insertMany([
    {
      DeTai: primaryDeTai._id,
      HocSinh: hs1._id,
      Nhom: primaryNhom._id,
      TuanSo: 1,
      LanNopLai: 0,
      LoaiCapNhat: 'Báo cáo tuần',
      MucTieuTuan: 'Khảo sát nguyên lý cảm biến bụi mịn PM2.5 và phân công nhiệm vụ các thành viên trong nhóm.',
      NoiDung: 'Nhóm học sinh đã hoàn thành sơ đồ khối mạch cảm biến ESP32 và danh mục linh kiện thực hành STEM.',
      NoiDungDaLam: 'Vẽ sơ đồ nối dây cảm biến PMS7003, DHT22 với vi điều khiển ESP32 và kiểm thử nguồn cấp.',
      KhoKhan: 'Cần hiệu chuẩn lại sai số độ ẩm của cảm biến DHT22 trong phòng máy lạnh.',
      KeHoachTuanSau: 'Lắp ráp hộp bảo vệ trạm quan trắc và đo đạc thực nghiệm tại 5 phòng học khối 10.',
      PhanTramHoanThanh: 40,
      FileDinhKem: 'NhatKy_STEM_Tuan1_Lop10A1.pdf',
      MinhChung: [
        {
          TenFile: 'SoDoMach_ESP32_PM25.pdf',
          Url: 'https://ipfs.io/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
          GhiChu: 'Sơ đồ nguyên lý mạch đo bụi mịn phòng học'
        }
      ],
      TrangThaiDanhGia: 'Dat',
      DiemTienDo: 9.0,
      NhanXetGV: 'Nhóm học sinh xác định mục tiêu nghiên cứu rõ ràng, sơ đồ nối dây mạch ESP32 chính xác.',
      GiaoVienDanhGia: gv1._id,
      NgayDanhGia: now,
      CanhBaoTienDo: [],
      TxHash: '0x7a1c8f92e3b410a65d8c219f84e30b12c77d6a55f1902b3c4d5e6f7a8b9c0d11',
      TrangThaiBlockchain: 'DaGhi',
      createdAt: now,
      updatedAt: now
    },
    {
      DeTai: primaryDeTai._id,
      HocSinh: hs1._id,
      Nhom: primaryNhom._id,
      TuanSo: 2,
      LanNopLai: 0,
      LoaiCapNhat: 'Báo cáo thực nghiệm',
      MucTieuTuan: 'Thu thập số liệu thực nghiệm nồng độ bụi PM2.5 và nhiệt ẩm tại các lớp học.',
      NoiDung: 'Hoàn thiện mô hình trạm đo chất lượng không khí tại phòng thực hành STEM và thu thập dữ liệu đo 5 phòng học khối 10.',
      NoiDungDaLam: 'Đo liên tục trong 7 ngày học, lập bảng thống kê và vẽ biểu đồ biến thiên chất lượng không khí theo giờ ra chơi.',
      KhoKhan: 'Không có.',
      KeHoachTuanSau: 'Hoàn thiện báo cáo tổng kết dự án STEM và chuẩn bị poster thuyết trình cấp trường.',
      PhanTramHoanThanh: 85,
      FileDinhKem: 'SoLieu_ThucNghiem_Tuan2_Lop10A1.pdf',
      MinhChung: [
        {
          TenFile: 'BangSoLieu_DoKhongKhi_Lop10A1.pdf',
          Url: 'https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
          GhiChu: 'Bảng số liệu thực nghiệm 7 ngày'
        }
      ],
      TrangThaiDanhGia: 'Dat',
      DiemTienDo: 9.5,
      NhanXetGV: 'Số liệu đo đạc trung thực, biểu đồ so sánh nồng độ bụi theo khung giờ trực quan.',
      GiaoVienDanhGia: gv1._id,
      NgayDanhGia: now,
      CanhBaoTienDo: [],
      TxHash: '0x8b2d9e03f4c521b76e9d320a95f41c23d88e7b66a2013c4d5e6f7a8b9c0d1e22',
      TrangThaiBlockchain: 'DaGhi',
      createdAt: now,
      updatedAt: now
    },
    {
      DeTai: secondDeTai._id,
      HocSinh: hs2._id,
      Nhom: secondNhom._id,
      TuanSo: 1,
      LanNopLai: 0,
      LoaiCapNhat: 'Báo cáo tuần',
      MucTieuTuan: 'Thu thập và gán nhãn dữ liệu hình ảnh rác thải học đường.',
      NoiDung: 'Thu thập bộ dữ liệu 500 hình ảnh rác thải tái chế tại khuôn viên trường THPT và gán nhãn 3 nhóm.',
      NoiDungDaLam: 'Chụp ảnh thực tế vỏ chai nhựa, lon nước ngọt, giấy nháp học sinh và tiền xử lý kích thước ảnh.',
      KhoKhan: 'Ánh sáng ngược tại hành lang làm một số ảnh bị mờ.',
      KeHoachTuanSau: 'Huấn luyện mô hình phân loại ảnh và tích hợp lên mạch điều khiển nắp thùng rác.',
      PhanTramHoanThanh: 55,
      FileDinhKem: 'BoDuLieu_PhanLoaiRac_Tuan1.pdf',
      MinhChung: [
        {
          TenFile: 'TapMauAnh_RacThaiHocDuong.pdf',
          Url: 'https://ipfs.io/ipfs/QmZTR5bcpQD7cFgTorqxZDYaew1Wqgfbd2ud9QqGPAkK2V',
          GhiChu: 'Bộ dữ liệu ảnh thực tế tại trường THPT'
        }
      ],
      TrangThaiDanhGia: 'Dat',
      DiemTienDo: 8.8,
      NhanXetGV: 'Đã duyệt bộ mẫu ảnh, nhóm học sinh tiếp tục huấn luyện mô hình nhận diện.',
      GiaoVienDanhGia: gv2._id,
      NgayDanhGia: now,
      CanhBaoTienDo: [],
      TxHash: '0x9c3e0f14a5d632c87f0e431b06a52d34e99f8c77b3124d5e6f7a8b9c0d1e2f33',
      TrangThaiBlockchain: 'DaGhi',
      createdAt: now,
      updatedAt: now
    }
  ]);

  // 8b. diemsos (khop 100% schema DiemSo.js voi unique index BaoCao_1)
  await db.collection('diemsos').deleteMany({});
  await db.collection('diemsos').insertMany([
    {
      BaoCao: baoCaos[0]._id,
      GiaoVienCham: gv1._id,
      HocSinh: hs1._id,
      DeTai: primaryDeTai._id,
      Nhom: primaryNhom._id,
      DiemGoc: 9.2,
      LaDieuChinh: false,
      Diem: 9.2,
      NhanXet: 'Nhóm học sinh Lớp 10A1 nắm vững kiến thức liên môn Vật lý - Tin học, mô hình IoT hoạt động ổn định.',
      AI_Score: 9.1,
      AI_Feedback: 'Mô hình PhoBERT đánh giá báo cáo có cấu trúc khoa học rõ ràng, số liệu thực nghiệm tại 5 phòng học đầy đủ.',
      RubricsResult: [
        { TenTieuChi: 'Tính mới và Sáng tạo KHTN', TrongSo: 30, DiemToiDa: 10, AI_DiemTieuChi: 9.0, GV_DiemTieuChi: 9.2, AI_NhanXetTieuChi: 'Ý tưởng thiết thực cho môi trường lớp học' },
        { TenTieuChi: 'Phương pháp nghiên cứu & Thử nghiệm', TrongSo: 40, DiemToiDa: 10, AI_DiemTieuChi: 9.2, GV_DiemTieuChi: 9.3, AI_NhanXetTieuChi: 'Có bảng đo đạc thực nghiệm 30 ngày' },
        { TenTieuChi: 'Báo cáo kỹ thuật & Trình bày kết quả', TrongSo: 30, DiemToiDa: 10, AI_DiemTieuChi: 9.0, GV_DiemTieuChi: 9.0, AI_NhanXetTieuChi: 'Trình bày mạch lạc, đúng chuẩn KHKT phổ thông' }
      ],
      TxHash: '0x4f11a9c283e71b249d05c6a881e7f3429a0b1c2d3e4f5a6b7c8d9e0f1a2b3c44',
      TrangThaiBlockchain: 'DaGhi',
      SubmissionIndex: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      BaoCao: baoCaos[1]._id,
      GiaoVienCham: gv2._id,
      HocSinh: hs2._id,
      DeTai: secondDeTai._id,
      Nhom: secondNhom._id,
      DiemGoc: 8.8,
      LaDieuChinh: false,
      Diem: 8.8,
      NhanXet: 'Dự án phân loại rác thải thông minh có tính ứng dụng thực tiễn cao trong trường phổ thông.',
      AI_Score: 8.7,
      AI_Feedback: 'Báo cáo nêu bật được quy trình thu thập 500 mẫu ảnh rác thải tái chế tại trường THPT và kiểm thử thực tế.',
      RubricsResult: [
        { TenTieuChi: 'Tính mới và Sáng tạo KHTN', TrongSo: 30, DiemToiDa: 10, AI_DiemTieuChi: 8.8, GV_DiemTieuChi: 9.0, AI_NhanXetTieuChi: 'Góp phần xây dựng trường học xanh' },
        { TenTieuChi: 'Phương pháp nghiên cứu & Thử nghiệm', TrongSo: 40, DiemToiDa: 10, AI_DiemTieuChi: 8.6, GV_DiemTieuChi: 8.8, AI_NhanXetTieuChi: 'Thực nghiệm phân loại đạt 94.2%' },
        { TenTieuChi: 'Báo cáo kỹ thuật & Trình bày kết quả', TrongSo: 30, DiemToiDa: 10, AI_DiemTieuChi: 8.7, GV_DiemTieuChi: 8.6, AI_NhanXetTieuChi: 'Cấu trúc báo cáo rõ ràng' }
      ],
      TxHash: '0x5a22b0d394f82c350e16d7b992f8a4530b1c2d3e4f5a6b7c8d9e0f1a2b3c4d55',
      TrangThaiBlockchain: 'DaGhi',
      SubmissionIndex: 1,
      createdAt: now,
      updatedAt: now
    },
    {
      BaoCao: baoCaos[2]._id,
      GiaoVienCham: gv1._id,
      HocSinh: hs3._id,
      DeTai: thirdDeTai._id,
      Nhom: thirdNhom._id,
      DiemGoc: 8.6,
      LaDieuChinh: false,
      Diem: 8.6,
      NhanXet: 'Học sinh tích cực tham gia đo đạc thực nghiệm và hoàn thành tốt phần báo cáo dự án KHKT.',
      AI_Score: 8.5,
      AI_Feedback: 'Nội dung báo cáo bám sát mục tiêu số hóa nhật ký thực hành thí nghiệm KHTN cấp THPT.',
      RubricsResult: [
        { TenTieuChi: 'Tính mới và Sáng tạo KHTN', TrongSo: 30, DiemToiDa: 10, AI_DiemTieuChi: 8.5, GV_DiemTieuChi: 8.7, AI_NhanXetTieuChi: 'Ứng dụng công nghệ số vào học đường' },
        { TenTieuChi: 'Phương pháp nghiên cứu & Thử nghiệm', TrongSo: 40, DiemToiDa: 10, AI_DiemTieuChi: 8.5, GV_DiemTieuChi: 8.6, AI_NhanXetTieuChi: 'Có khảo sát thực tế tại lớp 10A1 và 11A2' },
        { TenTieuChi: 'Báo cáo kỹ thuật & Trình bày kết quả', TrongSo: 30, DiemToiDa: 10, AI_DiemTieuChi: 8.5, GV_DiemTieuChi: 8.5, AI_NhanXetTieuChi: 'Trình bày sạch đẹp, đúng quy định' }
      ],
      TxHash: '0x6b33c1e405a93d461f27e8c003a9b5641c2d3e4f5a6b7c8d9e0f1a2b3c4d5e66',
      TrangThaiBlockchain: 'DaGhi',
      SubmissionIndex: 2,
      createdAt: now,
      updatedAt: now
    }
  ]);

  // 8c. ailogs (khop 100% schema AILog.js)
  await db.collection('ailogs').deleteMany({});
  await db.collection('ailogs').insertMany([
    {
      BaoCao: baoCaos[0]._id,
      DeTai: primaryDeTai._id,
      HocSinh: hs1._id,
      TextHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      TextLength: 1420,
      ScoreResult: {
        model: 'vinai/phobert-base',
        suggestedTotalScore: 9.1,
        confidence: 0.92,
        summary: 'Báo cáo dự án STEM Lớp 10A1 đạt chất lượng tốt, số liệu thực nghiệm đầy đủ.'
      },
      SecurityFlags: [],
      InjectionDetected: false,
      RepetitionRate: 0.04,
      ExtractionMethod: 'native',
      TimeTakenMs: 640,
      CreatedAt: now
    },
    {
      BaoCao: baoCaos[1]._id,
      DeTai: secondDeTai._id,
      HocSinh: hs2._id,
      TextHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
      TextLength: 1680,
      ScoreResult: {
        model: 'vinai/phobert-base',
        suggestedTotalScore: 8.7,
        confidence: 0.89,
        summary: 'Dự án phân loại rác thải nhựa tại trường THPT có phương pháp thử nghiệm thực tế rõ ràng.'
      },
      SecurityFlags: [],
      InjectionDetected: false,
      RepetitionRate: 0.05,
      ExtractionMethod: 'native',
      TimeTakenMs: 590,
      CreatedAt: now
    },
    {
      BaoCao: baoCaos[2]._id,
      DeTai: thirdDeTai._id,
      HocSinh: hs3._id,
      TextHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      TextLength: 1350,
      ScoreResult: {
        model: 'keepitreal/vietnamese-sbert',
        suggestedTotalScore: 8.5,
        plagiarismSimilarity: 0.12,
        summary: 'Kiểm tra độ tương đồng ngữ nghĩa SBERT giữa các báo cáo STEM trong lớp ở mức an toàn (12%).'
      },
      SecurityFlags: [],
      InjectionDetected: false,
      RepetitionRate: 0.03,
      ExtractionMethod: 'native',
      TimeTakenMs: 480,
      CreatedAt: now
    }
  ]);

  // 8d. loimoilophocs (xoa index cu LopHoc_1_SinhVien_1 neu co va khop 100% schema LoiMoiLopHoc.js)
  try {
    const idxs = await db.collection('loimoilophocs').indexes();
    for (const ix of idxs) {
      if (ix.name.includes('SinhVien') || ix.name.includes('GiangVien')) {
        await db.collection('loimoilophocs').dropIndex(ix.name);
        console.log('Dropped legacy index on loimoilophocs:', ix.name);
      }
    }
  } catch (e) {}
  await db.collection('loimoilophocs').deleteMany({});
  await db.collection('loimoilophocs').insertMany([
    {
      LopHoc: lop1._id,
      HocSinh: hs1._id,
      GiaoVien: gv1._id,
      TrangThai: 'DaChapNhan',
      createdAt: now,
      updatedAt: now
    },
    {
      LopHoc: lop1._id,
      HocSinh: hs2._id,
      GiaoVien: gv1._id,
      TrangThai: 'DaChapNhan',
      createdAt: now,
      updatedAt: now
    },
    {
      LopHoc: lop2._id,
      HocSinh: hs3._id,
      GiaoVien: gv2._id,
      TrangThai: 'ChoChapNhan',
      createdAt: now,
      updatedAt: now
    }
  ]);
  console.log('Seeded K-12 records into: baocaos, tiendos, diemsos, ailogs, loimoilophocs');
  }

  // 9. Xuat toan bo 27 bang chuan K-12 ra /Volumes/Hybridd06/Hoc_Tap/KLTN/data_export
  const finalCols = (await db.listCollections().toArray())
    .map(c => c.name)
    .filter(name => !name.startsWith('system.'))
    .sort();

  const fullDump = {
    exportedAt: new Date().toISOString(),
    databaseName: db.databaseName,
    educationLevel: 'K-12 (Giáo dục Phổ thông - Chương trình GDPT 2018)',
    totalCollections: finalCols.length,
    collections: {}
  };

  const readmeRows = [];
  let idx = 1;
  for (const colName of finalCols) {
    const docs = await db.collection(colName).find({}).toArray();
    fullDump.collections[colName] = docs;

    // Write JSON
    fs.writeFileSync(
      path.join(JSON_DIR, `${colName}.json`),
      JSON.stringify(docs, null, 2),
      'utf-8'
    );

    // Write CSV with UTF-8 BOM
    if (docs.length > 0) {
      const allKeys = [];
      const keySet = new Set();
      docs.forEach(d => {
        Object.keys(d).forEach(k => {
          if (!keySet.has(k)) {
            keySet.add(k);
            allKeys.push(k);
          }
        });
      });
      const headerLine = allKeys.map(k => toCsvValue(k)).join(',');
      const dataLines = docs.map(d => allKeys.map(k => toCsvValue(d[k])).join(','));
      const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\n');
      fs.writeFileSync(path.join(CSV_DIR, `${colName}.csv`), csvContent, 'utf-8');
    }

    readmeRows.push(
      `| ${idx} | \`${colName}\` | **${docs.length}** | [\`${colName}.json\`](./json/${colName}.json) | [\`${colName}.csv\`](./csv/${colName}.csv) |`
    );
    idx++;
  }

  fs.writeFileSync(
    path.join(EXPORT_DIR, 'full_database_dump.json'),
    JSON.stringify(fullDump, null, 2),
    'utf-8'
  );

  const readmeContent = `# DANH MỤC DỮ LIỆU ĐƯỢC XUẤT TỪ HỆ THỐNG WEB3 GIÁO DỤC PHỔ THÔNG K-12 (CNTT_KLCN130_HUIT)

- **Thời gian xuất dữ liệu:** ${new Date().toLocaleString('vi-VN')}
- **Tên cơ sở dữ liệu:** \`${db.databaseName}\` (MongoDB Cluster - Chuẩn hóa 100% Giáo dục Phổ thông K-12 theo Chương trình GDPT 2018)
- **Tổng số bảng (Collections):** ${finalCols.length}
- **Định dạng lưu trữ:**
  - Thư mục \`json/\`: Chứa file JSON chi tiết cho từng bảng dữ liệu (chuẩn REST API / Backup).
  - Thư mục \`csv/\`: Chứa file CSV mã hóa UTF-8 BOM cho từng bảng dữ liệu (mở trực tiếp bằng Microsoft Excel / Google Sheets không lỗi font tiếng Việt).
  - File \`full_database_dump.json\`: Toàn bộ cơ sở dữ liệu K-12 được đóng gói vào 1 file duy nhất.

## BẢNG THỐNG KÊ CHI TIẾT CÁC BẢNG DỮ LIỆU K-12

| STT | Tên Collection | Số Lượng Bản Ghi | File JSON | File CSV (Excel) |
| :--- | :--- | :--- | :--- | :--- |
${readmeRows.join('\n')}
`;

  fs.writeFileSync(path.join(EXPORT_DIR, 'README.md'), readmeContent, 'utf-8');
  console.log(`Successfully exported ${finalCols.length} collections to ${EXPORT_DIR}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

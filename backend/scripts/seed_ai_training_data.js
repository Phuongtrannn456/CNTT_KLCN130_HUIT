const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const AITrainingData = require('../models/AITrainingData');

async function seedAITrainingData() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web3giaovien';
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[INFO] Đã kết nối MongoDB Cloud');

    // Xóa data cũ để demo cho gọn
    await AITrainingData.deleteMany({});
    console.log('[INFO] Đã xóa dữ liệu training cũ');

    // Dummy ObjectIds
    const teacherStrictId = new mongoose.Types.ObjectId();
    const teacherEasyId = new mongoose.Types.ObjectId();
    const student1 = new mongoose.Types.ObjectId();
    const student2 = new mongoose.Types.ObjectId();
    const challengeId = new mongoose.Types.ObjectId();

    const sampleData = [
      // === GIÁO VIÊN KHÓ TÍNH (STRICT TEACHER) ===
      {
        challengeId,
        studentId: student1,
        teacherId: teacherStrictId,
        inputText: "Nhóm em đã làm được thùng rác tự mở nắp. Chúng em dùng Arduino và cảm biến để làm. Thùng rác hoạt động rất tốt và giúp bảo vệ môi trường.",
        topicRequirements: ["Sử dụng vi điều khiển (Arduino)", "Cảm biến khoảng cách", "Sơ đồ mạch điện rõ ràng"],
        aiScore: 7.0, // AI thấy đủ từ khóa "Arduino", "cảm biến" nên cho khá
        teacherScore: 5.0, // Thầy dạy Lý/Tin khó tính: "Không có mã code, không vẽ sơ đồ mạch điện, báo cáo quá sơ sài."
        delta: 2.0,
        isTrained: false
      },
      {
        challengeId,
        studentId: student2,
        teacherId: teacherStrictId,
        inputText: "Nhóm sử dụng mạch Arduino Uno R3 kết nối với cảm biến siêu âm HC-SR04 ở chân D9 và D10. Khi khoảng cách < 15cm, động cơ Servo quay 90 độ để mở nắp. Kèm theo là sơ đồ nối dây chi tiết và code C++.",
        topicRequirements: ["Sử dụng vi điều khiển (Arduino)", "Cảm biến khoảng cách", "Sơ đồ mạch điện rõ ràng"],
        aiScore: 8.5, 
        teacherScore: 9.5, // Thầy khó tính: "Báo cáo kỹ thuật xuất sắc, có phân tích chân cắm mạch điện rõ ràng."
        delta: 1.0,
        isTrained: false
      },

      // === GIÁO VIÊN DỄ TÍNH (EASY TEACHER) ===
      {
        challengeId,
        studentId: student1,
        teacherId: teacherEasyId,
        inputText: "Nhóm em đã làm được thùng rác tự mở nắp. Chúng em dùng Arduino và cảm biến để làm. Thùng rác hoạt động rất tốt và giúp bảo vệ môi trường.",
        topicRequirements: ["Sử dụng vi điều khiển (Arduino)", "Cảm biến khoảng cách", "Sơ đồ mạch điện rõ ràng"],
        aiScore: 7.0,
        teacherScore: 8.5, // Cô giáo dễ tính: "Sản phẩm có ý nghĩa thực tiễn bảo vệ môi trường, các em có cố gắng."
        delta: 1.5,
        isTrained: false
      }
    ];

    await AITrainingData.insertMany(sampleData);
    console.log(`[SUCCESS] Đã tạo thành công ${sampleData.length} mẫu dữ liệu Active Learning (Ngữ cảnh STEM K-12)!`);
    console.log('- 2 mẫu từ Thầy giáo khó tính (chú trọng kỹ thuật mạch điện/code).');
    console.log('- 1 mẫu từ Cô giáo dễ tính (chú trọng ý nghĩa sản phẩm, khích lệ).');
    
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Failed to seed AI Training Data:', error);
    process.exit(1);
  }
}

seedAITrainingData();

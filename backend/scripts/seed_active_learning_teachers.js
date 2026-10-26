require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const AITrainingData = require('../models/AITrainingData');
const Teacher = require('../models/Teacher');
const Challenge = require('../models/Challenge');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web3giaovien';

const mockSubmissions = [
  { text: "Dùng Arduino Uno, cảm biến siêu âm HC-SR04, servo motor. Code if distance < 10cm then open lid. Chạy ổn.", aiScore: 8.5 },
  { text: "Thùng rác thông minh tự động mở nắp. Dùng Arduino và cảm biến khoảng cách.", aiScore: 7.0 },
  { text: "Dự án sử dụng ESP32 kết hợp cảm biến siêu âm. Cập nhật dữ liệu thùng rác đầy lên Blynk.", aiScore: 9.0 },
  { text: "Lắp ráp mô hình thùng rác có nắp tự mở bằng servo. Đã test hoạt động tốt.", aiScore: 7.5 },
  { text: "Hệ thống phân loại rác hữu cơ và vô cơ bằng AI qua camera, điều khiển bằng Raspberry Pi.", aiScore: 9.5 }
];

async function seedTeacherStyles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const teachers = await Teacher.find().limit(2);
    if (teachers.length < 2) {
      console.log('Not enough teachers in DB');
      return;
    }
    const strictTeacherId = teachers[0]._id;
    const easyTeacherId = teachers[1]._id;

    const challenge = await Challenge.findOne();
    if (!challenge) {
      console.log('No challenge in DB');
      return;
    }
    const challengeId = challenge._id;
    const rubricCriteriaId = '65d1c4f5e4b0000000000001'; 

    const trainingRecords = [];

    // Khó tính
    for (let i = 0; i < mockSubmissions.length; i++) {
      const sub = mockSubmissions[i];
      trainingRecords.push({
        submissionId: `65d1c4f5e4b000000000010${i}`,
        challengeId,
        teacherId: strictTeacherId,
        rubricCriteriaId,
        inputText: sub.text,
        aiScore: sub.aiScore,
        teacherScore: Math.max(0, sub.aiScore - 1.5), 
        delta: Math.max(0, sub.aiScore - 1.5) - sub.aiScore,
        createdAt: new Date(Date.now() - Math.random() * 10000000000)
      });
    }

    // Dễ tính
    for (let i = 0; i < mockSubmissions.length; i++) {
      const sub = mockSubmissions[i];
      trainingRecords.push({
        submissionId: `65d1c4f5e4b000000000020${i}`,
        challengeId,
        teacherId: easyTeacherId,
        rubricCriteriaId,
        inputText: sub.text,
        aiScore: sub.aiScore,
        teacherScore: Math.min(10, sub.aiScore + 1.0), 
        delta: Math.min(10, sub.aiScore + 1.0) - sub.aiScore,
        createdAt: new Date(Date.now() - Math.random() * 10000000000)
      });
    }

    await AITrainingData.insertMany(trainingRecords);
    console.log(`✅ Đã seed thành công ${trainingRecords.length} records cho 2 gu giáo viên (Khó tính & Dễ tính).`);
    console.log(`Giáo viên khó tính (ID: ${strictTeacherId}) - Tên: ${teachers[0].fullName}`);
    console.log(`Giáo viên dễ tính (ID: ${easyTeacherId}) - Tên: ${teachers[1].fullName}`);

  } catch (error) {
    console.error('Lỗi seed:', error);
  } finally {
    mongoose.disconnect();
  }
}

seedTeacherStyles();

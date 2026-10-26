const mongoose = require('mongoose');
const Submission = require('./models/Submission');
const Challenge = require('./models/Challenge');
const ChallengeParticipation = require('./models/ChallengeParticipation');
const HocSinh = require('./models/HocSinh');
const GiaoVien = require('./models/GiaoVien');
const submissionController = require('./controllers/submissionController');

const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
};

async function runTests() {
    console.log("=== KẾT NỐI MONGODB (test_submission_race) ===");
    const dbUri = 'mongodb://127.0.0.1:27017/test_submission_race';
    await mongoose.connect(dbUri);
    if (mongoose.connection.name !== 'test_submission_race') {
        console.error('Không kết nối đúng CSDL test. Bỏ qua để an toàn.');
        process.exit(1);
    }
    await mongoose.connection.db.dropDatabase();

    const gv = await GiaoVien.create({ MaGV: 'GV1', HoTen: 'GV', Email: 'gv@test.com', WalletAddress: '0x1' });
    const hs = await HocSinh.create({ MaHS: 'HS1', HoTen: 'HS', Email: 'hs@test.com', WalletAddress: '0x2' });
    const challenge = await Challenge.create({ challengeId: 'C1', title: 'C1', description: 'Desc', createdBy: gv._id, deadline: new Date(Date.now() + 86400000) });
    const participation = await ChallengeParticipation.create({ challenge: challenge._id, student: hs._id, status: 'JOINED' });

    console.log("\n--- TEST RACE CONDITION BÀI NỘP ---");
    // Gửi 10 request đồng thời nhưng nội dung khác nhau để bypass check chống spam
    const reqs = Array.from({ length: 10 }).map((_, i) => ({
        params: { participationId: participation._id },
        user: { id: hs._id.toString() },
        body: { content: `Content ${i}`, attachments: [] }
    }));
    
    const responses = reqs.map(() => mockRes());
    
    await Promise.all(reqs.map((req, i) => submissionController.submitWork(req, responses[i])));

    const submissions = await Submission.find({ participation: participation._id }).sort({ version: 1 });
    const versions = submissions.map(s => s.version);
    
    let allPass = true;
    for (let i = 0; i < 10; i++) {
        if (responses[i].statusCode !== 201) {
            console.error(`Request ${i} bị lỗi ${responses[i].statusCode}:`, responses[i].data);
            allPass = false;
        }
    }
    
    const expectedVersions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    if (JSON.stringify(versions) !== JSON.stringify(expectedVersions)) {
        console.error(`Versions không đúng thứ tự từ 1 đến 10. Actual: ${versions}`);
        allPass = false;
    }

    console.log(`[${allPass ? 'PASS' : 'FAIL'}] Test Race Condition Submission`);
    if (!allPass) process.exit(1);

    if (mongoose.connection.name !== 'test_submission_race') {
        console.error('Lỗi: CSDL hiện tại không phải test_submission_race.');
        process.exit(1);
    }
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});

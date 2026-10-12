const mongoose = require('mongoose');
const TienDo = require('./models/TienDo');
const DeTai = require('./models/DeTai');
const HocSinh = require('./models/HocSinh');
const GiaoVien = require('./models/GiaoVien');
const DangKyDeTai = require('./models/DangKyDeTai');
const tienDoController = require('./controllers/tienDoController');

// Mock contractService
const contractService = require('./services/thesisContractService');
let submitCount = 0;
contractService.submitProgressOnChain = async () => {
    submitCount++;
    // Giả lập thành công trên Blockchain
    return '0x1234567890abcdef';
};

const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
};

async function runTests() {
    console.log("=== KẾT NỐI MONGODB (test_tiendo_retry) ===");
    const dbUri = 'mongodb://127.0.0.1:27017/test_tiendo_retry';
    await mongoose.connect(dbUri);
    if (mongoose.connection.name !== 'test_tiendo_retry') {
        console.error('Không kết nối đúng CSDL test. Bỏ qua.');
        process.exit(1);
    }
    await mongoose.connection.db.dropDatabase();

    const gv = await GiaoVien.create({ HoTen: 'GV', Email: 'gv@test.com', MaGV: 'GV1', WalletAddress: '0x1' });
    const hs = await HocSinh.create({ HoTen: 'HS', Email: 'hs@test.com', MaHS: 'HS1', WalletAddress: '0x2' });
    const deTai = await DeTai.create({ TenDeTai: 'DT1', MaDeTai: 'DT1', GiaoVienHuongDan: gv._id, Deadline: new Date() });
    
    // Tạo tiến độ LoiGhi
    const progress = await TienDo.create({
        DeTai: deTai._id,
        HocSinh: hs._id,
        TuanSo: 1,
        NoiDung: 'Test',
        TrangThaiBlockchain: 'LoiGhi',
        LoiBlockchain: 'insufficient funds'
    });

    console.log("\n--- TEST RETRY PROGRESS RACE CONDITION ---");
    // Gọi song song
    const reqs = [
        { params: { id: progress._id }, user: { id: gv._id.toString() } },
        { params: { id: progress._id }, user: { id: gv._id.toString() } }
    ];
    const responses = [mockRes(), mockRes()];

    await Promise.all(reqs.map((req, i) => tienDoController.retryBlockchain(req, responses[i])));

    const p = await TienDo.findById(progress._id);
    let allPass = true;

    if (p.TrangThaiBlockchain !== 'DaGhi') {
        console.error('Trạng thái sau retry không phải DaGhi. Actual:', p.TrangThaiBlockchain);
        allPass = false;
    }
    if (submitCount !== 1) {
        console.error('Số lần gọi contract =', submitCount, 'nhưng mong đợi 1 do chống trùng.');
        allPass = false;
    }

    let okResponses = responses.filter(r => r.statusCode === undefined || r.statusCode === 200).length;
    let conflictResponses = responses.filter(r => r.statusCode === 409).length;

    if (okResponses !== 1 || conflictResponses !== 1) {
        console.error(`Phản hồi không đúng: ok=${okResponses}, conflict=${conflictResponses}`);
        allPass = false;
    }

    console.log(`[${allPass ? 'PASS' : 'FAIL'}] Test Retry TienDo`);
    if (!allPass) process.exit(1);

    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});

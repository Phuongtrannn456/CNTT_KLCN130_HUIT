const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const morgan = require('morgan');
const connectDB = require('./config/db');
const logger = require('./config/logger');
require('dotenv').config();

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'https://web3.giaovien.ifanit.io.vn/')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// HTTP Request Logging (Morgan → Winston)
const morganStream = { write: (message) => logger.info(`[HTTP] ${message.trim()}`) };
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

const rateLimit = require('express-rate-limit');

// Rate limiter cho upload báo cáo (ngăn spam file)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 3,              // tối đa 3 lần upload/phút/IP
  message: { error: 'Quá nhiều lần upload. Vui lòng thử lại sau 1 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter cho AI scoring
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Quá nhiều yêu cầu chấm điểm. Vui lòng thử lại sau.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter cho login (chống brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 1000,
  message: { error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Socket.IO
io.on('connection', (socket) => {
  logger.info(`[SOCKET] User connected: ${socket.id}`);

  // Nhóm join room cạnh tranh theo đề tài
  socket.on('competition:join', ({ deTaiId, nhomId }) => {
    socket.join(`competition:${deTaiId}`);
    socket.nhomId = nhomId;
    socket.deTaiId = deTaiId;
    logger.info(`[SOCKET] Nhom ${nhomId} joined competition room: ${deTaiId}`);
  });

  // Nhóm rời room
  socket.on('competition:leave', ({ deTaiId }) => {
    socket.leave(`competition:${deTaiId}`);
    logger.info(`[SOCKET] Left competition room: ${deTaiId}`);
  });

  socket.on('qr:register', ({ sessionId }) => {
    socket.join(`qr:${sessionId}`);
    logger.info(`[SOCKET] Registered socket ${socket.id} to QR room: ${sessionId}`);
  });

  socket.on('admin:join', () => {
    socket.join('admin:room');
    logger.info(`[SOCKET] Socket ${socket.id} joined admin:room`);
  });

  socket.on('pending:join', (walletAddress) => {
    socket.join(`pending:${walletAddress.toLowerCase()}`);
    logger.info(`[SOCKET] Socket ${socket.id} joined pending room for wallet ${walletAddress}`);
  });

  socket.on('disconnect', () => {
    logger.info(`[SOCKET] User disconnected: ${socket.id}`);
  });
});
app.set('io', io);

// Multer config for IPFS / File Uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'uploads', 'reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `report-${uniqueSuffix}.pdf`); // Luôn đặt extension .pdf, bỏ qua extension gốc
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // Giảm từ 50MB → 20MB
  fileFilter: function (req, file, cb) {
    // Chỉ chấp nhận MIME type PDF
    const allowedMimes = ['application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Chỉ chấp nhận file PDF.'), false);
    }
    cb(null, true);
  }
});

// Import Controllers
const authController = require('./controllers/authController');
const hocSinhController = require('./controllers/hocSinhController');
const giaoVienController = require('./controllers/giaoVienController');
const deTaiController = require('./controllers/deTaiController');
const baoCaoController = require('./controllers/baoCaoController');
const diemSoController = require('./controllers/diemSoController');
const aiController = require('./controllers/aiController');
const tienDoController = require('./controllers/tienDoController');
const rubricsController = require('./controllers/rubricsController');
const baiTestController = require('./controllers/baiTestController');
const blockchainController = require('./controllers/blockchainController');
const nhomController = require('./controllers/nhomController');
const monHocController = require('./controllers/monHocController');
const lopHocController = require('./controllers/lopHocController');
const qrController = require('./controllers/qrController');
const adminController = require('./controllers/adminController');
const loiMoiLopHocController = require('./controllers/loiMoiLopHocController');

// Middleware xác thực & phân quyền
const { authenticateToken } = authController;
const { requireRole } = require('./middleware/authz');
const requireTeacher = [authenticateToken, requireRole('TEACHER_ROLE')];
const requireStudent = [authenticateToken, requireRole('STUDENT_ROLE')];
const requireAdmin = [authenticateToken, requireRole('ADMIN_ROLE')];
const requireAuth = [authenticateToken];


// 1. Root verify
app.get('/', (req, res) => {
  res.send('Web3 Giáo Viên API is running...');
});

// 2. Auth routes
// --- API K-12 Mới ---
app.post('/api/auth/login', loginLimiter, authController.verifySignature);
// app.post('/api/auth/link-wallet', ...); // Sẽ xử lý sau nếu cần logic tách biệt
app.use('/api/challenges', require('./routes/challengeRoutes'));
app.use('/api/participations', require('./routes/participationRoutes'));
app.use('/api/submissions', require('./routes/submissionRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/credentials', require('./routes/credentialRoutes'));

// --- Legacy Auth Routes ---
app.post('/api/auth/challenge', loginLimiter, authController.generateChallenge);
app.post('/api/auth/verify', loginLimiter, authController.verifySignature);
app.post('/api/auth/register-role', authController.registerWithRole);
app.post('/api/auth/logout', authController.authenticateToken, authController.logout);
app.get('/api/auth/qr-session', loginLimiter, authController.generateQrSession);
app.post('/api/auth/qr-submit', loginLimiter, authController.verifyQrSignature);

// 2b. QR Routes
app.get('/api/qr/me', ...requireAuth, qrController.getQrCode);
app.post('/api/qr/generate', ...requireAuth, qrController.generateQrCode);

// 2c. Admin Routes
app.get('/api/admin/requests', ...requireAdmin, adminController.getPendingRequests);
app.get('/api/admin/requests/history', ...requireAdmin, adminController.getProcessedRequests);
app.get('/api/admin/requests/:id', ...requireAdmin, adminController.getRequestDetail);
app.post('/api/admin/approve/:id', ...requireAdmin, adminController.approveRequest);
app.post('/api/admin/reject/:id', ...requireAdmin, adminController.rejectRequest);
app.get('/api/admin/lecturers', ...requireAdmin, adminController.getAllLecturers);

// 3. Học Sinh (và Alias: Học Sinh)
app.get('/api/hocsinh', hocSinhController.getAll);
app.get('/api/hocsinh/:id', hocSinhController.getById);
app.post('/api/hocsinh', hocSinhController.create);
app.put('/api/hocsinh/:id', hocSinhController.update);
app.put('/api/hocsinh/:id/profile', hocSinhController.updateProfile);
app.get('/api/hocsinh/masv/:maSV', hocSinhController.findByMaHS);
app.delete('/api/hocsinh/:id', hocSinhController.delete);
// Alias Học Sinh
app.get('/api/hocsinh', hocSinhController.getAll);
app.get('/api/hocsinh/:id', hocSinhController.getById);
app.post('/api/hocsinh', hocSinhController.create);
app.put('/api/hocsinh/:id', hocSinhController.update);
app.put('/api/hocsinh/:id/profile', hocSinhController.updateProfile);
app.get('/api/hocsinh/mahs/:maSV', hocSinhController.findByMaHS);
app.delete('/api/hocsinh/:id', hocSinhController.delete);

// 4. Giáo Viên (và Alias: Giáo Viên)
app.get('/api/giaovien', giaoVienController.getAll);
app.get('/api/giaovien/:id', giaoVienController.getById);
app.post('/api/giaovien', giaoVienController.create);
app.put('/api/giaovien/:id', giaoVienController.update);
app.delete('/api/giaovien/:id', giaoVienController.delete);
// Alias Giáo Viên
app.get('/api/giaovien', giaoVienController.getAll);
app.get('/api/giaovien/:id', giaoVienController.getById);
app.post('/api/giaovien', giaoVienController.create);
app.put('/api/giaovien/:id', giaoVienController.update);
app.delete('/api/giaovien/:id', giaoVienController.delete);

// 5. Đề Tài (và Alias: Dự Án)
app.get('/api/detai', deTaiController.getAll);
app.get('/api/detai/:id', deTaiController.getById);
app.post('/api/detai', ...requireTeacher, deTaiController.create);
app.put('/api/detai/:id', ...requireTeacher, deTaiController.update);
app.delete('/api/detai/:id', ...requireTeacher, deTaiController.delete);
app.post('/api/detai/:id/register', ...requireStudent, deTaiController.registerTopic);
// Alias Dự Án
app.get('/api/duan', deTaiController.getAll);
app.get('/api/duan/:id', deTaiController.getById);
app.post('/api/duan', ...requireTeacher, deTaiController.create);
app.put('/api/duan/:id', ...requireTeacher, deTaiController.update);
app.delete('/api/duan/:id', ...requireTeacher, deTaiController.delete);
app.post('/api/duan/:id/register', ...requireStudent, deTaiController.registerTopic);

// 5b. Đăng Ký Đề Tài (quản lý)
app.get('/api/dangky/hocsinh/:hsId/all', ...requireAuth, deTaiController.getMyRegistrations);
app.get('/api/dangky/hocsinh/:hsId', ...requireAuth, deTaiController.getMyRegistration);
app.get('/api/dangky/giaovien/:gvId', ...requireTeacher, deTaiController.getRegistrationsByLecturer);
app.put('/api/dangky/:id/approve', ...requireTeacher, deTaiController.approveRegistration);
app.delete('/api/dangky/:id', ...requireStudent, deTaiController.cancelRegistration);

// 5c. Nhóm học sinh
app.post('/api/detai/:id/invite', ...requireStudent, deTaiController.inviteMember);
app.get('/api/detai/invitations/:hsId', ...requireAuth, deTaiController.getMyInvitations);
app.post('/api/detai/invitation/:id/respond', ...requireStudent, deTaiController.respondToInvitation);

// 6. Báo Cáo
app.post('/api/baocao/upload', ...requireStudent, uploadLimiter, upload.single('file'), baoCaoController.uploadBaoCao);
app.get('/api/baocao/detai/:deTaiId', baoCaoController.getBaoCaoByDeTai);
app.get('/api/baocao/hocsinh/:hsId', baoCaoController.getMyBaoCao);
app.delete('/api/baocao/:id', ...requireStudent, baoCaoController.deleteBaoCao);
app.get('/api/baocao/giaovien/:gvId', ...requireTeacher, baoCaoController.getBaoCaoByLecturer);
app.get('/api/baocao/:id/extracted', ...requireTeacher, baoCaoController.getExtractedText);

// 7. Điểm Số
app.post('/api/diemso', ...requireTeacher, aiLimiter, diemSoController.chamDiem);
app.put('/api/diemso/:id/retry-blockchain', ...requireTeacher, aiLimiter, diemSoController.retryBlockchain);
app.put('/api/diemso/:id/adjust', ...requireTeacher, diemSoController.adjustGrade);
app.get('/api/diemso/hocsinh/:hsId', ...requireAuth, diemSoController.getDiemByHocSinh);
app.get('/api/diemso/comparison/:gvId', ...requireTeacher, diemSoController.getComparison);

// 7.1. Blockchain read-only routes (doi chieu DB <-> on-chain, chi Giang Vien)
app.get('/api/blockchain/contracts', ...requireTeacher, blockchainController.getContracts);
app.get('/api/blockchain/db-records', ...requireTeacher, blockchainController.getThesisDbRecords);
app.get('/api/blockchain/thesis/db-records', ...requireTeacher, blockchainController.getThesisDbRecords);
app.get('/api/blockchain/thesis/topic/:topicId', ...requireTeacher, blockchainController.getThesisTopic);
app.get('/api/blockchain/thesis/submissions', ...requireTeacher, blockchainController.getThesisSubmissions);
app.post('/api/blockchain/backfill-tx', ...requireTeacher, blockchainController.backfillTxHashes);

// 8. Tiến Độ
app.post('/api/tiendo', ...requireStudent, tienDoController.createProgressEntry);
app.get('/api/tiendo/hocsinh/:hsId', ...requireAuth, tienDoController.getProgressByHocSinh);
app.get('/api/tiendo/detail/:id', ...requireAuth, tienDoController.getProgressDetail);
app.put('/api/tiendo/:id', ...requireStudent, tienDoController.updateProgressEntry);
app.put('/api/tiendo/:id/danhgia', ...requireTeacher, tienDoController.evaluateProgress);
app.get('/api/tiendo/:id/ai-suggest', ...requireTeacher, tienDoController.aiSuggestProgress);
app.get('/api/tiendo/:hsId', ...requireAuth, tienDoController.getProgressBySV);
app.get('/api/tiendo/detai/:deTaiId', ...requireAuth, tienDoController.getProgressByTopic);
app.put('/api/tiendo/:id/nhanxet', ...requireTeacher, tienDoController.commentProgress);

// 9. AI / ML Services
app.post('/api/ai/analyze-report', ...requireTeacher, aiLimiter, aiController.analyzeReport);
app.post('/api/ai/analyze-rubrics', ...requireTeacher, aiLimiter, aiController.analyzeReportWithRubrics);
app.post('/api/ai/match-student', ...requireStudent, aiLimiter, aiController.matchStudent);

// 10. Rubrics Template
app.get('/api/rubrics/giaovien/:gvId', ...requireTeacher, rubricsController.getTemplatesByGV);
app.post('/api/rubrics', ...requireTeacher, rubricsController.createTemplate);
app.put('/api/rubrics/:id', ...requireTeacher, rubricsController.updateTemplate);
app.delete('/api/rubrics/:id', ...requireTeacher, rubricsController.deleteTemplate);
app.put('/api/rubrics/:id/default', ...requireTeacher, rubricsController.setDefaultTemplate);
app.post('/api/rubrics/:id/apply/:deTaiId', ...requireTeacher, rubricsController.applyTemplate);

// 11. Bài Test Cạnh Tranh Đầu Vào
app.post('/api/baitest', ...requireTeacher, baiTestController.createTest);
app.get('/api/baitest/detai/:deTaiId', ...requireTeacher, baiTestController.getTestByTopic);
app.get('/api/baitest/detai/:deTaiId/student', ...requireStudent, baiTestController.getTestForStudent);
app.post('/api/baitest/:id/start', ...requireStudent, baiTestController.startTest);
app.post('/api/baitest/:id/submit', ...requireStudent, baiTestController.submitTest);
app.get('/api/baitest/:id/results', ...requireTeacher, baiTestController.getTestResults);
app.post('/api/baitest/:id/select-winner', ...requireTeacher, baiTestController.selectWinner);
app.delete('/api/baitest/:id', ...requireTeacher, baiTestController.deleteTest);
app.get('/api/baitest/check/:deTaiId/:hocSinhId', ...requireAuth, baiTestController.checkSubmitted);

// 12. Quản Lý Nhóm
app.post('/api/nhom', ...requireStudent, nhomController.createNhom);
app.get('/api/nhom/hocsinh/:hsId/all', ...requireAuth, nhomController.getAllNhomByHocSinh);
app.get('/api/nhom/hocsinh/:hsId', ...requireAuth, nhomController.getNhomByHocSinh);
app.get('/api/nhom/invites/:hsId', ...requireAuth, nhomController.getPendingInvites);
app.get('/api/nhom/:id', ...requireAuth, nhomController.getNhomById);
app.post('/api/nhom/:id/invite', ...requireStudent, nhomController.inviteMember);
app.post('/api/nhom/:id/respond', ...requireStudent, nhomController.respondToInvite);
app.delete('/api/nhom/:id/kick/:hsId', ...requireStudent, nhomController.kickMember);
app.post('/api/nhom/:id/leave', ...requireStudent, nhomController.leaveNhom);
app.post('/api/nhom/:id/transfer-leader', ...requireStudent, nhomController.transferLeader);
app.post('/api/nhom/:id/chot', ...requireStudent, nhomController.chotNhom);
app.delete('/api/nhom/:id', ...requireStudent, nhomController.deleteNhom);

// Multer error handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File qua lon. Toi da 20MB.',
      code: 'FILE_TOO_LARGE'
    });
  }
  if (err.message && err.message.includes('PDF')) {
    return res.status(400).json({
      error: err.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'File khong hop le.',
      code: 'UNEXPECTED_FILE'
    });
  }
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Origin khong duoc phep',
      code: 'CORS_BLOCKED'
    });
  }
  logger.error(`[SERVER] Unhandled error: ${err.message}`);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Co loi xay ra tren server.'
      : err.message
  });
});

// 13. Quản Lý Môn Học
app.get('/api/monhoc/giaovien/:gvId', monHocController.getByGiaoVien);
app.post('/api/monhoc', monHocController.create);
app.put('/api/monhoc/:id', monHocController.update);
app.delete('/api/monhoc/:id', monHocController.delete);

// 14. Quản Lý Lớp Học
app.get('/api/lophoc/giaovien/:gvId', ...requireTeacher, lopHocController.getByGiaoVien);
app.get('/api/lophoc/hocsinh/:hsId', ...requireAuth, lopHocController.getByHocSinh);
app.get('/api/lophoc/:id/detail', ...requireAuth, lopHocController.getDetail);
app.post('/api/lophoc', ...requireTeacher, lopHocController.create);
app.put('/api/lophoc/:id', ...requireTeacher, lopHocController.update);
app.post('/api/lophoc/:id/hocsinh', ...requireTeacher, lopHocController.addHocSinh);
app.post('/api/lophoc/:id/import-hocsinh', ...requireTeacher, lopHocController.importHocSinh);
app.delete('/api/lophoc/:id/hocsinh/:hsId', ...requireTeacher, lopHocController.removeHocSinh);
app.delete('/api/lophoc/:id', ...requireTeacher, lopHocController.delete);
app.get('/api/lophoc/giaovien/:gvId/hocsinh', ...requireTeacher, lopHocController.getHocSinhByGiaoVien);

// 15. Lời Mời Lớp Học
app.post('/api/loimoi-lophoc/:lopId/invite', ...requireTeacher, loiMoiLopHocController.inviteHocSinh);
app.post('/api/loimoi-lophoc/:lopId/invite-batch', ...requireTeacher, loiMoiLopHocController.inviteBatch);
app.get('/api/loimoi-lophoc/lophoc/:lopId', ...requireTeacher, loiMoiLopHocController.getInvitesByLopHoc);
app.get('/api/loimoi-lophoc/hocsinh/:hsId', ...requireAuth, loiMoiLopHocController.getMyClassInvites);
app.post('/api/loimoi-lophoc/:id/respond', ...requireStudent, loiMoiLopHocController.respondToInvite);
app.delete('/api/loimoi-lophoc/:id', ...requireTeacher, loiMoiLopHocController.cancelInvite);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`[SERVER] Web3 Giáo Dục Phổ Thông API running on port ${PORT}`);
});

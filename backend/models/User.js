const mongoose = require('mongoose');

// Helper sinh DID Pseudonym tu dia chi vi (Web3 Pure Pseudonymity / Zero-PII)
const generatePseudonym = (role, walletAddress) => {
  const cleanAddr = (walletAddress || '').replace(/^0x/i, '').toLowerCase();
  const shortId = cleanAddr.substring(0, 6) || 'anon';
  if (role === 'teacher') return `Teacher_DID#${shortId}`;
  if (role === 'student') return `Student_DID#${shortId}`;
  if (role === 'admin') return `Admin_DID#${shortId}`;
  return `User_DID#${shortId}`;
};

const generateSchoolId = (role, walletAddress) => {
  const cleanAddr = (walletAddress || '').replace(/^0x/i, '').toLowerCase();
  const shortId = cleanAddr.substring(0, 6) || 'anon';
  if (role === 'teacher') return `GV_DID#${shortId}`;
  if (role === 'student') return `HS_DID#${shortId}`;
  if (role === 'admin') return `AD_DID#${shortId}`;
  return `ID#${shortId}`;
};

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true, lowercase: true },
  role: { type: String, enum: ['guest', 'student', 'teacher', 'admin'], default: 'guest' },
  
  // Dinh danh hien thi an danh tuyet doi (Zero-PII Pseudonym)
  fullName: { type: String },
  email: { type: String, sparse: true },
  
  // Cac truong alias de tuong thich 100% voi ca 23 controllers cu
  HoTen: { type: String },
  hoTen: { type: String },
  MaHS: { type: String },
  MaGV: { type: String },
  Email: { type: String },

  // Ma dinh danh DID (School ID)
  schoolId: { type: String, sparse: true }, 

  // Thong tin phi danh tinh danh cho Hoc sinh
  gpa: { type: Number, default: 0 },
  skills: [{ type: String }],
  gradeLevel: { type: Number, min: 1, max: 12 },
  school: { type: String, default: 'Trường Phổ Thông Web3' },
  conduct: { type: String, enum: ['Tốt', 'Khá', 'Trung bình', 'Yếu'], default: 'Tốt' },
  
  // Thong tin phi danh tinh danh cho Giao vien
  department: { type: String, default: 'Tổ STEM & Tin Học' },
  homeroomClass: { type: String, default: '' },

  profileUpdated: { type: Boolean, default: false },
  DaCapNhatHoSo: { type: Boolean, default: false },
  GPA: { type: Number, default: 0 },
  ChuyenNganh: { type: String, default: '' },
  chuyenNganh: { type: String, default: '' },
  KhoiLop: { type: Number },
  KyNang: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Tu dong gan DID Pseudonym truoc khi luu xuong MongoDB
userSchema.pre('save', function(next) {
  const pseudo = generatePseudonym(this.role, this.walletAddress);
  const scId = generateSchoolId(this.role, this.walletAddress);
  const cleanAddr = (this.walletAddress || '').replace(/^0x/i, '').toLowerCase();
  const shortId = cleanAddr.substring(0, 6) || 'anon';

  this.fullName = pseudo;
  this.HoTen = pseudo;
  this.hoTen = pseudo;
  this.schoolId = scId;
  this.MaHS = scId;
  this.MaGV = scId;

  // Luon luu email an danh dang did_<hash>@k12.did de bao ve PII tuyet doi
  const pseudoEmail = `did_${shortId}@k12.did`;
  this.email = pseudoEmail;
  this.Email = pseudoEmail;

  next();
});

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

// Đăng ký alias cho các model cũ/mới để mọi lệnh populate('GiaoVien'), populate('HocSinh'), etc. hoạt động 100% trơn tru
if (!mongoose.models.GiaoVien) {
  mongoose.model('GiaoVien', userSchema, 'users');
}
if (!mongoose.models.HocSinh) {
  mongoose.model('HocSinh', userSchema, 'users');
}
if (!mongoose.models.Teacher) {
  mongoose.model('Teacher', userSchema, 'users');
}
if (!mongoose.models.Student) {
  mongoose.model('Student', userSchema, 'users');
}

module.exports = UserModel;

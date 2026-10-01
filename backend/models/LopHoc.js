const mongoose = require('mongoose');

const lopHocSchema = new mongoose.Schema({
  MaLopHoc: { type: String, required: true },
  TenLopHoc: { type: String, required: true },
  MonHoc: { type: mongoose.Schema.Types.ObjectId, ref: 'MonHoc', required: true },
  GiaoVien: { type: mongoose.Schema.Types.ObjectId, ref: 'GiaoVien', required: true },
  HocSinh: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HocSinh' }]
}, { timestamps: true });

// Index cho query getByGiaoVien: filter theo GiaoVien + sort theo createdAt
lopHocSchema.index({ GiaoVien: 1, createdAt: -1 });

// Compound unique: cùng mã lớp + cùng môn học → không được trùng
lopHocSchema.index({ MaLopHoc: 1, MonHoc: 1 }, { unique: true });

module.exports = mongoose.model('LopHoc', lopHocSchema);

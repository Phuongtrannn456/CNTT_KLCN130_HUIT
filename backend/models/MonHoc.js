const mongoose = require('mongoose');

const monHocSchema = new mongoose.Schema({
  MaMonHoc: { type: String, required: true, unique: true },
  TenMonHoc: { type: String, required: true },
  MoTa: { type: String, default: '' },
  GiaoVien: { type: mongoose.Schema.Types.ObjectId, ref: 'GiaoVien', required: true }
}, { timestamps: true });

// Index cho query getByGiaoVien: filter theo GiaoVien + sort theo createdAt
monHocSchema.index({ GiaoVien: 1, createdAt: -1 });

module.exports = mongoose.model('MonHoc', monHocSchema);

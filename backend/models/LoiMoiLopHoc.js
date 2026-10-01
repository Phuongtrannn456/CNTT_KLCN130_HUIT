const mongoose = require('mongoose');

const loiMoiLopHocSchema = new mongoose.Schema({
  LopHoc: { type: mongoose.Schema.Types.ObjectId, ref: 'LopHoc', required: true },
  HocSinh: { type: mongoose.Schema.Types.ObjectId, ref: 'HocSinh', required: true },
  GiaoVien: { type: mongoose.Schema.Types.ObjectId, ref: 'GiaoVien', required: true },
  TrangThai: {
    type: String,
    enum: ['ChoChapNhan', 'DaChapNhan', 'TuChoi'],
    default: 'ChoChapNhan'
  },
}, { timestamps: true });

// Mỗi SV chỉ có 1 lời mời active cho 1 lớp
loiMoiLopHocSchema.index({ LopHoc: 1, HocSinh: 1 }, { unique: true });

module.exports = mongoose.model('LoiMoiLopHoc', loiMoiLopHocSchema);

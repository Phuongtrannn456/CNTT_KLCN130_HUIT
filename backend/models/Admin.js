const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  WalletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  HoTen: {
    type: String,
    required: true,
    default: 'Super Admin'
  }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

AdminSchema.virtual('walletAddress').get(function() {
  return this.WalletAddress;
});

module.exports = mongoose.model('Admin', AdminSchema);

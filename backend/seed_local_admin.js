require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const wallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.toLowerCase(); // Hardhat Account 0
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const existing = await Admin.findOne({ WalletAddress: wallet });
  if (existing) {
    console.log('Admin already exists');
  } else {
    await Admin.create({ WalletAddress: wallet, HoTen: 'System Admin' });
    console.log('Admin seeded with Hardhat Account 0 (0xf39...)');
  }
  process.exit();
});

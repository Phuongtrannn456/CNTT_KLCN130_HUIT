const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Admin = require('../models/Admin');

const defaultHardhatWallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Account 0
const prodWallet = '0x3081F8965F007A78C1502b51DAC0bD54E6f6dBBF';

async function main() {
  const args = process.argv.slice(2);
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web3giaovien';

  try {
    await mongoose.connect(MONGODB_URI);
    
    if (args.includes('--list')) {
      const admins = await Admin.find({});
      console.log('--- Current Admins ---');
      admins.forEach(a => console.log(`- ${a.HoTen || 'Unnamed'}: ${a.WalletAddress}`));
      return process.exit(0);
    }

    let targetWallet = args[0] || process.env.ADMIN_WALLET || defaultHardhatWallet;
    if (targetWallet === 'prod') targetWallet = prodWallet;

    targetWallet = targetWallet.toLowerCase();

    const existingAdmin = await Admin.findOne({ WalletAddress: targetWallet });
    if (existingAdmin) {
      console.log(`[INFO] Admin already exists for wallet: ${targetWallet}`);
      return process.exit(0);
    }

    const newAdmin = new Admin({
      WalletAddress: targetWallet,
      HoTen: targetWallet === defaultHardhatWallet.toLowerCase() ? 'Local Hardhat Admin' : 'Super Admin'
    });
    
    await newAdmin.save();
    console.log(`[SUCCESS] Admin seeded successfully for wallet: ${targetWallet}`);
    
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Failed executing seedAdmin:', error);
    process.exit(1);
  }
}

main();

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

async function sanitizeDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Không tìm thấy MONGODB_URI trong .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('Connected successfully!');

  const users = await User.find({});
  console.log(`Found ${users.length} users in database.`);

  let updatedCount = 0;
  for (const user of users) {
    const cleanAddr = (user.walletAddress || '').replace(/^0x/i, '').toLowerCase();
    const shortId = cleanAddr.substring(0, 6) || 'anon';
    const role = (user.role || 'student').toLowerCase();
    
    let pseudo = `Student_DID#${shortId}`;
    let scId = `HS_DID#${shortId.toUpperCase()}`;
    if (role === 'teacher') {
      pseudo = `Teacher_DID#${shortId}`;
      scId = `GV_DID#${shortId.toUpperCase()}`;
    } else if (role === 'admin') {
      pseudo = `Admin_DID#${shortId}`;
      scId = `AD_DID#${shortId.toUpperCase()}`;
    }

    const pseudoEmail = `did_${shortId}@k12.did`;

    user.fullName = pseudo;
    user.HoTen = pseudo;
    user.hoTen = pseudo;
    user.schoolId = scId;
    user.MaHS = scId;
    user.MaGV = scId;
    user.email = pseudoEmail;
    user.Email = pseudoEmail;

    await user.save();
    updatedCount++;
    console.log(`Updated user ${user.walletAddress} -> ${pseudo} (${user.role})`);
  }

  console.log(`\nDONE! Sanitized ${updatedCount} users to 100% Zero-PII Pure Pseudonymity.`);
  await mongoose.disconnect();
}

sanitizeDatabase().catch(err => {
  console.error('Error during sanitation:', err);
  process.exit(1);
});

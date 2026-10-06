require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const admins = await Admin.find({});
  console.log(admins);
  process.exit();
});

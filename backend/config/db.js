const mongoose = require('mongoose');
const logger = require('./logger');
require('dotenv').config();

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const localUri = 'mongodb://127.0.0.1:27017/web3giangvien';

  try {
    if (!primaryUri) throw new Error('Thiếu MONGODB_URI');
    const conn = await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 4000 });
    logger.info(`[DB] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.warn(`[DB] Kết nối MongoDB Atlas không thành công (${error.message}). Đang tự động chuyển sang MongoDB Local...`);
    try {
      const conn = await mongoose.connect(localUri);
      logger.info(`[DB] MongoDB Local Connected: ${conn.connection.host}`);
      return conn;
    } catch (localErr) {
      logger.error(`[DB] MongoDB Local cũng thất bại: ${localErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;

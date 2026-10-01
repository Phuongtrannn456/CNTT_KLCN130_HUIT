const { PinataSDK } = require('pinata-web3');
const logger = require('../config/logger');
require('dotenv').config();

// Khởi tạo SDK (nếu có key thì dùng, không thì fake)
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT || "fake_jwt_để_khỏi_lỗi",
  pinataGateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud",
});

const fs = require('fs');

exports.uploadFile = async (filePath, fileName) => {
    try {
        logger.info(`[IPFS] Uploading ${fileName} to Pinata...`);
        
        // Mock upload nếu không có API Key thật
        if (!process.env.PINATA_JWT || process.env.PINATA_JWT === 'your_pinata_jwt_here') {
            logger.info(`[IPFS] (MOCK) No PINATA_JWT found, returning fake CID for ${fileName}`);
            
            // Xóa file tạm
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                logger.warn(`[IPFS] Không thể xóa file tạm: ${err.message}`);
            }

            // Sinh random CID cho giống thật
            const randomCid = "Qm" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            return { IpfsHash: randomCid };
        }

        // 1. Đọc file từ thư mục tạm trên server (Multer)
        const fileBuffer = fs.readFileSync(filePath);
        
        // 2. Tạo Blob/File object (Hỗ trợ từ Node.js v20+)
        const blob = new Blob([fileBuffer]);
        const file = new File([blob], fileName, { type: 'application/octet-stream' });
        
        // 3. Thực hiện tải lên Pinata
        const upload = await pinata.upload.file(file);
        
        logger.info(`[IPFS] Upload success | CID=${upload.IpfsHash} | file=${fileName}`);
        
        // 4. Xóa file tạm sau khi đã upload
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            logger.warn(`[IPFS] Không thể xóa file tạm: ${err.message}`);
        }

        return { IpfsHash: upload.IpfsHash };
    } catch (error) {
        logger.error(`[IPFS] Upload failed: ${error.message}`);
        throw error;
    }
};

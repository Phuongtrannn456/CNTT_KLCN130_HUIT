const { PinataSDK } = require('pinata-web3');
const logger = require('../config/logger');
require('dotenv').config();

const path = require('path');
const crypto = require('crypto');

let pinata = null;
if (process.env.PINATA_JWT) {
  try {
    pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT,
      pinataGateway: process.env.PINATA_GATEWAY,
    });
  } catch (initErr) {
    logger.warn(`[IPFS] Không thể khởi tạo PinataSDK: ${initErr.message}`);
  }
}

exports.uploadFile = async (filePath, fileName) => {
    // 1. Đọc file từ thư mục tạm trên server (Multer)
    let fileBuffer;
    try {
        fileBuffer = fs.readFileSync(filePath);
    } catch (readErr) {
        logger.error(`[IPFS] Lỗi đọc file tạm: ${readErr.message}`);
        throw readErr;
    }

    // 2. Nếu có cấu hình Pinata, thử tải lên Pinata
    if (pinata && process.env.PINATA_JWT) {
        try {
            logger.info(`[IPFS] Đang tải ${fileName} lên Pinata...`);
            const blob = new Blob([fileBuffer]);
            const file = new File([blob], fileName, { type: 'application/octet-stream' });
            const upload = await pinata.upload.file(file);
            logger.info(`[IPFS] Tải lên Pinata thành công | CID=${upload.IpfsHash} | file=${fileName}`);

            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                logger.warn(`[IPFS] Không thể xóa file tạm: ${err.message}`);
            }

            return { IpfsHash: upload.IpfsHash };
        } catch (error) {
            logger.warn(`[IPFS] Tải lên Pinata thất bại (${error.message}). Chuyển sang lưu trữ cục bộ dự phòng.`);
        }
    }

    // 3. Fallback: Lưu trữ file cục bộ và tạo IPFS mock CID (deterministic SHA256)
    try {
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const fallbackCid = `QmLocal${hash.substring(0, 40)}`;

        const storageDir = path.join(__dirname, '../uploads/reports');
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        const safeFileName = `${Date.now()}_${path.basename(fileName)}`;
        const destination = path.join(storageDir, safeFileName);
        fs.writeFileSync(destination, fileBuffer);

        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            logger.warn(`[IPFS] Không thể xóa file tạm: ${err.message}`);
        }

        logger.info(`[IPFS Fallback] Đã lưu file cục bộ: ${destination} | CID giả lập=${fallbackCid}`);
        return { IpfsHash: fallbackCid, isLocalFallback: true, localPath: destination };
    } catch (fallbackError) {
        logger.error(`[IPFS Fallback] Thất bại khi lưu file cục bộ: ${fallbackError.message}`);
        throw fallbackError;
    }
};

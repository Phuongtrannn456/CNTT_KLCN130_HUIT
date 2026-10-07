const { PinataSDK } = require('pinata-web3');
const logger = require('../config/logger');
require('dotenv').config();

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

const fs = require('fs');
const { Blob } = require('buffer');

exports.uploadFile = async (filePath, fileName) => {
    try {
        logger.info(`[IPFS] Uploading ${fileName} to Pinata...`);
        
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);
        let file;
        if (typeof File !== 'undefined') {
            file = new File([blob], fileName, { type: 'application/octet-stream' });
        } else {
            file = blob;
            file.name = fileName;
        }
        
        const upload = await pinata.upload.file(file);
        
        logger.info(`[IPFS] Upload success | CID=${upload.IpfsHash} | file=${fileName}`);
        
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

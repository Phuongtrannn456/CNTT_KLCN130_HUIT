const { ethers } = require('ethers');

/**
 * Standardize and hash the credential payload.
 * Ensures properties are sorted and no PII is included.
 */
function createCanonicalHash(credentialData) {
  // 1. Dựng Payload chuẩn (loại bỏ mọi PII)
  const payload = {
    credentialId: credentialData.credentialId,
    achievementType: credentialData.metadata.achievementType,
    challengeId: credentialData.challenge.toString(),
    issuedAt: new Date(credentialData.metadata.issuedAt).toISOString(),
    issuerWallet: credentialData.issuerWallet.toLowerCase(),
    studentWallet: credentialData.studentWallet.toLowerCase(),
    version: credentialData.metadata.version || '1.0'
  };

  // 2. Sort key theo thứ tự Alphabet để hash nhất quán
  const sortedKeys = Object.keys(payload).sort();
  const sortedPayload = {};
  for (const key of sortedKeys) {
    sortedPayload[key] = payload[key];
  }

  // 3. Chuyển thành JSON chuẩn (không có dấu cách thừa)
  const canonicalJson = JSON.stringify(sortedPayload);

  // 4. Hash bằng Keccak256
  const hash = ethers.keccak256(ethers.toUtf8Bytes(canonicalJson));
  
  return { payload: sortedPayload, hash };
}

module.exports = {
  createCanonicalHash
};

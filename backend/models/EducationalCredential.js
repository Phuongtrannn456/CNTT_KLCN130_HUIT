const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const educationalCredentialSchema = new mongoose.Schema({
  credentialId: { 
    type: String, 
    required: true, 
    unique: true, 
    default: () => uuidv4() 
  },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true, unique: true }, // 1 Achievement -> 1 Credential
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  
  metadata: {
    achievementType: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
    version: { type: String, default: '1.0' }
  },

  status: { 
    type: String, 
    enum: ['DRAFT', 'PENDING_CLAIM', 'PENDING_CHAIN', 'ANCHORED', 'REVOKED', 'SUPERSEDED'], 
    default: 'PENDING_CLAIM' 
  },
  
  canonicalHash: { type: String }, // Hashed payload (keccak256)
  
  blockchain: {
    network: { type: String },
    contractAddress: { type: String },
    transactionHash: { type: String },
    blockNumber: { type: Number }
  },

  nonce: {
    type: Number,
    default: () => Math.floor(Math.random() * 1000000) // Simple nonce for signature
  }

}, { timestamps: true });

module.exports = mongoose.model('EducationalCredential', educationalCredentialSchema);

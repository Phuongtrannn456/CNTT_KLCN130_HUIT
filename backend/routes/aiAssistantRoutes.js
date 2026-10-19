const express = require('express');
const router = express.Router();
const aiAssistantController = require('../controllers/aiAssistantController');
const { authenticateToken } = require('../controllers/authController');

// Chat endpoint for all authenticated users (Students, Teachers, Admins)
router.post('/chat', authenticateToken, aiAssistantController.chatWithAssistant);

module.exports = router;

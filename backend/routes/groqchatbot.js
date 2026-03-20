// PetShop/backend/routes/groqchatbot.js
const express = require('express');
const {
  sendMessage,
  getHandlingGuide,
  getPetCategories,
  clearConversation,
  getHistory,
  healthCheck,
  getAvailableModels,
  getActiveSessions,
  validatePet
} = require('../controllers/groqchatbot');

// No authentication middleware - chatbot is public access
// (you can add isAuthenticatedUser if you want authenticated users only)

const router = express.Router();


router.post('/chat/message', sendMessage);                 // Send message to chatbot
router.get('/chat/health', healthCheck);                   // Health check endpoint
router.get('/chat/models', getAvailableModels);            // Get available models (debug)
router.get('/chat/sessions', getActiveSessions);           // Get active sessions (debug)

// Pet information routes
router.get('/chat/guide/:petType', getHandlingGuide);      // Get handling guide for specific pet
router.get('/chat/categories/:petType', getPetCategories); // Get categories for specific pet
router.get('/chat/validate/:petType', validatePet);        // Check if pet type is supported

// Session management
router.delete('/chat/clear', clearConversation);           // Clear current conversation
router.get('/chat/history/:sessionId', getHistory);        // Get conversation history

module.exports = router;
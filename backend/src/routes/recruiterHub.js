const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const recruiterHubController = require('../controllers/recruiterHubController');

// TODO: Add rate limiting middleware to prevent abuse
// This route performs database-intensive analysis and should be rate-limited
// Consider implementing rate limiting across all API routes for production
router.get('/', authMiddleware, recruiterHubController.getRecruiterHubAnalysis);
router.get('/config', authMiddleware, recruiterHubController.getConfig);
router.put('/config', authMiddleware, recruiterHubController.saveConfig);
router.delete('/config', authMiddleware, recruiterHubController.resetConfig);
router.get('/board', authMiddleware, recruiterHubController.getRecruitingBoard);

module.exports = router;

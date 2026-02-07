const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const recruiterHubController = require('../controllers/recruiterHubController');

router.get('/', authMiddleware, recruiterHubController.getRecruiterHubAnalysis);

module.exports = router;

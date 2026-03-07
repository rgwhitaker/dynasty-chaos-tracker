const express = require('express');
const router = express.Router({ mergeParams: true });
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const recruiterHubController = require('../controllers/recruiterHubController');

const recruiterHubRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.use(recruiterHubRateLimit);

router.get('/', authMiddleware, recruiterHubController.getRecruiterHubAnalysis);
router.get('/board', authMiddleware, recruiterHubController.getRecruitingBoard);

module.exports = router;

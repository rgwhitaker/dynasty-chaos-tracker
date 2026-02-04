const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const recruitingController = require('../controllers/recruitingController');
const recruitingService = require('../services/recruitingService');
const db = require('../config/database');

router.get('/', authMiddleware, recruitingController.getRecruits);
router.post('/', authMiddleware, recruitingController.createRecruit);
router.put('/:recruitId', authMiddleware, recruitingController.updateRecruit);
router.delete('/:recruitId', authMiddleware, recruitingController.deleteRecruit);

// Get recruiting targets based on roster gaps
router.get('/targets', authMiddleware, async (req, res) => {
  try {
    const { dynastyId } = req.params;
    
    const dynastyResult = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const targets = await recruitingService.generateRecruitingTargets(dynastyId);
    res.json(targets);

  } catch (error) {
    console.error('Get recruiting targets error:', error);
    res.status(500).json({ error: 'Failed to get recruiting targets' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const depthChartController = require('../controllers/depthChartController');
const exportService = require('../services/exportService');
const db = require('../config/database');

router.get('/', authMiddleware, depthChartController.getDepthChart);
router.post('/generate', authMiddleware, depthChartController.generateAutoDepthChart);
router.put('/', authMiddleware, depthChartController.updateDepthChart);

// Export routes
router.get('/export/pdf', authMiddleware, async (req, res) => {
  try {
    const { dynastyId } = req.params;
    
    // Verify ownership
    const dynastyResult = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    // Get depth chart
    const depthChartResult = await db.query(
      `SELECT dc.*, p.first_name, p.last_name, p.overall_rating, p.year
       FROM depth_charts dc
       JOIN players p ON dc.player_id = p.id
       WHERE dc.dynasty_id = $1
       ORDER BY dc.position, dc.depth_order`,
      [dynastyId]
    );

    const depthChart = {};
    depthChartResult.rows.forEach(row => {
      if (!depthChart[row.position]) {
        depthChart[row.position] = [];
      }
      depthChart[row.position].push(row);
    });

    const { filepath } = await exportService.exportDepthChartPDF(depthChart, dynastyResult.rows[0]);
    res.download(filepath);

  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Failed to export depth chart' });
  }
});

router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const { dynastyId } = req.params;
    
    const dynastyResult = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const depthChartResult = await db.query(
      `SELECT dc.*, p.first_name, p.last_name, p.overall_rating, p.year
       FROM depth_charts dc
       JOIN players p ON dc.player_id = p.id
       WHERE dc.dynasty_id = $1
       ORDER BY dc.position, dc.depth_order`,
      [dynastyId]
    );

    const depthChart = {};
    depthChartResult.rows.forEach(row => {
      if (!depthChart[row.position]) {
        depthChart[row.position] = [];
      }
      depthChart[row.position].push(row);
    });

    const { filepath } = await exportService.exportDepthChartCSV(depthChart, dynastyResult.rows[0]);
    res.download(filepath);

  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export depth chart' });
  }
});

router.post('/share', authMiddleware, async (req, res) => {
  try {
    const { dynastyId } = req.params;
    
    const dynastyResult = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const shareUrl = await exportService.generateShareableLink(dynastyId);
    res.json({ shareUrl });

  } catch (error) {
    console.error('Generate share link error:', error);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

module.exports = router;

const db = require('../config/database');
const recruiterHubService = require('../services/recruiterHubService');

/**
 * Get recruiter hub analysis for a dynasty
 */
const getRecruiterHubAnalysis = async (req, res) => {
  try {
    const { dynastyId } = req.params;

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const analysis = await recruiterHubService.analyzeRosterAttritionRisks(dynastyId);

    res.json(analysis);
  } catch (error) {
    console.error('Get recruiter hub analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze roster attrition risks' });
  }
};

/**
 * Get recruiter hub configuration (target depths) for a dynasty
 */
const getConfig = async (req, res) => {
  try {
    const { dynastyId } = req.params;

    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const config = await recruiterHubService.getConfig(dynastyId);
    res.json({ positionTargets: config, defaults: recruiterHubService.DEFAULT_MIN_DEPTH });
  } catch (error) {
    console.error('Get recruiter hub config error:', error);
    res.status(500).json({ error: 'Failed to get recruiter hub configuration' });
  }
};

/**
 * Save recruiter hub configuration (target depths) for a dynasty
 */
const saveConfig = async (req, res) => {
  try {
    const { dynastyId } = req.params;
    const { positionTargets } = req.body;

    if (!positionTargets || typeof positionTargets !== 'object') {
      return res.status(400).json({ error: 'positionTargets object is required' });
    }

    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    await recruiterHubService.saveConfig(dynastyId, positionTargets);
    const config = await recruiterHubService.getConfig(dynastyId);
    res.json({ positionTargets: config, defaults: recruiterHubService.DEFAULT_MIN_DEPTH });
  } catch (error) {
    console.error('Save recruiter hub config error:', error);
    res.status(500).json({ error: 'Failed to save recruiter hub configuration' });
  }
};

/**
 * Get recruiting board with position analysis context
 */
const getRecruitingBoard = async (req, res) => {
  try {
    const { dynastyId } = req.params;

    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    // Get position analysis from the recruiter hub
    const analysis = await recruiterHubService.analyzeRosterAttritionRisks(dynastyId);

    // Get the recruiting board (recruits)
    const recruitsResult = await db.query(
      'SELECT * FROM recruits WHERE dynasty_id = $1 ORDER BY priority_score DESC, stars DESC',
      [dynastyId]
    );

    // Build a position-level summary from the analysis for each recruit's position
    const recruits = recruitsResult.rows.map(recruit => {
      const posAnalysis = analysis.positionAnalysis[recruit.position] || null;
      return {
        ...recruit,
        positionNeed: posAnalysis ? {
          status: posAnalysis.status,
          needToRecruit: posAnalysis.needToRecruit,
          currentCount: posAnalysis.currentCount,
          projectedCount: posAnalysis.projectedCount,
          targetDepth: posAnalysis.targetDepth
        } : null
      };
    });

    res.json({
      recruits,
      positionAnalysis: analysis.positionAnalysis
    });
  } catch (error) {
    console.error('Get recruiting board error:', error);
    res.status(500).json({ error: 'Failed to get recruiting board' });
  }
};

module.exports = {
  getRecruiterHubAnalysis,
  getConfig,
  saveConfig,
  getRecruitingBoard
};

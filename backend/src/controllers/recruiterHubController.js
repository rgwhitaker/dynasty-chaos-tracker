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

module.exports = {
  getRecruiterHubAnalysis
};

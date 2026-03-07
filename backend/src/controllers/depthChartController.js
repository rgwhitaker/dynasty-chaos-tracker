const db = require('../config/database');
const depthChartService = require('../services/depthChartService');
const depthChartMappingService = require('../services/depthChartMappingService');

const getDepthChart = async (req, res) => {
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

    const result = await db.query(
      `SELECT dc.*, p.first_name, p.last_name, p.overall_rating, p.year
       FROM depth_charts dc
       JOIN players p ON dc.player_id = p.id
       WHERE dc.dynasty_id = $1
       ORDER BY dc.position, dc.depth_order`,
      [dynastyId]
    );

    // Group by position
    const depthChart = {};
    result.rows.forEach(row => {
      if (!depthChart[row.position]) {
        depthChart[row.position] = [];
      }
      depthChart[row.position].push(row);
    });

    res.json(depthChart);
  } catch (error) {
    console.error('Get depth chart error:', error);
    res.status(500).json({ error: 'Failed to fetch depth chart' });
  }
};

const generateAutoDepthChart = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Verify team belongs to user
    const teamCheck = await db.query(
      'SELECT * FROM teams WHERE id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    await depthChartService.generateDepthChart(teamId, req.user.id);

    res.json({ message: 'Depth chart generated successfully' });
  } catch (error) {
    console.error('Generate depth chart error:', error);
    res.status(500).json({ error: 'Failed to generate depth chart' });
  }
};

const updateDepthChart = async (req, res) => {
  try {
    const { dynastyId } = req.params;
    const { position, playerId, depthOrder } = req.body;

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    // Verify player belongs to dynasty
    const playerCheck = await db.query(
      'SELECT * FROM players WHERE id = $1 AND dynasty_id = $2',
      [playerId, dynastyId]
    );

    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const result = await db.query(
      `INSERT INTO depth_charts (dynasty_id, position, depth_order, player_id, is_manual_override)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (dynasty_id, position, depth_order)
       DO UPDATE SET player_id = $4, is_manual_override = TRUE
       RETURNING *`,
      [dynastyId, position, depthOrder, playerId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update depth chart error:', error);
    res.status(500).json({ error: 'Failed to update depth chart' });
  }
};

/**
 * Get depth chart mapping configuration for a dynasty
 */
const getMappingConfig = async (req, res) => {
  try {
    const { dynastyId } = req.params;

    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const config = await depthChartMappingService.getConfig(dynastyId);
    res.json({ depthChartMapping: config, defaults: depthChartMappingService.buildDefaultConfig() });
  } catch (error) {
    console.error('Get depth chart mapping config error:', error);
    res.status(500).json({ error: 'Failed to get depth chart mapping configuration' });
  }
};

/**
 * Save depth chart mapping configuration for a dynasty
 */
const saveMappingConfig = async (req, res) => {
  try {
    const { dynastyId } = req.params;
    const { depthChartMapping } = req.body;

    if (!depthChartMapping || typeof depthChartMapping !== 'object') {
      return res.status(400).json({ error: 'depthChartMapping object is required' });
    }

    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    await depthChartMappingService.saveConfig(dynastyId, depthChartMapping);
    const config = await depthChartMappingService.getConfig(dynastyId);
    res.json({ depthChartMapping: config, defaults: depthChartMappingService.buildDefaultConfig() });
  } catch (error) {
    console.error('Save depth chart mapping config error:', error);
    res.status(400).json({ error: error.message || 'Failed to save depth chart mapping configuration' });
  }
};

/**
 * Reset depth chart mapping configuration to defaults
 */
const resetMappingConfig = async (req, res) => {
  try {
    const { dynastyId } = req.params;

    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const config = await depthChartMappingService.resetConfig(dynastyId);
    res.json({ depthChartMapping: config, defaults: depthChartMappingService.buildDefaultConfig() });
  } catch (error) {
    console.error('Reset depth chart mapping config error:', error);
    res.status(500).json({ error: 'Failed to reset depth chart mapping configuration' });
  }
};

module.exports = {
  getDepthChart,
  generateAutoDepthChart,
  updateDepthChart,
  getMappingConfig,
  saveMappingConfig,
  resetMappingConfig,
};

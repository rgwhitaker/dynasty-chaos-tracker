const db = require('../config/database');
const studScoreService = require('../services/studScoreService');

const getPlayers = async (req, res) => {
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
      'SELECT * FROM players WHERE dynasty_id = $1 ORDER BY position, overall_rating DESC',
      [dynastyId]
    );

    // Calculate stud scores for each player
    const playersWithScores = await Promise.all(
      result.rows.map(async (player) => {
        const studScore = await studScoreService.calculateStudScore(req.user.id, player);
        return { ...player, stud_score: studScore };
      })
    );

    res.json(playersWithScores);
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
};

const createPlayer = async (req, res) => {
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

    const {
      first_name, last_name, position, jersey_number, year, overall_rating,
      attributes, dealbreakers
    } = req.body;

    const result = await db.query(
      `INSERT INTO players (
        dynasty_id, first_name, last_name, position, jersey_number, year, overall_rating,
        attributes, dealbreakers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        dynastyId, first_name, last_name, position, jersey_number, year, overall_rating,
        JSON.stringify(attributes || {}), dealbreakers || []
      ]
    );

    const player = result.rows[0];
    const studScore = await studScoreService.calculateStudScore(req.user.id, player);

    res.status(201).json({ ...player, stud_score: studScore });
  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
};

const updatePlayer = async (req, res) => {
  try {
    const { dynastyId, playerId } = req.params;

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'first_name', 'last_name', 'position', 'jersey_number', 'year', 'overall_rating'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(req.body[field]);
        paramCount++;
      }
    }

    // Handle JSONB attributes
    if (req.body.attributes !== undefined) {
      fields.push(`attributes = $${paramCount}`);
      values.push(JSON.stringify(req.body.attributes));
      paramCount++;
    }

    // Handle array dealbreakers
    if (req.body.dealbreakers !== undefined) {
      fields.push(`dealbreakers = $${paramCount}`);
      values.push(req.body.dealbreakers);
      paramCount++;
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(playerId, dynastyId);

    const result = await db.query(
      `UPDATE players SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} AND dynasty_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = result.rows[0];
    const studScore = await studScoreService.calculateStudScore(req.user.id, player);

    res.json({ ...player, stud_score: studScore });
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
};

const deletePlayer = async (req, res) => {
  try {
    const { dynastyId, playerId } = req.params;

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const result = await db.query(
      'DELETE FROM players WHERE id = $1 AND dynasty_id = $2 RETURNING *',
      [playerId, dynastyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
};

module.exports = {
  getPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
};

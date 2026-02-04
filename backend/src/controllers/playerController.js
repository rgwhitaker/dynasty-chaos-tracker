const db = require('../config/database');
const studScoreService = require('../services/studScoreService');

const getPlayers = async (req, res) => {
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

    const result = await db.query(
      'SELECT * FROM players WHERE team_id = $1 ORDER BY position, overall_rating DESC',
      [teamId]
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
    const { teamId } = req.params;
    
    // Verify team belongs to user
    const teamCheck = await db.query(
      'SELECT * FROM teams WHERE id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const {
      first_name, last_name, position, jersey_number, year, overall_rating,
      speed, strength, awareness, agility, acceleration, stamina, injury,
      throw_power, throw_accuracy, carrying, catching, route_running,
      blocking, tackling, coverage, kick_power, kick_accuracy
    } = req.body;

    const result = await db.query(
      `INSERT INTO players (
        team_id, first_name, last_name, position, jersey_number, year, overall_rating,
        speed, strength, awareness, agility, acceleration, stamina, injury,
        throw_power, throw_accuracy, carrying, catching, route_running,
        blocking, tackling, coverage, kick_power, kick_accuracy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *`,
      [
        teamId, first_name, last_name, position, jersey_number, year, overall_rating,
        speed, strength, awareness, agility, acceleration, stamina, injury,
        throw_power, throw_accuracy, carrying, catching, route_running,
        blocking, tackling, coverage, kick_power, kick_accuracy
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
    const { teamId, playerId } = req.params;

    // Verify team belongs to user
    const teamCheck = await db.query(
      'SELECT * FROM teams WHERE id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'first_name', 'last_name', 'position', 'jersey_number', 'year', 'overall_rating',
      'speed', 'strength', 'awareness', 'agility', 'acceleration', 'stamina', 'injury',
      'throw_power', 'throw_accuracy', 'carrying', 'catching', 'route_running',
      'blocking', 'tackling', 'coverage', 'kick_power', 'kick_accuracy'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(req.body[field]);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(playerId, teamId);

    const result = await db.query(
      `UPDATE players SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} AND team_id = $${paramCount + 1} RETURNING *`,
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
    const { teamId, playerId } = req.params;

    // Verify team belongs to user
    const teamCheck = await db.query(
      'SELECT * FROM teams WHERE id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const result = await db.query(
      'DELETE FROM players WHERE id = $1 AND team_id = $2 RETURNING *',
      [playerId, teamId]
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

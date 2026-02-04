const db = require('../config/database');
const recruitingService = require('../services/recruitingService');

const getRecruits = async (req, res) => {
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
      'SELECT * FROM recruits WHERE team_id = $1 ORDER BY commitment_probability DESC, stars DESC',
      [teamId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get recruits error:', error);
    res.status(500).json({ error: 'Failed to fetch recruits' });
  }
};

const createRecruit = async (req, res) => {
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
      first_name, last_name, position, stars, overall_rating,
      commitment_status, hometown, state
    } = req.body;

    // Calculate commitment probability
    const commitmentProbability = recruitingService.predictCommitmentProbability({
      stars, overall_rating, commitment_status
    });

    const result = await db.query(
      `INSERT INTO recruits (
        team_id, first_name, last_name, position, stars, overall_rating,
        commitment_status, commitment_probability, hometown, state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [teamId, first_name, last_name, position, stars, overall_rating,
       commitment_status, commitmentProbability, hometown, state]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create recruit error:', error);
    res.status(500).json({ error: 'Failed to create recruit' });
  }
};

const updateRecruit = async (req, res) => {
  try {
    const { teamId, recruitId } = req.params;

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
      'first_name', 'last_name', 'position', 'stars', 'overall_rating',
      'commitment_status', 'hometown', 'state'
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

    // Recalculate commitment probability if relevant fields changed
    if (req.body.stars || req.body.overall_rating || req.body.commitment_status) {
      const currentRecruit = await db.query('SELECT * FROM recruits WHERE id = $1', [recruitId]);
      const recruit = currentRecruit.rows[0];
      const updatedData = { ...recruit, ...req.body };
      const commitmentProbability = recruitingService.predictCommitmentProbability(updatedData);
      
      fields.push(`commitment_probability = $${paramCount}`);
      values.push(commitmentProbability);
      paramCount++;
    }

    values.push(recruitId, teamId);

    const result = await db.query(
      `UPDATE recruits SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} AND team_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recruit not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update recruit error:', error);
    res.status(500).json({ error: 'Failed to update recruit' });
  }
};

const deleteRecruit = async (req, res) => {
  try {
    const { teamId, recruitId } = req.params;

    // Verify team belongs to user
    const teamCheck = await db.query(
      'SELECT * FROM teams WHERE id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const result = await db.query(
      'DELETE FROM recruits WHERE id = $1 AND team_id = $2 RETURNING *',
      [recruitId, teamId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recruit not found' });
    }

    res.json({ message: 'Recruit deleted successfully' });
  } catch (error) {
    console.error('Delete recruit error:', error);
    res.status(500).json({ error: 'Failed to delete recruit' });
  }
};

module.exports = {
  getRecruits,
  createRecruit,
  updateRecruit,
  deleteRecruit,
};

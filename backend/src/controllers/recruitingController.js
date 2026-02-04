const db = require('../config/database');
const recruitingService = require('../services/recruitingService');

const getRecruits = async (req, res) => {
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
      'SELECT * FROM recruits WHERE dynasty_id = $1 ORDER BY priority_score DESC, stars DESC',
      [dynastyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get recruits error:', error);
    res.status(500).json({ error: 'Failed to fetch recruits' });
  }
};

const createRecruit = async (req, res) => {
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
      first_name, last_name, position, stars, overall_rating,
      attributes, commitment_status, dealbreakers, hometown, state
    } = req.body;

    // Calculate commitment probability
    const commitmentProbability = recruitingService.predictCommitmentProbability({
      stars, overall_rating, commitment_status
    });

    // Calculate dealbreaker fit
    const dealbreakerFitScore = recruitingService.calculateDealbreakerFit(
      dealbreakers,
      dynastyCheck.rows[0]
    );

    // Calculate priority score
    const priorityScore = await recruitingService.calculatePriorityScore(dynastyId, {
      position, stars, overall_rating, attributes
    });

    const result = await db.query(
      `INSERT INTO recruits (
        dynasty_id, first_name, last_name, position, stars, overall_rating,
        attributes, commitment_status, commitment_probability, dealbreakers,
        dealbreaker_fit_score, priority_score, hometown, state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [dynastyId, first_name, last_name, position, stars, overall_rating,
       JSON.stringify(attributes || {}), commitment_status, commitmentProbability,
       dealbreakers || [], dealbreakerFitScore, priorityScore, hometown, state]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create recruit error:', error);
    res.status(500).json({ error: 'Failed to create recruit' });
  }
};

const updateRecruit = async (req, res) => {
  try {
    const { dynastyId, recruitId } = req.params;

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

    // Recalculate scores if relevant fields changed
    if (req.body.stars || req.body.overall_rating || req.body.commitment_status || req.body.attributes) {
      const currentRecruit = await db.query('SELECT * FROM recruits WHERE id = $1', [recruitId]);
      const recruit = currentRecruit.rows[0];
      const updatedData = { ...recruit, ...req.body };
      
      const commitmentProbability = recruitingService.predictCommitmentProbability(updatedData);
      fields.push(`commitment_probability = $${paramCount}`);
      values.push(commitmentProbability);
      paramCount++;

      if (req.body.dealbreakers) {
        const dealbreakerFitScore = recruitingService.calculateDealbreakerFit(
          req.body.dealbreakers,
          dynastyCheck.rows[0]
        );
        fields.push(`dealbreaker_fit_score = $${paramCount}`);
        values.push(dealbreakerFitScore);
        paramCount++;
      }

      const priorityScore = await recruitingService.calculatePriorityScore(dynastyId, updatedData);
      fields.push(`priority_score = $${paramCount}`);
      values.push(priorityScore);
      paramCount++;
    }

    values.push(recruitId, dynastyId);

    const result = await db.query(
      `UPDATE recruits SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} AND dynasty_id = $${paramCount + 1} RETURNING *`,
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
    const { dynastyId, recruitId } = req.params;

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const result = await db.query(
      'DELETE FROM recruits WHERE id = $1 AND dynasty_id = $2 RETURNING *',
      [recruitId, dynastyId]
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

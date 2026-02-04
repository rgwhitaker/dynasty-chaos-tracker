const db = require('../config/database');

const getWeights = async (req, res) => {
  try {
    const { position } = req.query;

    let query = 'SELECT * FROM stud_score_weights WHERE user_id = $1';
    const params = [req.user.id];

    if (position) {
      query += ' AND position = $2';
      params.push(position);
    }

    query += ' ORDER BY position, attribute_name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get weights error:', error);
    res.status(500).json({ error: 'Failed to fetch weights' });
  }
};

const updateWeight = async (req, res) => {
  try {
    const { position, attributeName, weight } = req.body;

    const result = await db.query(
      `INSERT INTO stud_score_weights (user_id, position, attribute_name, weight)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, position, attribute_name)
       DO UPDATE SET weight = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, position, attributeName, weight]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update weight error:', error);
    res.status(500).json({ error: 'Failed to update weight' });
  }
};

const resetWeights = async (req, res) => {
  try {
    const { position } = req.body;

    await db.query(
      'DELETE FROM stud_score_weights WHERE user_id = $1 AND position = $2',
      [req.user.id, position]
    );

    res.json({ message: 'Weights reset to defaults' });
  } catch (error) {
    console.error('Reset weights error:', error);
    res.status(500).json({ error: 'Failed to reset weights' });
  }
};

module.exports = {
  getWeights,
  updateWeight,
  resetWeights,
};

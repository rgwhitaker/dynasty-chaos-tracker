const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const db = require('../config/database');

// Get user's dynasties
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM dynasties WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dynasties' });
  }
});

// Create dynasty
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { team_name, school, conference, season_year } = req.body;
    const result = await db.query(
      'INSERT INTO dynasties (user_id, team_name, school, conference, season_year) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, team_name, school, conference, season_year]
    );
    
    // Create initial roster version
    await db.query(
      'INSERT INTO roster_versions (dynasty_id, season_year, version_name) VALUES ($1, $2, $3)',
      [result.rows[0].id, season_year, 'Initial Roster']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create dynasty' });
  }
});

// Update dynasty
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { team_name, school, conference, season_year, current_week } = req.body;
    const result = await db.query(
      'UPDATE dynasties SET team_name = $1, school = $2, conference = $3, season_year = $4, current_week = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND user_id = $7 RETURNING *',
      [team_name, school, conference, season_year, current_week, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update dynasty' });
  }
});

// Delete dynasty
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM dynasties WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }
    res.json({ message: 'Dynasty deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete dynasty' });
  }
});

module.exports = router;

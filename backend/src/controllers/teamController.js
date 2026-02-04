const db = require('../config/database');

const getTeams = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM teams WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

const createTeam = async (req, res) => {
  try {
    const { team_name, school, conference } = req.body;

    const result = await db.query(
      'INSERT INTO teams (user_id, team_name, school, conference) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, team_name, school, conference]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { team_name, school, conference } = req.body;

    const result = await db.query(
      'UPDATE teams SET team_name = $1, school = $2, conference = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5 RETURNING *',
      [team_name, school, conference, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
};

const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM teams WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

module.exports = {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
};

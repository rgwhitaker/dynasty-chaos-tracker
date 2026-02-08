const db = require('../config/database');
const studScoreService = require('../services/studScoreService');
const { validateStatCaps, calculatePotentialScore } = require('../constants/statCaps');

/**
 * Helper function to ensure player attributes are properly parsed from JSONB
 * @param {Object} player - Player object from database
 * @returns {Object} Player object with parsed attributes
 */
const ensureAttributesParsed = (player) => {
  let attributes = player.attributes;
  if (typeof attributes === 'string') {
    try {
      attributes = JSON.parse(attributes);
    } catch (e) {
      console.error(`Failed to parse attributes for player ID ${player.id} (${player.first_name} ${player.last_name}):`, e);
      attributes = {};
    }
  }
  return attributes || {};
};

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

    // Calculate stud scores for each player and ensure attributes are parsed
    const playersWithScores = await Promise.all(
      result.rows.map(async (player) => {
        const attributes = ensureAttributesParsed(player);
        const studScore = await studScoreService.calculateStudScore(req.user.id, player);
        
        // Parse stat_caps if it's a string
        let statCaps = player.stat_caps;
        if (typeof statCaps === 'string') {
          try {
            statCaps = JSON.parse(statCaps);
          } catch (e) {
            statCaps = {};
          }
        }
        
        // Calculate potential score
        const potentialScore = calculatePotentialScore(statCaps, player.position);
        const adjustedStudScore = studScoreService.calculateAdjustedStudScore(studScore, potentialScore);
        
        return { 
          ...player, 
          attributes, 
          stat_caps: statCaps,
          stud_score: studScore,
          potential_score: potentialScore,
          adjusted_stud_score: adjustedStudScore,
        };
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
      height, weight, dev_trait, attributes, dealbreakers, stat_caps
    } = req.body;

    // Validate stat_caps if provided
    if (stat_caps && position) {
      const validation = validateStatCaps(position, stat_caps);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Invalid stat caps data', 
          details: validation.errors 
        });
      }
    }

    const result = await db.query(
      `INSERT INTO players (
        dynasty_id, first_name, last_name, position, jersey_number, year, overall_rating,
        height, weight, dev_trait, attributes, dealbreakers, stat_caps
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        dynastyId, first_name, last_name, position, jersey_number, year, overall_rating,
        height, weight, dev_trait, JSON.stringify(attributes || {}), dealbreakers || [],
        JSON.stringify(stat_caps || {})
      ]
    );

    const player = result.rows[0];
    const playerAttributes = ensureAttributesParsed(player);
    const studScore = await studScoreService.calculateStudScore(req.user.id, player);
    
    // Parse stat_caps
    let parsedStatCaps = player.stat_caps;
    if (typeof parsedStatCaps === 'string') {
      try {
        parsedStatCaps = JSON.parse(parsedStatCaps);
      } catch (e) {
        parsedStatCaps = {};
      }
    }
    
    const potentialScore = calculatePotentialScore(parsedStatCaps, player.position);
    const adjustedStudScore = studScoreService.calculateAdjustedStudScore(studScore, potentialScore);

    res.status(201).json({ 
      ...player, 
      attributes: playerAttributes, 
      stat_caps: parsedStatCaps,
      stud_score: studScore,
      potential_score: potentialScore,
      adjusted_stud_score: adjustedStudScore,
    });
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
      'first_name', 'last_name', 'position', 'jersey_number', 'year', 'overall_rating',
      'height', 'weight', 'dev_trait'
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

    // Handle JSONB stat_caps with validation
    if (req.body.stat_caps !== undefined) {
      const position = req.body.position || (await db.query(
        'SELECT position FROM players WHERE id = $1',
        [playerId]
      )).rows[0]?.position;

      if (position && req.body.stat_caps) {
        const validation = validateStatCaps(position, req.body.stat_caps);
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Invalid stat caps data', 
            details: validation.errors 
          });
        }
      }

      fields.push(`stat_caps = $${paramCount}`);
      values.push(JSON.stringify(req.body.stat_caps));
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
    const playerAttributes = ensureAttributesParsed(player);
    const studScore = await studScoreService.calculateStudScore(req.user.id, player);
    
    // Parse stat_caps
    let parsedStatCaps = player.stat_caps;
    if (typeof parsedStatCaps === 'string') {
      try {
        parsedStatCaps = JSON.parse(parsedStatCaps);
      } catch (e) {
        parsedStatCaps = {};
      }
    }
    
    const potentialScore = calculatePotentialScore(parsedStatCaps, player.position);
    const adjustedStudScore = studScoreService.calculateAdjustedStudScore(studScore, potentialScore);

    res.json({ 
      ...player, 
      attributes: playerAttributes, 
      stat_caps: parsedStatCaps,
      stud_score: studScore,
      potential_score: potentialScore,
      adjusted_stud_score: adjustedStudScore,
    });
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

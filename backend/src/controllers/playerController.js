const db = require('../config/database');
const studScoreService = require('../services/studScoreService');
const { validateStatCaps, calculatePotentialScore } = require('../constants/statCaps');

const YEAR_ADVANCEMENT = {
  FR: 'SO',
  SO: 'JR',
  JR: 'SR',
  SR: 'GRAD',
  'RS FR': 'RS SO',
  'RS SO': 'RS JR',
  'RS JR': 'RS SR',
  'RS SR': 'GRAD',
  GRAD: 'GRAD',
};

const getAdvancedYear = (year) => YEAR_ADVANCEMENT[year] || year || null;

const advancePlayerSeason = (player) => {
  let nextYear = getAdvancedYear(player.year);
  let redshirted = player.redshirted || false;
  let redshirtUsed = player.redshirt_used || false;
  let redshirtApplied = false;

  if (redshirted && !redshirtUsed) {
    nextYear = player.year;
    redshirted = false;
    redshirtUsed = true;
    redshirtApplied = true;
  } else {
    redshirted = false;
  }

  return {
    year: nextYear,
    redshirted,
    redshirt_used: redshirtUsed,
    redshirtApplied,
    graduated: nextYear === 'GRAD',
  };
};

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
        const studScoreResult = await studScoreService.calculateStudScore(req.user.id, player, dynastyId);
        
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
        const potentialScore = calculatePotentialScore(statCaps, player.position, player.archetype);
        
        return { 
          ...player, 
          attributes, 
          stat_caps: statCaps,
          stud_score: studScoreResult.studScore,
          base_score: studScoreResult.baseScore,
          potential_score: potentialScore,
          adjusted_stud_score: studScoreResult.studScore,
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
      height, weight, dev_trait, archetype, attributes, dealbreakers, stat_caps, transfer_intent, abilities,
      redshirted, redshirt_used
    } = req.body;

    // Validate stat_caps if provided
    if (stat_caps && position) {
      const validation = validateStatCaps(position, stat_caps, archetype);
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
        height, weight, dev_trait, archetype, attributes, dealbreakers, stat_caps, transfer_intent, abilities,
        redshirted, redshirt_used
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        dynastyId, first_name, last_name, position, jersey_number, year, overall_rating,
        height, weight, dev_trait, archetype || null, JSON.stringify(attributes || {}), dealbreakers || [],
        JSON.stringify(stat_caps || {}), transfer_intent || false, JSON.stringify(abilities || {}),
        redshirted || false, redshirt_used || false
      ]
    );

    const player = result.rows[0];
    const playerAttributes = ensureAttributesParsed(player);
    const studScoreResult = await studScoreService.calculateStudScore(req.user.id, player);
    
    // Parse stat_caps
    let parsedStatCaps = player.stat_caps;
    if (typeof parsedStatCaps === 'string') {
      try {
        parsedStatCaps = JSON.parse(parsedStatCaps);
      } catch (e) {
        parsedStatCaps = {};
      }
    }
    
    const potentialScore = calculatePotentialScore(parsedStatCaps, player.position, player.archetype);

    res.status(201).json({ 
      ...player, 
      attributes: playerAttributes, 
      stat_caps: parsedStatCaps,
      stud_score: studScoreResult.studScore,
      base_score: studScoreResult.baseScore,
      potential_score: potentialScore,
      adjusted_stud_score: studScoreResult.studScore,
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
      'height', 'weight', 'dev_trait', 'archetype', 'transfer_intent', 'redshirted', 'redshirt_used'
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

      const archetype = req.body.archetype !== undefined ? req.body.archetype : (await db.query(
        'SELECT archetype FROM players WHERE id = $1',
        [playerId]
      )).rows[0]?.archetype;

      if (position && req.body.stat_caps) {
        const validation = validateStatCaps(position, req.body.stat_caps, archetype);
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

    // Handle JSONB abilities
    if (req.body.abilities !== undefined) {
      fields.push(`abilities = $${paramCount}`);
      values.push(JSON.stringify(req.body.abilities));
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
    const studScoreResult = await studScoreService.calculateStudScore(req.user.id, player);
    
    // Parse stat_caps
    let parsedStatCaps = player.stat_caps;
    if (typeof parsedStatCaps === 'string') {
      try {
        parsedStatCaps = JSON.parse(parsedStatCaps);
      } catch (e) {
        parsedStatCaps = {};
      }
    }
    
    const potentialScore = calculatePotentialScore(parsedStatCaps, player.position, player.archetype);

    res.json({ 
      ...player, 
      attributes: playerAttributes, 
      stat_caps: parsedStatCaps,
      stud_score: studScoreResult.studScore,
      base_score: studScoreResult.baseScore,
      potential_score: potentialScore,
      adjusted_stud_score: studScoreResult.studScore,
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

const advanceSeason = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { dynastyId } = req.params;

    await client.query('BEGIN');

    const dynastyCheck = await client.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    const playersResult = await client.query(
      'SELECT id, year, redshirted, redshirt_used FROM players WHERE dynasty_id = $1 FOR UPDATE',
      [dynastyId]
    );

    let graduatesCount = 0;
    let redshirtsProcessed = 0;

    for (const player of playersResult.rows) {
      const advancedPlayer = advancePlayerSeason(player);

      if (advancedPlayer.redshirtApplied) {
        redshirtsProcessed += 1;
      }

      if (advancedPlayer.graduated) {
        graduatesCount += 1;
      }

      await client.query(
        `UPDATE players
         SET year = $1, redshirted = $2, redshirt_used = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [advancedPlayer.year, advancedPlayer.redshirted, advancedPlayer.redshirt_used, player.id]
      );
    }

    await client.query(
      `DELETE FROM depth_charts dc
       USING players p
       WHERE dc.player_id = p.id
         AND p.dynasty_id = $1
         AND p.year = 'GRAD'`,
      [dynastyId]
    );

    const committedRecruitsResult = await client.query(
      `SELECT *
       FROM recruits
       WHERE dynasty_id = $1 AND commitment_status = 'Committed'
       FOR UPDATE`,
      [dynastyId]
    );

    const committedRecruits = committedRecruitsResult.rows;
    let movedRecruitsCount = 0;

    for (const recruit of committedRecruits) {
      await client.query(
        `INSERT INTO players (
          dynasty_id, first_name, last_name, position, year, overall_rating,
          height, weight, dev_trait, archetype, attributes, abilities,
          dealbreakers, transfer_intent, stat_caps, redshirted, redshirt_used
        ) VALUES (
          $1, $2, $3, $4, 'FR', $5,
          $6, $7, $8, $9, $10, $11,
          $12, FALSE, $13, FALSE, FALSE
        )`,
        [
          dynastyId,
          recruit.first_name,
          recruit.last_name,
          recruit.position,
          recruit.overall_rating,
          recruit.height,
          recruit.weight,
          recruit.dev_trait || 'Unknown',
          recruit.archetype || null,
          recruit.attributes || {},
          recruit.abilities || {},
          recruit.dealbreakers || [],
          {},
        ]
      );
      movedRecruitsCount += 1;
    }

    if (committedRecruits.length > 0) {
      await client.query(
        `DELETE FROM recruits
         WHERE dynasty_id = $1 AND commitment_status = 'Committed'`,
        [dynastyId]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Season advanced successfully',
      summary: {
        playersProcessed: playersResult.rows.length,
        recruitsMoved: movedRecruitsCount,
        graduatesMoved: graduatesCount,
        redshirtsProcessed,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Advance season error:', error);
    res.status(500).json({ error: 'Failed to advance season' });
  } finally {
    client.release();
  }
};

module.exports = {
  getPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  advanceSeason,
  getAdvancedYear,
  advancePlayerSeason,
};

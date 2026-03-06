const db = require('../config/database');
const { ROSTER_POSITIONS } = require('../constants/playerAttributes');

/**
 * Analyzes roster retention risks and recruiting needs
 */

/**
 * Check if a player is at risk for NFL/CFL draft
 * Players with OVR >= 87 and upperclassmen status
 */
function isDraftRisk(player) {
  const draftEligibleYears = ['JR', 'SR', 'RS SR', 'GRAD'];
  return player.overall_rating >= 87 && draftEligibleYears.includes(player.year);
}

/**
 * Check if a player is graduating
 */
function isGraduating(player) {
  const graduatingYears = ['SR', 'RS SR', 'GRAD'];
  return graduatingYears.includes(player.year);
}

/**
 * Check if a player has dealbreaker risk
 */
function hasDealbreakers(player) {
  return !!(player.dealbreakers && Array.isArray(player.dealbreakers) && player.dealbreakers.length > 0);
}

/**
 * Check if a player intends to transfer (dealbreaker not being met)
 */
function hasTransferIntent(player) {
  return player.transfer_intent === true;
}

/**
 * Get attrition risk breakdown for a single position
 */
function getPositionAttritionRisk(players) {
  const risks = {
    dealbreakers: [],
    transferIntent: [],
    draftRisk: [],
    graduating: [],
    total: 0
  };

  players.forEach(player => {
    let playerAtRisk = false;

    if (hasDealbreakers(player)) {
      risks.dealbreakers.push(player);
      playerAtRisk = true;
    }

    if (hasTransferIntent(player)) {
      risks.transferIntent.push(player);
      playerAtRisk = true;
    }

    if (isDraftRisk(player)) {
      risks.draftRisk.push(player);
      playerAtRisk = true;
    }

    if (isGraduating(player)) {
      risks.graduating.push(player);
      playerAtRisk = true;
    }

    // Count unique players (a player might have multiple risk factors)
    if (playerAtRisk) {
      risks.total++;
    }
  });

  // Remove duplicates in total count (a player might be in multiple categories)
  const uniqueAtRiskPlayers = new Set();
  [...risks.dealbreakers, ...risks.transferIntent, ...risks.draftRisk, ...risks.graduating].forEach(p => {
    uniqueAtRiskPlayers.add(p.id);
  });
  risks.total = uniqueAtRiskPlayers.size;

  return risks;
}

// Default minimum depth per position
const DEFAULT_MIN_DEPTH = {
  'QB': 3,
  'HB': 4,
  'FB': 2,
  'WR': 6,
  'TE': 3,
  'LT': 2,
  'LG': 2,
  'C': 2,
  'RG': 2,
  'RT': 2,
  'LEDG': 3,
  'REDG': 3,
  'DT': 4,
  'SAM': 2,
  'MIKE': 2,
  'WILL': 2,
  'CB': 5,
  'FS': 2,
  'SS': 2,
  'K': 2,
  'P': 2
};

/**
 * Get the recruiter hub configuration (target depths) for a dynasty.
 * Returns user-configured values merged with defaults.
 */
async function getConfig(dynastyId) {
  const result = await db.query(
    'SELECT position, target_depth FROM recruiter_hub_config WHERE dynasty_id = $1',
    [dynastyId]
  );

  // Start with defaults, overlay any user-configured values
  const config = { ...DEFAULT_MIN_DEPTH };
  result.rows.forEach(row => {
    config[row.position] = row.target_depth;
  });

  return config;
}

/**
 * Save recruiter hub configuration (target depths) for a dynasty.
 * Accepts an object mapping position -> target_depth.
 */
async function saveConfig(dynastyId, positionDepths) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    for (const [position, targetDepth] of Object.entries(positionDepths)) {
      if (!ROSTER_POSITIONS.includes(position)) continue;
      const depth = Math.max(0, Math.min(20, parseInt(targetDepth, 10)));
      if (isNaN(depth)) continue;

      await client.query(
        `INSERT INTO recruiter_hub_config (dynasty_id, position, target_depth)
         VALUES ($1, $2, $3)
         ON CONFLICT (dynasty_id, position)
         DO UPDATE SET target_depth = $3, updated_at = CURRENT_TIMESTAMP`,
        [dynastyId, position, depth]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate recruiting recommendations for a position
 */
function calculateRecruitingNeed(position, currentCount, atRiskCount, customDepthMap, committedCount = 0) {
  const targetDepth = (customDepthMap && customDepthMap[position] !== undefined)
    ? customDepthMap[position]
    : (DEFAULT_MIN_DEPTH[position] || 3);
  const normalizedCommittedCount = Math.max(0, committedCount || 0);
  const effectiveCount = currentCount + normalizedCommittedCount;
  const projectedCount = effectiveCount - atRiskCount;
  const needToRecruit = Math.max(0, targetDepth - projectedCount);

  // Determine status
  let status;
  if (needToRecruit > 0) {
    // Below target depth - critical
    status = 'CRITICAL';
  } else if (atRiskCount > 0 && projectedCount === targetDepth) {
    // At target depth but has risk - warning
    status = 'WARNING';
  } else {
    // Above target depth - OK
    status = 'OK';
  }

  return {
    currentCount,
    committedCount: normalizedCommittedCount,
    effectiveCount,
    atRiskCount,
    projectedCount,
    targetDepth,
    needToRecruit,
    status
  };
}

/**
 * Analyze all roster attrition risks by position
 */
async function analyzeRosterAttritionRisks(dynastyId) {
  try {
    // Load user-configured target depths (merged with defaults)
    const customDepthMap = await getConfig(dynastyId);

    // Get all players for the dynasty
    const result = await db.query(
      `SELECT id, first_name, last_name, position, jersey_number, year, overall_rating, 
              attributes, dealbreakers, departure_risk, transfer_intent
       FROM players 
       WHERE dynasty_id = $1
       ORDER BY position, overall_rating DESC`,
      [dynastyId]
    );

    const allPlayers = result.rows;

    // Get committed recruits by position so they count toward recruiting needs
    const committedResult = await db.query(
      `SELECT position, COUNT(*)::int AS committed_count
       FROM recruits
       WHERE dynasty_id = $1 AND commitment_status = 'Committed'
       GROUP BY position`,
      [dynastyId]
    );
    const committedByPosition = {};
    committedResult.rows.forEach(row => {
      committedByPosition[row.position] = Number(row.committed_count) || 0;
    });

    // Group players by position
    const playersByPosition = {};
    ROSTER_POSITIONS.forEach(pos => {
      playersByPosition[pos] = [];
    });

    allPlayers.forEach(player => {
      if (playersByPosition[player.position]) {
        playersByPosition[player.position].push(player);
      }
    });

    // Analyze each position
    const positionAnalysis = {};
    ROSTER_POSITIONS.forEach(position => {
      const players = playersByPosition[position] || [];
      const risks = getPositionAttritionRisk(players);
      const committedCount = committedByPosition[position] || 0;
      const recommendations = calculateRecruitingNeed(position, players.length, risks.total, customDepthMap, committedCount);

      positionAnalysis[position] = {
        position,
        ...recommendations,
        risks: {
          dealbreakersCount: risks.dealbreakers.length,
          transferIntentCount: risks.transferIntent.length,
          draftRiskCount: risks.draftRisk.length,
          graduatingCount: risks.graduating.length,
          totalAtRisk: risks.total,
          players: {
            dealbreakers: risks.dealbreakers.map(p => ({
              id: p.id,
              name: `${p.first_name} ${p.last_name}`,
              year: p.year,
              overall: p.overall_rating,
              dealbreakers: p.dealbreakers
            })),
            transferIntent: risks.transferIntent.map(p => ({
              id: p.id,
              name: `${p.first_name} ${p.last_name}`,
              year: p.year,
              overall: p.overall_rating,
              dealbreakers: p.dealbreakers
            })),
            draftRisk: risks.draftRisk.map(p => ({
              id: p.id,
              name: `${p.first_name} ${p.last_name}`,
              year: p.year,
              overall: p.overall_rating
            })),
            graduating: risks.graduating.map(p => ({
              id: p.id,
              name: `${p.first_name} ${p.last_name}`,
              year: p.year,
              overall: p.overall_rating
            }))
          }
        }
      };
    });

    // Calculate overall statistics
    const overallStats = {
      totalPlayers: allPlayers.length,
      totalAtRisk: 0,
      totalDealbreakers: 0,
      totalTransferIntent: 0,
      totalDraftRisk: 0,
      totalGraduating: 0,
      criticalPositions: 0,
      warningPositions: 0
    };

    Object.values(positionAnalysis).forEach(pos => {
      overallStats.totalAtRisk += pos.risks.totalAtRisk;
      overallStats.totalDealbreakers += pos.risks.dealbreakersCount;
      overallStats.totalTransferIntent += pos.risks.transferIntentCount;
      overallStats.totalDraftRisk += pos.risks.draftRiskCount;
      overallStats.totalGraduating += pos.risks.graduatingCount;
      if (pos.status === 'CRITICAL') overallStats.criticalPositions++;
      if (pos.status === 'WARNING') overallStats.warningPositions++;
    });

    // Get dealbreaker breakdown
    const dealbreakerBreakdown = getDealbreakerBreakdown(allPlayers);

    return {
      positionAnalysis,
      overallStats,
      dealbreakerBreakdown
    };
  } catch (error) {
    console.error('Analyze roster attrition risks error:', error);
    throw error;
  }
}

/**
 * Get breakdown of dealbreaker types across the roster
 */
function getDealbreakerBreakdown(players) {
  const breakdown = {};
  
  players.forEach(player => {
    if (player.dealbreakers && player.dealbreakers.length > 0) {
      player.dealbreakers.forEach(dealbreaker => {
        if (!breakdown[dealbreaker]) {
          breakdown[dealbreaker] = {
            type: dealbreaker,
            count: 0,
            players: []
          };
        }
        breakdown[dealbreaker].count++;
        breakdown[dealbreaker].players.push({
          id: player.id,
          name: `${player.first_name} ${player.last_name}`,
          position: player.position,
          year: player.year,
          overall: player.overall_rating
        });
      });
    }
  });

  // Convert to array and sort by count
  return Object.values(breakdown).sort((a, b) => b.count - a.count);
}

module.exports = {
  DEFAULT_MIN_DEPTH,
  analyzeRosterAttritionRisks,
  getConfig,
  saveConfig,
  calculateRecruitingNeed,
  isDraftRisk,
  isGraduating,
  hasDealbreakers,
  hasTransferIntent
};

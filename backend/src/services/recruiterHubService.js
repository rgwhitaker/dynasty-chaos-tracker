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
  return player.dealbreakers && player.dealbreakers.length > 0;
}

/**
 * Get attrition risk breakdown for a single position
 */
function getPositionAttritionRisk(players) {
  const risks = {
    dealbreakers: [],
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
  [...risks.dealbreakers, ...risks.draftRisk, ...risks.graduating].forEach(p => {
    uniqueAtRiskPlayers.add(p.id);
  });
  risks.total = uniqueAtRiskPlayers.size;

  return risks;
}

/**
 * Calculate recruiting recommendations for a position
 */
function calculateRecruitingNeed(currentCount, atRiskCount) {
  // Basic logic: maintain minimum depth of 3-4 players per position
  const minDepth = {
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

  const targetDepth = minDepth[currentCount] || 3;
  const projectedCount = currentCount - atRiskCount;
  const needToRecruit = Math.max(0, targetDepth - projectedCount);

  return {
    currentCount,
    atRiskCount,
    projectedCount,
    targetDepth,
    needToRecruit,
    status: needToRecruit > 0 ? 'CRITICAL' : projectedCount < targetDepth ? 'WARNING' : 'OK'
  };
}

/**
 * Analyze all roster attrition risks by position
 */
async function analyzeRosterAttritionRisks(dynastyId) {
  try {
    // Get all players for the dynasty
    const result = await db.query(
      `SELECT id, first_name, last_name, position, jersey_number, year, overall_rating, 
              attributes, dealbreakers, departure_risk
       FROM players 
       WHERE dynasty_id = $1
       ORDER BY position, overall_rating DESC`,
      [dynastyId]
    );

    const allPlayers = result.rows;

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
      const recommendations = calculateRecruitingNeed(players.length, risks.total);

      positionAnalysis[position] = {
        position,
        ...recommendations,
        risks: {
          dealbreakersCount: risks.dealbreakers.length,
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
      totalDraftRisk: 0,
      totalGraduating: 0,
      criticalPositions: 0,
      warningPositions: 0
    };

    Object.values(positionAnalysis).forEach(pos => {
      overallStats.totalAtRisk += pos.risks.totalAtRisk;
      overallStats.totalDealbreakers += pos.risks.dealbreakersCount;
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
  analyzeRosterAttritionRisks,
  isDraftRisk,
  isGraduating,
  hasDealbreakers
};

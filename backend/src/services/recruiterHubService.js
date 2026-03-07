const db = require('../config/database');
const { ROSTER_POSITIONS } = require('../constants/playerAttributes');
const { DEPTH_CHART_SLOTS } = require('../constants/depthChartMapping');
const depthChartMappingService = require('./depthChartMappingService');

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

function isPlayerAtRisk(player) {
  return hasDealbreakers(player) || hasTransferIntent(player) || isDraftRisk(player) || isGraduating(player);
}

function bucketKey(position, archetype = null) {
  return `${position}::${archetype || '*'}`;
}

function incrementCount(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount;
}

function parseBucketKey(key) {
  const [position, archetype] = key.split('::');
  return { position, archetype: archetype === '*' ? null : archetype };
}

function buildAvailabilityPool(players, committedRecruits) {
  const pool = {};

  const addEntry = (position, archetype) => {
    if (!pool[position]) {
      pool[position] = { total: 0, byArchetype: {} };
    }
    const normalizedArchetype = archetype || '__UNSPECIFIED__';
    pool[position].total += 1;
    pool[position].byArchetype[normalizedArchetype] = (pool[position].byArchetype[normalizedArchetype] || 0) + 1;
  };

  players.forEach(player => addEntry(player.position, player.archetype));
  committedRecruits.forEach(recruit => addEntry(recruit.position, recruit.archetype));

  return pool;
}

function canConsume(pool, rule) {
  const entry = pool[rule.position];
  if (!entry || entry.total <= 0) return false;

  if (rule.archetype) {
    return (entry.byArchetype[rule.archetype] || 0) > 0;
  }

  return entry.total > 0;
}

function consume(pool, rule) {
  const entry = pool[rule.position];
  if (!entry || entry.total <= 0) return false;

  let archetypeToConsume = rule.archetype || null;
  if (!archetypeToConsume) {
    const candidates = Object.entries(entry.byArchetype)
      .filter(([, count]) => count > 0)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });
    if (!candidates.length) return false;
    archetypeToConsume = candidates[0][0];
  }

  if (!entry.byArchetype[archetypeToConsume] || entry.byArchetype[archetypeToConsume] <= 0) {
    return false;
  }

  entry.byArchetype[archetypeToConsume] -= 1;
  entry.total -= 1;
  return true;
}

function determineStatus(needToRecruit, atRiskCount, projectedCount, targetDepth) {
  if (needToRecruit > 0) return 'CRITICAL';
  if (atRiskCount > 0 && projectedCount === targetDepth) return 'WARNING';
  return 'OK';
}

function simulateDemandFromMapping(mappingConfig, projectedPlayers, committedRecruits) {
  const pool = buildAvailabilityPool(projectedPlayers, committedRecruits);
  const targetByBucket = {};
  const shortageByBucket = {};

  DEPTH_CHART_SLOTS.forEach(slot => {
    const slotConfig = mappingConfig.slots[slot];
    for (let i = 0; i < slotConfig.count; i++) {
      let matchedRule = null;
      for (const rule of slotConfig.rules) {
        if (canConsume(pool, rule)) {
          consume(pool, rule);
          matchedRule = rule;
          break;
        }
      }

      if (!matchedRule) {
        matchedRule = slotConfig.rules[0];
        incrementCount(shortageByBucket, bucketKey(matchedRule.position, matchedRule.archetype));
      }

      incrementCount(targetByBucket, bucketKey(matchedRule.position, matchedRule.archetype));
    }
  });

  return { targetByBucket, shortageByBucket };
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

    if (playerAtRisk) {
      risks.total++;
    }
  });

  const uniqueAtRiskPlayers = new Set();
  [...risks.dealbreakers, ...risks.transferIntent, ...risks.draftRisk, ...risks.graduating].forEach(p => {
    uniqueAtRiskPlayers.add(p.id);
  });
  risks.total = uniqueAtRiskPlayers.size;

  return risks;
}

async function getConfig(dynastyId) {
  return depthChartMappingService.getConfig(dynastyId);
}

async function saveConfig(dynastyId, depthChartMapping) {
  return depthChartMappingService.saveConfig(dynastyId, depthChartMapping);
}

async function resetConfig(dynastyId) {
  return depthChartMappingService.resetConfig(dynastyId);
}

/**
 * Analyze all roster attrition risks by position
 */
async function analyzeRosterAttritionRisks(dynastyId) {
  try {
    const mappingConfig = await depthChartMappingService.getConfig(dynastyId);

    const result = await db.query(
      `SELECT id, first_name, last_name, position, archetype, jersey_number, year, overall_rating,
              attributes, dealbreakers, departure_risk, transfer_intent
       FROM players
       WHERE dynasty_id = $1
       ORDER BY position, overall_rating DESC`,
      [dynastyId]
    );

    const committedResult = await db.query(
      `SELECT position, COALESCE(archetype, '') AS archetype, COUNT(*)::int AS committed_count
       FROM recruits
       WHERE dynasty_id = $1 AND commitment_status = 'Committed'
       GROUP BY position, COALESCE(archetype, '')`,
      [dynastyId]
    );

    const allPlayers = result.rows;
    const atRiskPlayers = allPlayers.filter(isPlayerAtRisk);
    const projectedPlayers = allPlayers.filter(player => !isPlayerAtRisk(player));
    const committedRecruits = [];

    const committedByPosition = {};
    const committedByPositionArchetype = {};
    committedResult.rows.forEach(row => {
      const count = Number(row.committed_count) || 0;
      if (count <= 0) return;
      committedByPosition[row.position] = (committedByPosition[row.position] || 0) + count;
      if (!committedByPositionArchetype[row.position]) committedByPositionArchetype[row.position] = {};
      if (row.archetype) {
        committedByPositionArchetype[row.position][row.archetype] = (committedByPositionArchetype[row.position][row.archetype] || 0) + count;
      }

      for (let i = 0; i < count; i++) {
        committedRecruits.push({ position: row.position, archetype: row.archetype || null });
      }
    });

    const demandSimulation = simulateDemandFromMapping(mappingConfig, projectedPlayers, committedRecruits);

    const playersByPosition = {};
    const atRiskByPosition = {};
    const atRiskByPositionArchetype = {};
    const currentByPositionArchetype = {};
    ROSTER_POSITIONS.forEach(pos => {
      playersByPosition[pos] = [];
      atRiskByPosition[pos] = 0;
      currentByPositionArchetype[pos] = {};
      atRiskByPositionArchetype[pos] = {};
    });

    allPlayers.forEach(player => {
      if (!playersByPosition[player.position]) return;
      playersByPosition[player.position].push(player);
      const archetype = player.archetype || '__UNSPECIFIED__';
      currentByPositionArchetype[player.position][archetype] = (currentByPositionArchetype[player.position][archetype] || 0) + 1;
    });

    atRiskPlayers.forEach(player => {
      if (!(player.position in atRiskByPosition)) return;
      atRiskByPosition[player.position] = (atRiskByPosition[player.position] || 0) + 1;
      const archetype = player.archetype || '__UNSPECIFIED__';
      atRiskByPositionArchetype[player.position][archetype] = (atRiskByPositionArchetype[player.position][archetype] || 0) + 1;
    });

    const targetByPosition = {};
    const needByPosition = {};
    const archetypeAnalysis = {};

    Object.entries(demandSimulation.targetByBucket).forEach(([key, targetDepth]) => {
      const needToRecruit = demandSimulation.shortageByBucket[key] || 0;
      const { position, archetype } = parseBucketKey(key);

      targetByPosition[position] = (targetByPosition[position] || 0) + targetDepth;
      needByPosition[position] = (needByPosition[position] || 0) + needToRecruit;

      const currentCount = archetype
        ? (currentByPositionArchetype[position]?.[archetype] || 0)
        : (playersByPosition[position]?.length || 0);
      const committedCount = archetype
        ? (committedByPositionArchetype[position]?.[archetype] || 0)
        : (committedByPosition[position] || 0);
      const atRiskCount = archetype
        ? (atRiskByPositionArchetype[position]?.[archetype] || 0)
        : (atRiskByPosition[position] || 0);
      const projectedCount = Math.max(0, currentCount + committedCount - atRiskCount);

      archetypeAnalysis[bucketKey(position, archetype)] = {
        position,
        archetype,
        currentCount,
        committedCount,
        effectiveCount: currentCount + committedCount,
        atRiskCount,
        projectedCount,
        targetDepth,
        needToRecruit,
        status: determineStatus(needToRecruit, atRiskCount, projectedCount, targetDepth),
      };
    });

    const positionAnalysis = {};
    ROSTER_POSITIONS.forEach(position => {
      const players = playersByPosition[position] || [];
      const risks = getPositionAttritionRisk(players);
      const committedCount = committedByPosition[position] || 0;
      const projectedCount = Math.max(0, players.length + committedCount - risks.total);
      const targetDepth = targetByPosition[position] || 0;
      const needToRecruit = needByPosition[position] || 0;

      positionAnalysis[position] = {
        position,
        currentCount: players.length,
        committedCount,
        effectiveCount: players.length + committedCount,
        atRiskCount: risks.total,
        projectedCount,
        targetDepth,
        needToRecruit,
        status: determineStatus(needToRecruit, risks.total, projectedCount, targetDepth),
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

    const dealbreakerBreakdown = getDealbreakerBreakdown(allPlayers);

    return {
      mappingConfig,
      positionAnalysis,
      archetypeAnalysis,
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

  return Object.values(breakdown).sort((a, b) => b.count - a.count);
}

module.exports = {
  analyzeRosterAttritionRisks,
  getConfig,
  saveConfig,
  resetConfig,
  isDraftRisk,
  isGraduating,
  hasDealbreakers,
  hasTransferIntent,
  isPlayerAtRisk,
  simulateDemandFromMapping,
  determineStatus,
  bucketKey,
};

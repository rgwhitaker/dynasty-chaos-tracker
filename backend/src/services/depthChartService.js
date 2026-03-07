const db = require('../config/database');
const studScoreService = require('./studScoreService');
const depthChartMappingService = require('./depthChartMappingService');
const { DEPTH_CHART_SLOT_COUNTS } = require('../constants/depthChartMapping');

/**
 * Generate depth chart for a dynasty based on Stud Scores
 */
async function generateDepthChart(dynastyId, userId) {
  try {
    const mappingConfig = await depthChartMappingService.getConfig(dynastyId);

    // Get all players for the dynasty
    const playersResult = await db.query(
      'SELECT * FROM players WHERE dynasty_id = $1',
      [dynastyId]
    );

    const players = playersResult.rows;

    // Pre-calculate stud scores once per player for deterministic sorting
    const playersWithScores = await Promise.all(
      players.map(async (player) => {
        const studScoreResult = await studScoreService.calculateStudScore(userId, player);
        return { ...player, studScore: studScoreResult.studScore };
      })
    );

    const playersByPosition = {};
    playersWithScores.forEach(player => {
      if (!playersByPosition[player.position]) playersByPosition[player.position] = [];
      playersByPosition[player.position].push(player);
    });

    // Clear existing auto-generated depth chart (keep manual overrides)
    await db.query(
      'DELETE FROM depth_charts WHERE dynasty_id = $1 AND is_manual_override = FALSE',
      [dynastyId]
    );

    // Generate depth chart for each slot using configured ordered rules
    for (const [slot, slotConfig] of Object.entries(mappingConfig.slots)) {
      const selectedPlayers = [];
      const selectedIds = new Set();

      for (const rule of slotConfig.rules) {
        const candidates = (playersByPosition[rule.position] || [])
          .filter(player => !rule.archetype || player.archetype === rule.archetype)
          .sort((a, b) => {
            if (b.studScore !== a.studScore) return b.studScore - a.studScore;
            if (b.overall_rating !== a.overall_rating) return b.overall_rating - a.overall_rating;
            return a.id - b.id;
          });

        for (const candidate of candidates) {
          if (selectedIds.has(candidate.id)) continue;
          selectedPlayers.push(candidate);
          selectedIds.add(candidate.id);
          if (selectedPlayers.length >= slotConfig.count) break;
        }

        if (selectedPlayers.length >= slotConfig.count) break;
      }

      for (let i = 0; i < selectedPlayers.length; i++) {
        await db.query(
          `INSERT INTO depth_charts (dynasty_id, position, depth_order, player_id, is_manual_override)
           VALUES ($1, $2, $3, $4, FALSE)
           ON CONFLICT (dynasty_id, position, depth_order)
           DO UPDATE SET player_id = $4 WHERE depth_charts.is_manual_override = FALSE`,
          [dynastyId, slot, i + 1, selectedPlayers[i].id]
        );
      }
    }

    return { message: 'Depth chart generated successfully' };
  } catch (error) {
    console.error('Generate depth chart error:', error);
    throw error;
  }
}

/**
 * Get depth chart positions configuration
 */
function getDepthChartPositions() {
  return {
    offense: {
      QB: { name: 'Quarterback', depth: DEPTH_CHART_SLOT_COUNTS.QB },
      HB: { name: 'Halfback', depth: DEPTH_CHART_SLOT_COUNTS.HB },
      FB: { name: 'Fullback', depth: DEPTH_CHART_SLOT_COUNTS.FB },
      WR: { name: 'Wide Receiver', depth: DEPTH_CHART_SLOT_COUNTS.WR },
      TE: { name: 'Tight End', depth: DEPTH_CHART_SLOT_COUNTS.TE },
      LT: { name: 'Left Tackle', depth: DEPTH_CHART_SLOT_COUNTS.LT },
      LG: { name: 'Left Guard', depth: DEPTH_CHART_SLOT_COUNTS.LG },
      C: { name: 'Center', depth: DEPTH_CHART_SLOT_COUNTS.C },
      RG: { name: 'Right Guard', depth: DEPTH_CHART_SLOT_COUNTS.RG },
      RT: { name: 'Right Tackle', depth: DEPTH_CHART_SLOT_COUNTS.RT }
    },
    defense: {
      LEDG: { name: 'Left Edge', depth: DEPTH_CHART_SLOT_COUNTS.LEDG },
      DT: { name: 'Defensive Tackle', depth: DEPTH_CHART_SLOT_COUNTS.DT },
      REDG: { name: 'Right Edge', depth: DEPTH_CHART_SLOT_COUNTS.REDG },
      SAM: { name: 'SAM Linebacker', depth: DEPTH_CHART_SLOT_COUNTS.SAM },
      MIKE: { name: 'MIKE Linebacker', depth: DEPTH_CHART_SLOT_COUNTS.MIKE },
      WILL: { name: 'WILL Linebacker', depth: DEPTH_CHART_SLOT_COUNTS.WILL },
      CB: { name: 'Cornerback', depth: DEPTH_CHART_SLOT_COUNTS.CB },
      FS: { name: 'Free Safety', depth: DEPTH_CHART_SLOT_COUNTS.FS },
      SS: { name: 'Strong Safety', depth: DEPTH_CHART_SLOT_COUNTS.SS }
    },
    special: {
      K: { name: 'Kicker', depth: DEPTH_CHART_SLOT_COUNTS.K },
      P: { name: 'Punter', depth: DEPTH_CHART_SLOT_COUNTS.P },
      KR: { name: 'Kick Returner', depth: DEPTH_CHART_SLOT_COUNTS.KR },
      PR: { name: 'Punt Returner', depth: DEPTH_CHART_SLOT_COUNTS.PR },
      KOS: { name: 'Kickoff Specialist', depth: DEPTH_CHART_SLOT_COUNTS.KOS },
      LS: { name: 'Long Snapper', depth: DEPTH_CHART_SLOT_COUNTS.LS }
    },
    situational: {
      '3DRB': { name: '3rd Down RB', depth: DEPTH_CHART_SLOT_COUNTS['3DRB'] },
      PWHB: { name: 'Power HB', depth: DEPTH_CHART_SLOT_COUNTS.PWHB },
      SLWR: { name: 'Slot WR', depth: DEPTH_CHART_SLOT_COUNTS.SLWR },
      RLE: { name: 'Rush Left End', depth: DEPTH_CHART_SLOT_COUNTS.RLE },
      RRE: { name: 'Rush Right End', depth: DEPTH_CHART_SLOT_COUNTS.RRE },
      RDT: { name: 'Rush DT', depth: DEPTH_CHART_SLOT_COUNTS.RDT },
      SUBLB: { name: 'Sub LB', depth: DEPTH_CHART_SLOT_COUNTS.SUBLB },
      SLCB: { name: 'Slot CB', depth: DEPTH_CHART_SLOT_COUNTS.SLCB },
      NT: { name: 'Nose Tackle', depth: DEPTH_CHART_SLOT_COUNTS.NT },
      GAD: { name: 'Goal Line/Adaptive', depth: DEPTH_CHART_SLOT_COUNTS.GAD }
    }
  };
}

module.exports = {
  generateDepthChart,
  getDepthChartPositions
};

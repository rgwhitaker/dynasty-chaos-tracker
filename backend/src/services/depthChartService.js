const db = require('../config/database');
const studScoreService = require('./studScoreService');
const depthChartMappingService = require('./depthChartMappingService');

/**
 * Generate depth chart for a dynasty based on Stud Scores
 */
async function generateDepthChart(dynastyId, userId) {
  try {
    // Get all players for the dynasty
    const playersResult = await db.query(
      'SELECT * FROM players WHERE dynasty_id = $1',
      [dynastyId]
    );

    const players = playersResult.rows;

    const mappingConfig = await depthChartMappingService.getConfig(dynastyId);

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
    for (const slotConfig of Object.values(mappingConfig.slots)) {
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
          [dynastyId, slotConfig.slot, i + 1, selectedPlayers[i].id]
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
      QB: { name: 'Quarterback', depth: 3 },
      HB: { name: 'Halfback', depth: 4 },
      FB: { name: 'Fullback', depth: 3 },
      WR: { name: 'Wide Receiver', depth: 6 },
      TE: { name: 'Tight End', depth: 3 },
      LT: { name: 'Left Tackle', depth: 3 },
      LG: { name: 'Left Guard', depth: 3 },
      C: { name: 'Center', depth: 3 },
      RG: { name: 'Right Guard', depth: 3 },
      RT: { name: 'Right Tackle', depth: 3 }
    },
    defense: {
      LEDG: { name: 'Left Edge', depth: 3 },
      DT: { name: 'Defensive Tackle', depth: 5 },
      REDG: { name: 'Right Edge', depth: 3 },
      SAM: { name: 'SAM Linebacker', depth: 3 },
      MIKE: { name: 'MIKE Linebacker', depth: 4 },
      WILL: { name: 'WILL Linebacker', depth: 3 },
      CB: { name: 'Cornerback', depth: 5 },
      FS: { name: 'Free Safety', depth: 3 },
      SS: { name: 'Strong Safety', depth: 3 }
    },
    special: {
      K: { name: 'Kicker', depth: 3 },
      P: { name: 'Punter', depth: 3 },
      KR: { name: 'Kick Returner', depth: 5 },
      PR: { name: 'Punt Returner', depth: 5 },
      KOS: { name: 'Kickoff Specialist', depth: 3 },
      LS: { name: 'Long Snapper', depth: 3 }
    },
    situational: {
      '3DRB': { name: '3rd Down RB', depth: 3 },
      PWHB: { name: 'Power HB', depth: 3 },
      SLWR: { name: 'Slot WR', depth: 3 },
      RLE: { name: 'Rush Left End', depth: 3 },
      RRE: { name: 'Rush Right End', depth: 3 },
      RDT: { name: 'Rush DT', depth: 3 },
      SUBLB: { name: 'Sub LB', depth: 3 },
      SLCB: { name: 'Slot CB', depth: 3 },
      NT: { name: 'Nose Tackle', depth: 3 },
      GAD: { name: 'Goal Line/Adaptive', depth: 3 }
    }
  };
}

module.exports = {
  generateDepthChart,
  getDepthChartPositions
};

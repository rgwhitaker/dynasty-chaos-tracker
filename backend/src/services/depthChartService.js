const db = require('../config/database');
const studScoreService = require('./studScoreService');

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

    // Group players by position
    const playersByPosition = {};
    for (const player of players) {
      if (!playersByPosition[player.position]) {
        playersByPosition[player.position] = [];
      }
      playersByPosition[player.position].push(player);
    }

    // Clear existing auto-generated depth chart (keep manual overrides)
    await db.query(
      'DELETE FROM depth_charts WHERE dynasty_id = $1 AND is_manual_override = FALSE',
      [dynastyId]
    );

    // Generate depth chart for each position
    for (const [position, positionPlayers] of Object.entries(playersByPosition)) {
      // Calculate stud scores for each player
      const playersWithScores = await Promise.all(
        positionPlayers.map(async (player) => {
          const studScoreResult = await studScoreService.calculateStudScore(userId, player);
          return { ...player, studScore: studScoreResult.studScore };
        })
      );

      // Sort by stud score (descending)
      playersWithScores.sort((a, b) => b.studScore - a.studScore);

      // Insert into depth chart
      for (let i = 0; i < playersWithScores.length; i++) {
        await db.query(
          `INSERT INTO depth_charts (dynasty_id, position, depth_order, player_id, is_manual_override)
           VALUES ($1, $2, $3, $4, FALSE)
           ON CONFLICT (dynasty_id, position, depth_order)
           DO UPDATE SET player_id = $4 WHERE depth_charts.is_manual_override = FALSE`,
          [dynastyId, position, i + 1, playersWithScores[i].id]
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
      FB: { name: 'Fullback', depth: 2 },
      WR: { name: 'Wide Receiver', depth: 6 },
      TE: { name: 'Tight End', depth: 3 },
      LT: { name: 'Left Tackle', depth: 2 },
      LG: { name: 'Left Guard', depth: 2 },
      C: { name: 'Center', depth: 2 },
      RG: { name: 'Right Guard', depth: 2 },
      RT: { name: 'Right Tackle', depth: 2 }
    },
    defense: {
      LEDG: { name: 'Left Edge', depth: 3 },
      DT: { name: 'Defensive Tackle', depth: 4 },
      REDG: { name: 'Right Edge', depth: 3 },
      SAM: { name: 'SAM Linebacker', depth: 2 },
      MIKE: { name: 'MIKE Linebacker', depth: 2 },
      WILL: { name: 'WILL Linebacker', depth: 2 },
      CB: { name: 'Cornerback', depth: 5 },
      FS: { name: 'Free Safety', depth: 3 },
      SS: { name: 'Strong Safety', depth: 3 }
    },
    special: {
      K: { name: 'Kicker', depth: 2 },
      P: { name: 'Punter', depth: 2 },
      KR: { name: 'Kick Returner', depth: 3 },
      PR: { name: 'Punt Returner', depth: 3 },
      KOS: { name: 'Kickoff Specialist', depth: 1 },
      LS: { name: 'Long Snapper', depth: 2 }
    },
    situational: {
      '3DRB': { name: '3rd Down RB', depth: 2 },
      PWHB: { name: 'Power HB', depth: 2 },
      SLWR: { name: 'Slot WR', depth: 3 },
      RLE: { name: 'Rush Left End', depth: 2 },
      RRE: { name: 'Rush Right End', depth: 2 },
      RDT: { name: 'Rush DT', depth: 2 },
      SUBLB: { name: 'Sub LB', depth: 2 },
      SLCB: { name: 'Slot CB', depth: 3 },
      NT: { name: 'Nose Tackle', depth: 2 },
      GAD: { name: 'Goal Line/Adaptive', depth: 2 }
    }
  };
}

module.exports = {
  generateDepthChart,
  getDepthChartPositions
};

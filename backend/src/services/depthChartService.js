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
          const studScore = await studScoreService.calculateStudScore(userId, player);
          return { ...player, studScore };
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
      RB: { name: 'Running Back', depth: 4 },
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
      LE: { name: 'Left End', depth: 3 },
      DT: { name: 'Defensive Tackle', depth: 4 },
      RE: { name: 'Right End', depth: 3 },
      LOLB: { name: 'Left Outside LB', depth: 2 },
      MLB: { name: 'Middle Linebacker', depth: 3 },
      ROLB: { name: 'Right Outside LB', depth: 2 },
      CB: { name: 'Cornerback', depth: 5 },
      FS: { name: 'Free Safety', depth: 3 },
      SS: { name: 'Strong Safety', depth: 3 }
    },
    special: {
      K: { name: 'Kicker', depth: 2 },
      P: { name: 'Punter', depth: 2 }
    }
  };
}

module.exports = {
  generateDepthChart,
  getDepthChartPositions
};

const db = require('../config/database');

/**
 * Predict commitment probability for a recruit
 * Uses simple heuristics - could be enhanced with ML model
 */
function predictCommitmentProbability(recruit) {
  let baseProbability = 50; // Start at 50%

  // Higher star recruits are harder to get
  if (recruit.stars) {
    baseProbability -= (recruit.stars - 3) * 10;
  }

  // Commitment status heavily influences probability
  if (recruit.commitment_status === 'Committed') {
    baseProbability = 90;
  } else if (recruit.commitment_status === 'Considering') {
    baseProbability = 60;
  } else if (recruit.commitment_status === 'Not Interested') {
    baseProbability = 10;
  }

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, baseProbability));
}

/**
 * Calculate dealbreaker fit score
 */
function calculateDealbreakerFit(recruitDealbreakers, dynastyMetadata) {
  if (!recruitDealbreakers || recruitDealbreakers.length === 0) {
    return 50; // Neutral if no dealbreakers
  }

  let fitScore = 0;
  let totalWeight = 0;

  const dealbreakerMatches = {
    'Championship Contender': dynastyMetadata.conference === 'SEC' || dynastyMetadata.conference === 'Big Ten',
    'Academic Prestige': ['Stanford', 'Notre Dame', 'Michigan', 'Vanderbilt'].includes(dynastyMetadata.school),
    'Playing Time': true, // Assume always available
    'Pro Distance': ['Ohio State', 'Alabama', 'Georgia', 'Clemson'].includes(dynastyMetadata.school),
    'Proximity': true // Would need location matching
  };

  recruitDealbreakers.forEach(dealbreaker => {
    const matches = dealbreakerMatches[dealbreaker];
    if (matches !== undefined) {
      fitScore += matches ? 1 : 0;
      totalWeight += 1;
    }
  });

  return totalWeight > 0 ? (fitScore / totalWeight) * 100 : 50;
}

/**
 * Calculate recruiting priority score
 */
async function calculatePriorityScore(dynastyId, recruit) {
  try {
    // Get roster gaps
    const positionGap = await analyzePositionGap(dynastyId, recruit.position);
    
    // Base score from recruit quality
    let score = (recruit.stars || 3) * 20;

    // Boost for needed positions
    score += positionGap.need * 10;

    // Boost for attribute match (if attributes available)
    if (recruit.attributes && Object.keys(recruit.attributes).length > 0) {
      score += 10; // Simple boost for having attribute data
    }

    return Math.min(100, score);
  } catch (error) {
    console.error('Calculate priority score error:', error);
    return 50; // Default
  }
}

/**
 * Analyze position gap for recruiting needs
 */
async function analyzePositionGap(dynastyId, position) {
  try {
    // Get current players at position
    const result = await db.query(
      `SELECT year, COUNT(*) as count 
       FROM players 
       WHERE dynasty_id = $1 AND position = $2 
       GROUP BY year`,
      [dynastyId, position]
    );

    const counts = {
      FR: 0,
      SO: 0,
      JR: 0,
      SR: 0,
      GRAD: 0
    };

    result.rows.forEach(row => {
      counts[row.year] = parseInt(row.count);
    });

    // Calculate need (higher if many seniors/grads leaving)
    const leavingSoon = counts.SR + counts.GRAD;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    let need = 0;
    if (total === 0) {
      need = 10; // Desperately need if no players
    } else if (leavingSoon / total > 0.5) {
      need = 8; // High need
    } else if (leavingSoon / total > 0.3) {
      need = 5; // Moderate need
    } else {
      need = 2; // Low need
    }

    return {
      need,
      current: total,
      leaving: leavingSoon,
      breakdown: counts
    };
  } catch (error) {
    console.error('Analyze position gap error:', error);
    return { need: 5, current: 0, leaving: 0, breakdown: {} };
  }
}

/**
 * Predict player departure risk
 */
function predictDepartureRisk(player) {
  let risk = 0;

  // Senior and Grad students very likely to leave
  if (player.year === 'SR') {
    risk = 95;
  } else if (player.year === 'GRAD') {
    risk = 98;
  } else if (player.year === 'JR') {
    // Juniors with high ratings might declare for draft
    if (player.overall_rating >= 85) {
      risk = 40;
    } else {
      risk = 5;
    }
  } else {
    risk = 2; // FR/SO unlikely to leave
  }

  // Check dealbreakers
  if (player.dealbreakers && player.dealbreakers.length > 3) {
    risk += 15; // More dealbreakers = higher transfer risk
  }

  return Math.min(100, risk);
}

/**
 * Generate recruiting targets based on roster gaps
 */
async function generateRecruitingTargets(dynastyId) {
  try {
    // Analyze all positions
    const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P'];
    const targets = [];

    for (const position of positions) {
      const gap = await analyzePositionGap(dynastyId, position);
      
      if (gap.need >= 5) {
        targets.push({
          position,
          priority: gap.need,
          current_count: gap.current,
          leaving_count: gap.leaving,
          recommended_recruits: Math.max(2, gap.leaving)
        });
      }
    }

    // Sort by priority
    targets.sort((a, b) => b.priority - a.priority);

    return targets;
  } catch (error) {
    console.error('Generate recruiting targets error:', error);
    throw error;
  }
}

module.exports = {
  predictCommitmentProbability,
  calculateDealbreakerFit,
  calculatePriorityScore,
  analyzePositionGap,
  predictDepartureRisk,
  generateRecruitingTargets
};

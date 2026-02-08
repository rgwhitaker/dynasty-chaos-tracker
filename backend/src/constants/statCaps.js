/**
 * Stat Cap Constants for College Football 26
 * Position-specific stat groups for tracking player potential
 */

// Position stat groups mapping
// Each position has 6-7 stat groups in order, with 20 upgrade blocks each
const POSITION_STAT_GROUPS = {
  QB: ['Accuracy', 'Power', 'IQ', 'Elusiveness', 'Quickness', 'Health'],
  HB: ['Quickness', 'Elusiveness', 'Hands', 'Power', 'Route Running', 'IQ'],
  FB: ['Blocking', 'Power', 'IQ', 'Quickness', 'Hands', 'Route Running'],
  WR: ['Quickness', 'Hands', 'Route Running', 'Elusiveness', 'Power', 'IQ'],
  TE: ['Route Running', 'Hands', 'Elusiveness', 'IQ', 'Power', 'Quickness'],
  // Offensive Line (T, G, C all share the same groups)
  T: ['Pass Blocking', 'Run Blocking', 'Power', 'IQ', 'Footwork', 'Quickness'],
  G: ['Pass Blocking', 'Run Blocking', 'Power', 'IQ', 'Footwork', 'Quickness'],
  C: ['Pass Blocking', 'Run Blocking', 'Power', 'IQ', 'Footwork', 'Quickness'],
  LT: ['Pass Blocking', 'Run Blocking', 'Power', 'IQ', 'Footwork', 'Quickness'],
  LG: ['Pass Blocking', 'Run Blocking', 'Power', 'IQ', 'Footwork', 'Quickness'],
  RG: ['Pass Blocking', 'Run Blocking', 'Power', 'IQ', 'Footwork', 'Quickness'],
  RT: ['Pass Blocking', 'Run Blocking', 'Power', 'IQ', 'Footwork', 'Quickness'],
  // Edge Rushers
  LEDG: ['Power Moves', 'Finesse Moves', 'Power', 'Quickness', 'Run Stopping', 'IQ'],
  REDG: ['Power Moves', 'Finesse Moves', 'Power', 'Quickness', 'Run Stopping', 'IQ'],
  // Defensive Tackle
  DT: ['Pass Rushing', 'Power', 'Quickness', 'Run Stopping', 'IQ', 'Health'],
  // Linebackers (SAM, WILL, MIKE all share the same groups)
  SAM: ['Quickness', 'Pass Coverage', 'Run Stopping', 'IQ', 'Power', 'Pass Rush'],
  WILL: ['Quickness', 'Pass Coverage', 'Run Stopping', 'IQ', 'Power', 'Pass Rush'],
  MIKE: ['Quickness', 'Pass Coverage', 'Run Stopping', 'IQ', 'Power', 'Pass Rush'],
  // Cornerback
  CB: ['Man Coverage', 'Zone Coverage', 'Quickness', 'Hands', 'Power', 'Run Stopping'],
  // Free Safety
  FS: ['IQ', 'Pass Coverage', 'Quickness', 'Run Support', 'Power', 'Hands'],
  // Strong Safety
  SS: ['Zone Coverage', 'Man Coverage', 'Quickness', 'Run Support', 'Power', 'Hands'],
  // Special Teams
  K: ['Kick Accuracy', 'IQ', 'Kick Power', 'Quickness', 'Throw Accuracy', 'Throw Power'],
  P: ['Kick Accuracy', 'IQ', 'Kick Power', 'Quickness', 'Throw Accuracy', 'Throw Power'],
};

/**
 * Validate stat cap data structure
 * @param {string} position - Player position
 * @param {object} statCaps - Stat caps data object
 * @returns {object} Validation result with isValid and errors
 */
function validateStatCaps(position, statCaps) {
  const errors = [];
  
  if (!statCaps || typeof statCaps !== 'object') {
    return { isValid: true, errors: [] }; // Allow empty/null stat caps
  }

  const validGroups = POSITION_STAT_GROUPS[position];
  if (!validGroups) {
    errors.push(`Invalid position: ${position}`);
    return { isValid: false, errors };
  }

  for (const [groupName, groupData] of Object.entries(statCaps)) {
    // Check if stat group is valid for this position
    if (!validGroups.includes(groupName)) {
      errors.push(`Invalid stat group "${groupName}" for position ${position}`);
      continue;
    }

    // Validate purchased_blocks
    if (groupData.purchased_blocks !== undefined) {
      const purchased = groupData.purchased_blocks;
      if (!Number.isInteger(purchased) || purchased < 0 || purchased > 20) {
        errors.push(`Invalid purchased_blocks for ${groupName}: must be integer 0-20`);
      }
    }

    // Validate capped_blocks
    if (groupData.capped_blocks !== undefined) {
      if (!Array.isArray(groupData.capped_blocks)) {
        errors.push(`Invalid capped_blocks for ${groupName}: must be an array`);
      } else {
        const capped = groupData.capped_blocks;
        
        // Check each value is 1-20
        for (const block of capped) {
          if (!Number.isInteger(block) || block < 1 || block > 20) {
            errors.push(`Invalid capped block value in ${groupName}: must be integer 1-20`);
          }
        }

        // Check for duplicates
        const uniqueCapped = new Set(capped);
        if (uniqueCapped.size !== capped.length) {
          errors.push(`Duplicate capped blocks in ${groupName}`);
        }

        // Validate total blocks
        const purchased = groupData.purchased_blocks || 0;
        if (purchased + capped.length > 20) {
          errors.push(`Combined purchased and capped blocks exceed 20 in ${groupName}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate potential score based on stat caps
 * Returns a 0-100 score representing the percentage of available (non-capped) blocks
 * @param {object} statCaps - Stat caps data object
 * @param {string} position - Player position
 * @returns {number} Potential score (0-100)
 */
function calculatePotentialScore(statCaps, position) {
  if (!statCaps || typeof statCaps !== 'object' || Object.keys(statCaps).length === 0) {
    return 100; // No caps = full potential
  }

  const validGroups = POSITION_STAT_GROUPS[position];
  if (!validGroups) {
    return 100; // Invalid position, default to full potential
  }

  let totalBlocks = validGroups.length * 20; // Total possible blocks
  let cappedBlocks = 0;

  for (const groupName of validGroups) {
    const groupData = statCaps[groupName];
    if (groupData && Array.isArray(groupData.capped_blocks)) {
      cappedBlocks += groupData.capped_blocks.length;
    }
  }

  const availableBlocks = totalBlocks - cappedBlocks;
  const potentialScore = Math.round((availableBlocks / totalBlocks) * 100);

  return potentialScore;
}

/**
 * Get stat groups for a position
 * @param {string} position - Player position
 * @returns {array} Array of stat group names
 */
function getStatGroupsForPosition(position) {
  return POSITION_STAT_GROUPS[position] || [];
}

module.exports = {
  POSITION_STAT_GROUPS,
  validateStatCaps,
  calculatePotentialScore,
  getStatGroupsForPosition,
};

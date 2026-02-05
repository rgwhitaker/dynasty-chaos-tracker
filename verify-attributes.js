#!/usr/bin/env node
/**
 * Verification script for player attributes constants
 * Ensures all constants are properly defined and accessible
 */

const {
  PLAYER_RATINGS,
  PHYSICAL_ATTRIBUTES,
  DEV_TRAITS,
  POSITIONS,
  YEARS,
  ATTRIBUTE_DISPLAY_NAMES
} = require('./backend/src/constants/playerAttributes');

console.log('=== Player Attributes Verification ===\n');

// Verify player ratings count
console.log(`✓ Total Player Ratings: ${PLAYER_RATINGS.length}`);
if (PLAYER_RATINGS.length !== 55) {
  console.error(`✗ ERROR: Expected 55 ratings, found ${PLAYER_RATINGS.length}`);
  process.exit(1);
}

// Verify physical attributes
console.log(`✓ Physical Attributes: ${PHYSICAL_ATTRIBUTES.length}`);
console.log(`  - ${PHYSICAL_ATTRIBUTES.join(', ')}`);

// Verify dev traits
console.log(`✓ Development Traits: ${DEV_TRAITS.length}`);
console.log(`  - ${DEV_TRAITS.join(', ')}`);

// Verify positions
console.log(`✓ Positions: ${POSITIONS.length}`);
console.log(`  - ${POSITIONS.join(', ')}`);

// Verify years
console.log(`✓ Years: ${YEARS.length}`);
console.log(`  - ${YEARS.join(', ')}`);

// Verify all ratings have display names
console.log('\n=== Attribute Display Names Verification ===');
let missingDisplayNames = [];
for (const rating of PLAYER_RATINGS) {
  if (!ATTRIBUTE_DISPLAY_NAMES[rating]) {
    missingDisplayNames.push(rating);
  }
}

if (missingDisplayNames.length > 0) {
  console.error(`✗ Missing display names for: ${missingDisplayNames.join(', ')}`);
  process.exit(1);
} else {
  console.log(`✓ All ${PLAYER_RATINGS.length} ratings have display names`);
}

// Sample some display names
console.log('\nSample Display Names:');
['OVR', 'SPD', 'THP', 'SAC', 'CTH', 'MCV', 'KPW'].forEach(abbr => {
  console.log(`  ${abbr} -> ${ATTRIBUTE_DISPLAY_NAMES[abbr]}`);
});

console.log('\n=== All Verifications Passed ✓ ===\n');
console.log('Player Ratings (55 total):');
console.log(PLAYER_RATINGS.join(', '));

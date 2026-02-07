/**
 * Integration test to verify the complete flow
 * Tests both roster list and player detail screen parsing
 * Run with: node backend/test-integration.js
 */

const { parseRosterData } = require('./src/services/ocrService');

console.log('Running Integration Tests...\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

// Test 1: Roster list should parse correctly
console.log('\n### TEST 1: Roster List Parsing ###');
console.log('-'.repeat(80));

const rosterListInput = `12 QB John Smith 85
15 HB Michael Johnson 82
7 WR David Williams 88`;

const rosterResult = parseRosterData(rosterListInput);
if (rosterResult.length === 3) {
  console.log('✓ PASSED: Roster list parsed 3 players correctly');
  console.log('  Sample player:', rosterResult[0]);
  passed++;
} else {
  console.log(`✗ FAILED: Expected 3 players, got ${rosterResult.length}`);
  failed++;
}

// Test 2: Player detail screen should parse correctly
console.log('\n### TEST 2: Player Detail Screen Parsing ###');
console.log('-'.repeat(80));

const detailScreenInput = `Overview  Ratings  Mentals  Physicals

Cai WOODS

Position QB (R) #16
Class Senior (SR (RS))
Height 6'0"
Weight 211 lbs
84 OVR

Archetype Field General
Star Rating ★★★★☆
Pipeline State of Florida
Hometown Jacksonville, FL
Development Trait Normal
Dealbreaker None`;

const detailResult = parseRosterData(detailScreenInput);
if (detailResult.length === 1) {
  const player = detailResult[0];
  if (player.first_name === 'Cai' && 
      player.last_name === 'WOODS' && 
      player.position === 'QB' &&
      player.jersey_number === 16 &&
      player.overall_rating === 84) {
    console.log('✓ PASSED: Player detail screen parsed correctly');
    console.log('  Player:', player);
    passed++;
  } else {
    console.log('✗ FAILED: Player data incorrect');
    console.log('  Player:', player);
    failed++;
  }
} else {
  console.log(`✗ FAILED: Expected 1 player, got ${detailResult.length}`);
  failed++;
}

// Test 3: Empty roster list should attempt detail screen parsing (and fail gracefully)
console.log('\n### TEST 3: Invalid Input Should Return Empty ###');
console.log('-'.repeat(80));

const invalidInput = `Some random text
that doesn't match
any parsing pattern`;

const invalidResult = parseRosterData(invalidInput);
if (invalidResult.length === 0) {
  console.log('✓ PASSED: Invalid input returned empty array as expected');
  passed++;
} else {
  console.log(`✗ FAILED: Expected 0 players, got ${invalidResult.length}`);
  failed++;
}

// Test 4: NCAA roster format should still work
console.log('\n### TEST 4: NCAA Roster Format Parsing ###');
console.log('-'.repeat(80));

const ncaaInput = `T.Bragg SO (RS) WR 89
J.Williams FR HB 87
C.Woods SR QB 84`;

const ncaaResult = parseRosterData(ncaaInput);
if (ncaaResult.length === 3) {
  console.log('✓ PASSED: NCAA roster format parsed 3 players correctly');
  console.log('  Sample player:', ncaaResult[0]);
  passed++;
} else {
  console.log(`✗ FAILED: Expected 3 players, got ${ncaaResult.length}`);
  failed++;
}

// Test 5: Player detail with minimal information
console.log('\n### TEST 5: Minimal Player Detail Screen ###');
console.log('-'.repeat(80));

const minimalDetailInput = `Overview

Tom BRADY

Position QB #12
92 OVR`;

const minimalResult = parseRosterData(minimalDetailInput);
if (minimalResult.length === 1) {
  const player = minimalResult[0];
  if (player.first_name === 'Tom' && 
      player.last_name === 'BRADY' && 
      player.position === 'QB' &&
      player.jersey_number === 12 &&
      player.overall_rating === 92) {
    console.log('✓ PASSED: Minimal player detail screen parsed correctly');
    console.log('  Player:', player);
    passed++;
  } else {
    console.log('✗ FAILED: Player data incorrect');
    console.log('  Player:', player);
    failed++;
  }
} else {
  console.log(`✗ FAILED: Expected 1 player, got ${minimalResult.length}`);
  failed++;
}

// Summary
console.log('\n' + '='.repeat(80));
console.log(`\nTest Summary: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);

if (failed === 0) {
  console.log('✓ All integration tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some integration tests failed');
  process.exit(1);
}

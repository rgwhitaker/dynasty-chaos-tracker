/**
 * Unit test for recruiter hub service
 * Tests the logic for analyzing roster attrition risks
 * Run with: node backend/test-recruiter-hub.js
 */

const { isDraftRisk, isGraduating, hasDealbreakers, hasTransferIntent, calculateRecruitingNeed, DEFAULT_MIN_DEPTH } = require('./src/services/recruiterHubService');

console.log('Running Recruiter Hub Service Tests...\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

// Test 1: Draft Risk Detection
console.log('\n### TEST 1: Draft Risk Detection ###');
console.log('-'.repeat(80));

const draftRiskPlayer = { 
  overall_rating: 90, 
  year: 'JR',
  first_name: 'John',
  last_name: 'Smith'
};

const noDraftRiskPlayer = { 
  overall_rating: 85, 
  year: 'JR',
  first_name: 'Jane',
  last_name: 'Doe'
};

const noDraftRiskSophomore = { 
  overall_rating: 90, 
  year: 'SO',
  first_name: 'Bob',
  last_name: 'Johnson'
};

if (isDraftRisk(draftRiskPlayer) === true) {
  console.log('✓ PASSED: High OVR Junior detected as draft risk');
  passed++;
} else {
  console.log('✗ FAILED: High OVR Junior should be draft risk');
  failed++;
}

if (isDraftRisk(noDraftRiskPlayer) === false) {
  console.log('✓ PASSED: OVR 85 Junior not flagged as draft risk');
  passed++;
} else {
  console.log('✗ FAILED: OVR 85 Junior should not be draft risk');
  failed++;
}

if (isDraftRisk(noDraftRiskSophomore) === false) {
  console.log('✓ PASSED: High OVR Sophomore not flagged as draft risk');
  passed++;
} else {
  console.log('✗ FAILED: Sophomores should not be draft eligible');
  failed++;
}

// Test 2: Graduation Detection
console.log('\n### TEST 2: Graduation Detection ###');
console.log('-'.repeat(80));

const graduatingSenior = { year: 'SR', first_name: 'Tom', last_name: 'Wilson' };
const graduatingRsSr = { year: 'RS SR', first_name: 'Tim', last_name: 'Brown' };
const graduatingGrad = { year: 'GRAD', first_name: 'Terry', last_name: 'Green' };
const notGraduatingJr = { year: 'JR', first_name: 'Tyler', last_name: 'White' };

if (isGraduating(graduatingSenior) === true) {
  console.log('✓ PASSED: Senior detected as graduating');
  passed++;
} else {
  console.log('✗ FAILED: Senior should be graduating');
  failed++;
}

if (isGraduating(graduatingRsSr) === true) {
  console.log('✓ PASSED: RS SR detected as graduating');
  passed++;
} else {
  console.log('✗ FAILED: RS SR should be graduating');
  failed++;
}

if (isGraduating(graduatingGrad) === true) {
  console.log('✓ PASSED: GRAD detected as graduating');
  passed++;
} else {
  console.log('✗ FAILED: GRAD should be graduating');
  failed++;
}

if (isGraduating(notGraduatingJr) === false) {
  console.log('✓ PASSED: Junior not flagged as graduating');
  passed++;
} else {
  console.log('✗ FAILED: Junior should not be graduating');
  failed++;
}

// Test 3: Dealbreaker Detection
console.log('\n### TEST 3: Dealbreaker Detection ###');
console.log('-'.repeat(80));

const playerWithDealbreakers = {
  dealbreakers: ['Playing Time C+', 'Conference Prestige D'],
  first_name: 'Mike',
  last_name: 'Davis'
};

const playerWithoutDealbreakers = {
  dealbreakers: [],
  first_name: 'Steve',
  last_name: 'Miller'
};

const playerWithNullDealbreakers = {
  dealbreakers: null,
  first_name: 'Dave',
  last_name: 'Moore'
};

if (hasDealbreakers(playerWithDealbreakers) === true) {
  console.log('✓ PASSED: Player with dealbreakers detected');
  passed++;
} else {
  console.log('✗ FAILED: Player with dealbreakers should be flagged');
  failed++;
}

if (hasDealbreakers(playerWithoutDealbreakers) === false) {
  console.log('✓ PASSED: Player with empty dealbreakers not flagged');
  passed++;
} else {
  console.log('✗ FAILED: Player with empty dealbreakers should not be flagged');
  failed++;
}

if (hasDealbreakers(playerWithNullDealbreakers) === false) {
  console.log('✓ PASSED: Player with null dealbreakers not flagged');
  passed++;
} else {
  console.log('✗ FAILED: Player with null dealbreakers should not be flagged');
  failed++;
}

// Test 3.5: Transfer Intent Detection
console.log('\n### TEST 3.5: Transfer Intent Detection ###');
console.log('-'.repeat(80));

const playerWithTransferIntent = {
  transfer_intent: true,
  first_name: 'Alex',
  last_name: 'Transfer'
};

const playerWithoutTransferIntent = {
  transfer_intent: false,
  first_name: 'Ben',
  last_name: 'Staying'
};

const playerWithNullTransferIntent = {
  transfer_intent: null,
  first_name: 'Carl',
  last_name: 'Unknown'
};

const playerWithUndefinedTransferIntent = {
  first_name: 'Dan',
  last_name: 'Legacy'
};

if (hasTransferIntent(playerWithTransferIntent) === true) {
  console.log('✓ PASSED: Player with transfer intent detected');
  passed++;
} else {
  console.log('✗ FAILED: Player with transfer intent should be flagged');
  failed++;
}

if (hasTransferIntent(playerWithoutTransferIntent) === false) {
  console.log('✓ PASSED: Player without transfer intent not flagged');
  passed++;
} else {
  console.log('✗ FAILED: Player without transfer intent should not be flagged');
  failed++;
}

if (hasTransferIntent(playerWithNullTransferIntent) === false) {
  console.log('✓ PASSED: Player with null transfer intent not flagged');
  passed++;
} else {
  console.log('✗ FAILED: Player with null transfer intent should not be flagged');
  failed++;
}

if (hasTransferIntent(playerWithUndefinedTransferIntent) === false) {
  console.log('✓ PASSED: Player with undefined transfer intent not flagged');
  passed++;
} else {
  console.log('✗ FAILED: Player with undefined transfer intent should not be flagged');
  failed++;
}

// Test 4: Combined Risk Scenarios
console.log('\n### TEST 4: Combined Risk Scenarios ###');
console.log('-'.repeat(80));

const multiRiskPlayer = {
  overall_rating: 92,
  year: 'SR',
  dealbreakers: ['Playing Time C'],
  transfer_intent: true,
  first_name: 'Multi',
  last_name: 'Risk'
};

let multiRiskCount = 0;
if (isDraftRisk(multiRiskPlayer)) multiRiskCount++;
if (isGraduating(multiRiskPlayer)) multiRiskCount++;
if (hasDealbreakers(multiRiskPlayer)) multiRiskCount++;
if (hasTransferIntent(multiRiskPlayer)) multiRiskCount++;

if (multiRiskCount === 4) {
  console.log('✓ PASSED: Player with multiple risks detected correctly (4 risks)');
  passed++;
} else {
  console.log(`✗ FAILED: Expected 4 risks, detected ${multiRiskCount}`);
  failed++;
}

// Test 5: Default Target Depths
console.log('\n### TEST 5: Default Target Depth Configuration ###');
console.log('-'.repeat(80));

if (DEFAULT_MIN_DEPTH['QB'] === 3) {
  console.log('✓ PASSED: Default QB target depth is 3');
  passed++;
} else {
  console.log(`✗ FAILED: Expected QB default 3, got ${DEFAULT_MIN_DEPTH['QB']}`);
  failed++;
}

if (DEFAULT_MIN_DEPTH['DT'] === 4) {
  console.log('✓ PASSED: Default DT target depth is 4');
  passed++;
} else {
  console.log(`✗ FAILED: Expected DT default 4, got ${DEFAULT_MIN_DEPTH['DT']}`);
  failed++;
}

if (DEFAULT_MIN_DEPTH['WR'] === 6) {
  console.log('✓ PASSED: Default WR target depth is 6');
  passed++;
} else {
  console.log(`✗ FAILED: Expected WR default 6, got ${DEFAULT_MIN_DEPTH['WR']}`);
  failed++;
}

// Test 6: calculateRecruitingNeed with default depths
console.log('\n### TEST 6: calculateRecruitingNeed (default depths) ###');
console.log('-'.repeat(80));

const needResult1 = calculateRecruitingNeed('QB', 2, 1);
if (needResult1.targetDepth === 3 && needResult1.needToRecruit === 2 && needResult1.status === 'CRITICAL') {
  console.log('✓ PASSED: QB with 2 players, 1 at risk → CRITICAL, need 2');
  passed++;
} else {
  console.log(`✗ FAILED: Expected CRITICAL need 2, got status=${needResult1.status} need=${needResult1.needToRecruit}`);
  failed++;
}

const needResult2 = calculateRecruitingNeed('DT', 5, 1);
if (needResult2.targetDepth === 4 && needResult2.needToRecruit === 0 && needResult2.status === 'WARNING') {
  console.log('✓ PASSED: DT with 5 players, 1 at risk → WARNING (projected 4 = target, has risk)');
  passed++;
} else {
  console.log(`✗ FAILED: Expected WARNING need 0, got status=${needResult2.status} need=${needResult2.needToRecruit}`);
  failed++;
}

const needResult3 = calculateRecruitingNeed('WR', 7, 1);
if (needResult3.status === 'WARNING') {
  console.log('✓ PASSED: WR with 7 players, 1 at risk → WARNING (projected 6 = target, has risk)');
  passed++;
} else {
  console.log(`✗ FAILED: Expected WARNING for WR 7/1, got status=${needResult3.status}`);
  failed++;
}

// Test 7: calculateRecruitingNeed with custom depth map
console.log('\n### TEST 7: calculateRecruitingNeed (custom depths) ###');
console.log('-'.repeat(80));

const customDepths = { 'DT': 6, 'QB': 2 };

const customResult1 = calculateRecruitingNeed('DT', 5, 1, customDepths);
if (customResult1.targetDepth === 6 && customResult1.needToRecruit === 2 && customResult1.status === 'CRITICAL') {
  console.log('✓ PASSED: DT with custom target 6, 5 players, 1 at risk → CRITICAL, need 2');
  passed++;
} else {
  console.log(`✗ FAILED: Expected CRITICAL need 2 target 6, got status=${customResult1.status} need=${customResult1.needToRecruit} target=${customResult1.targetDepth}`);
  failed++;
}

const customResult2 = calculateRecruitingNeed('QB', 3, 1, customDepths);
if (customResult2.targetDepth === 2 && customResult2.needToRecruit === 0 && customResult2.status === 'WARNING') {
  console.log('✓ PASSED: QB with custom target 2, 3 players, 1 at risk → WARNING (projected 2 = target, has risk)');
  passed++;
} else {
  console.log(`✗ FAILED: Expected WARNING need 0 target 2, got status=${customResult2.status} need=${customResult2.needToRecruit} target=${customResult2.targetDepth}`);
  failed++;
}

// Positions not in customDepths should fall back to defaults
const customResult3 = calculateRecruitingNeed('WR', 2, 0, customDepths);
if (customResult3.targetDepth === 6 && customResult3.needToRecruit === 4 && customResult3.status === 'CRITICAL') {
  console.log('✓ PASSED: WR not in customDepths falls back to default target 6 → CRITICAL, need 4');
  passed++;
} else {
  console.log(`✗ FAILED: Expected default fallback CRITICAL need 4, got status=${customResult3.status} need=${customResult3.needToRecruit} target=${customResult3.targetDepth}`);
  failed++;
}

// Test 8: WARNING status when exactly at target depth with at-risk players
console.log('\n### TEST 8: WARNING status with custom depths ###');
console.log('-'.repeat(80));

const warningResult = calculateRecruitingNeed('DT', 8, 2, { 'DT': 6 });
if (warningResult.status === 'WARNING' && warningResult.targetDepth === 6) {
  console.log('✓ PASSED: DT projected exactly at custom target 6 with risk → WARNING');
  passed++;
} else {
  console.log(`✗ FAILED: Expected WARNING at target 6, got status=${warningResult.status} target=${warningResult.targetDepth}`);
  failed++;
}

// Summary
console.log('\n');
console.log('='.repeat(80));
console.log('Test Summary');
console.log('='.repeat(80));
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log(`TOTAL:  ${passed + failed}`);
console.log(`SUCCESS RATE: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(80));

if (failed === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed.');
  process.exit(1);
}

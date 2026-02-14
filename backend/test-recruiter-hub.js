/**
 * Unit test for recruiter hub service
 * Tests the logic for analyzing roster attrition risks
 * Run with: node backend/test-recruiter-hub.js
 */

const { isDraftRisk, isGraduating, hasDealbreakers, hasTransferIntent } = require('./src/services/recruiterHubService');

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

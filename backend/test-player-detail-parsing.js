/**
 * Test script for player detail screen OCR parsing
 * Run with: node backend/test-player-detail-parsing.js
 */

const { 
  parsePlayerDetailScreen, 
  isPlayerDetailScreen,
  cleanOcrText 
} = require('./src/services/ocrService');

// Test cases for player detail screen
const detailScreenTests = [
  {
    name: 'Basic player detail screen - Example from problem statement',
    input: `Overview  Ratings  Mentals  Physicals

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
Dealbreaker None`,
    expected: {
      first_name: 'Cai',
      last_name: 'WOODS',
      position: 'QB',
      jersey_number: 16,
      overall_rating: 84,
      class: 'SR (RS)',
      height: "6'0\"",
      weight: 211
    }
  },
  {
    name: 'Player detail with different position format',
    input: `Overview  Ratings

John SMITH

Position WR #7
Class Junior (JR)
Height 6'2"
Weight 195 lbs
88 OVR

Development Trait Star`,
    expected: {
      first_name: 'John',
      last_name: 'SMITH',
      position: 'WR',
      jersey_number: 7,
      overall_rating: 88,
      class: 'JR',
      height: "6'2\"",
      weight: 195
    }
  },
  {
    name: 'Player detail with freshman year',
    input: `Overview

Mike JONES

Position RB #23
Class Freshman (FR)
Height 5'11"
Weight 205 lbs
78 OVR`,
    expected: {
      first_name: 'Mike',
      last_name: 'JONES',
      position: 'RB',
      jersey_number: 23,
      overall_rating: 78,
      class: 'FR',
      height: "5'11\"",
      weight: 205
    }
  },
  {
    name: 'Player detail without position redshirt indicator',
    input: `Overview  Ratings

Tom BRADY

Position QB #12
Class Senior (SR)
Height 6'4"
Weight 225 lbs
92 OVR

Development Trait Superstar`,
    expected: {
      first_name: 'Tom',
      last_name: 'BRADY',
      position: 'QB',
      jersey_number: 12,
      overall_rating: 92,
      class: 'SR',
      height: "6'4\"",
      weight: 225
    }
  }
];

// Test cases for detection function
const detectionTests = [
  {
    name: 'Should detect player detail screen with Overview tab',
    input: `Overview  Ratings  Mentals
Cai WOODS
Position QB #16
Class Senior`,
    expectedDetection: true
  },
  {
    name: 'Should detect player detail screen with labeled fields',
    input: `Player Info
Position QB #16
Class Senior
Height 6'0"
Weight 211 lbs`,
    expectedDetection: true
  },
  {
    name: 'Should NOT detect roster list as detail screen',
    input: `12 QB John Smith 85
15 HB Michael Johnson 82
7 WR David Williams 88`,
    expectedDetection: false
  },
  {
    name: 'Should detect detail screen with Archetype keyword',
    input: `Name: John Smith
Archetype: Field General
Development Trait: Star
Position QB #10`,
    expectedDetection: true
  }
];

console.log('Running Player Detail Screen Parsing Tests...\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

// Test detection function first
console.log('\n### DETECTION TESTS ###\n');
detectionTests.forEach((testCase, index) => {
  console.log(`\nDetection Test ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(80));
  
  const result = isPlayerDetailScreen(testCase.input);
  const success = result === testCase.expectedDetection;
  
  if (success) {
    console.log(`✓ PASSED: Detection result = ${result}`);
    passed++;
  } else {
    console.log(`✗ FAILED: Expected ${testCase.expectedDetection}, got ${result}`);
    failed++;
  }
});

// Test parsing function
console.log('\n\n### PARSING TESTS ###\n');
detailScreenTests.forEach((testCase, index) => {
  console.log(`\nParsing Test ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(80));
  
  const result = parsePlayerDetailScreen(testCase.input);
  
  if (result.length === 0) {
    console.log(`✗ FAILED: No player parsed`);
    failed++;
    return;
  }
  
  const player = result[0];
  let testPassed = true;
  const errors = [];
  
  // Validate expected fields
  if (testCase.expected.first_name && player.first_name !== testCase.expected.first_name) {
    errors.push(`First name: expected "${testCase.expected.first_name}", got "${player.first_name}"`);
    testPassed = false;
  }
  
  if (testCase.expected.last_name && player.last_name !== testCase.expected.last_name) {
    errors.push(`Last name: expected "${testCase.expected.last_name}", got "${player.last_name}"`);
    testPassed = false;
  }
  
  if (testCase.expected.position && player.position !== testCase.expected.position) {
    errors.push(`Position: expected "${testCase.expected.position}", got "${player.position}"`);
    testPassed = false;
  }
  
  if (testCase.expected.jersey_number && player.jersey_number !== testCase.expected.jersey_number) {
    errors.push(`Jersey: expected ${testCase.expected.jersey_number}, got ${player.jersey_number}`);
    testPassed = false;
  }
  
  if (testCase.expected.overall_rating && player.overall_rating !== testCase.expected.overall_rating) {
    errors.push(`Overall: expected ${testCase.expected.overall_rating}, got ${player.overall_rating}`);
    testPassed = false;
  }
  
  if (testCase.expected.class && player.attributes.CLASS !== testCase.expected.class) {
    errors.push(`Class: expected "${testCase.expected.class}", got "${player.attributes.CLASS}"`);
    testPassed = false;
  }
  
  if (testCase.expected.height && player.attributes.HEIGHT !== testCase.expected.height) {
    errors.push(`Height: expected "${testCase.expected.height}", got "${player.attributes.HEIGHT}"`);
    testPassed = false;
  }
  
  if (testCase.expected.weight && player.attributes.WEIGHT !== testCase.expected.weight) {
    errors.push(`Weight: expected ${testCase.expected.weight}, got ${player.attributes.WEIGHT}`);
    testPassed = false;
  }
  
  if (testPassed) {
    console.log(`✓ PASSED`);
    console.log('Parsed player:', JSON.stringify(player, null, 2));
    passed++;
  } else {
    console.log(`✗ FAILED`);
    errors.forEach(err => console.log(`  - ${err}`));
    console.log('Parsed player:', JSON.stringify(player, null, 2));
    failed++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\nTest Summary: ${passed} passed, ${failed} failed out of ${detectionTests.length + detailScreenTests.length} tests`);

if (failed === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed');
  process.exit(1);
}

/**
 * Test script for OCR parsing logic
 * Run with: node backend/test-ocr-parsing.js
 */

// Simple mock of the parseRosterData function for testing
function parseRosterData(ocrText) {
  const players = [];
  const lines = ocrText.split('\n').filter(line => line.trim());

  // More flexible parsing patterns to handle various OCR output formats
  // Pattern 1: Jersey Position Name Overall (e.g., "12 QB John Smith 85")
  const pattern1 = /^(\d+)\s+([A-Z]{1,3})\s+([A-Za-z\s]+?)\s+(\d{2})/;
  
  // Pattern 2: Position Jersey Name Overall (e.g., "QB 12 John Smith 85")
  const pattern2 = /^([A-Z]{1,3})\s+(\d+)\s+([A-Za-z\s]+?)\s+(\d{2})/;
  
  // Pattern 3: Name Position Jersey Overall (e.g., "John Smith QB 12 85")
  const pattern3 = /^([A-Za-z\s]+?)\s+([A-Z]{1,3})\s+(\d+)\s+(\d{2})/;

  for (const line of lines) {
    let match = line.match(pattern1);
    let jersey, position, name, overall;

    if (match) {
      [, jersey, position, name, overall] = match;
    } else {
      match = line.match(pattern2);
      if (match) {
        [, position, jersey, name, overall] = match;
      } else {
        match = line.match(pattern3);
        if (match) {
          [, name, position, jersey, overall] = match;
        }
      }
    }

    if (match) {
      const nameParts = name.trim().split(/\s+/);
      let firstName, lastName;
      
      if (nameParts.length === 1) {
        // Single name - use as last name, leave first name empty
        firstName = '';
        lastName = nameParts[0];
      } else {
        lastName = nameParts.pop();
        firstName = nameParts.join(' ');
      }

      // Validate parsed data before adding
      const overallNum = parseInt(overall);
      const jerseyNum = parseInt(jersey);
      
      if (overallNum >= 40 && overallNum <= 99 && jerseyNum >= 0 && jerseyNum <= 99) {
        players.push({
          jersey_number: jerseyNum,
          position: position.toUpperCase(),
          first_name: firstName,
          last_name: lastName,
          overall_rating: overallNum,
          attributes: {} // Would need more sophisticated parsing
        });
      }
    }
  }

  console.log(`parseRosterData: Processed ${lines.length} lines, found ${players.length} valid players`);
  if (players.length > 0) {
    console.log('Sample parsed player:', players[0]);
  }

  return players;
}

// Test cases
const testCases = [
  {
    name: 'Pattern 1: Jersey Position Name Overall',
    input: `12 QB John Smith 85
15 RB Michael Johnson 82
7 WR David Williams 88`,
    expected: 3
  },
  {
    name: 'Pattern 2: Position Jersey Name Overall',
    input: `QB 12 John Smith 85
RB 15 Michael Johnson 82
WR 7 David Williams 88`,
    expected: 3
  },
  {
    name: 'Pattern 3: Name Position Jersey Overall',
    input: `John Smith QB 12 85
Michael Johnson RB 15 82
David Williams WR 7 88`,
    expected: 3
  },
  {
    name: 'Mixed case names',
    input: `12 QB john smith 85
15 RB Michael JOHNSON 82
7 WR david Williams 88`,
    expected: 3
  },
  {
    name: 'With noise and invalid lines',
    input: `Header Line
12 QB John Smith 85
Some noise here
15 RB Michael Johnson 82
Another bad line
7 WR David Williams 88
Footer`,
    expected: 3
  },
  {
    name: 'Single name players',
    input: `12 QB Brady 85
15 RB Smith 82`,
    expected: 2
  },
  {
    name: 'Three-letter positions',
    input: `12 MLB John Smith 85
15 OLB Michael Johnson 82`,
    expected: 2
  },
  {
    name: 'Edge case overall ratings',
    input: `12 QB John Smith 40
15 RB Michael Johnson 99`,
    expected: 2
  },
  {
    name: 'Invalid overall ratings (too low/high)',
    input: `12 QB John Smith 39
15 RB Michael Johnson 100`,
    expected: 0
  },
  {
    name: 'Empty or whitespace only input',
    input: `


    `,
    expected: 0
  }
];

console.log('Running OCR Parsing Tests...\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(80));
  
  const result = parseRosterData(testCase.input);
  const success = result.length === testCase.expected;
  
  if (success) {
    console.log(`✓ PASSED: Expected ${testCase.expected} players, got ${result.length}`);
    passed++;
  } else {
    console.log(`✗ FAILED: Expected ${testCase.expected} players, got ${result.length}`);
    console.log('Parsed players:', result);
    failed++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\nTest Summary: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed');
  process.exit(1);
}

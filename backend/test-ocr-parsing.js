/**
 * Test script for OCR parsing logic
 * Run with: node backend/test-ocr-parsing.js
 * 
 * NOTE: This file duplicates the parsing logic from ocrService.js for standalone testing.
 * Any changes to the parsing logic should be reflected in both files.
 */

// Duplicate of cleanOcrText function from ocrService.js for standalone testing
function cleanOcrText(text) {
  // Replace common OCR mistakes
  return text
    .replace(/\}/g, ')') // Replace } with )
    .replace(/\{/g, '(') // Replace { with (
    .replace(/\[(\d+)\]/g, '$1') // Replace [3] with 3
    .replace(/\[x\]/gi, '99') // Replace [x] with 99 (common OCR error)
    .replace(/Lal/g, '99') // Replace Lal with 99 (common OCR error)
    .replace(/hal/g, '99') // Replace hal with 99 (common OCR error)
    .replace(/v\*OVR/g, 'OVR') // Replace v*OVR with OVR
    .replace(/\bO\b/g, '0') // Replace isolated O with 0
    .replace(/\bl\b/g, '1'); // Replace isolated l with 1
}

// Duplicate of parseRosterData function from ocrService.js for standalone testing
function parseRosterData(ocrText) {
  const players = [];
  const lines = ocrText.split('\n').filter(line => line.trim());

  // Clean the OCR text first
  const cleanedLines = lines.map(line => cleanOcrText(line));

  // More flexible parsing patterns to handle various OCR output formats
  // Pattern 1: Jersey Position Name Overall (e.g., "12 QB John Smith 85")
  const pattern1 = /^(\d+)\s+([A-Z]{1,4})\s+([A-Za-z\s]+?)\s+(\d{2})/;
  
  // Pattern 2: Position Jersey Name Overall (e.g., "QB 12 John Smith 85")
  const pattern2 = /^([A-Z]{1,4})\s+(\d+)\s+([A-Za-z\s]+?)\s+(\d{2})/;
  
  // Pattern 3: Name Position Jersey Overall (e.g., "John Smith QB 12 85")
  const pattern3 = /^([A-Za-z\s]+?)\s+([A-Z]{1,4})\s+(\d+)\s+(\d{2})/;
  
  // Pattern 4: NCAA Roster format - Name Year Position Overall (e.g., "T.Bragg SO (RS) WR 89")
  // Matches: Initial.LastName or First.LastName or Initial LastName or FirstName LastName, 
  // Year (e.g., FR, SO, JR, SR) with optional (RS), Position, Overall
  // Also handles hyphenated names like Smith-Marsette and space-separated initials like "J Williams"
  const pattern4 = /^([A-Z]\.?\s?[A-Za-z-]+(?:\s+[A-Z][A-Za-z-]+)?)\s+(?:FR|SO|JR|SR)\s*(?:\([A-Z]{0,2}\))?\s+([A-Z]{1,4})\s+(\d{2}[\+]?)/i;

  for (const line of cleanedLines) {
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
        } else {
          // Try NCAA roster format (Pattern 4)
          match = line.match(pattern4);
          if (match) {
            [, name, position, overall] = match;
            // For NCAA format, we don't have jersey numbers in the roster screen
            // We'll assign 0 as a placeholder which can be updated later
            jersey = '0';
            // Remove the '+' suffix if present
            overall = overall.replace('+', '');
          }
        }
      }
    }

    if (match) {
      const nameParts = name.trim().split(/\s+/);
      let firstName, lastName;
      
      // Handle abbreviated names like "T.Bragg"
      if (name.includes('.')) {
        const parts = name.split('.');
        if (parts.length === 2) {
          firstName = parts[0]; // Initial
          lastName = parts[1];
        } else {
          // Fallback to regular parsing
          if (nameParts.length === 1) {
            firstName = '';
            lastName = nameParts[0];
          } else {
            lastName = nameParts.pop();
            firstName = nameParts.join(' ');
          }
        }
      } else if (nameParts.length === 1) {
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
15 HB Michael Johnson 82
7 WR David Williams 88`,
    expected: 3
  },
  {
    name: 'Pattern 2: Position Jersey Name Overall',
    input: `QB 12 John Smith 85
HB 15 Michael Johnson 82
WR 7 David Williams 88`,
    expected: 3
  },
  {
    name: 'Pattern 3: Name Position Jersey Overall',
    input: `John Smith QB 12 85
Michael Johnson HB 15 82
David Williams WR 7 88`,
    expected: 3
  },
  {
    name: 'Mixed case names',
    input: `12 QB john smith 85
15 HB Michael JOHNSON 82
7 WR david Williams 88`,
    expected: 3
  },
  {
    name: 'With noise and invalid lines',
    input: `Header Line
12 QB John Smith 85
Some noise here
15 HB Michael Johnson 82
Another bad line
7 WR David Williams 88
Footer`,
    expected: 3
  },
  {
    name: 'Single name players',
    input: `12 QB Brady 85
15 HB Smith 82`,
    expected: 2
  },
  {
    name: 'Linebacker positions',
    input: `12 SAM John Smith 85
15 MIKE Michael Johnson 82
7 WILL David Williams 80`,
    expected: 3
  },
  {
    name: 'Defensive line positions',
    input: `12 LEDG John Smith 85
15 DT Michael Johnson 82
7 REDG David Williams 80`,
    expected: 3
  },
  {
    name: 'Edge case overall ratings',
    input: `12 QB John Smith 40
15 HB Michael Johnson 99`,
    expected: 2
  },
  {
    name: 'Invalid overall ratings (too low/high)',
    input: `12 QB John Smith 39
15 HB Michael Johnson 100`,
    expected: 0
  },
  {
    name: 'Empty or whitespace only input',
    input: `


    `,
    expected: 0
  },
  {
    name: 'NCAA Roster Format - Pattern 4 (Actual OCR output from logs)',
    input: `NAME YEAR POS v*OVR SPD ACC AGI CoD STR AWR CAR BCV
T.Bragg SO (RS} WR 89 92 95 92 92 58 91 [3 88
J.Moss SO (RS} RT 87 [3 78 73 58 90 92 53 37
J Williams FR (RS) HB 87 Lal 93 90 89 70 80 82 88
B.Tate FR (RS) SAM 86+ 81 90 82 73 80 82 57 43
J.Silas FR(RS) RG 86+ 60 hal 60 55 94 89 51 37
J.Smith-Marsette FR(RS) C 86 66 73 [x] 58 Lal 89 56 34
J.Bamba SR(RS) LEDG 86+ 82 89 78 70 87 88 54 40
C.Woods SR(RS) QB 84 85 91 86 84 67 80 77 90
AThompson SO (RS} CB 83 Lal 92 90 88 [x] 88 57 62`,
    expected: 9 // Should parse all 9 players (excluding header)
  },
  {
    name: 'NCAA Roster Format - Simple cases',
    input: `T.Bragg SO (RS) WR 89
J.Williams FR HB 87
C.Woods SR QB 84`,
    expected: 3
  },
  {
    name: 'NCAA Roster Format - With OCR errors',
    input: `T.Bragg SO (RS} WR 89
J.Moss SO (RS} RT 87
B.Tate FR (RS) SAM 86+`,
    expected: 3
  },
  {
    name: 'NCAA Roster Format - Hyphenated names',
    input: `J.Smith-Marsette FR(RS) C 86
A.Johnson-Lee SO WR 85`,
    expected: 2
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

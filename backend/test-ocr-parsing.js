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
    .replace(/\[(\d+)/g, '$1') // Replace [3 with 3 (missing closing bracket)
    .replace(/\[x\]/gi, '99') // Replace [x] with 99 (common OCR error)
    .replace(/\[x/gi, '99') // Replace [x with 99 (missing closing bracket)
    .replace(/Lal/g, '99') // Replace Lal with 99 (common OCR error)
    .replace(/hal/g, '99') // Replace hal with 99 (common OCR error)
    .replace(/v\*OVR/g, 'OVR') // Replace v*OVR with OVR
    .replace(/\bO\b/g, '0') // Replace isolated O with 0
    .replace(/\bl\b/g, '1'); // Replace isolated l with 1
}

/**
 * Correct common position OCR misreads
 */
function correctPosition(position) {
  const upperPos = position.toUpperCase();
  
  // Common OCR position misreads - map to correct position
  // Note: Only map OCR errors that are clearly wrong, not legitimate positions
  const positionCorrections = {
    '0T': 'DT',   // 0 confused with D
    'Dl': 'DT',   // l confused with T
    'D1': 'DT',   // 1 confused with T
    'DI': 'DT',   // I confused with T
    'HG': 'HB',   // G confused with B
    'W8': 'WR',   // 8 confused with R
  };
  
  // First check if it's in correction map
  if (positionCorrections[upperPos]) {
    return positionCorrections[upperPos];
  }
  
  // Return original if no correction needed
  return upperPos;
}

/**
 * Extract name suffix (Jr., Sr., II, III, IV, V)
 */
function extractNameSuffix(nameParts) {
  if (nameParts.length === 0) {
    return { suffix: null, nameParts };
  }
  
  const lastPart = nameParts[nameParts.length - 1];
  const suffixPattern = /^(Jr\.?|Sr\.?|II|III|IV|V|2nd|3rd|4th|5th)$/i;
  
  if (suffixPattern.test(lastPart)) {
    const suffix = lastPart;
    const remainingParts = nameParts.slice(0, -1);
    return { suffix, nameParts: remainingParts };
  }
  
  return { suffix: null, nameParts };
}

/**
 * Clean highlighted row artifacts from OCR text
 * Highlighted/selected rows in game screenshots often produce OCR artifacts
 */
function cleanHighlightedRowArtifacts(line) {
  // Remove common highlight artifacts:
  // - Block characters: █, ▀, ▄, ▌, ▐, ░, ▒, ▓
  // - Special markers/arrows: ►, >, », ▶
  // - Selection indicators
  return line
    .replace(/[█▀▄▌▐░▒▓]/g, '') // Remove block characters
    .replace(/^[►>»▶➤➜]\s*/g, '') // Remove leading arrows/indicators
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Duplicate of parseRosterData function from ocrService.js for standalone testing
function parseRosterData(ocrText) {
  const players = [];
  const lines = ocrText.split('\n').filter(line => line.trim());

  // Clean the OCR text first, including highlighted row artifacts
  const cleanedLines = lines.map(line => cleanHighlightedRowArtifacts(cleanOcrText(line)));

  // Check if first line is a header with attribute names
  let headerAttributes = null;
  let dataStartIndex = 0;
  
  if (cleanedLines.length > 0) {
    const firstLine = cleanedLines[0].toUpperCase();
    // Header detection: look for common attribute names
    if (firstLine.includes('SPD') || firstLine.includes('ACC') || 
        firstLine.includes('AGI') || firstLine.includes('COD') ||
        (firstLine.includes('OVR') && firstLine.includes('POS'))) {
      // Parse header to extract attribute column names
      const headerParts = cleanedLines[0].split(/\s+/);
      headerAttributes = [];
      for (const part of headerParts) {
        const cleaned = part.replace(/[^A-Za-z]/g, '').toUpperCase();
        // Map common variations
        if (cleaned === 'COD') {
          headerAttributes.push('COD');
        } else if (cleaned.length >= 2 && cleaned.length <= 4) {
          // Likely an attribute abbreviation
          headerAttributes.push(cleaned);
        }
      }
      dataStartIndex = 1; // Skip header row
      console.log('Detected header with attributes:', headerAttributes);
    }
  }

  // More flexible parsing patterns to handle various OCR output formats
  // Pattern 1: Jersey Position Name Overall (e.g., "12 QB John Smith 85" or "12 QB John Smith Jr. 85")
  const pattern1 = /^(\d+)\s+([A-Z0-9il]{1,4})\s+([A-Za-z\s.]+?)\s+(\d{2})/i;
  
  // Pattern 2: Position Jersey Name Overall (e.g., "QB 12 John Smith 85" or "OT 12 John Smith Jr. 85")
  const pattern2 = /^([A-Z0-9il]{1,4})\s+(\d+)\s+([A-Za-z\s.]+?)\s+(\d{2})/i;
  
  // Pattern 3: Name Position Jersey Overall (e.g., "John Smith QB 12 85" or "John Smith Jr. QB 12 85")
  const pattern3 = /^([A-Za-z\s.]+?)\s+([A-Z0-9il]{1,4})\s+(\d+)\s+(\d{2})/i;
  
  // Pattern 4: NCAA Roster format - Name Year Position Overall (e.g., "T.Bragg SO (RS) WR 89")
  // Matches: Initial.LastName or First.LastName or Initial LastName or FirstName LastName, 
  // Year (e.g., FR, SO, JR, SR) with optional (RS), Position, Overall
  // Also handles hyphenated names like Smith-Marsette and space-separated initials like "J Williams"
  // Handles suffixes like Jr., Sr., II, III, etc.
  const pattern4 = /^([A-Z]\.?\s?[A-Za-z-]+(?:\s+[A-Z][A-Za-z-]+)?(?:\s+(?:Jr\.?|Sr\.?|II|III|IV|V))?)\s+(?:FR|SO|JR|SR)\s*(?:\([A-Z]{0,2}\))?\s+([A-Z0-9]{1,4})\s+(\d{2}[\+]?)/i;

  for (let i = dataStartIndex; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];
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
      let firstName, lastName, suffix = null;
      
      // Handle abbreviated names like "T.Bragg" - split by dot first
      if (name.includes('.')) {
        const parts = name.split('.');
        if (parts.length === 2) {
          firstName = parts[0]; // Initial
          // Check for suffix in the last name part
          const lastNameParts = parts[1].trim().split(/\s+/);
          const suffixResult = extractNameSuffix(lastNameParts);
          suffix = suffixResult.suffix;
          lastName = suffixResult.nameParts.join(' ');
        } else {
          // Fallback to regular parsing
          let nameParts = name.trim().split(/\s+/);
          const suffixResult = extractNameSuffix(nameParts);
          suffix = suffixResult.suffix;
          nameParts = suffixResult.nameParts;
          
          if (nameParts.length === 1) {
            firstName = '';
            lastName = nameParts[0];
          } else {
            lastName = nameParts.pop();
            firstName = nameParts.join(' ');
          }
        }
      } else {
        // No dot - regular name parsing
        let nameParts = name.trim().split(/\s+/);
        const suffixResult = extractNameSuffix(nameParts);
        suffix = suffixResult.suffix;
        nameParts = suffixResult.nameParts;
        
        if (nameParts.length === 1) {
          // Single name - use as last name, leave first name empty
          firstName = '';
          lastName = nameParts[0];
        } else {
          lastName = nameParts.pop();
          firstName = nameParts.join(' ');
        }
      }

      // Validate parsed data before adding
      const overallNum = parseInt(overall);
      const jerseyNum = parseInt(jersey);
      
      // Apply position correction for common OCR errors
      const correctedPosition = correctPosition(position);
      
      if (overallNum >= 40 && overallNum <= 99 && jerseyNum >= 0 && jerseyNum <= 99) {
        // Initialize attributes with OVR
        const attributes = {
          OVR: overallNum
        };
        
        // Add suffix to attributes if present
        if (suffix) {
          attributes.SUFFIX = suffix;
        }

        // If header with attributes was detected, parse additional attributes
        if (headerAttributes && headerAttributes.length > 0) {
          const lineParts = line.split(/\s+/);
          // Find where the numeric attributes start (after position)
          let attrStartIndex = -1;
          for (let j = 0; j < lineParts.length; j++) {
            const part = lineParts[j].toUpperCase();
            // Position is typically 2-4 letters
            if (part.match(/^[A-Z]{1,4}$/) && j > 0) {
              // Check if next part is a number (the overall rating)
              if (j + 1 < lineParts.length && lineParts[j + 1].match(/^\d+[\+]?$/)) {
                attrStartIndex = j + 1;
                break;
              }
            }
          }

          if (attrStartIndex >= 0 && attrStartIndex < lineParts.length) {
            // Find attribute column indices from header
            let attrColumnStart = -1;
            for (let j = 0; j < headerAttributes.length; j++) {
              if (headerAttributes[j] === 'OVR' || headerAttributes[j] === 'VOVR') {
                attrColumnStart = j;
                break;
              }
            }

            if (attrColumnStart >= 0) {
              // Parse attribute values
              const attrValues = lineParts.slice(attrStartIndex);
              for (let j = 0; j < attrValues.length && (attrColumnStart + j) < headerAttributes.length; j++) {
                const attrName = headerAttributes[attrColumnStart + j];
                const attrValue = parseInt(attrValues[j].replace('+', ''));
                
                // Validate attribute value (should be 0-99)
                if (!isNaN(attrValue) && attrValue >= 0 && attrValue <= 99) {
                  attributes[attrName] = attrValue;
                }
              }
            }
          }
        }

        players.push({
          jersey_number: jerseyNum,
          position: correctedPosition,
          first_name: firstName,
          last_name: lastName,
          overall_rating: overallNum,
          attributes: attributes
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
  },
  {
    name: 'Position correction - 0T (zero-T) misread as DT',
    input: `12 0T John Smith 85
15 DT Michael Johnson 82`,
    expected: 2
  },
  {
    name: 'Position correction - Dl and D1 misread as DT',
    input: `12 Dl John Smith 85
15 D1 Michael Johnson 82`,
    expected: 2
  },
  {
    name: 'Name with suffix Jr.',
    input: `12 QB John Smith Jr. 85
15 HB Michael Jones Sr. 82`,
    expected: 2
  },
  {
    name: 'Name with suffix II, III',
    input: `12 QB John Smith II 85
15 HB Michael Jones III 82
7 WR David Brown IV 88`,
    expected: 3
  },
  {
    name: 'Highlighted row with arrow indicator',
    input: `► 12 QB John Smith 85
15 HB Michael Johnson 82`,
    expected: 2
  },
  {
    name: 'Highlighted row with block characters',
    input: `█ 12 QB John Smith 85
15 HB Michael Johnson 82`,
    expected: 2
  },
  {
    name: 'NCAA format with suffix',
    input: `J.Smith Jr. FR WR 85
T.Brown III SO QB 88`,
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

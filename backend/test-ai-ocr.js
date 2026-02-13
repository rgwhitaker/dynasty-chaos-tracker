/**
 * Test script for AI-powered OCR parsing
 * Run with: OPENAI_API_KEY=your-key node backend/test-ai-ocr.js
 */

const { parseRosterWithAI, validateAIPlayers } = require('./src/services/aiOcrService');

// Test cases
const testCases = [
  {
    name: 'Position correction - OT misread should be corrected to DT',
    input: `12 OT John Smith 85
15 DT Michael Johnson 82`,
    expectedCount: 2,
    expectedPositions: ['DT', 'DT']
  },
  {
    name: 'Position correction - 0T misread as DT',
    input: `12 0T John Smith 85
15 DT Michael Johnson 82`,
    expectedCount: 2,
    expectedPositions: ['DT', 'DT']
  },
  {
    name: 'Name with suffix Jr. and Sr.',
    input: `12 QB John Smith Jr. 85
15 HB Michael Jones Sr. 82`,
    expectedCount: 2,
    checkSuffixes: true
  },
  {
    name: 'Name with suffix II, III, IV',
    input: `12 QB John Smith II 85
15 HB Michael Jones III 82
7 WR David Brown IV 88`,
    expectedCount: 3,
    checkSuffixes: true
  },
  {
    name: 'Highlighted row with arrow indicator',
    input: `► 12 QB John Smith 85
15 HB Michael Johnson 82`,
    expectedCount: 2
  },
  {
    name: 'Highlighted row with block characters',
    input: `█ 12 QB John Smith 85
15 HB Michael Johnson 82`,
    expectedCount: 2
  },
  {
    name: 'NCAA Roster Format with OCR errors',
    input: `NAME YEAR POS v*OVR SPD ACC AGI CoD STR AWR CAR BCV
T.Bragg SO (RS} WR 89 92 95 92 92 58 91 [3 88
J.Moss SO (RS} RT 87 [3 78 73 58 90 92 53 37
J Williams FR (RS) HB 87 Lal 93 90 89 70 80 82 88`,
    expectedCount: 3
  },
  {
    name: 'Complex case - mixed errors',
    input: `12 0T John Smith Jr. 85
► 15 Dl Michael Jones II 82
█ 7 WR David Williams III 88`,
    expectedCount: 3,
    checkSuffixes: true,
    expectedPositions: ['DT', 'DT', 'WR']
  },
  {
    name: 'Real OCR output - oT misread with defensive stats',
    input: `NAME YEAR POS vOVR SPD ACC AGI coD STR AWR [41{d PMV FMV
C.Immediato JR oT 78 64 77 64 56 85 76 76 82 64
T.Kabeya SO (RS) DT 724 63 73 65 55 84 74 lal 76 62
J.Gans FR(RS) oT 664 68 79 n 61 79 72 76 74 72
B.Lawhorn Moore So DT 644 59 68 [LX] 53 81 67 59 72 61`,
    expectedCount: 4,
    expectedPositions: ['DT', 'DT', 'DT', 'DT']
  }
];

async function runTests() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY environment variable not set');
    console.error('Usage: OPENAI_API_KEY=your-key node backend/test-ai-ocr.js');
    process.exit(1);
  }

  console.log('Running AI OCR Parsing Tests...\n');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\nTest ${i + 1}: ${testCase.name}`);
    console.log('-'.repeat(80));

    try {
      const result = await parseRosterWithAI(testCase.input);
      const validation = validateAIPlayers(result);
      
      let success = true;
      let failureReason = '';

      // Check player count
      if (result.length !== testCase.expectedCount) {
        success = false;
        failureReason = `Expected ${testCase.expectedCount} players, got ${result.length}`;
      }

      // Check positions if specified
      if (success && testCase.expectedPositions) {
        const actualPositions = result.map(p => p.position);
        const positionsMatch = testCase.expectedPositions.every((pos, idx) => 
          actualPositions[idx] === pos
        );
        if (!positionsMatch) {
          success = false;
          failureReason = `Expected positions ${testCase.expectedPositions.join(', ')}, got ${actualPositions.join(', ')}`;
        }
      }

      // Check suffixes if specified
      if (success && testCase.checkSuffixes) {
        const hasSuffixes = result.some(p => p.attributes && p.attributes.SUFFIX);
        if (!hasSuffixes) {
          success = false;
          failureReason = 'Expected to find suffixes in player attributes';
        }
      }

      // Check validation
      if (success && !validation.valid) {
        success = false;
        failureReason = `Validation failed: ${JSON.stringify(validation.errors)}`;
      }

      if (success) {
        console.log(`✓ PASSED: ${result.length} players parsed correctly`);
        if (result.length > 0) {
          console.log('Sample player:', JSON.stringify(result[0], null, 2));
        }
        passed++;
      } else {
        console.log(`✗ FAILED: ${failureReason}`);
        console.log('Parsed players:', JSON.stringify(result, null, 2));
        failed++;
      }
    } catch (error) {
      console.log(`✗ FAILED: ${error.message}`);
      console.error(error);
      failed++;
    }

    // Small delay between tests to avoid rate limiting
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\nTest Summary: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

  if (failed === 0) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});

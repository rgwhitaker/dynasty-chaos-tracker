/**
 * Unit test for recruiter hub and depth chart mapping logic
 * Run with: node backend/test-recruiter-hub.js
 */

const recruiterHubService = require('./src/services/recruiterHubService');
const depthChartMappingService = require('./src/services/depthChartMappingService');

const {
  isDraftRisk,
  isGraduating,
  hasDealbreakers,
  hasTransferIntent,
  simulateDemandFromMapping,
  bucketKey,
} = recruiterHubService;

console.log('Running Recruiter Hub Service Tests...\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

function assert(condition, passMessage, failMessage) {
  if (condition) {
    console.log(`✓ PASSED: ${passMessage}`);
    passed++;
  } else {
    console.log(`✗ FAILED: ${failMessage}`);
    failed++;
  }
}

// Test 1: Draft Risk Detection
console.log('\n### TEST 1: Draft Risk Detection ###');
console.log('-'.repeat(80));
assert(
  isDraftRisk({ overall_rating: 90, year: 'JR' }) === true,
  'High OVR Junior detected as draft risk',
  'High OVR Junior should be draft risk'
);
assert(
  isDraftRisk({ overall_rating: 85, year: 'JR' }) === false,
  'OVR 85 Junior not flagged as draft risk',
  'OVR 85 Junior should not be draft risk'
);
assert(
  isDraftRisk({ overall_rating: 90, year: 'SO' }) === false,
  'High OVR Sophomore not flagged as draft risk',
  'Sophomores should not be draft eligible'
);

// Test 2: Graduation Detection
console.log('\n### TEST 2: Graduation Detection ###');
console.log('-'.repeat(80));
assert(
  isGraduating({ year: 'SR' }) === true,
  'Senior detected as graduating',
  'Senior should be graduating'
);
assert(
  isGraduating({ year: 'JR' }) === false,
  'Junior not flagged as graduating',
  'Junior should not be graduating'
);

// Test 3: Dealbreaker and transfer intent checks
console.log('\n### TEST 3: Risk Flag Detection ###');
console.log('-'.repeat(80));
assert(
  hasDealbreakers({ dealbreakers: ['Playing Time C+'] }) === true,
  'Dealbreaker risk detected',
  'Dealbreaker risk should be detected'
);
assert(
  hasDealbreakers({ dealbreakers: [] }) === false,
  'Empty dealbreakers are ignored',
  'Empty dealbreakers should not be flagged'
);
assert(
  hasTransferIntent({ transfer_intent: true }) === true,
  'Transfer intent detected',
  'Transfer intent should be detected'
);
assert(
  hasTransferIntent({ transfer_intent: false }) === false,
  'No transfer intent when false',
  'False transfer intent should not be flagged'
);

// Test 4: Default mapping slot counts and rule shape
console.log('\n### TEST 4: Default Mapping Configuration ###');
console.log('-'.repeat(80));
const defaultConfig = depthChartMappingService.buildDefaultConfig();
assert(
  defaultConfig.slots.QB.count === 3 && defaultConfig.slots.WR.count === 6 && defaultConfig.slots.NT.count === 3,
  'Default slot counts include in-game values',
  'Default slot counts do not match expected in-game values'
);
assert(
  Array.isArray(defaultConfig.slots.LEDG.rules) && defaultConfig.slots.LEDG.rules.length > 0,
  'Default mapping includes ordered rules',
  'Default mapping should include ordered rules for each slot'
);

// Test 5: Override validation and persistence schema safety
console.log('\n### TEST 5: Override Validation ###');
console.log('-'.repeat(80));
let validationError = null;
try {
  depthChartMappingService.validateAndMergeConfig({
    slots: {
      SUBLB: {
        rules: [{ position: 'MIKE', archetype: 'Not Real' }]
      }
    }
  });
} catch (error) {
  validationError = error;
}
assert(
  !!validationError && validationError.message.includes('Invalid archetype'),
  'Invalid archetype override is rejected with clear error',
  'Invalid archetype should fail validation with an explicit error'
);

// Test 6: Deterministic slot fill simulation
console.log('\n### TEST 6: Deterministic Simulation ###');
console.log('-'.repeat(80));
const deterministicConfig = depthChartMappingService.validateAndMergeConfig({
  slots: {
    QB: { rules: [{ position: 'QB' }] }
  }
});
const deterministicPlayers = [
  { position: 'QB', archetype: 'Dual Threat' },
  { position: 'QB', archetype: 'Pocket Passer' },
];
const firstSim = simulateDemandFromMapping(deterministicConfig, deterministicPlayers, []);
const secondSim = simulateDemandFromMapping(deterministicConfig, deterministicPlayers, []);
assert(
  JSON.stringify(firstSim) === JSON.stringify(secondSim),
  'Simulation output is deterministic for identical inputs',
  'Simulation should be deterministic'
);

// Test 7: Scenario - Any QB at QB
console.log('\n### TEST 7: Scenario - Any QB at QB ###');
console.log('-'.repeat(80));
const qbConfig = depthChartMappingService.validateAndMergeConfig({
  slots: {
    QB: { rules: [{ position: 'QB' }] }
  }
});
const qbSim = simulateDemandFromMapping(qbConfig, [{ position: 'QB', archetype: 'Dual Threat' }], []);
assert(
  qbSim.targetByBucket[bucketKey('QB', null)] === 3,
  'QB slot produces generic QB target demand',
  `Expected QB target demand of 3, got ${qbSim.targetByBucket[bucketKey('QB', null)]}`
);

// Test 8: Scenario - Thumpers at LEDG/REDG
console.log('\n### TEST 8: Scenario - Thumpers at LEDG/REDG ###');
console.log('-'.repeat(80));
const thumperConfig = depthChartMappingService.validateAndMergeConfig({
  slots: {
    LEDG: { rules: [{ position: 'SAM', archetype: 'Thumper' }] },
    REDG: { rules: [{ position: 'WILL', archetype: 'Thumper' }] },
  }
});
const thumperSim = simulateDemandFromMapping(thumperConfig, [], []);
assert(
  thumperSim.targetByBucket[bucketKey('SAM', 'Thumper')] === 3 &&
  thumperSim.targetByBucket[bucketKey('WILL', 'Thumper')] === 3,
  'LEDG/REDG remap contributes Thumper archetype demand',
  'Expected Thumper demand from LEDG/REDG remapping'
);

// Test 9: Scenario - Lurkers at SUBLB
console.log('\n### TEST 9: Scenario - Lurkers at SUBLB ###');
console.log('-'.repeat(80));
const lurkerConfig = depthChartMappingService.validateAndMergeConfig({
  slots: {
    SUBLB: { rules: [{ position: 'MIKE', archetype: 'Lurker' }] },
  }
});
const lurkerSim = simulateDemandFromMapping(lurkerConfig, [], []);
assert(
  lurkerSim.targetByBucket[bucketKey('MIKE', 'Lurker')] === 3,
  'SUBLB remap drives Lurker demand',
  'Expected Lurker demand from SUBLB remap'
);

// Test 10: Scenario - No EDGE usage
console.log('\n### TEST 10: Scenario - No EDGE Usage ###');
console.log('-'.repeat(80));
const noEdgeConfig = depthChartMappingService.validateAndMergeConfig({
  slots: {
    LEDG: { rules: [{ position: 'SAM', archetype: 'Thumper' }] },
    REDG: { rules: [{ position: 'WILL', archetype: 'Thumper' }] },
    RLE: { rules: [{ position: 'SAM', archetype: 'Thumper' }] },
    RRE: { rules: [{ position: 'WILL', archetype: 'Thumper' }] },
  }
});
const noEdgeSim = simulateDemandFromMapping(noEdgeConfig, [], []);
assert(
  !Object.keys(noEdgeSim.targetByBucket).some(key => key.startsWith('LEDG::') || key.startsWith('REDG::') || key.includes('Edge Setter')),
  'No EDGE rule usage results in no EDGE/Edge Setter demand bucket',
  'EDGE demand buckets should be absent when mapping does not reference EDGE'
);

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

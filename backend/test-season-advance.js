const assert = require('assert');
const { getAdvancedYear, advancePlayerSeason } = require('./src/controllers/playerController');

console.log('Running season advancement helper tests...\n');

assert.strictEqual(getAdvancedYear('FR'), 'SO');
assert.strictEqual(getAdvancedYear('SO'), 'JR');
assert.strictEqual(getAdvancedYear('JR'), 'SR');
assert.strictEqual(getAdvancedYear('SR'), 'GRAD');
assert.strictEqual(getAdvancedYear('RS SR'), 'GRAD');
assert.strictEqual(getAdvancedYear('GRAD'), 'GRAD');

const redshirtedPlayer = advancePlayerSeason({
  year: 'FR',
  redshirted: true,
  redshirt_used: false,
});

assert.deepStrictEqual(redshirtedPlayer, {
  year: 'FR',
  redshirted: false,
  redshirt_used: true,
  redshirtApplied: true,
  graduated: false,
});

const nonRedshirtPlayer = advancePlayerSeason({
  year: 'JR',
  redshirted: false,
  redshirt_used: false,
});

assert.deepStrictEqual(nonRedshirtPlayer, {
  year: 'SR',
  redshirted: false,
  redshirt_used: false,
  redshirtApplied: false,
  graduated: false,
});

const graduatedPlayer = advancePlayerSeason({
  year: 'SR',
  redshirted: false,
  redshirt_used: false,
});

assert.strictEqual(graduatedPlayer.year, 'GRAD');
assert.strictEqual(graduatedPlayer.graduated, true);

console.log('✓ Season advancement helper tests passed');

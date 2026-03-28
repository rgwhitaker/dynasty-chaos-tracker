const db = require('../config/database');
const { ROSTER_POSITIONS, POSITION_ARCHETYPES } = require('../constants/playerAttributes');

/**
 * Default archetype groups that ship out of the box.
 * Each group has a custom name, unit (offense/defense/specialTeams),
 * one or more source positions, and zero or more archetypes to filter by.
 * An empty archetypes array means "all archetypes for those positions".
 */
const DEFAULT_ARCHETYPE_GROUPS = {
  offense: [
    { group_name: 'Pocket Passer', positions: ['QB'], archetypes: ['Pocket Passer'], display_order: 1 },
    { group_name: 'Dual Threat QB', positions: ['QB'], archetypes: ['Dual Threat', 'Backfield Creator', 'Pure Runner'], display_order: 2 },
    { group_name: 'Power Backs', positions: ['HB'], archetypes: ['Contact Seeker', 'Elusive Bruiser'], display_order: 3 },
    { group_name: 'Receiving Backs', positions: ['HB'], archetypes: ['Backfield Threat', 'North/South Receiver', 'East/West Playmaker'], display_order: 4 },
    { group_name: 'Fullback', positions: ['FB'], archetypes: [], display_order: 5 },
    { group_name: 'Speed Receivers', positions: ['WR'], archetypes: ['Speedster', 'Elusive Route Runner', 'Route Artist'], display_order: 6 },
    { group_name: 'Possession Receivers', positions: ['WR'], archetypes: ['Contested Specialist', 'Gritty Possession', 'Physical Route Runner', 'Gadget'], display_order: 7 },
    { group_name: 'Receiving TE', positions: ['TE'], archetypes: ['Gritty Possession', 'Physical Route Runner', 'Pure Possession', 'Vertical Threat'], display_order: 8 },
    { group_name: 'Blocking TE', positions: ['TE'], archetypes: ['Pure Blocker'], display_order: 9 },
    { group_name: 'Pass Protectors', positions: ['LT', 'LG', 'C', 'RG', 'RT'], archetypes: ['Pass Protector', 'Agile'], display_order: 10 },
    { group_name: 'Road Graders', positions: ['LT', 'LG', 'C', 'RG', 'RT'], archetypes: ['Raw Strength', 'Well Rounded'], display_order: 11 },
  ],
  defense: [
    { group_name: 'Speed Rushers', positions: ['LEDG', 'REDG'], archetypes: ['Speed Rusher'], display_order: 1 },
    { group_name: 'Power Rushers', positions: ['LEDG', 'REDG'], archetypes: ['Power Rusher', 'Pure Power'], display_order: 2 },
    { group_name: 'Edge Setters', positions: ['LEDG', 'REDG'], archetypes: ['Edge Setter'], display_order: 3 },
    { group_name: 'Run Stoppers', positions: ['DT'], archetypes: ['Gap Specialist', 'Pure Power'], display_order: 4 },
    { group_name: 'Pass Rush DT', positions: ['DT'], archetypes: ['Power Rusher', 'Speed Rusher'], display_order: 5 },
    { group_name: 'Lurkers', positions: ['SAM', 'MIKE', 'WILL'], archetypes: ['Lurker'], display_order: 6 },
    { group_name: 'Signal Callers', positions: ['SAM', 'MIKE', 'WILL'], archetypes: ['Signal Caller'], display_order: 7 },
    { group_name: 'Thumpers', positions: ['SAM', 'MIKE', 'WILL'], archetypes: ['Thumper'], display_order: 8 },
    { group_name: 'Man Coverage CB', positions: ['CB'], archetypes: ['Bump and Run'], display_order: 9 },
    { group_name: 'Zone Coverage CB', positions: ['CB'], archetypes: ['Zone', 'Boundary', 'Field'], display_order: 10 },
    { group_name: 'Safeties', positions: ['FS', 'SS'], archetypes: [], display_order: 11 },
  ],
  specialTeams: [
    { group_name: 'Kicker', positions: ['K'], archetypes: [], display_order: 1 },
    { group_name: 'Punter', positions: ['P'], archetypes: [], display_order: 2 },
  ],
};

function buildDefaultGroups() {
  return JSON.parse(JSON.stringify(DEFAULT_ARCHETYPE_GROUPS));
}

function validateGroup(group) {
  if (!group || typeof group !== 'object') {
    throw new Error('Each archetype group must be an object');
  }

  if (!group.group_name || typeof group.group_name !== 'string' || group.group_name.trim().length === 0) {
    throw new Error('Each archetype group must have a non-empty group_name');
  }

  if (!Array.isArray(group.positions) || group.positions.length === 0) {
    throw new Error(`Archetype group "${group.group_name}" must have at least one position`);
  }

  for (const pos of group.positions) {
    if (!ROSTER_POSITIONS.includes(pos)) {
      throw new Error(`Invalid position "${pos}" in archetype group "${group.group_name}"`);
    }
  }

  if (!Array.isArray(group.archetypes)) {
    throw new Error(`Archetypes must be an array in archetype group "${group.group_name}"`);
  }

  for (const arch of group.archetypes) {
    // Verify the archetype exists for at least one of the specified positions
    const validForSomePosition = group.positions.some(pos => {
      const validArchetypes = POSITION_ARCHETYPES[pos] || [];
      return validArchetypes.includes(arch);
    });
    if (!validForSomePosition) {
      throw new Error(`Archetype "${arch}" is not valid for any of the positions [${group.positions.join(', ')}] in group "${group.group_name}"`);
    }
  }
}

function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Archetype groups config must be an object');
  }

  const validUnits = ['offense', 'defense', 'specialTeams'];
  for (const unit of validUnits) {
    if (config[unit] !== undefined) {
      if (!Array.isArray(config[unit])) {
        throw new Error(`Unit "${unit}" must be an array of groups`);
      }
      config[unit].forEach(group => validateGroup(group));
    }
  }

  // Check for unexpected keys
  for (const key of Object.keys(config)) {
    if (!validUnits.includes(key)) {
      throw new Error(`Invalid unit "${key}". Must be one of: ${validUnits.join(', ')}`);
    }
  }

  return config;
}

async function getGroups(dynastyId) {
  const result = await db.query(
    'SELECT unit, group_name, positions, archetypes, display_order FROM roster_archetype_groups WHERE dynasty_id = $1 ORDER BY unit, display_order',
    [dynastyId]
  );

  if (result.rows.length === 0) {
    return null; // No custom config – frontend will use defaults
  }

  const config = {};
  result.rows.forEach(row => {
    if (!config[row.unit]) {
      config[row.unit] = [];
    }
    config[row.unit].push({
      group_name: row.group_name,
      positions: row.positions,
      archetypes: row.archetypes,
      display_order: row.display_order,
    });
  });

  return config;
}

async function saveGroups(dynastyId, config) {
  const validated = validateConfig(config);
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM roster_archetype_groups WHERE dynasty_id = $1', [dynastyId]);

    const validUnits = ['offense', 'defense', 'specialTeams'];
    for (const unit of validUnits) {
      const groups = validated[unit] || [];
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        await client.query(
          `INSERT INTO roster_archetype_groups (dynasty_id, unit, group_name, positions, archetypes, display_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [dynastyId, unit, group.group_name.trim(), group.positions, group.archetypes, group.display_order ?? i + 1]
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return validated;
}

async function resetGroups(dynastyId) {
  await db.query('DELETE FROM roster_archetype_groups WHERE dynasty_id = $1', [dynastyId]);
  return buildDefaultGroups();
}

module.exports = {
  buildDefaultGroups,
  getGroups,
  saveGroups,
  resetGroups,
};

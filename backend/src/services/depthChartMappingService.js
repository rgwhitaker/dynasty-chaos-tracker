const db = require('../config/database');
const { ROSTER_POSITIONS, POSITION_ARCHETYPES } = require('../constants/playerAttributes');
const {
  DEPTH_CHART_SLOT_COUNTS,
  DEFAULT_DEPTH_CHART_SLOT_RULES,
  DEPTH_CHART_SLOTS,
} = require('../constants/depthChartMapping');

function buildDefaultConfig() {
  const slots = {};
  DEPTH_CHART_SLOTS.forEach(slot => {
    slots[slot] = {
      slot,
      count: DEPTH_CHART_SLOT_COUNTS[slot],
      rules: DEFAULT_DEPTH_CHART_SLOT_RULES[slot].map(rule => ({ ...rule })),
    };
  });
  return { slots };
}

function normalizeRule(rule) {
  if (!rule || typeof rule !== 'object') {
    return null;
  }

  const position = typeof rule.position === 'string' ? rule.position.trim() : '';
  if (!position) {
    return null;
  }

  let archetype = null;
  if (rule.archetype !== undefined && rule.archetype !== null && String(rule.archetype).trim() !== '') {
    archetype = String(rule.archetype).trim();
  }

  return { position, archetype };
}

function validateRule(slot, rule) {
  if (!ROSTER_POSITIONS.includes(rule.position)) {
    throw new Error(`Invalid position "${rule.position}" in slot "${slot}"`);
  }

  if (rule.archetype) {
    const validArchetypes = POSITION_ARCHETYPES[rule.position] || [];
    if (!validArchetypes.includes(rule.archetype)) {
      throw new Error(`Invalid archetype "${rule.archetype}" for position "${rule.position}" in slot "${slot}"`);
    }
  }
}

function validateAndMergeConfig(overrideConfig) {
  const base = buildDefaultConfig();
  if (!overrideConfig || typeof overrideConfig !== 'object') {
    return base;
  }

  const incomingSlots = overrideConfig.slots;
  if (!incomingSlots || typeof incomingSlots !== 'object') {
    return base;
  }

  Object.entries(incomingSlots).forEach(([slot, slotValue]) => {
    if (!DEPTH_CHART_SLOTS.includes(slot)) {
      throw new Error(`Invalid depth chart slot "${slot}"`);
    }
    if (!slotValue || typeof slotValue !== 'object') {
      throw new Error(`Invalid slot configuration for "${slot}"`);
    }
    if (!Array.isArray(slotValue.rules) || slotValue.rules.length === 0) {
      throw new Error(`Slot "${slot}" must include at least one rule`);
    }

    const rules = slotValue.rules.map(normalizeRule).filter(Boolean);
    if (rules.length === 0) {
      throw new Error(`Slot "${slot}" must include at least one valid rule`);
    }
    rules.forEach(rule => validateRule(slot, rule));

    base.slots[slot] = {
      slot,
      count: DEPTH_CHART_SLOT_COUNTS[slot],
      rules,
    };
  });

  return base;
}

async function getConfig(dynastyId) {
  const result = await db.query(
    'SELECT slot, rules_json FROM recruiter_hub_depth_chart_mapping WHERE dynasty_id = $1',
    [dynastyId]
  );

  const override = { slots: {} };
  result.rows.forEach(row => {
    override.slots[row.slot] = { rules: row.rules_json };
  });

  return validateAndMergeConfig(override);
}

async function saveConfig(dynastyId, config) {
  const validated = validateAndMergeConfig(config);
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM recruiter_hub_depth_chart_mapping WHERE dynasty_id = $1', [dynastyId]);

    for (const slot of DEPTH_CHART_SLOTS) {
      const slotConfig = validated.slots[slot];
      await client.query(
        `INSERT INTO recruiter_hub_depth_chart_mapping (dynasty_id, slot, rules_json)
         VALUES ($1, $2, $3::jsonb)`,
        [dynastyId, slot, JSON.stringify(slotConfig.rules)]
      );
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

async function resetConfig(dynastyId) {
  await db.query('DELETE FROM recruiter_hub_depth_chart_mapping WHERE dynasty_id = $1', [dynastyId]);
  return buildDefaultConfig();
}

module.exports = {
  buildDefaultConfig,
  validateAndMergeConfig,
  getConfig,
  saveConfig,
  resetConfig,
};

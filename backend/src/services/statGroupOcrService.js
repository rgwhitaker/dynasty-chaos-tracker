const OpenAI = require('openai');
const sharp = require('sharp');
const fs = require('fs').promises;
const { getStatGroupsForPosition } = require('../constants/statCaps');

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * All known stat group names across all positions/archetypes
 */
const ALL_STAT_GROUP_NAMES = [
  'Accuracy', 'Power', 'IQ', 'Elusiveness', 'Quickness', 'Health',
  'Hands', 'Route Running', 'Blocking',
  'Pass Blocking', 'Run Blocking', 'Footwork',
  'Power Moves', 'Finesse Moves', 'Run Stopping',
  'Pass Coverage', 'Pass Rush', 'Pass Rushing',
  'Man Coverage', 'Zone Coverage', 'Run Support',
  'Kick Accuracy', 'Kick Power', 'Throw Accuracy', 'Throw Power',
];

/**
 * Preprocess stat group screenshot for OCR
 * Creates both normal and inverted versions to handle mixed contrast
 * (one stat group typically has light background with dark text)
 */
async function preprocessStatGroupImage(imagePath) {
  const normalPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '_sg_normal.png');
  const invertedPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '_sg_inverted.png');

  try {
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .sharpen()
      .toFile(normalPath);

    await sharp(imagePath)
      .grayscale()
      .negate({ alpha: false })
      .normalize()
      .sharpen()
      .toFile(invertedPath);

    return { normalPath, invertedPath };
  } catch (error) {
    console.error('Stat group image preprocessing error:', error);
    return { normalPath: imagePath, invertedPath: null };
  }
}

/**
 * Parse stat groups from a screenshot using OpenAI Vision API
 * Sends both normal and inverted images to handle mixed contrast backgrounds
 * @param {string} imagePath - Path to the uploaded screenshot
 * @param {string} position - Player position for validation
 * @param {string} [archetype] - Player archetype (optional)
 * @returns {object} Parsed stat groups with { groupName: purchased_blocks }
 */
async function parseStatGroupScreenshot(imagePath, position, archetype) {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
  }

  const validGroups = getStatGroupsForPosition(position, archetype);
  if (!validGroups || validGroups.length === 0) {
    throw new Error(`No stat groups defined for position: ${position}`);
  }

  // Preprocess to get normal and inverted versions
  const { normalPath, invertedPath } = await preprocessStatGroupImage(imagePath);

  // Read the images as base64
  const normalImageData = await fs.readFile(normalPath);
  const normalBase64 = normalImageData.toString('base64');

  const imageMessages = [
    {
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${normalBase64}`,
        detail: 'high',
      },
    },
  ];

  // Add inverted image if available to handle mixed contrast
  if (invertedPath) {
    try {
      const invertedImageData = await fs.readFile(invertedPath);
      const invertedBase64 = invertedImageData.toString('base64');
      imageMessages.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${invertedBase64}`,
          detail: 'high',
        },
      });
    } catch (err) {
      console.error('Failed to read inverted image, proceeding with normal only:', err.message);
    }
  }

  const prompt = `You are analyzing a screenshot of stat groups from the College Football 26 video game.

The screenshot shows a list of stat groups for a player. Each stat group has:
1. A name (e.g., "Blocking", "Power", "IQ", "Quickness", "Hands", "Route Running")
2. A numeric value (0-100) displayed next to the name
3. A visual bar showing progress blocks (20 blocks per stat group)
4. Some blocks may be LOCKED/CAPPED (cannot be upgraded) - these are shown with a padlock/lock icon 🔒 or appear grayed out/different from normal blocks

IMPORTANT VISUAL DETAILS:
- One of the stat groups typically has a LIGHT/WHITE background with BLACK text (inverted contrast compared to the others which have dark backgrounds with light text)
- I am providing two versions of the image - a normal version and an inverted version - so you can read text from both contrast styles
- Use whichever version makes each stat group's text clearest
- LOOK CAREFULLY for locked/capped blocks - they typically have a lock icon 🔒 or appear visually different (grayed out, striped, or with different shading)

The valid stat group names for this player's position (${position}) are:
${validGroups.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Other possible stat group names across all positions:
${ALL_STAT_GROUP_NAMES.join(', ')}

For each stat group visible in the screenshot, extract:
- The stat group name (must match one of the valid names above, correct any OCR-like misreads)
- The numeric value displayed (typically 0-99, occasionally 100 if maxed out)
- The positions of any CAPPED/LOCKED blocks (if visible) - these are block numbers 1-20 that show a lock icon or appear grayed out

Return ALL stat groups visible in the screenshot, even if some are not in the expected list for this position.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a precise data extraction assistant for video game screenshots. Extract stat group names and their numeric values accurately. Return only valid JSON.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...imageMessages,
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'stat_groups',
          strict: false,
          schema: {
            type: 'object',
            properties: {
              stat_groups: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'integer' },
                    capped_blocks: {
                      type: 'array',
                      items: { type: 'integer' },
                      description: 'Array of block numbers (1-20) that are locked/capped',
                    },
                  },
                  required: ['name', 'value'],
                  additionalProperties: false,
                },
              },
            },
            required: ['stat_groups'],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.1,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const statGroups = result.stat_groups || [];

    console.log(`Stat Group OCR: Extracted ${statGroups.length} stat groups`);
    console.log('Extracted stat groups:', JSON.stringify(statGroups));

    // Convert to stat_caps format
    return convertToStatCaps(statGroups, validGroups);
  } catch (error) {
    console.error('Stat group OCR parsing error:', error);
    throw error;
  } finally {
    // Clean up preprocessed files
    try {
      if (normalPath !== imagePath) await fs.unlink(normalPath).catch(() => {});
      if (invertedPath) await fs.unlink(invertedPath).catch(() => {});
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Convert OCR-extracted stat group values to stat_caps format
 * The numeric value represents the stat group's current rating (0-99 or 0-100)
 * Each stat group has 20 upgrade blocks
 * - For values 0-99: purchased_blocks = Math.floor(value / 5), giving 0-19 blocks
 * - For value 100: purchased_blocks = 20
 * @param {array} ocrStatGroups - Array of { name, value, capped_blocks? } from OCR
 * @param {array} validGroups - Array of valid group names for the position
 * @returns {object} stat_caps object compatible with the player model
 */
function convertToStatCaps(ocrStatGroups, validGroups) {
  const statCaps = {};

  for (const group of ocrStatGroups) {
    // Fuzzy match the OCR name to valid group names
    const matchedName = matchStatGroupName(group.name, validGroups);
    if (!matchedName) {
      console.log(`Stat Group OCR: Could not match "${group.name}" to any valid group`);
      continue;
    }

    // Clamp value to valid range (0-100)
    const value = Math.max(0, Math.min(100, group.value));

    // Convert value to purchased blocks
    // Values 0-99 map to 0-19 blocks (each block = 5 points)
    // Value 100 maps to 20 blocks (full)
    let purchasedBlocks;
    if (value === 100) {
      purchasedBlocks = 20;
    } else {
      purchasedBlocks = Math.floor(value / 5);
    }

    // Extract capped blocks from OCR (if provided)
    const cappedBlocks = Array.isArray(group.capped_blocks) ? group.capped_blocks : [];
    
    // Validate capped blocks are in valid range (1-20)
    const validCappedBlocks = cappedBlocks.filter(block => {
      const isValid = Number.isInteger(block) && block >= 1 && block <= 20;
      if (!isValid && block !== undefined) {
        console.log(`Stat Group OCR: Invalid capped block ${block} for "${matchedName}" (must be 1-20)`);
      }
      return isValid;
    });

    statCaps[matchedName] = {
      purchased_blocks: purchasedBlocks,
      capped_blocks: validCappedBlocks,
    };
  }

  return statCaps;
}

/**
 * Fuzzy match an OCR stat group name to valid group names
 * Handles common OCR misreads and case differences
 */
function matchStatGroupName(ocrName, validGroups) {
  if (!ocrName) return null;

  const normalized = ocrName.trim();

  // Exact match (case-insensitive)
  for (const group of validGroups) {
    if (group.toLowerCase() === normalized.toLowerCase()) {
      return group;
    }
  }

  // Also check all known stat group names (in case the position groups are wrong)
  for (const group of ALL_STAT_GROUP_NAMES) {
    if (group.toLowerCase() === normalized.toLowerCase()) {
      // Only return if it's in the valid groups for this position
      if (validGroups.includes(group)) {
        return group;
      }
      // Still return it if it's a known name (user might have wrong position configured)
      return group;
    }
  }

  // Substring match for partial OCR reads
  for (const group of validGroups) {
    if (group.toLowerCase().includes(normalized.toLowerCase()) ||
        normalized.toLowerCase().includes(group.toLowerCase())) {
      return group;
    }
  }

  return null;
}

module.exports = {
  parseStatGroupScreenshot,
  convertToStatCaps,
  matchStatGroupName,
  preprocessStatGroupImage,
};

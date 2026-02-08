const OpenAI = require('openai');

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Parse roster data using AI-powered post-processing (OpenAI GPT-4o-mini)
 * This provides more robust parsing than regex, handling:
 * - Position misreads (DT/OT confusion)
 * - Player name suffixes (Jr., Sr., II, III, etc.)
 * - Highlighted rows with special characters
 * - OCR artifacts and formatting issues
 */
async function parseRosterWithAI(ocrText) {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
  }

  const prompt = `You are an expert at parsing college football roster data from OCR text output.

OCR Text:
${ocrText}

Your task:
1. Parse all player entries from the OCR text
2. Correct common OCR errors (O→D, 0→D, l→T, I→T in positions)
3. Extract player names and separate suffixes (Jr., Sr., II, III, IV, V)
4. Ignore highlighted row artifacts (arrows, block characters)
5. Handle various roster formats (jersey-position-name-overall, NCAA format, etc.)

Position Codes (correct these if OCR misread them):
- Offense: QB, HB, FB, WR, TE, LT, LG, C, RG, RT
- Defense: LEDG, REDG, DT, SAM, MIKE, WILL, CB, FS, SS
- Special: K, P

Common OCR Errors to Fix:
- "DT" is often misread as "OT" - correct back to "DT" when context indicates defensive tackle
- "0T" (zero-T) should be "DT"
- "Dl" or "D1" or "DI" should be "DT"
- "HG" should be "HB"
- "W8" should be "WR"

Return ONLY valid players with:
- jersey_number (0-99, use 0 if not available)
- position (2-4 letter code, corrected)
- first_name (can be empty or initial)
- last_name (required)
- overall_rating (40-99)
- attributes object with:
  - OVR: overall rating
  - SUFFIX: name suffix if present (Jr., Sr., II, III, etc.)
  - Any other numeric attributes from the roster

Parse carefully and validate all data. Return empty array if no valid players found.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a precise data extraction assistant that returns only valid JSON arrays of player objects.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { 
        type: 'json_schema',
        json_schema: {
          name: 'roster_players',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              players: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    jersey_number: { type: 'integer' },
                    position: { type: 'string' },
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    overall_rating: { type: 'integer' },
                    attributes: {
                      type: 'object',
                      properties: {
                        OVR: { type: 'integer' },
                        SUFFIX: { type: 'string' },
                        VOVR: { type: 'integer' },
                        SPD: { type: 'integer' },
                        ACC: { type: 'integer' },
                        AGI: { type: 'integer' },
                        COD: { type: 'integer' },
                        STR: { type: 'integer' },
                        AWR: { type: 'integer' },
                        PMV: { type: 'integer' },
                        FMV: { type: 'integer' },
                        CAR: { type: 'integer' },
                        BCV: { type: 'integer' },
                        THP: { type: 'integer' },
                        SAC: { type: 'integer' },
                        MAC: { type: 'integer' },
                        DAC: { type: 'integer' },
                        RUN: { type: 'integer' },
                        TUP: { type: 'integer' },
                        BSK: { type: 'integer' },
                        TRK: { type: 'integer' },
                        SFA: { type: 'integer' },
                        SPM: { type: 'integer' },
                        JMP: { type: 'integer' },
                        CTH: { type: 'integer' },
                        CIT: { type: 'integer' },
                        SPC: { type: 'integer' },
                        SRR: { type: 'integer' },
                        MRR: { type: 'integer' },
                        DRR: { type: 'integer' },
                        RTE: { type: 'integer' },
                        RLS: { type: 'integer' },
                        PBK: { type: 'integer' },
                        RBK: { type: 'integer' },
                        IBL: { type: 'integer' },
                        TAK: { type: 'integer' },
                        BSH: { type: 'integer' },
                        PRC: { type: 'integer' },
                        PRS: { type: 'integer' },
                        ZCV: { type: 'integer' },
                        MCV: { type: 'integer' },
                        PUR: { type: 'integer' },
                        MAN: { type: 'integer' },
                        KPW: { type: 'integer' },
                        KAC: { type: 'integer' },
                        STA: { type: 'integer' },
                        INJ: { type: 'integer' },
                        TGH: { type: 'integer' }
                      },
                      required: ['OVR'],
                      additionalProperties: false
                    }
                  },
                  required: ['jersey_number', 'position', 'first_name', 'last_name', 'overall_rating', 'attributes'],
                  additionalProperties: false
                }
              }
            },
            required: ['players'],
            additionalProperties: false
          }
        }
      },
      temperature: 0.1, // Low temperature for consistent, accurate parsing
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const players = result.players || [];

    console.log(`AI OCR: Parsed ${players.length} players from OCR text`);
    if (players.length > 0) {
      console.log('AI OCR Sample player:', players[0]);
    }

    return players;
  } catch (error) {
    console.error('AI OCR parsing error:', error);
    throw error;
  }
}

/**
 * Validate parsed player data from AI
 */
function validateAIPlayers(players) {
  const errors = [];
  const validPositions = [
    'QB', 'HB', 'FB', 'WR', 'TE',
    'LT', 'LG', 'C', 'RG', 'RT',
    'LEDG', 'REDG', 'DT',
    'SAM', 'MIKE', 'WILL',
    'CB', 'FS', 'SS',
    'K', 'P'
  ];

  players.forEach((player, index) => {
    if (!player.last_name) {
      errors.push({ index, field: 'name', message: 'Invalid player name' });
    }
    if (!validPositions.includes(player.position)) {
      errors.push({ index, field: 'position', message: `Invalid position: ${player.position}` });
    }
    if (player.overall_rating < 40 || player.overall_rating > 99) {
      errors.push({ index, field: 'overall_rating', message: `Invalid overall rating: ${player.overall_rating}` });
    }
    if (player.jersey_number < 0 || player.jersey_number > 99) {
      errors.push({ index, field: 'jersey_number', message: `Invalid jersey number: ${player.jersey_number}` });
    }
  });

  return { valid: errors.length === 0, errors, players };
}

module.exports = {
  parseRosterWithAI,
  validateAIPlayers
};

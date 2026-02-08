const OpenAI = require('openai');
const { Ollama } = require('ollama');

// AI Provider Configuration
const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama'; // 'ollama', 'openai'
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

// Initialize clients based on configuration
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const ollama = new Ollama({ host: OLLAMA_URL });

/**
 * Build the parsing prompt for roster data
 */
function buildParsingPrompt(ocrText) {
  return `You are an expert at parsing college football roster data from OCR text output.

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

Return ONLY valid players as a JSON object with a "players" array. Each player must have:
- jersey_number (0-99, use 0 if not available)
- position (2-4 letter code, corrected)
- first_name (can be empty or initial)
- last_name (required)
- overall_rating (40-99)
- attributes object with:
  - OVR: overall rating
  - SUFFIX: name suffix if present (Jr., Sr., II, III, etc.)
  - Any other numeric attributes from the roster

Example output format:
{
  "players": [
    {
      "jersey_number": 12,
      "position": "DT",
      "first_name": "John",
      "last_name": "Smith",
      "overall_rating": 85,
      "attributes": { "OVR": 85, "SUFFIX": "Jr." }
    }
  ]
}

Parse carefully and validate all data. Return {"players": []} if no valid players found.`;
}

/**
 * Parse roster data using Ollama (self-hosted LLM)
 */
async function parseWithOllama(ocrText) {
  try {
    console.log(`Using Ollama model: ${OLLAMA_MODEL} at ${OLLAMA_URL}`);
    
    const prompt = buildParsingPrompt(ocrText);
    
    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a precise data extraction assistant that returns only valid JSON objects with player data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      format: 'json', // Request JSON format
      options: {
        temperature: 0.1, // Low temperature for consistency
        num_predict: 2000, // Allow enough tokens for full response
      }
    });

    const content = response.message.content;
    const result = JSON.parse(content);
    const players = result.players || [];

    console.log(`Ollama AI OCR: Parsed ${players.length} players from OCR text`);
    if (players.length > 0) {
      console.log('Ollama Sample player:', players[0]);
    }

    return players;
  } catch (error) {
    console.error('Ollama AI OCR parsing error:', error);
    throw error;
  }
}

/**
 * Parse roster data using OpenAI (cloud LLM)
 */
async function parseWithOpenAI(ocrText) {
  try {
    console.log('Using OpenAI GPT-4o-mini');
    
    const prompt = buildParsingPrompt(ocrText);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a precise data extraction assistant that returns only valid JSON objects with player data.'
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
                      additionalProperties: true
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
      temperature: 0.1,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const players = result.players || [];

    console.log(`OpenAI AI OCR: Parsed ${players.length} players from OCR text`);
    if (players.length > 0) {
      console.log('OpenAI Sample player:', players[0]);
    }

    return players;
  } catch (error) {
    console.error('OpenAI AI OCR parsing error:', error);
    throw error;
  }
}

/**
 * Parse roster data using AI-powered post-processing
 * Supports both self-hosted (Ollama) and cloud (OpenAI) LLMs
 * This provides more robust parsing than regex, handling:
 * - Position misreads (DT/OT confusion)
 * - Player name suffixes (Jr., Sr., II, III, etc.)
 * - Highlighted rows with special characters
 * - OCR artifacts and formatting issues
 */
async function parseRosterWithAI(ocrText) {
  // Determine which AI provider to use
  const provider = AI_PROVIDER.toLowerCase();
  
  if (provider === 'ollama') {
    return await parseWithOllama(ocrText);
  } else if (provider === 'openai') {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }
    return await parseWithOpenAI(ocrText);
  } else {
    throw new Error(`Unknown AI provider: ${provider}. Use 'ollama' or 'openai'`);
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

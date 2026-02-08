const { Ollama } = require('ollama');
const db = require('../config/database');

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'llama3.1:8b';

const ollama = new Ollama({ host: OLLAMA_URL });

/**
 * Get roster context for chat assistant
 * Fetches relevant player data to provide context to the LLM
 */
async function getRosterContext(dynastyId, userQuery) {
  try {
    // Fetch all players for this dynasty
    const playersResult = await db.query(
      `SELECT id, first_name, last_name, position, jersey_number, 
              overall_rating, year, attributes
       FROM players 
       WHERE dynasty_id = $1 
       ORDER BY overall_rating DESC 
       LIMIT 100`,
      [dynastyId]
    );

    const players = playersResult.rows;

    // Build a concise summary of the roster
    const rosterSummary = {
      totalPlayers: players.length,
      byPosition: {},
      topPlayers: players.slice(0, 10).map(p => ({
        name: `${p.first_name} ${p.last_name}`,
        position: p.position,
        jersey: p.jersey_number,
        overall: p.overall_rating,
        year: p.year
      })),
      averageRating: players.length > 0 
        ? Math.round(players.reduce((sum, p) => sum + p.overall_rating, 0) / players.length)
        : 0
    };

    // Group by position
    players.forEach(player => {
      if (!rosterSummary.byPosition[player.position]) {
        rosterSummary.byPosition[player.position] = [];
      }
      rosterSummary.byPosition[player.position].push({
        name: `${player.first_name} ${player.last_name}`,
        jersey: player.jersey_number,
        overall: player.overall_rating,
        year: player.year
      });
    });

    return {
      players,
      summary: rosterSummary
    };
  } catch (error) {
    console.error('Error fetching roster context:', error);
    throw error;
  }
}

/**
 * Chat with roster assistant
 * Uses self-hosted LLM to answer questions about the roster
 */
async function chatWithRoster(dynastyId, userMessage, chatHistory = []) {
  try {
    console.log(`Roster Chat: Processing query for dynasty ${dynastyId}`);

    // Get roster context
    const { players, summary } = await getRosterContext(dynastyId, userMessage);

    // Build system prompt with roster context
    const systemPrompt = `You are a helpful college football dynasty assistant. You have access to the current roster data.

Roster Summary:
- Total Players: ${summary.totalPlayers}
- Average Overall Rating: ${summary.averageRating}
- Top 10 Players:
${summary.topPlayers.map(p => `  • ${p.name} (${p.position} #${p.jersey}) - ${p.overall} OVR, ${p.year || 'N/A'}`).join('\n')}

Position Breakdown:
${Object.entries(summary.byPosition).map(([pos, players]) => 
  `- ${pos}: ${players.length} players (avg: ${Math.round(players.reduce((s, p) => s + p.overall, 0) / players.length)})`
).join('\n')}

When answering questions:
1. Be specific and use actual player names and stats from the roster
2. Provide analysis and recommendations based on the data
3. Be conversational and helpful
4. If you don't have enough information, say so
5. Format responses clearly with bullet points or lists when appropriate

Focus on helping the user manage their dynasty team effectively.`;

    // Build message history for context
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // Add chat history (limit to last 10 messages for context)
    const recentHistory = chatHistory.slice(-10);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Call Ollama
    console.log(`Using Ollama chat model: ${OLLAMA_CHAT_MODEL}`);
    const response = await ollama.chat({
      model: OLLAMA_CHAT_MODEL,
      messages: messages,
      options: {
        temperature: 0.7, // Slightly higher for more natural conversation
        num_predict: 500, // Limit response length
      }
    });

    const assistantMessage = response.message.content;

    console.log('Roster Chat: Response generated successfully');

    return {
      message: assistantMessage,
      context: {
        playersAnalyzed: summary.totalPlayers,
        avgOverall: summary.averageRating
      }
    };
  } catch (error) {
    console.error('Roster chat error:', error);
    throw error;
  }
}

/**
 * Stream chat response for real-time interaction
 */
async function* streamChatWithRoster(dynastyId, userMessage, chatHistory = []) {
  try {
    const { players, summary } = await getRosterContext(dynastyId, userMessage);

    const systemPrompt = `You are a helpful college football dynasty assistant with access to the current roster.

Roster: ${summary.totalPlayers} players, avg OVR ${summary.averageRating}
Top players: ${summary.topPlayers.slice(0, 5).map(p => `${p.name} (${p.position}, ${p.overall})`).join(', ')}

Be helpful, specific, and conversational.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-10),
      { role: 'user', content: userMessage }
    ];

    // Stream response from Ollama
    const stream = await ollama.chat({
      model: OLLAMA_CHAT_MODEL,
      messages: messages,
      stream: true,
      options: {
        temperature: 0.7,
        num_predict: 500,
      }
    });

    for await (const chunk of stream) {
      if (chunk.message?.content) {
        yield chunk.message.content;
      }
    }
  } catch (error) {
    console.error('Roster chat stream error:', error);
    throw error;
  }
}

/**
 * Get suggested questions based on roster
 */
function getSuggestedQuestions(summary) {
  const suggestions = [
    "Who are my best players?",
    "Which positions need upgrades?",
    "Show me my starting lineup",
    "What's my depth at quarterback?",
    "Who should I focus on recruiting?"
  ];

  // Add position-specific questions
  if (summary.byPosition.QB?.length > 0) {
    suggestions.push("Compare my quarterbacks");
  }
  if (summary.byPosition.WR?.length > 2) {
    suggestions.push("Who are my top 3 receivers?");
  }

  return suggestions.slice(0, 6);
}

module.exports = {
  chatWithRoster,
  streamChatWithRoster,
  getRosterContext,
  getSuggestedQuestions
};

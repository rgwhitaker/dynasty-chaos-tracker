const { chatWithRoster, streamChatWithRoster, getSuggestedQuestions, getRosterContext } = require('../services/rosterChatService');

/**
 * Chat with roster assistant
 * POST /api/dynasties/:id/chat
 */
async function chat(req, res) {
  try {
    const dynastyId = req.params.id;
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call chat service
    const result = await chatWithRoster(dynastyId, message, history);

    res.json({
      response: result.message,
      context: result.context,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    
    // Check if Ollama is not available
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      return res.status(503).json({ 
        error: 'AI chat service is not available. Please ensure Ollama is running.',
        hint: 'Start Ollama with: ollama serve'
      });
    }

    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Stream chat with roster assistant
 * POST /api/dynasties/:id/chat/stream
 */
async function chatStream(req, res) {
  try {
    const dynastyId = req.params.id;
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream response
    for await (const chunk of streamChatWithRoster(dynastyId, message, history)) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    // Send done signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Chat stream endpoint error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to stream chat response',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
}

/**
 * Get suggested questions for chat
 * GET /api/dynasties/:id/chat/suggestions
 */
async function getSuggestions(req, res) {
  try {
    const dynastyId = req.params.id;
    
    // Get roster context to generate relevant suggestions
    const { summary } = await getRosterContext(dynastyId);
    const suggestions = getSuggestedQuestions(summary);

    res.json({
      suggestions,
      rosterSummary: {
        totalPlayers: summary.totalPlayers,
        avgOverall: summary.averageRating
      }
    });
  } catch (error) {
    console.error('Suggestions endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to get suggestions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Check if chat service is available
 * GET /api/chat/status
 */
async function checkStatus(req, res) {
  try {
    const { Ollama } = require('ollama');
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollama = new Ollama({ host: OLLAMA_URL });

    // Try to list models to check if Ollama is running
    const models = await ollama.list();
    
    res.json({
      available: true,
      provider: 'ollama',
      url: OLLAMA_URL,
      models: models.models?.map(m => m.name) || [],
      message: 'Chat service is available'
    });
  } catch (error) {
    res.json({
      available: false,
      provider: 'ollama',
      error: 'Ollama is not running or not accessible',
      hint: 'Start Ollama with: ollama serve'
    });
  }
}

module.exports = {
  chat,
  chatStream,
  getSuggestions,
  checkStatus
};

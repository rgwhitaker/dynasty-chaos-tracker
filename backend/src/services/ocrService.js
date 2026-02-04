const Tesseract = require('tesseract.js');
const AWS = require('aws-sdk');
const vision = require('@google-cloud/vision');
const sharp = require('sharp');
const fs = require('fs').promises;
const db = require('../config/database');

// Initialize AWS Textract
const textract = new AWS.Textract({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Initialize Google Cloud Vision
const visionClient = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? new vision.ImageAnnotatorClient() 
  : null;

/**
 * Preprocess image for better OCR accuracy
 */
async function preprocessImage(imagePath) {
  try {
    const outputPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '_processed.png');
    
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(128)
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return imagePath; // Return original if preprocessing fails
  }
}

/**
 * Extract text using Tesseract.js
 */
async function extractTextTesseract(imagePath) {
  try {
    const { data } = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => console.log(m)
    });
    return data.text;
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    throw error;
  }
}

/**
 * Extract text using AWS Textract
 */
async function extractTextTextract(imagePath) {
  try {
    const imageBytes = await fs.readFile(imagePath);
    
    const params = {
      Document: {
        Bytes: imageBytes
      }
    };

    const result = await textract.detectDocumentText(params).promise();
    
    const text = result.Blocks
      .filter(block => block.BlockType === 'LINE')
      .map(block => block.Text)
      .join('\n');

    return text;
  } catch (error) {
    console.error('Textract OCR error:', error);
    throw error;
  }
}

/**
 * Extract text using Google Cloud Vision
 */
async function extractTextGoogleVision(imagePath) {
  try {
    if (!visionClient) {
      throw new Error('Google Cloud Vision not configured');
    }

    const [result] = await visionClient.textDetection(imagePath);
    const detections = result.textAnnotations;
    
    return detections[0]?.description || '';
  } catch (error) {
    console.error('Google Vision OCR error:', error);
    throw error;
  }
}

/**
 * Parse roster data from OCR text
 */
function parseRosterData(ocrText) {
  const players = [];
  const lines = ocrText.split('\n').filter(line => line.trim());

  // Simple parsing logic - this would need to be more sophisticated
  // based on actual screenshot format
  const playerPattern = /^(\d+)\s+([A-Z]+)\s+([A-Z\s]+)\s+(\d+)/;

  for (const line of lines) {
    const match = line.match(playerPattern);
    if (match) {
      const [, jersey, position, name, overall] = match;
      const nameParts = name.trim().split(/\s+/);
      const lastName = nameParts.pop();
      const firstName = nameParts.join(' ');

      players.push({
        jersey_number: parseInt(jersey),
        position,
        first_name: firstName,
        last_name: lastName,
        overall_rating: parseInt(overall),
        attributes: {} // Would need more sophisticated parsing
      });
    }
  }

  return players;
}

/**
 * Validate parsed player data
 */
function validatePlayerData(players) {
  const errors = [];
  const validPositions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P'];

  players.forEach((player, index) => {
    if (!player.first_name || !player.last_name) {
      errors.push({ index, field: 'name', message: 'Invalid player name' });
    }
    if (!validPositions.includes(player.position)) {
      errors.push({ index, field: 'position', message: 'Invalid position' });
    }
    if (player.overall_rating < 40 || player.overall_rating > 99) {
      errors.push({ index, field: 'overall_rating', message: 'Invalid overall rating' });
    }
  });

  return { valid: errors.length === 0, errors, players };
}

/**
 * Process roster screenshot
 */
async function processRosterScreenshot(filePath, dynastyId, uploadId, ocrMethod = 'tesseract') {
  try {
    // Update status to processing
    await db.query(
      'UPDATE ocr_uploads SET processing_status = $1 WHERE id = $2',
      ['processing', uploadId]
    );

    // Preprocess image
    const processedPath = await preprocessImage(filePath);
    
    await db.query(
      'UPDATE ocr_uploads SET is_preprocessed = TRUE WHERE id = $1',
      [uploadId]
    );

    // Extract text based on method
    let ocrText;
    switch (ocrMethod) {
      case 'textract':
        ocrText = await extractTextTextract(processedPath);
        break;
      case 'google_vision':
        ocrText = await extractTextGoogleVision(processedPath);
        break;
      case 'tesseract':
      default:
        ocrText = await extractTextTesseract(processedPath);
        break;
    }

    // Parse roster data
    const parsedPlayers = parseRosterData(ocrText);

    // Validate data
    const validation = validatePlayerData(parsedPlayers);

    if (validation.errors.length > 0) {
      // Store validation errors for manual correction
      await db.query(
        'UPDATE ocr_uploads SET validation_errors = $1, processing_status = $2 WHERE id = $3',
        [JSON.stringify(validation.errors), 'requires_validation', uploadId]
      );
      return { status: 'requires_validation', errors: validation.errors, players: parsedPlayers };
    }

    // Import players
    let importedCount = 0;
    for (const player of validation.players) {
      await db.query(
        `INSERT INTO players (dynasty_id, first_name, last_name, position, jersey_number, overall_rating, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [dynastyId, player.first_name, player.last_name, player.position, 
         player.jersey_number, player.overall_rating, JSON.stringify(player.attributes)]
      );
      importedCount++;
    }

    // Update upload status
    await db.query(
      'UPDATE ocr_uploads SET processing_status = $1, players_imported = $2 WHERE id = $3',
      ['completed', importedCount, uploadId]
    );

    return { status: 'completed', importedCount };

  } catch (error) {
    console.error('OCR processing error:', error);
    await db.query(
      'UPDATE ocr_uploads SET processing_status = $1 WHERE id = $2',
      ['failed', uploadId]
    );
    throw error;
  }
}

/**
 * Process batch of screenshots
 */
async function processBatchUpload(filePaths, dynastyId, uploadId, ocrMethod = 'tesseract') {
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      const result = await processRosterScreenshot(filePath, dynastyId, uploadId, ocrMethod);
      results.push({ filePath, success: true, result });
    } catch (error) {
      results.push({ filePath, success: false, error: error.message });
    }
  }

  return results;
}

module.exports = {
  preprocessImage,
  extractTextTesseract,
  extractTextTextract,
  extractTextGoogleVision,
  parseRosterData,
  validatePlayerData,
  processRosterScreenshot,
  processBatchUpload
};

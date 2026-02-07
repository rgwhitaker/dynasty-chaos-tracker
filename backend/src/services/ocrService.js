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
 * Clean OCR text to handle common OCR errors
 */
function cleanOcrText(text) {
  // Replace common OCR mistakes
  return text
    .replace(/\}/g, ')') // Replace } with )
    .replace(/\{/g, '(') // Replace { with (
    .replace(/\[(\d+)\]/g, '$1') // Replace [3] with 3
    .replace(/\[(\d+)/g, '$1') // Replace [3 with 3 (missing closing bracket)
    .replace(/\[x\]/gi, '99') // Replace [x] with 99 (common OCR error)
    .replace(/\[x/gi, '99') // Replace [x with 99 (missing closing bracket)
    .replace(/Lal/g, '99') // Replace Lal with 99 (common OCR error)
    .replace(/hal/g, '99') // Replace hal with 99 (common OCR error)
    .replace(/v\*OVR/g, 'OVR') // Replace v*OVR with OVR
    .replace(/\bO\b/g, '0') // Replace isolated O with 0
    .replace(/\bl\b/g, '1'); // Replace isolated l with 1
}

/**
 * Detect if OCR text is from a player detail screen vs roster list
 */
function isPlayerDetailScreen(ocrText) {
  const upperText = ocrText.toUpperCase();
  
  // Look for keywords/patterns that indicate a detail screen
  const detailScreenIndicators = [
    'OVERVIEW', 'RATINGS', 'MENTALS', 'PHYSICALS',
    'ARCHETYPE', 'DEVELOPMENT TRAIT', 'DEALBREAKER',
    'PIPELINE', 'HOMETOWN', 'STAR RATING'
  ];
  
  // Count how many detail screen indicators are present
  let indicatorCount = 0;
  for (const indicator of detailScreenIndicators) {
    if (upperText.includes(indicator)) {
      indicatorCount++;
    }
  }
  
  // Look for labeled field patterns (e.g., "Position QB", "Class Senior", "Height 6'0"")
  const labeledFieldPatterns = [
    /\bPOSITION\s+[A-Z]{1,4}/i,
    /\bCLASS\s+(FRESHMAN|SOPHOMORE|JUNIOR|SENIOR)/i,
    /\bHEIGHT\s+\d/i,
    /\bWEIGHT\s+\d/i
  ];
  
  let labeledFieldCount = 0;
  for (const pattern of labeledFieldPatterns) {
    if (pattern.test(ocrText)) {
      labeledFieldCount++;
    }
  }
  
  // If we have multiple indicators or labeled fields, it's likely a detail screen
  return indicatorCount >= 2 || labeledFieldCount >= 2;
}

/**
 * Parse player detail screen (individual player view)
 */
function parsePlayerDetailScreen(ocrText) {
  const lines = ocrText.split('\n').filter(line => line.trim());
  const cleanedLines = lines.map(line => cleanOcrText(line));
  
  const player = {
    jersey_number: 0,
    position: '',
    first_name: '',
    last_name: '',
    overall_rating: 0,
    attributes: {}
  };
  
  // Extract player name - typically at the top in uppercase (e.g., "Cai WOODS")
  // Look for a line with 2 words, both capitalized
  const namePattern = /^([A-Z][a-z]+)\s+([A-Z]+)$/;
  for (let i = 0; i < Math.min(5, cleanedLines.length); i++) {
    const match = cleanedLines[i].match(namePattern);
    if (match) {
      player.first_name = match[1];
      player.last_name = match[2];
      break;
    }
  }
  
  // Extract position and jersey number from "Position QB (R) #16" format
  const positionPattern = /Position\s+([A-Z]{1,4})\s*(?:\([A-Z]\))?\s*#?(\d+)/i;
  for (const line of cleanedLines) {
    const match = line.match(positionPattern);
    if (match) {
      player.position = match[1].toUpperCase();
      player.jersey_number = parseInt(match[2]);
      break;
    }
  }
  
  // Extract class/year from patterns like "Senior (SR (RS))" or "Class Senior"
  const classPattern = /(?:Class\s+)?(Freshman|Sophomore|Junior|Senior)\s*(?:\(([A-Z]{2}(?:\s*\([A-Z]{2}\))?)\))?/i;
  for (const line of cleanedLines) {
    const match = line.match(classPattern);
    if (match) {
      // Store the abbreviated form if available, otherwise the full form
      const classAbbr = match[2] || match[1].substring(0, 2).toUpperCase();
      player.attributes.CLASS = classAbbr;
      break;
    }
  }
  
  // Extract overall rating from "84 OVR" badge or similar
  const overallPattern = /(\d{2})\s*(?:OVR|OVERALL)/i;
  for (const line of cleanedLines) {
    const match = line.match(overallPattern);
    if (match) {
      const overall = parseInt(match[1]);
      if (overall >= 40 && overall <= 99) {
        player.overall_rating = overall;
        player.attributes.OVR = overall;
        break;
      }
    }
  }
  
  // Extract height from patterns like "Height 6'0"" or "6'0""
  const heightPattern = /(?:Height\s+)?(\d+[''′]\s*\d+[""″]?)/i;
  for (const line of cleanedLines) {
    const match = line.match(heightPattern);
    if (match) {
      player.attributes.HEIGHT = match[1].replace(/[′″]/g, (m) => m === '′' ? "'" : '"');
      break;
    }
  }
  
  // Extract weight from patterns like "Weight 211 lbs" or "211 lbs"
  const weightPattern = /(?:Weight\s+)?(\d{2,3})\s*(?:lbs?)?/i;
  for (const line of cleanedLines) {
    const match = line.match(weightPattern);
    if (match) {
      const weight = parseInt(match[1]);
      // Weight should be reasonable (150-400 lbs)
      if (weight >= 150 && weight <= 400) {
        player.attributes.WEIGHT = weight;
        break;
      }
    }
  }
  
  // Extract development trait if present
  const devTraitPattern = /(?:Development\s+Trait|Dev\s+Trait)\s*:?\s*([A-Za-z\s]+)/i;
  for (const line of cleanedLines) {
    const match = line.match(devTraitPattern);
    if (match) {
      player.attributes.DEV_TRAIT = match[1].trim();
      break;
    }
  }
  
  // Validate that we have the minimum required data
  if (player.last_name && player.position && player.overall_rating >= 40) {
    return [player]; // Return as array for consistency with parseRosterData
  }
  
  return [];
}

/**
 * Parse roster data from OCR text
 */
function parseRosterData(ocrText) {
  const players = [];
  const lines = ocrText.split('\n').filter(line => line.trim());

  // Clean the OCR text first
  const cleanedLines = lines.map(line => cleanOcrText(line));

  // Check if first line is a header with attribute names
  let headerAttributes = null;
  let dataStartIndex = 0;
  
  if (cleanedLines.length > 0) {
    const firstLine = cleanedLines[0].toUpperCase();
    // Header detection: look for common attribute names
    if (firstLine.includes('SPD') || firstLine.includes('ACC') || 
        firstLine.includes('AGI') || firstLine.includes('COD') ||
        (firstLine.includes('OVR') && firstLine.includes('POS'))) {
      // Parse header to extract attribute column names
      const headerParts = cleanedLines[0].split(/\s+/);
      headerAttributes = [];
      for (const part of headerParts) {
        const cleaned = part.replace(/[^A-Za-z]/g, '').toUpperCase();
        // Map common variations
        if (cleaned === 'COD') {
          headerAttributes.push('COD');
        } else if (cleaned.length >= 2 && cleaned.length <= 4) {
          // Likely an attribute abbreviation
          headerAttributes.push(cleaned);
        }
      }
      dataStartIndex = 1; // Skip header row
      // Log only in development mode
      if (process.env.NODE_ENV !== 'production') {
        console.log('Detected header with attributes:', headerAttributes);
      }
    }
  }

  // More flexible parsing patterns to handle various OCR output formats
  // Pattern 1: Jersey Position Name Overall (e.g., "12 QB John Smith 85")
  const pattern1 = /^(\d+)\s+([A-Z]{1,4})\s+([A-Za-z\s]+?)\s+(\d{2})/;
  
  // Pattern 2: Position Jersey Name Overall (e.g., "QB 12 John Smith 85")
  const pattern2 = /^([A-Z]{1,4})\s+(\d+)\s+([A-Za-z\s]+?)\s+(\d{2})/;
  
  // Pattern 3: Name Position Jersey Overall (e.g., "John Smith QB 12 85")
  const pattern3 = /^([A-Za-z\s]+?)\s+([A-Z]{1,4})\s+(\d+)\s+(\d{2})/;
  
  // Pattern 4: NCAA Roster format - Name Year Position Overall (e.g., "T.Bragg SO (RS) WR 89")
  // Matches: Initial.LastName or First.LastName or Initial LastName or FirstName LastName, 
  // Year (e.g., FR, SO, JR, SR) with optional (RS), Position, Overall
  // Also handles hyphenated names like Smith-Marsette and space-separated initials like "J Williams"
  const pattern4 = /^([A-Z]\.?\s?[A-Za-z-]+(?:\s+[A-Z][A-Za-z-]+)?)\s+(?:FR|SO|JR|SR)\s*(?:\([A-Z]{0,2}\))?\s+([A-Z]{1,4})\s+(\d{2}[\+]?)/i;

  for (let i = dataStartIndex; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];
    let match = line.match(pattern1);
    let jersey, position, name, overall;

    if (match) {
      [, jersey, position, name, overall] = match;
    } else {
      match = line.match(pattern2);
      if (match) {
        [, position, jersey, name, overall] = match;
      } else {
        match = line.match(pattern3);
        if (match) {
          [, name, position, jersey, overall] = match;
        } else {
          // Try NCAA roster format (Pattern 4)
          match = line.match(pattern4);
          if (match) {
            [, name, position, overall] = match;
            // For NCAA format, we don't have jersey numbers in the roster screen
            // We'll assign 0 as a placeholder which can be updated later
            jersey = '0';
            // Remove the '+' suffix if present
            overall = overall.replace('+', '');
          }
        }
      }
    }

    if (match) {
      const nameParts = name.trim().split(/\s+/);
      let firstName, lastName;
      
      // Handle abbreviated names like "T.Bragg"
      if (name.includes('.')) {
        const parts = name.split('.');
        if (parts.length === 2) {
          firstName = parts[0]; // Initial
          lastName = parts[1];
        } else {
          // Fallback to regular parsing
          if (nameParts.length === 1) {
            firstName = '';
            lastName = nameParts[0];
          } else {
            lastName = nameParts.pop();
            firstName = nameParts.join(' ');
          }
        }
      } else if (nameParts.length === 1) {
        // Single name - use as last name, leave first name empty
        firstName = '';
        lastName = nameParts[0];
      } else {
        lastName = nameParts.pop();
        firstName = nameParts.join(' ');
      }

      // Validate parsed data before adding
      const overallNum = parseInt(overall);
      const jerseyNum = parseInt(jersey);
      
      if (overallNum >= 40 && overallNum <= 99 && jerseyNum >= 0 && jerseyNum <= 99) {
        // Initialize attributes with OVR
        const attributes = {
          OVR: overallNum
        };

        // If header with attributes was detected, parse additional attributes
        if (headerAttributes && headerAttributes.length > 0) {
          const lineParts = line.split(/\s+/);
          // Find where the numeric attributes start (after position)
          let attrStartIndex = -1;
          for (let j = 0; j < lineParts.length; j++) {
            const part = lineParts[j].toUpperCase();
            // Position is typically 2-4 letters
            if (part.match(/^[A-Z]{1,4}$/) && j > 0) {
              // Check if next part is a number (the overall rating)
              if (j + 1 < lineParts.length && lineParts[j + 1].match(/^\d+[\+]?$/)) {
                attrStartIndex = j + 1;
                break;
              }
            }
          }

          if (attrStartIndex >= 0 && attrStartIndex < lineParts.length) {
            // Find attribute column indices from header
            let attrColumnStart = -1;
            for (let j = 0; j < headerAttributes.length; j++) {
              if (headerAttributes[j] === 'OVR' || headerAttributes[j] === 'VOVR') {
                attrColumnStart = j;
                break;
              }
            }

            if (attrColumnStart >= 0) {
              // Parse attribute values
              const attrValues = lineParts.slice(attrStartIndex);
              for (let j = 0; j < attrValues.length && (attrColumnStart + j) < headerAttributes.length; j++) {
                const attrName = headerAttributes[attrColumnStart + j];
                const attrValue = parseInt(attrValues[j].replace('+', ''));
                
                // Validate attribute value (should be 0-99)
                if (!isNaN(attrValue) && attrValue >= 0 && attrValue <= 99) {
                  attributes[attrName] = attrValue;
                }
              }
            }
          }
        }

        players.push({
          jersey_number: jerseyNum,
          position: position.toUpperCase(),
          first_name: firstName,
          last_name: lastName,
          overall_rating: overallNum,
          attributes: attributes
        });
      }
    }
  }

  console.log(`parseRosterData: Processed ${lines.length} lines, found ${players.length} valid players`);
  if (players.length > 0) {
    console.log('Sample parsed player:', players[0]);
  }

  // If no players were found, try parsing as player detail screen
  if (players.length === 0) {
    console.log('No players found with roster list parsing, attempting player detail screen parsing...');
    if (isPlayerDetailScreen(ocrText)) {
      console.log('Detected player detail screen format');
      const detailPlayers = parsePlayerDetailScreen(ocrText);
      if (detailPlayers.length > 0) {
        console.log('Successfully parsed player detail screen:', detailPlayers[0]);
        return detailPlayers;
      }
    }
  }

  return players;
}

/**
 * Validate parsed player data
 */
function validatePlayerData(players) {
  const errors = [];
  // Valid roster positions from College Football game
  const validPositions = [
    'QB', 'HB', 'FB', 'WR', 'TE',           // Offense skill positions
    'LT', 'LG', 'C', 'RG', 'RT',            // Offensive line
    'LEDG', 'REDG', 'DT',                   // Defensive line
    'SAM', 'MIKE', 'WILL',                  // Linebackers
    'CB', 'FS', 'SS',                        // Secondary
    'K', 'P'                                 // Special teams
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

    // Log extracted text for debugging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('OCR extracted text:');
      console.log('===================');
      console.log(ocrText);
      console.log('===================');
    } else {
      console.log(`OCR extracted text length: ${ocrText.length} characters`);
    }

    // Parse roster data
    const parsedPlayers = parseRosterData(ocrText);
    console.log(`Parsed ${parsedPlayers.length} players from OCR text`);

    // Check if no players were parsed
    if (parsedPlayers.length === 0) {
      console.log('WARNING: No players could be parsed from OCR text');
      await db.query(
        'UPDATE ocr_uploads SET processing_status = $1, validation_errors = $2 WHERE id = $3',
        ['failed', JSON.stringify([{ message: 'No players could be parsed from the screenshot. Please ensure the image shows a roster with player data in a clear format.' }]), uploadId]
      );
      return { status: 'failed', errors: [{ message: 'No players could be parsed from the screenshot' }], players: [] };
    }

    // Validate data
    const validation = validatePlayerData(parsedPlayers);

    if (validation.errors.length > 0) {
      console.log(`Validation errors found: ${validation.errors.length} errors`);
      console.log('Validation errors:', JSON.stringify(validation.errors, null, 2));
      // Store validation errors for manual correction
      await db.query(
        'UPDATE ocr_uploads SET validation_errors = $1, processing_status = $2 WHERE id = $3',
        [JSON.stringify(validation.errors), 'requires_validation', uploadId]
      );
      return { status: 'requires_validation', errors: validation.errors, players: parsedPlayers };
    }

    // Import players with duplicate detection
    // First, fetch all existing players for this dynasty to avoid N+1 queries
    const existingPlayersResult = await db.query(
      `SELECT id, first_name, last_name, position, attributes, jersey_number, overall_rating 
       FROM players 
       WHERE dynasty_id = $1`,
      [dynastyId]
    );
    
    // Create a lookup map for fast duplicate detection
    const existingPlayersMap = new Map();
    for (const p of existingPlayersResult.rows) {
      const key = `${p.first_name.toLowerCase()}_${p.last_name.toLowerCase()}_${p.position}`;
      existingPlayersMap.set(key, p);
    }

    let importedCount = 0;
    let updatedCount = 0;
    for (const player of validation.players) {
      // Check if player already exists using the in-memory map
      const key = `${player.first_name.toLowerCase()}_${player.last_name.toLowerCase()}_${player.position}`;
      const existing = existingPlayersMap.get(key);

      if (existing) {
        // Player exists - merge attributes and update
        const existingAttrs = existing.attributes || {};
        const newAttrs = player.attributes || {};
        
        // Merge attributes (new values override existing ones)
        const mergedAttrs = { ...existingAttrs, ...newAttrs };
        
        await db.query(
          `UPDATE players 
           SET jersey_number = $1, 
               overall_rating = $2, 
               attributes = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [
            player.jersey_number ?? existing.jersey_number,
            player.overall_rating ?? existing.overall_rating,
            JSON.stringify(mergedAttrs),
            existing.id
          ]
        );
        updatedCount++;
      } else {
        // Player doesn't exist - insert new
        await db.query(
          `INSERT INTO players (dynasty_id, first_name, last_name, position, jersey_number, overall_rating, attributes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [dynastyId, player.first_name, player.last_name, player.position, 
           player.jersey_number, player.overall_rating, JSON.stringify(player.attributes)]
        );
        importedCount++;
      }
    }

    console.log(`Successfully processed ${importedCount} new players and updated ${updatedCount} existing players in dynasty ${dynastyId}`);

    // Update upload status
    await db.query(
      'UPDATE ocr_uploads SET processing_status = $1, players_imported = $2 WHERE id = $3',
      ['completed', importedCount + updatedCount, uploadId]
    );

    return { status: 'completed', importedCount, updatedCount, totalProcessed: importedCount + updatedCount };

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
  cleanOcrText,
  parseRosterData,
  parsePlayerDetailScreen,
  isPlayerDetailScreen,
  validatePlayerData,
  processRosterScreenshot,
  processBatchUpload
};

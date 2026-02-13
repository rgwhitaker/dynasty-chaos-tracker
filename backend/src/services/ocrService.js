const Tesseract = require('tesseract.js');
const { TextractClient, DetectDocumentTextCommand } = require('@aws-sdk/client-textract');
const vision = require('@google-cloud/vision');
const sharp = require('sharp');
const fs = require('fs').promises;
const db = require('../config/database');
const { parseRosterWithAI, validateAIPlayers } = require('./aiOcrService');

// Initialize AWS Textract
const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Initialize Google Cloud Vision
const visionClient = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? new vision.ImageAnnotatorClient() 
  : null;

/**
 * Preprocess image for better OCR accuracy
 * Returns paths to both normal and inverted versions to handle
 * mixed-contrast screenshots (e.g., highlighted rows with white background)
 */
async function preprocessImage(imagePath) {
  try {
    const outputPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '_processed.png');
    const invertedPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '_inverted.png');
    
    // Create standard processed image
    // Grayscale + normalize + sharpen is good for OCR
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .sharpen()
      .toFile(outputPath);

    // Create inverted version to capture text on white/highlighted backgrounds
    // This helps detect the first player row which often has inverted colors
    // (white background with dark text vs dark background with light text)
    await sharp(imagePath)
      .grayscale()
      .negate()
      .normalize()
      .sharpen()
      .toFile(invertedPath);

    return { normalPath: outputPath, invertedPath };
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return { normalPath: imagePath, invertedPath: null }; // Return original if preprocessing fails
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
    
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: imageBytes
      }
    });

    const result = await textractClient.send(command);
    
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
 * Correct common position OCR misreads
 */
function correctPosition(position) {
  const upperPos = position.toUpperCase();
  
  // Common OCR position misreads - map to correct position
  // Note: Only map OCR errors that are clearly wrong, not legitimate positions
  // Valid positions are: QB, HB, FB, WR, TE, LT, LG, C, RG, RT (offense),
  //                      LEDG, REDG, DT (D-line), SAM, MIKE, WILL (LB),
  //                      CB, FS, SS (secondary), K, P (special teams)
  const positionCorrections = {
    'OT': 'DT',   // O confused with D - Note: OT is NOT a valid position (tackles are LT/RT)
    '0T': 'DT',   // 0 confused with D
    'Dl': 'DT',   // l confused with T
    'D1': 'DT',   // 1 confused with T
    'DI': 'DT',   // I confused with T
    'HG': 'HB',   // G confused with B
    'W8': 'WR',   // 8 confused with R
  };
  
  // First check if it's in correction map
  if (positionCorrections[upperPos]) {
    return positionCorrections[upperPos];
  }
  
  // Return original if no correction needed
  return upperPos;
}

/**
 * Extract name suffix (Jr., Sr., II, III, IV, V)
 */
function extractNameSuffix(nameParts) {
  if (nameParts.length === 0) {
    return { suffix: null, nameParts };
  }
  
  const lastPart = nameParts[nameParts.length - 1];
  const suffixPattern = /^(Jr\.?|Sr\.?|II|III|IV|V|2nd|3rd|4th|5th)$/i;
  
  if (suffixPattern.test(lastPart)) {
    const suffix = lastPart;
    const remainingParts = nameParts.slice(0, -1);
    return { suffix, nameParts: remainingParts };
  }
  
  return { suffix: null, nameParts };
}

/**
 * Clean highlighted row artifacts from OCR text
 * Highlighted/selected rows in game screenshots often produce OCR artifacts
 */
function cleanHighlightedRowArtifacts(line) {
  // Remove common highlight artifacts:
  // - Block characters: █, ▀, ▄, ▌, ▐, ░, ▒, ▓
  // - Special markers/arrows: ►, >, », ▶
  // - Selection indicators
  return line
    .replace(/[█▀▄▌▐░▒▓]/g, '') // Remove block characters
    .replace(/^[►>»▶➤➜]\s*/g, '') // Remove leading arrows/indicators
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
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
  
  // If we have at least one indicator and one labeled field, or multiple indicators/fields, it's likely a detail screen
  // Also check for the OVR badge pattern which is common in detail screens
  const hasOvrBadge = /\d{2}\s*(?:OVR|OVERALL)/i.test(ocrText);
  
  return (indicatorCount >= 2 || labeledFieldCount >= 2 || 
          (indicatorCount >= 1 && labeledFieldCount >= 1) ||
          (hasOvrBadge && labeledFieldCount >= 1));
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
  const classMapping = {
    'FRESHMAN': 'FR',
    'SOPHOMORE': 'SO',
    'JUNIOR': 'JR',
    'SENIOR': 'SR'
  };
  for (const line of cleanedLines) {
    const match = line.match(classPattern);
    if (match) {
      // Store the abbreviated form if available, otherwise map the full form
      const classAbbr = match[2] || classMapping[match[1].toUpperCase()];
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
  const primeMap = { '′': "'", '″': '"' };
  const heightPattern = /(?:Height\s+)?(\d+[''′]\s*\d+[""″]?)/i;
  for (const line of cleanedLines) {
    const match = line.match(heightPattern);
    if (match) {
      player.attributes.HEIGHT = match[1].replace(/[′″]/g, (m) => primeMap[m] || m);
      break;
    }
  }
  
  // Extract weight from patterns like "Weight 211 lbs" or "211 lbs"
  // Require either the "Weight" label or "lbs" suffix to reduce false positives
  const weightPattern = /(?:Weight\s+(\d{2,3})(?:\s*lbs?)?|(\d{2,3})\s*lbs)/i;
  for (const line of cleanedLines) {
    const match = line.match(weightPattern);
    if (match) {
      const weight = parseInt(match[1] || match[2]);
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

  // Clean the OCR text first, including highlighted row artifacts
  const cleanedLines = lines.map(line => cleanHighlightedRowArtifacts(cleanOcrText(line)));

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
  // Pattern 1: Jersey Position Name Overall (e.g., "12 QB John Smith 85" or "12 QB John Smith Jr. 85")
  const pattern1 = /^(\d+)\s+([A-Z0-9il]{1,4})\s+([A-Za-z\s.]+?)\s+(\d{2})/i;
  
  // Pattern 2: Position Jersey Name Overall (e.g., "QB 12 John Smith 85" or "OT 12 John Smith Jr. 85")
  const pattern2 = /^([A-Z0-9il]{1,4})\s+(\d+)\s+([A-Za-z\s.]+?)\s+(\d{2})/i;
  
  // Pattern 3: Name Position Jersey Overall (e.g., "John Smith QB 12 85" or "John Smith Jr. QB 12 85")
  const pattern3 = /^([A-Za-z\s.]+?)\s+([A-Z0-9il]{1,4})\s+(\d+)\s+(\d{2})/i;
  
  // Pattern 4: NCAA Roster format - Name Year Position Overall (e.g., "T.Bragg SO (RS) WR 89")
  // Matches: Initial.LastName or First.LastName or Initial LastName or FirstName LastName, 
  // Year (e.g., FR, SO, JR, SR) with optional (RS), Position, Overall
  // Also handles hyphenated names like Smith-Marsette and space-separated initials like "J Williams"
  // Handles suffixes like Jr., Sr., II, III, etc.
  const pattern4 = /^([A-Z]\.?\s?[A-Za-z-]+(?:\s+[A-Z][A-Za-z-]+)?(?:\s+(?:Jr\.?|Sr\.?|II|III|IV|V))?)\s+(?:FR|SO|JR|SR)\s*(?:\([A-Z]{0,2}\))?\s+([A-Z0-9]{1,4})\s+(\d{2}[\+]?)/i;

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
      let firstName, lastName, suffix = null;
      
      // Handle abbreviated names like "T.Bragg" - split by dot first
      if (name.includes('.')) {
        const parts = name.split('.');
        if (parts.length === 2) {
          firstName = parts[0]; // Initial
          // Check for suffix in the last name part
          const lastNameParts = parts[1].trim().split(/\s+/);
          const suffixResult = extractNameSuffix(lastNameParts);
          suffix = suffixResult.suffix;
          lastName = suffixResult.nameParts.join(' ');
        } else {
          // Fallback to regular parsing
          let nameParts = name.trim().split(/\s+/);
          const suffixResult = extractNameSuffix(nameParts);
          suffix = suffixResult.suffix;
          nameParts = suffixResult.nameParts;
          
          if (nameParts.length === 1) {
            firstName = '';
            lastName = nameParts[0];
          } else {
            lastName = nameParts.pop();
            firstName = nameParts.join(' ');
          }
        }
      } else {
        // No dot - regular name parsing
        let nameParts = name.trim().split(/\s+/);
        const suffixResult = extractNameSuffix(nameParts);
        suffix = suffixResult.suffix;
        nameParts = suffixResult.nameParts;
        
        if (nameParts.length === 1) {
          // Single name - use as last name, leave first name empty
          firstName = '';
          lastName = nameParts[0];
        } else {
          lastName = nameParts.pop();
          firstName = nameParts.join(' ');
        }
      }

      // Validate parsed data before adding
      const overallNum = parseInt(overall);
      const jerseyNum = parseInt(jersey);
      
      // Apply position correction for common OCR errors
      const correctedPosition = correctPosition(position);
      
      if (overallNum >= 40 && overallNum <= 99 && jerseyNum >= 0 && jerseyNum <= 99) {
        // Initialize attributes with OVR
        const attributes = {
          OVR: overallNum
        };
        
        // Add suffix to attributes if present
        if (suffix) {
          attributes.SUFFIX = suffix;
        }

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
          position: correctedPosition,
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
 * Parse roster data with AI-powered post-processing and fallback to regex
 * Uses AI (OpenAI GPT) as primary method for better accuracy, falls back to regex if unavailable
 */
async function parseRosterDataWithAI(ocrText, useAI = true) {
  // Try AI parsing first if enabled and API key is available
  if (useAI && process.env.OPENAI_API_KEY) {
    try {
      console.log('Attempting AI-powered OCR parsing...');
      const aiPlayers = await parseRosterWithAI(ocrText);
      
      if (aiPlayers && aiPlayers.length > 0) {
        console.log(`AI parsing successful: ${aiPlayers.length} players found`);
        return aiPlayers;
      } else {
        console.log('AI parsing returned no players, falling back to regex parsing...');
      }
    } catch (error) {
      console.error('AI parsing failed, falling back to regex parsing:', error.message);
    }
  } else if (useAI && !process.env.OPENAI_API_KEY) {
    console.log('AI parsing requested but OPENAI_API_KEY not configured, using regex parsing');
  }
  
  // Fallback to regex-based parsing
  console.log('Using regex-based parsing...');
  return parseRosterData(ocrText);
}

/**
 * Merge players from multiple OCR passes, removing duplicates
 * Keeps the version with more complete data (more attributes)
 */
function mergeParsedPlayers(playerSets) {
  const playerMap = new Map();
  
  for (const players of playerSets) {
    for (const player of players) {
      // Create a unique key based on name and position
      // Use empty string as fallback for null/undefined values
      const firstName = (player.first_name || '').toLowerCase();
      const lastName = (player.last_name || '').toLowerCase();
      const position = player.position || '';
      const key = `${firstName}_${lastName}_${position}`;
      
      const existing = playerMap.get(key);
      if (!existing) {
        playerMap.set(key, player);
      } else {
        // Keep the version with more attributes (more complete data)
        const existingAttrCount = Object.keys(existing.attributes || {}).length;
        const newAttrCount = Object.keys(player.attributes || {}).length;
        
        if (newAttrCount > existingAttrCount) {
          // New player has more data, merge attributes
          const mergedAttrs = { ...existing.attributes, ...player.attributes };
          playerMap.set(key, { ...player, attributes: mergedAttrs });
        } else if (existingAttrCount === newAttrCount) {
          // Same attribute count, merge to get the best of both
          const mergedAttrs = { ...existing.attributes, ...player.attributes };
          playerMap.set(key, { ...existing, attributes: mergedAttrs });
        }
        // If existing has more attributes, keep it as is
      }
    }
  }
  
  return Array.from(playerMap.values());
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

    // Preprocess image - returns both normal and inverted versions
    const { normalPath, invertedPath } = await preprocessImage(filePath);
    
    await db.query(
      'UPDATE ocr_uploads SET is_preprocessed = TRUE WHERE id = $1',
      [uploadId]
    );

    // Helper function to extract text based on method
    async function extractText(imagePath) {
      switch (ocrMethod) {
        case 'textract':
          return await extractTextTextract(imagePath);
        case 'google_vision':
          return await extractTextGoogleVision(imagePath);
        case 'tesseract':
        default:
          return await extractTextTesseract(imagePath);
      }
    }

    // Extract text from normal processed image
    let ocrText = await extractText(normalPath);
    
    // Log extracted text for debugging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('OCR extracted text (normal):');
      console.log('===================');
      console.log(ocrText);
      console.log('===================');
    } else {
      console.log(`OCR extracted text length (normal): ${ocrText.length} characters`);
    }

    // Parse roster data with AI (falls back to regex if AI unavailable)
    const useAI = process.env.USE_AI_OCR !== 'false'; // Default to true unless explicitly disabled
    let parsedPlayers = await parseRosterDataWithAI(ocrText, useAI);
    console.log(`Parsed ${parsedPlayers.length} players from normal OCR text`);

    // If inverted image was created, also run OCR on it and merge results
    // This helps capture text on highlighted/white background rows
    if (invertedPath) {
      try {
        const invertedOcrText = await extractText(invertedPath);
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('OCR extracted text (inverted):');
          console.log('===================');
          console.log(invertedOcrText);
          console.log('===================');
        } else {
          console.log(`OCR extracted text length (inverted): ${invertedOcrText.length} characters`);
        }
        
        const invertedPlayers = await parseRosterDataWithAI(invertedOcrText, useAI);
        console.log(`Parsed ${invertedPlayers.length} players from inverted OCR text`);
        
        // Merge players from both passes
        if (invertedPlayers.length > 0) {
          parsedPlayers = mergeParsedPlayers([parsedPlayers, invertedPlayers]);
          console.log(`Total unique players after merging: ${parsedPlayers.length}`);
        }
      } catch (invertedError) {
        console.error('Inverted image OCR failed, continuing with normal results:', invertedError.message);
      }
    }

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
  parseRosterDataWithAI,
  parsePlayerDetailScreen,
  isPlayerDetailScreen,
  validatePlayerData,
  mergeParsedPlayers,
  processRosterScreenshot,
  processBatchUpload
};

const path = require('path');
const os = require('os');
const db = require('../config/database');
const { createNotification } = require('./notificationService');
const { extractFrames, getVideoDuration, deduplicateFrames, cleanupFrames } = require('./videoProcessingService');
const {
  preprocessImage,
  extractTextTesseract,
  extractTextTextract,
  extractTextGoogleVision,
  parseRosterDataWithAI,
  mergeParsedPlayers,
  validatePlayerData,
} = require('./ocrService');

// Maximum video duration in seconds (5 minutes)
const MAX_VIDEO_DURATION_SECONDS = 300;

/**
 * Process a video upload: extract frames, OCR each, compare to existing roster,
 * and store pending results for user review/approval.
 *
 * @param {string} videoPath - Path to the uploaded video file
 * @param {number} dynastyId - Dynasty ID
 * @param {number} uploadId - OCR upload record ID
 * @param {string} ocrMethod - OCR engine to use ('tesseract', 'textract', 'google_vision')
 * @returns {Promise<object>} { newPlayers, updatedPlayers, unchangedCount }
 */
async function processVideoUpload(videoPath, dynastyId, uploadId, ocrMethod = 'tesseract') {
  const framesDir = path.join(os.tmpdir(), `dynasty-video-frames-${uploadId}-${Date.now()}`);

  try {
    // Update status to processing
    await db.query(
      'UPDATE ocr_uploads SET processing_status = $1 WHERE id = $2',
      ['processing', uploadId]
    );

    // Check video duration
    const duration = await getVideoDuration(videoPath);
    console.log(`Video duration: ${duration.toFixed(1)}s`);

    if (duration > MAX_VIDEO_DURATION_SECONDS) {
      await db.query(
        'UPDATE ocr_uploads SET processing_status = $1, validation_errors = $2 WHERE id = $3',
        ['failed', JSON.stringify([{ message: `Video is too long (${Math.ceil(duration)}s). Maximum duration is ${MAX_VIDEO_DURATION_SECONDS / 60} minutes. Please trim your video.` }]), uploadId]
      );
      return { status: 'failed', errors: [{ message: `Video exceeds maximum duration of ${MAX_VIDEO_DURATION_SECONDS / 60} minutes` }] };
    }

    // Step 1: Extract frames (1 fps)
    const allFrames = await extractFrames(videoPath, framesDir, { fps: 1 });

    await db.query(
      'UPDATE ocr_uploads SET total_frames = $1 WHERE id = $2',
      [allFrames.length, uploadId]
    );

    if (allFrames.length === 0) {
      await db.query(
        'UPDATE ocr_uploads SET processing_status = $1, validation_errors = $2 WHERE id = $3',
        ['failed', JSON.stringify([{ message: 'No frames could be extracted from the video.' }]), uploadId]
      );
      return { status: 'failed', errors: [{ message: 'No frames could be extracted from the video' }] };
    }

    // Step 2: Deduplicate frames
    const uniqueFrames = await deduplicateFrames(allFrames);

    // Step 3: OCR each unique frame using the existing pipeline
    const allPlayerSets = [];
    let analyzedCount = 0;

    for (const framePath of uniqueFrames) {
      try {
        const players = await processFrame(framePath, ocrMethod);
        if (players.length > 0) {
          allPlayerSets.push(players);
        }
      } catch (frameErr) {
        console.error(`Error processing frame ${framePath}:`, frameErr.message);
        // Skip this frame, continue with others
      }

      analyzedCount++;
      await db.query(
        'UPDATE ocr_uploads SET frames_analyzed = $1 WHERE id = $2',
        [analyzedCount, uploadId]
      );
    }

    // Step 4: Merge all players across frames
    if (allPlayerSets.length === 0) {
      await db.query(
        'UPDATE ocr_uploads SET processing_status = $1, validation_errors = $2 WHERE id = $3',
        ['failed', JSON.stringify([{ message: 'No players could be detected in any frame. Ensure the video shows the roster clearly.' }]), uploadId]
      );
      return { status: 'failed', errors: [{ message: 'No players detected in video frames' }] };
    }

    const mergedPlayers = mergeParsedPlayers(allPlayerSets);
    console.log(`Merged ${mergedPlayers.length} unique players from ${allPlayerSets.length} frame(s)`);

    // Validate
    const validation = validatePlayerData(mergedPlayers);
    // Filter to only valid players (skip ones with validation errors)
    const validPlayers = validation.players.filter((_, idx) => {
      return !validation.errors.some(e => e.index === idx);
    });

    if (validPlayers.length === 0) {
      await db.query(
        'UPDATE ocr_uploads SET processing_status = $1, validation_errors = $2 WHERE id = $3',
        ['failed', JSON.stringify(validation.errors), uploadId]
      );
      return { status: 'failed', errors: validation.errors };
    }

    // Step 5: Compare against existing roster
    const existingPlayersResult = await db.query(
      `SELECT id, first_name, last_name, position, jersey_number, overall_rating, attributes
       FROM players
       WHERE dynasty_id = $1`,
      [dynastyId]
    );

    const { newPlayers, updatedPlayers, unchangedCount } = compareWithRoster(
      validPlayers,
      existingPlayersResult.rows
    );

    // Step 6: Store pending results for review
    const pendingData = { newPlayers, updatedPlayers, unchangedCount };

    await db.query(
      `INSERT INTO video_ocr_pending (upload_id, dynasty_id, pending_data, status)
       VALUES ($1, $2, $3, 'pending_review')`,
      [uploadId, dynastyId, JSON.stringify(pendingData)]
    );

    await db.query(
      'UPDATE ocr_uploads SET processing_status = $1, players_imported = $2 WHERE id = $3',
      ['pending_review', newPlayers.length + updatedPlayers.length, uploadId]
    );

    // Create notification for the user
    try {
      const uploadRow = await db.query('SELECT user_id FROM ocr_uploads WHERE id = $1', [uploadId]);
      if (uploadRow.rows.length > 0) {
        const totalChanges = newPlayers.length + updatedPlayers.length;
        const message = totalChanges > 0
          ? `Video processing complete: ${newPlayers.length} new player(s) and ${updatedPlayers.length} update(s) found. Review and approve the changes.`
          : `Video processing complete but no roster changes were detected.`;
        await createNotification(uploadRow.rows[0].user_id, dynastyId, 'video_ocr_complete', message);
      }
    } catch (notifErr) {
      console.error('Failed to create completion notification:', notifErr);
    }

    console.log(`Video OCR complete: ${newPlayers.length} new, ${updatedPlayers.length} updates, ${unchangedCount} unchanged`);

    return { status: 'pending_review', newPlayers, updatedPlayers, unchangedCount };

  } catch (error) {
    console.error('Video OCR processing error:', error);
    await db.query(
      'UPDATE ocr_uploads SET processing_status = $1, validation_errors = $2 WHERE id = $3',
      ['failed', JSON.stringify([{ message: error.message }]), uploadId]
    );

    // Create failure notification
    try {
      const uploadRow = await db.query('SELECT user_id FROM ocr_uploads WHERE id = $1', [uploadId]);
      if (uploadRow.rows.length > 0) {
        await createNotification(
          uploadRow.rows[0].user_id,
          dynastyId,
          'video_ocr_failed',
          `Video processing failed: ${error.message}. Please try uploading again.`
        );
      }
    } catch (notifErr) {
      console.error('Failed to create failure notification:', notifErr);
    }

    throw error;
  } finally {
    // Always clean up frames
    await cleanupFrames(framesDir);
  }
}

/**
 * Process a single frame through the OCR pipeline.
 * @param {string} framePath - Path to the frame image
 * @param {string} ocrMethod - OCR method to use
 * @returns {Promise<object[]>} Array of parsed players
 */
async function processFrame(framePath, ocrMethod) {
  // Preprocess the frame - returns both normal and inverted versions
  const { normalPath, invertedPath } = await preprocessImage(framePath);

  // Helper to extract text using the selected OCR method
  async function extractText(imagePath) {
    switch (ocrMethod) {
      case 'textract':
        return extractTextTextract(imagePath);
      case 'google_vision':
        return extractTextGoogleVision(imagePath);
      case 'tesseract':
      default:
        return extractTextTesseract(imagePath);
    }
  }

  // Extract text from normal processed image
  let ocrText = await extractText(normalPath);

  // Skip frames with very little text (likely transition/blur frames)
  if (!ocrText || ocrText.trim().length < 20) {
    ocrText = null;
  }

  // Parse roster data with AI fallback from normal image
  const useAI = process.env.USE_AI_OCR !== 'false';
  let players = [];
  if (ocrText) {
    players = await parseRosterDataWithAI(ocrText, useAI);
  }

  // If inverted image was created, also run OCR on it and merge results
  // This helps capture text from dark-background game screenshots
  if (invertedPath) {
    try {
      const invertedOcrText = await extractText(invertedPath);
      if (invertedOcrText && invertedOcrText.trim().length >= 20) {
        const invertedPlayers = await parseRosterDataWithAI(invertedOcrText, useAI);
        if (invertedPlayers.length > 0) {
          if (players.length > 0) {
            players = mergeParsedPlayers([players, invertedPlayers]);
          } else {
            players = invertedPlayers;
          }
        }
      }
    } catch (invertedError) {
      console.error('Inverted frame OCR failed, continuing with normal results:', invertedError.message);
    }
  }

  return players;
}

/**
 * Compare parsed players from video against the existing roster.
 * Categorizes each as new, updated (with diffs), or unchanged.
 *
 * @param {object[]} parsedPlayers - Players parsed from video
 * @param {object[]} existingPlayers - Current players in DB
 * @returns {{ newPlayers: object[], updatedPlayers: object[], unchangedCount: number }}
 */
function compareWithRoster(parsedPlayers, existingPlayers) {
  // Build lookup maps for existing players
  const exactMap = new Map();     // first_last_position
  const fuzzyMap = new Map();     // last_position (fallback)

  for (const p of existingPlayers) {
    const exactKey = `${(p.first_name || '').toLowerCase()}_${(p.last_name || '').toLowerCase()}_${p.position}`;
    exactMap.set(exactKey, p);

    const fuzzyKey = `${(p.last_name || '').toLowerCase()}_${p.position}`;
    if (!fuzzyMap.has(fuzzyKey)) {
      fuzzyMap.set(fuzzyKey, []);
    }
    fuzzyMap.get(fuzzyKey).push(p);
  }

  const newPlayers = [];
  const updatedPlayers = [];
  let unchangedCount = 0;

  for (const parsed of parsedPlayers) {
    // Try exact match first
    const exactKey = `${(parsed.first_name || '').toLowerCase()}_${(parsed.last_name || '').toLowerCase()}_${parsed.position}`;
    let existing = exactMap.get(exactKey);

    // Fuzzy fallback: last_name + position
    if (!existing) {
      const fuzzyKey = `${(parsed.last_name || '').toLowerCase()}_${parsed.position}`;
      const candidates = fuzzyMap.get(fuzzyKey);
      if (candidates && candidates.length === 1) {
        existing = candidates[0];
      } else if (candidates && candidates.length > 1) {
        // Multiple matches — use jersey number as tiebreaker
        existing = candidates.find(c => c.jersey_number === parsed.jersey_number) || null;
      }
    }

    if (existing) {
      // Compute diff
      const diffs = computePlayerDiff(parsed, existing);
      if (diffs.length > 0) {
        updatedPlayers.push({
          tempId: `update-${existing.id}`,
          existingId: existing.id,
          first_name: existing.first_name,
          last_name: existing.last_name,
          position: existing.position,
          jersey_number: parsed.jersey_number,
          overall_rating: parsed.overall_rating,
          attributes: parsed.attributes || {},
          diffs,
        });
      } else {
        unchangedCount++;
      }
    } else {
      newPlayers.push({
        tempId: `new-${newPlayers.length}`,
        first_name: parsed.first_name,
        last_name: parsed.last_name,
        position: parsed.position,
        jersey_number: parsed.jersey_number,
        overall_rating: parsed.overall_rating,
        attributes: parsed.attributes || {},
      });
    }
  }

  return { newPlayers, updatedPlayers, unchangedCount };
}

/**
 * Compute field-level diffs between a parsed player and an existing player.
 * @param {object} parsed - Parsed player data from OCR
 * @param {object} existing - Existing player from DB
 * @returns {object[]} Array of { field, oldValue, newValue }
 */
function computePlayerDiff(parsed, existing) {
  const diffs = [];

  // Top-level fields
  if (parsed.jersey_number != null && parsed.jersey_number !== existing.jersey_number) {
    diffs.push({ field: 'jersey_number', oldValue: existing.jersey_number, newValue: parsed.jersey_number });
  }
  if (parsed.overall_rating != null && parsed.overall_rating !== existing.overall_rating) {
    diffs.push({ field: 'overall_rating', oldValue: existing.overall_rating, newValue: parsed.overall_rating });
  }

  // Attribute-level diffs
  const newAttrs = parsed.attributes || {};
  const existingAttrs = existing.attributes || {};

  for (const [key, newVal] of Object.entries(newAttrs)) {
    // Skip SUFFIX from diff display (it's metadata, not a rating)
    if (key === 'SUFFIX') continue;
    // Skip OVR since we already compare overall_rating
    if (key === 'OVR') continue;

    const oldVal = existingAttrs[key];
    if (oldVal !== undefined && oldVal !== newVal) {
      diffs.push({ field: key, oldValue: oldVal, newValue: newVal });
    } else if (oldVal === undefined && newVal !== undefined) {
      diffs.push({ field: key, oldValue: null, newValue: newVal });
    }
  }

  return diffs;
}

/**
 * Get pending video OCR results for review.
 * @param {number} uploadId
 * @param {number} dynastyId
 * @returns {Promise<object|null>}
 */
async function getVideoResults(uploadId, dynastyId) {
  const result = await db.query(
    `SELECT vp.*, ou.processing_status, ou.total_frames, ou.frames_analyzed, ou.upload_type
     FROM video_ocr_pending vp
     JOIN ocr_uploads ou ON ou.id = vp.upload_id
     WHERE vp.upload_id = $1 AND vp.dynasty_id = $2 AND vp.status = 'pending_review'`,
    [uploadId, dynastyId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    uploadId: row.upload_id,
    dynastyId: row.dynasty_id,
    status: row.status,
    processingStatus: row.processing_status,
    pendingData: row.pending_data,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

/**
 * Approve selected players from video OCR results.
 * Only checked new/updated players get saved to the DB.
 *
 * @param {number} uploadId
 * @param {number} dynastyId
 * @param {string[]} approvedNewPlayerIds - tempIds of new players to add
 * @param {string[]} approvedUpdatePlayerIds - tempIds of existing players to update
 * @returns {Promise<{ importedCount: number, updatedCount: number }>}
 */
async function approveVideoResults(uploadId, dynastyId, approvedNewPlayerIds, approvedUpdatePlayerIds) {
  // Fetch pending data
  const pendingResult = await db.query(
    `SELECT * FROM video_ocr_pending
     WHERE upload_id = $1 AND dynasty_id = $2 AND status = 'pending_review'`,
    [uploadId, dynastyId]
  );

  if (pendingResult.rows.length === 0) {
    throw new Error('No pending video OCR results found for this upload');
  }

  const pendingData = pendingResult.rows[0].pending_data;
  const pendingId = pendingResult.rows[0].id;

  let importedCount = 0;
  let updatedCount = 0;

  // Insert approved new players
  const approvedNew = (pendingData.newPlayers || []).filter(
    p => approvedNewPlayerIds.includes(p.tempId)
  );

  for (const player of approvedNew) {
    await db.query(
      `INSERT INTO players (dynasty_id, first_name, last_name, position, jersey_number, overall_rating, attributes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [dynastyId, player.first_name, player.last_name, player.position,
       player.jersey_number, player.overall_rating, JSON.stringify(player.attributes)]
    );
    importedCount++;
  }

  // Apply approved updates
  const approvedUpdates = (pendingData.updatedPlayers || []).filter(
    p => approvedUpdatePlayerIds.includes(p.tempId)
  );

  for (const player of approvedUpdates) {
    // Fetch current existing player to merge attributes
    const existingResult = await db.query(
      'SELECT attributes FROM players WHERE id = $1 AND dynasty_id = $2',
      [player.existingId, dynastyId]
    );

    if (existingResult.rows.length === 0) continue;

    const existingAttrs = existingResult.rows[0].attributes || {};
    const mergedAttrs = { ...existingAttrs, ...(player.attributes || {}) };

    await db.query(
      `UPDATE players
       SET jersey_number = $1,
           overall_rating = $2,
           attributes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND dynasty_id = $5`,
      [
        player.jersey_number,
        player.overall_rating,
        JSON.stringify(mergedAttrs),
        player.existingId,
        dynastyId,
      ]
    );
    updatedCount++;
  }

  // Mark pending as approved
  await db.query(
    `UPDATE video_ocr_pending SET status = 'approved' WHERE id = $1`,
    [pendingId]
  );

  // Update upload record
  await db.query(
    'UPDATE ocr_uploads SET processing_status = $1, players_imported = $2 WHERE id = $3',
    ['completed', importedCount + updatedCount, uploadId]
  );

  console.log(`Video OCR approved: ${importedCount} new players, ${updatedCount} updates`);

  return { importedCount, updatedCount };
}

module.exports = {
  processVideoUpload,
  getVideoResults,
  approveVideoResults,
  compareWithRoster,
  computePlayerDiff,
};

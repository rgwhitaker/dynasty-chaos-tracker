const ocrService = require('../services/ocrService');
const statGroupOcrService = require('../services/statGroupOcrService');
const videoOcrService = require('../services/videoOcrService');
const db = require('../config/database');

const uploadScreenshot = async (req, res) => {
  try {
    if (!req.file && !req.files) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dynastyId } = req.params;
    const { ocrMethod } = req.body; // 'tesseract', 'textract', or 'google_vision'

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    // Handle both single and batch uploads
    const files = req.files || [req.file];
    const filePaths = files.map(f => f.path);

    // Create OCR upload record
    const uploadResult = await db.query(
      'INSERT INTO ocr_uploads (user_id, dynasty_id, file_paths, processing_status, ocr_method) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, dynastyId, filePaths, 'processing', ocrMethod || 'tesseract']
    );

    const uploadRecord = uploadResult.rows[0];

    // Process OCR in background
    if (filePaths.length === 1) {
      ocrService.processRosterScreenshot(filePaths[0], dynastyId, uploadRecord.id, ocrMethod)
        .then(result => {
          console.log('OCR processing completed:', result);
        })
        .catch(err => {
          console.error('OCR processing error:', err);
          console.error('Error stack:', err.stack);
        });
    } else {
      ocrService.processBatchUpload(filePaths, dynastyId, uploadRecord.id, ocrMethod)
        .then(results => {
          console.log('Batch OCR processing completed:', results);
        })
        .catch(err => {
          console.error('Batch OCR processing error:', err);
          console.error('Error stack:', err.stack);
        });
    }

    res.json({ 
      message: 'Screenshot(s) uploaded successfully',
      uploadId: uploadRecord.id,
      status: 'processing',
      filesCount: filePaths.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
};

const getUploadStatus = async (req, res) => {
  try {
    const { uploadId } = req.params;

    const result = await db.query(
      'SELECT * FROM ocr_uploads WHERE id = $1 AND user_id = $2',
      [uploadId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get upload status error:', error);
    res.status(500).json({ error: 'Failed to get upload status' });
  }
};

const uploadStatGroupScreenshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dynastyId, playerId } = req.params;
    const { position, archetype } = req.body;

    if (!position) {
      return res.status(400).json({ error: 'Player position is required' });
    }

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    // Verify player exists in this dynasty
    const playerCheck = await db.query(
      'SELECT * FROM players WHERE id = $1 AND dynasty_id = $2',
      [playerId, dynastyId]
    );

    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Process stat group screenshot
    const statCaps = await statGroupOcrService.parseStatGroupScreenshot(
      req.file.path,
      position,
      archetype || undefined
    );

    res.json({
      message: 'Stat group screenshot processed successfully',
      stat_caps: statCaps,
    });
  } catch (error) {
    console.error('Stat group OCR error:', error);
    res.status(500).json({ error: 'Failed to process stat group screenshot' });
  }
};

const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { dynastyId } = req.params;
    const { ocrMethod } = req.body;

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    // Create OCR upload record with video type
    const uploadResult = await db.query(
      'INSERT INTO ocr_uploads (user_id, dynasty_id, file_paths, processing_status, ocr_method, upload_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, dynastyId, [req.file.path], 'processing', ocrMethod || 'tesseract', 'video']
    );

    const uploadRecord = uploadResult.rows[0];

    // Process video in background
    videoOcrService.processVideoUpload(req.file.path, dynastyId, uploadRecord.id, ocrMethod)
      .then(result => {
        console.log('Video OCR processing completed:', result);
      })
      .catch(err => {
        console.error('Video OCR processing error:', err);
        console.error('Error stack:', err.stack);
      });

    res.json({
      message: 'Video uploaded successfully. Processing has started.',
      uploadId: uploadRecord.id,
      status: 'processing',
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
};

const getVideoResults = async (req, res) => {
  try {
    const { dynastyId, uploadId } = req.params;

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    // Check upload status first
    const uploadStatus = await db.query(
      'SELECT processing_status, total_frames, frames_analyzed, upload_type FROM ocr_uploads WHERE id = $1 AND user_id = $2',
      [uploadId, req.user.id]
    );

    if (uploadStatus.rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const upload = uploadStatus.rows[0];

    // If still processing, return status with progress
    if (upload.processing_status === 'processing') {
      return res.json({
        status: 'processing',
        totalFrames: upload.total_frames,
        framesAnalyzed: upload.frames_analyzed,
      });
    }

    // If failed, return the failure info
    if (upload.processing_status === 'failed') {
      const fullUpload = await db.query(
        'SELECT * FROM ocr_uploads WHERE id = $1',
        [uploadId]
      );
      return res.json({
        status: 'failed',
        errors: fullUpload.rows[0]?.validation_errors || [],
      });
    }

    // Get pending results
    const results = await videoOcrService.getVideoResults(uploadId, dynastyId);

    if (!results) {
      return res.status(404).json({ error: 'No pending results found. They may have expired or already been approved.' });
    }

    res.json({
      status: 'pending_review',
      ...results.pendingData,
      expiresAt: results.expiresAt,
    });
  } catch (error) {
    console.error('Get video results error:', error);
    res.status(500).json({ error: 'Failed to get video results' });
  }
};

const getVideoUploads = async (req, res) => {
  try {
    const { dynastyId } = req.params;

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    // Get all video uploads for this dynasty that are processing or pending review
    const result = await db.query(
      `SELECT id, processing_status, total_frames, frames_analyzed, upload_type, created_at
       FROM ocr_uploads
       WHERE user_id = $1 AND dynasty_id = $2 AND upload_type = 'video'
         AND processing_status IN ('processing', 'pending_review', 'failed')
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.user.id, dynastyId]
    );

    res.json({ uploads: result.rows });
  } catch (error) {
    console.error('Get video uploads error:', error);
    res.status(500).json({ error: 'Failed to get video uploads' });
  }
};

const approveVideoResults = async (req, res) => {
  try {
    const { dynastyId, uploadId } = req.params;
    const { approvedNewPlayerIds = [], approvedUpdatePlayerIds = [] } = req.body;

    // Verify dynasty belongs to user
    const dynastyCheck = await db.query(
      'SELECT * FROM dynasties WHERE id = $1 AND user_id = $2',
      [dynastyId, req.user.id]
    );

    if (dynastyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dynasty not found' });
    }

    // Verify upload belongs to user
    const uploadCheck = await db.query(
      'SELECT * FROM ocr_uploads WHERE id = $1 AND user_id = $2',
      [uploadId, req.user.id]
    );

    if (uploadCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const result = await videoOcrService.approveVideoResults(
      parseInt(uploadId),
      parseInt(dynastyId),
      approvedNewPlayerIds,
      approvedUpdatePlayerIds
    );

    res.json({
      message: `Successfully saved ${result.importedCount} new player(s) and ${result.updatedCount} update(s).`,
      ...result,
    });
  } catch (error) {
    console.error('Approve video results error:', error);
    res.status(500).json({ error: error.message || 'Failed to approve video results' });
  }
};

module.exports = {
  uploadScreenshot,
  getUploadStatus,
  uploadStatGroupScreenshot,
  uploadVideo,
  getVideoResults,
  getVideoUploads,
  approveVideoResults,
};

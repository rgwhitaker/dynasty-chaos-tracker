const ocrService = require('../services/ocrService');
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

module.exports = {
  uploadScreenshot,
  getUploadStatus,
};

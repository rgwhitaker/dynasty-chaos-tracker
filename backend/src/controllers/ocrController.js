const ocrService = require('../services/ocrService');
const db = require('../config/database');

const uploadScreenshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { teamId } = req.params;
    const { ocrMethod } = req.body; // 'tesseract' or 'textract'

    // Verify team belongs to user
    const teamCheck = await db.query(
      'SELECT * FROM teams WHERE id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Create OCR upload record
    const uploadResult = await db.query(
      'INSERT INTO ocr_uploads (user_id, team_id, file_name, processing_status, ocr_method) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, teamId, req.file.filename, 'processing', ocrMethod || 'tesseract']
    );

    const uploadRecord = uploadResult.rows[0];

    // Process OCR in background
    ocrService.processRosterScreenshot(req.file.path, teamId, uploadRecord.id, ocrMethod)
      .catch(err => console.error('OCR processing error:', err));

    res.json({ 
      message: 'Screenshot uploaded successfully',
      uploadId: uploadRecord.id,
      status: 'processing' 
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

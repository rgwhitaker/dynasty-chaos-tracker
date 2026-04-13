-- Add upload_type column to ocr_uploads to distinguish video from screenshot uploads
ALTER TABLE ocr_uploads
ADD COLUMN IF NOT EXISTS upload_type VARCHAR(20) DEFAULT 'screenshot';

-- Add video processing progress columns
ALTER TABLE ocr_uploads
ADD COLUMN IF NOT EXISTS total_frames INTEGER,
ADD COLUMN IF NOT EXISTS frames_analyzed INTEGER DEFAULT 0;

-- Create video_ocr_pending table for storing pending review results
CREATE TABLE IF NOT EXISTS video_ocr_pending (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER REFERENCES ocr_uploads(id) ON DELETE CASCADE,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    pending_data JSONB NOT NULL, -- { newPlayers: [...], updatedPlayers: [...with diffs...], unchangedCount }
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review', -- pending_review, approved, expired
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_video_ocr_pending_upload_id ON video_ocr_pending(upload_id);
CREATE INDEX IF NOT EXISTS idx_video_ocr_pending_dynasty_id ON video_ocr_pending(dynasty_id);
CREATE INDEX IF NOT EXISTS idx_video_ocr_pending_status ON video_ocr_pending(status);

const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const ocrController = require('../controllers/ocrController');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG) are allowed'));
    }
  }
});

// Configure multer for video uploads
const videoUpload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit for video
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|quicktime|webm|x-msvideo|mov|avi/;
    const allowedExts = /\.mp4$|\.mov$|\.webm$|\.avi$/i;
    const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files (MP4, MOV, WebM, AVI) are allowed'));
    }
  }
});

// Screenshot routes
router.post('/upload', authMiddleware, upload.single('screenshot'), ocrController.uploadScreenshot);
router.post('/upload-batch', authMiddleware, upload.array('screenshots', 10), ocrController.uploadScreenshot);
router.post('/stat-groups/:playerId', authMiddleware, upload.single('screenshot'), ocrController.uploadStatGroupScreenshot);
router.get('/status/:uploadId', authMiddleware, ocrController.getUploadStatus);

// Rate limit for video upload (expensive operation)
const videoUploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 5, // max 5 video uploads per 5 minutes
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many video uploads. Please wait a few minutes before trying again.' },
});

// Rate limit for video upload status polling
const videoStatusRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // max 60 requests per minute (polling every 3-5 seconds)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
});

// Video upload routes
router.post('/upload-video', videoUploadRateLimit, authMiddleware, videoUpload.single('video'), ocrController.uploadVideo);
router.get('/video-results/:uploadId', videoStatusRateLimit, authMiddleware, ocrController.getVideoResults);
router.post('/video-approve/:uploadId', authMiddleware, ocrController.approveVideoResults);
router.get('/video-uploads', videoStatusRateLimit, authMiddleware, ocrController.getVideoUploads);

module.exports = router;

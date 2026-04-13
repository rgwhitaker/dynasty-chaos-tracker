const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
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

// Video upload routes
router.post('/upload-video', authMiddleware, videoUpload.single('video'), ocrController.uploadVideo);
router.get('/video-results/:uploadId', authMiddleware, ocrController.getVideoResults);
router.post('/video-approve/:uploadId', authMiddleware, ocrController.approveVideoResults);

module.exports = router;

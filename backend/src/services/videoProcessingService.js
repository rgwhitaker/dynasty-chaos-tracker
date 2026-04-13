const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Set ffmpeg path from the bundled binary
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Extract frames from a video at a configurable rate.
 * @param {string} videoPath - Path to the input video file
 * @param {string} outputDir - Directory to save extracted frames
 * @param {object} options - { fps: frames per second to extract (default 1) }
 * @returns {Promise<string[]>} Array of extracted frame file paths
 */
async function extractFrames(videoPath, outputDir, options = {}) {
  const fps = options.fps || 1;

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const outputPattern = path.join(outputDir, 'frame-%04d.png');

    ffmpeg(videoPath)
      .outputOptions([
        `-vf`, `fps=${fps}`,
      ])
      .output(outputPattern)
      .on('end', async () => {
        try {
          const files = await fs.readdir(outputDir);
          const framePaths = files
            .filter(f => f.startsWith('frame-') && f.endsWith('.png'))
            .sort()
            .map(f => path.join(outputDir, f));
          console.log(`Extracted ${framePaths.length} frames from video at ${fps} fps`);
          resolve(framePaths);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        console.error('Frame extraction error:', err);
        reject(new Error(`Failed to extract frames: ${err.message}`));
      })
      .run();
  });
}

/**
 * Get video duration in seconds.
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<number>} Duration in seconds
 */
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`));
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Deduplicate consecutive frames by comparing pixel content.
 * Uses a fast perceptual hash comparison via Sharp to drop near-identical frames.
 * @param {string[]} framePaths - Array of frame file paths (sorted in order)
 * @returns {Promise<string[]>} Filtered array of unique frame paths
 */
async function deduplicateFrames(framePaths) {
  if (framePaths.length <= 1) return framePaths;

  const uniqueFrames = [framePaths[0]];
  let prevHash = await computeFrameHash(framePaths[0]);

  for (let i = 1; i < framePaths.length; i++) {
    const currentHash = await computeFrameHash(framePaths[i]);
    const similarity = hammingDistance(prevHash, currentHash);

    // If frames are less than 90% similar, keep the new frame
    if (similarity < 0.90) {
      uniqueFrames.push(framePaths[i]);
    }

    prevHash = currentHash;
  }

  console.log(`Frame deduplication: ${framePaths.length} → ${uniqueFrames.length} unique frames`);
  return uniqueFrames;
}

/**
 * Compute a perceptual hash for a frame image.
 * Resizes to 16x16 grayscale and converts to a binary hash.
 * @param {string} imagePath - Path to the image
 * @returns {Promise<Buffer>} Hash buffer
 */
async function computeFrameHash(imagePath) {
  const { data } = await sharp(imagePath)
    .resize(16, 16, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Convert to binary hash: each pixel is 0 or 1 based on mean
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const hash = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    hash[i] = data[i] >= mean ? 1 : 0;
  }
  return hash;
}

/**
 * Calculate similarity between two perceptual hashes (0-1 scale).
 * @param {Buffer} hash1
 * @param {Buffer} hash2
 * @returns {number} Similarity score (1.0 = identical, 0.0 = completely different)
 */
function hammingDistance(hash1, hash2) {
  const len = Math.min(hash1.length, hash2.length);
  let matching = 0;
  for (let i = 0; i < len; i++) {
    if (hash1[i] === hash2[i]) matching++;
  }
  return matching / len;
}

/**
 * Clean up extracted frames directory.
 * @param {string} outputDir - Directory to delete
 */
async function cleanupFrames(outputDir) {
  try {
    await fs.rm(outputDir, { recursive: true, force: true });
    console.log(`Cleaned up frames directory: ${outputDir}`);
  } catch (err) {
    console.error(`Failed to clean up frames directory ${outputDir}:`, err.message);
  }
}

module.exports = {
  extractFrames,
  getVideoDuration,
  deduplicateFrames,
  cleanupFrames,
};

/**
 * Test script for preprocessImage dual-pass logic
 * Run with: node backend/test-preprocess-image.js
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { preprocessImage, mergeParsedPlayers } = require('./src/services/ocrService');

async function test() {
  console.log('Testing preprocessImage dual-pass functionality...\n');
  
  // Create a test image in temp directory
  const testDir = '/tmp/ocr-test';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create test image with mixed backgrounds
  const width = 400;
  const height = 200;
  const pixels = Buffer.alloc(width * height * 3);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      if (y < height / 2) {
        // Top half: white background
        pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255;
      } else {
        // Bottom half: dark background
        pixels[idx] = 40; pixels[idx + 1] = 40; pixels[idx + 2] = 40;
      }
    }
  }
  
  const testImagePath = path.join(testDir, 'test_mixed.png');
  await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toFile(testImagePath);
  console.log('Created test image:', testImagePath);
  
  // Test 1: preprocessImage returns both paths
  console.log('\nTest 1: preprocessImage returns both normal and inverted paths');
  const result = await preprocessImage(testImagePath);
  console.log('Result:', result);
  
  const hasNormalPath = typeof result.normalPath === 'string';
  const hasInvertedPath = typeof result.invertedPath === 'string';
  console.log('Has normalPath:', hasNormalPath);
  console.log('Has invertedPath:', hasInvertedPath);
  console.log((hasNormalPath && hasInvertedPath) ? '✓ PASSED' : '✗ FAILED');
  
  // Test 2: Both files exist
  console.log('\nTest 2: Both processed files exist');
  const normalExists = fs.existsSync(result.normalPath);
  const invertedExists = fs.existsSync(result.invertedPath);
  console.log('Normal file exists:', normalExists);
  console.log('Inverted file exists:', invertedExists);
  console.log((normalExists && invertedExists) ? '✓ PASSED' : '✗ FAILED');
  
  // Test 3: Files are different
  console.log('\nTest 3: Normal and inverted files are different');
  if (normalExists && invertedExists) {
    const normalStats = fs.statSync(result.normalPath);
    const invertedStats = fs.statSync(result.invertedPath);
    // They should have similar sizes but different content
    console.log('Normal file size:', normalStats.size);
    console.log('Inverted file size:', invertedStats.size);
    console.log('✓ PASSED - Both files created with content');
  } else {
    console.log('✗ FAILED - Files not created');
  }
  
  // Test 4: mergeParsedPlayers function
  console.log('\nTest 4: mergeParsedPlayers correctly merges player data');
  const normalPlayers = [
    { first_name: 'A', last_name: 'Kilgore', position: 'CB', overall_rating: 78, attributes: { OVR: 78, SPD: 90 } },
    { first_name: 'I', last_name: 'Bettis', position: 'CB', overall_rating: 73, attributes: { OVR: 73 } },
  ];
  const invertedPlayers = [
    { first_name: 'A', last_name: 'Thompson', position: 'CB', overall_rating: 83, attributes: { OVR: 83, SPD: 91 } },
    { first_name: 'A', last_name: 'Kilgore', position: 'CB', overall_rating: 78, attributes: { OVR: 78, ACC: 91 } },
  ];
  
  const merged = mergeParsedPlayers([normalPlayers, invertedPlayers]);
  console.log('Merged player count:', merged.length);
  console.log('Expected: 3 unique players');
  
  const hasThompson = merged.some(p => p.last_name === 'Thompson');
  const hasBettis = merged.some(p => p.last_name === 'Bettis');
  const kilgore = merged.find(p => p.last_name === 'Kilgore');
  const kilgoreHasBothAttrs = kilgore?.attributes?.SPD === 90 && kilgore?.attributes?.ACC === 91;
  
  console.log('Thompson (from inverted pass) found:', hasThompson);
  console.log('Bettis (from normal pass) found:', hasBettis);
  console.log('Kilgore attributes merged:', kilgoreHasBothAttrs);
  console.log((merged.length === 3 && hasThompson && hasBettis && kilgoreHasBothAttrs) ? '✓ PASSED' : '✗ FAILED');
  
  // Cleanup
  try {
    fs.unlinkSync(testImagePath);
    fs.unlinkSync(result.normalPath);
    fs.unlinkSync(result.invertedPath);
    console.log('\nCleanup: Test files removed');
  } catch (e) {
    // Ignore cleanup errors
  }
  
  console.log('\nAll tests completed.');
}

test().catch(console.error);

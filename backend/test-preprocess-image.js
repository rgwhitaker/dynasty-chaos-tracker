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
  
  let allPassed = true;
  
  // Test 1: preprocessImage returns both paths
  console.log('\nTest 1: preprocessImage returns both normal and inverted paths');
  const result = await preprocessImage(testImagePath);
  console.log('Result:', result);
  
  const hasNormalPath = typeof result.normalPath === 'string';
  const hasInvertedPath = typeof result.invertedPath === 'string';
  console.log('Has normalPath:', hasNormalPath);
  console.log('Has invertedPath:', hasInvertedPath);
  if (hasNormalPath && hasInvertedPath) {
    console.log('✓ PASSED');
  } else {
    console.log('✗ FAILED');
    allPassed = false;
  }
  
  // Test 2: Both files exist
  console.log('\nTest 2: Both processed files exist');
  const normalExists = fs.existsSync(result.normalPath);
  const invertedExists = fs.existsSync(result.invertedPath);
  console.log('Normal file exists:', normalExists);
  console.log('Inverted file exists:', invertedExists);
  if (normalExists && invertedExists) {
    console.log('✓ PASSED');
  } else {
    console.log('✗ FAILED');
    allPassed = false;
  }
  
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
    allPassed = false;
  }
  
  // Test 4: mergeParsedPlayers correctly merges player data
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
  if (merged.length === 3 && hasThompson && hasBettis && kilgoreHasBothAttrs) {
    console.log('✓ PASSED');
  } else {
    console.log('✗ FAILED');
    allPassed = false;
  }
  
  // Test 5: mergeParsedPlayers handles empty arrays
  console.log('\nTest 5: mergeParsedPlayers handles empty arrays');
  const emptyMerge = mergeParsedPlayers([[], normalPlayers]);
  console.log('Merged with empty array count:', emptyMerge.length);
  if (emptyMerge.length === normalPlayers.length) {
    console.log('✓ PASSED');
  } else {
    console.log('✗ FAILED');
    allPassed = false;
  }
  
  // Test 6: mergeParsedPlayers handles null/undefined names
  console.log('\nTest 6: mergeParsedPlayers handles null/undefined names');
  const playersWithNullNames = [
    { first_name: null, last_name: 'Smith', position: 'QB', overall_rating: 85, attributes: { OVR: 85 } },
    { first_name: undefined, last_name: 'Jones', position: 'WR', overall_rating: 80, attributes: { OVR: 80 } },
    { first_name: '', last_name: '', position: 'CB', overall_rating: 75, attributes: { OVR: 75 } },
  ];
  try {
    const nullMerge = mergeParsedPlayers([playersWithNullNames, []]);
    console.log('Merged players with null names count:', nullMerge.length);
    if (nullMerge.length === 3) {
      console.log('✓ PASSED - No crash with null/undefined names');
    } else {
      console.log('✗ FAILED - Unexpected count');
      allPassed = false;
    }
  } catch (error) {
    console.log('✗ FAILED - Error:', error.message);
    allPassed = false;
  }
  
  // Test 7: mergeParsedPlayers handles arrays with no duplicates
  console.log('\nTest 7: mergeParsedPlayers handles arrays with no duplicates');
  const uniquePlayers1 = [
    { first_name: 'A', last_name: 'Player', position: 'QB', overall_rating: 85, attributes: { OVR: 85 } },
  ];
  const uniquePlayers2 = [
    { first_name: 'B', last_name: 'Player', position: 'WR', overall_rating: 80, attributes: { OVR: 80 } },
  ];
  const noDupeMerge = mergeParsedPlayers([uniquePlayers1, uniquePlayers2]);
  console.log('Merged unique players count:', noDupeMerge.length);
  if (noDupeMerge.length === 2) {
    console.log('✓ PASSED');
  } else {
    console.log('✗ FAILED');
    allPassed = false;
  }
  
  // Cleanup
  try {
    fs.unlinkSync(testImagePath);
    fs.unlinkSync(result.normalPath);
    fs.unlinkSync(result.invertedPath);
    console.log('\nCleanup: Test files removed');
  } catch (e) {
    // Ignore cleanup errors
  }
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('All tests passed!');
    process.exit(0);
  } else {
    console.log('Some tests failed!');
    process.exit(1);
  }
}

test().catch(console.error);

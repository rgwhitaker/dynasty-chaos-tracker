## OCR Accuracy Issues with Roster Screenshot Uploads

When uploading in-game roster screenshots for OCR import, there are several accuracy issues:

1. **Position Misclassification:**
   - The OCR incorrectly reads "DT" (Defensive Tackle) as "OT" (Offensive Tackle) for some player positions.
2. **Highlighted Row Misses:**
   - The processing does not read the first player row if it is highlighted, resulting in missed player data.
3. **Suffix Parsing Failures:**
   - Player names with suffixes such as "Jr." or "II" do not get processed correctly, causing inaccurate name parsing or missing players.

### Proposed Improvements

- **AI-Based Processing:**
  - Current processing relies heavily on regex and basic text extraction, which fails with special cases (e.g., highlights, suffixes, subtle differences between characters).
  - Move towards using AI-powered OCR and post-processing, such as machine learning models, to improve accuracy for position detection, highlighted row handling, and player name parsing. This would help resolve these edge cases and create a more robust import pipeline.

### Steps to Reproduce
1. Upload a roster screenshot with highlighted rows and players with suffixes (e.g., "Jr.", "II", etc.).
2. Observe the OCR output and note position misclassifications and missed names.

### Relevant Code

- Main OCR text parsing function:  
  [parseRosterData() in backend/src/services/ocrService.js](https://github.com/rgwhitaker/dynasty-chaos-tracker/blob/7e4ab62cd0f3a2030c0d25b32f134a4fcdf09d9e/backend/src/services/ocrService.js#L283-L302)
- Player detail screen parsing logic:  
  [parsePlayerDetailScreen() in backend/src/services/ocrService.js](https://github.com/rgwhitaker/dynasty-chaos-tracker/blob/7e4ab62cd0f3a2030c0d25b32f134a4fcdf09d9e/backend/src/services/ocrService.js#L168-L190)
- Header detection and attribute extraction:  
  [parseRosterData() header detection and attribute parsing](https://github.com/rgwhitaker/dynasty-chaos-tracker/blob/7e4ab62cd0f3a2030c0d25b32f134a4fcdf09d9e/backend/src/services/ocrService.js#L401-L420)
- Fallback parsing and handling for 0 players detected:  
  [processRosterScreenshot() and zero players handling](https://github.com/rgwhitaker/dynasty-chaos-tracker/blob/7e4ab62cd0f3a2030c0d25b32f134a4fcdf09d9e/backend/src/services/ocrService.js#L564-L579)
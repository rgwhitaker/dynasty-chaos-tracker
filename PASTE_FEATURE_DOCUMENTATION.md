# Paste Functionality for Stat Group Screenshots

## Overview
Users can now paste stat group screenshots directly into the edit and add player screens using keyboard shortcuts (Ctrl+V on Windows/Linux or Cmd+V on Mac).

## Feature Location
This feature is available in three places:
1. **Edit Player Dialog** (RosterManagement page)
2. **Add Player Dialog** (RosterDepthChart page)
3. **Manual Add Form** (RosterManagement page)

## How to Use

### Step 1: Open Player Form
Navigate to one of the player management screens and open the edit or add player dialog.

### Step 2: Select Position
Select a player position to enable the stat caps section.

### Step 3: Save Player (for Edit)
If editing an existing player, the player must be saved first before the paste functionality becomes available.

### Step 4: Take Screenshot
In your game, navigate to the stat group screen you want to capture and take a screenshot using your operating system's screenshot tool.

### Step 5: Paste the Screenshot
With the player form open and the stat caps section visible:
- **Windows/Linux**: Press `Ctrl+V`
- **Mac**: Press `Cmd+V`

### Step 6: Wait for Processing
The system will:
1. Display "Image pasted! Processing..." message
2. Send the image to the OCR service
3. Extract stat group data
4. Update the stat caps automatically
5. Display success or error message

## Visual Feedback

### Before Pasting
- Upload button is available
- Helpful tip message: "💡 Tip: You can paste screenshots directly using Ctrl+V (Cmd+V on Mac) or click the button below to select a file."

### During Processing
- Blue info alert: "Image pasted! Processing..."
- Upload button shows "Processing..." with spinner

### After Success
- Green success alert: "Stat groups updated from screenshot"
- Stat cap blocks are automatically updated based on OCR results
- Message auto-dismisses after 5 seconds

### On Error
- Red error alert with specific error message
- User can retry by pasting again or using the upload button

## Technical Details

### Supported Image Formats
The paste functionality accepts images in the following formats:
- PNG
- JPEG
- JPG

### OCR Processing
The pasted image is processed through the same OCR pipeline as file uploads:
1. Image is converted to a File object
2. Sent to backend OCR service
3. Processed using Tesseract, AWS Textract, Google Vision, or OpenAI GPT-4o-mini
4. Results are merged with existing stat caps (OCR values take precedence)

### Browser Compatibility
The paste functionality uses the Clipboard API, which is supported in:
- Chrome 76+
- Firefox 63+
- Safari 13.1+
- Edge 79+

## Benefits

1. **Faster Data Entry**: No need to save screenshots as files first
2. **Streamlined Workflow**: Copy screenshot → paste directly in app
3. **Fewer Steps**: Eliminates file upload dialog navigation
4. **Same Reliability**: Uses identical OCR processing as file uploads
5. **User-Friendly**: Familiar keyboard shortcut (Ctrl+V / Cmd+V)

## Example Workflow

1. Open game and navigate to a player's stat group screen
2. Press `Windows Key + Shift + S` (or equivalent) to take a screenshot
3. Open Dynasty Chaos Tracker
4. Click "Edit" on a player
5. Scroll to the Stat Caps section
6. Press `Ctrl+V` to paste the screenshot
7. Wait for "Stat groups updated from screenshot" confirmation
8. Verify the stat caps are correct
9. Save the player

## Notes

- The paste listener is attached to the entire document, so you can paste from anywhere on the page when the dialog is open
- Only one image is processed per paste action
- If multiple images are in the clipboard, the first one is used
- Text and other clipboard content is ignored
- The paste action is prevented from its default behavior to avoid pasting the image as visible content on the page

# Player Edit and Delete Feature

## Overview
This feature adds the ability to edit and delete existing players in the Dynasty Chaos Tracker application.

## User Interface Changes

### Player Cards
Each player card in the roster now displays two action buttons:
- **Edit** button (with edit icon) - Opens the Edit Player dialog
- **Delete** button (with delete icon, in red) - Opens the Delete Confirmation dialog

### Edit Player Dialog
When clicking the "Edit" button on a player card:
1. A modal dialog opens with the title "Edit Player"
2. The form is pre-populated with all current player data
3. Fields available for editing:
   - First Name (required)
   - Last Name (required)
   - Position (required dropdown)
   - Jersey Number (0-99)
   - Year (dropdown: FR, SO, JR, SR, RS-FR, RS-SO, RS-JR, RS-SR)
   - Overall Rating (40-99)
   - Height (e.g., 6'2")
   - Weight (150-400 lbs)
   - Dev Trait (dropdown: Normal, Impact, Star, Elite)
   - All 55 player attributes organized by category in collapsible accordions:
     - Physical Attributes
     - Awareness
     - Ball Carrier
     - Receiving
     - Passing
     - Blocking
     - Defense
     - Coverage
     - Special Teams

4. Dialog Actions:
   - **Cancel** button - Closes dialog without saving
   - **Save Changes** button - Saves the updates and closes the dialog

### Delete Confirmation Dialog
When clicking the "Delete" button on a player card:
1. A confirmation dialog appears with the title "Confirm Delete"
2. Shows a message: "Are you sure you want to delete [Player Name]?"
3. Warning: "This action cannot be undone."
4. Dialog Actions:
   - **Cancel** button - Closes dialog without deleting
   - **Delete** button (red, with delete icon) - Permanently deletes the player

## Technical Implementation

### Backend API (Already Existed)
- `PUT /api/dynasties/:dynastyId/players/:playerId` - Update player
- `DELETE /api/dynasties/:dynastyId/players/:playerId` - Delete player

### Frontend Changes

#### Redux Store (`frontend/src/store/slices/playerSlice.js`)
Added two new async thunks:
```javascript
export const updatePlayer = createAsyncThunk('player/update', ...)
export const deletePlayer = createAsyncThunk('player/delete', ...)
```

With corresponding reducers to:
- Update the player in the state array when edit is successful
- Remove the player from the state array when delete is successful
- Handle loading and error states

#### UI Component (`frontend/src/pages/RosterManagement.js`)
Added:
- Edit and Delete buttons to player cards
- Edit Player Dialog with full form
- Delete Confirmation Dialog
- State management for both operations
- Error handling and loading states
- Integration with Redux actions

## User Workflow

### Editing a Player
1. Navigate to Roster Management page
2. Find the player card you want to edit
3. Click the "Edit" button
4. Modify any fields you want to change
5. Click "Save Changes"
6. The player card updates immediately with new data

### Deleting a Player
1. Navigate to Roster Management page
2. Find the player card you want to delete
3. Click the "Delete" button (red)
4. Confirm deletion in the dialog
5. Click "Delete" in the confirmation dialog
6. The player card is immediately removed from the roster

## Error Handling
- API errors are displayed in the Edit dialog if update fails
- Delete errors are shown in an alert if deletion fails
- Loading states prevent duplicate submissions
- Proper error message extraction from API responses

## Security
- All operations require authentication (via authMiddleware)
- Dynasty ownership is verified on the backend
- Player can only be edited/deleted if belongs to user's dynasty
- No security vulnerabilities detected by CodeQL

## Future Enhancements (Optional)
- Success toast notifications instead of alerts
- Undo functionality for deletions
- Bulk edit/delete operations
- Edit history/audit log

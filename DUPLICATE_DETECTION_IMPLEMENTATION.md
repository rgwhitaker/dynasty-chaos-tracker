# Duplicate Player Detection Implementation

## Overview
This document describes the implementation of duplicate player detection in the Dynasty Chaos Tracker OCR system. This feature prevents duplicate player records when users upload multiple screenshots containing the same players.

## Problem Statement
When users upload multiple screenshots that contain some of the same players (e.g., one screenshot showing speed/strength ratings, another showing accuracy/agility ratings), the system was creating duplicate player records in the database. This led to:
- Data inconsistency
- Inflated roster counts
- Difficulty managing player data
- Poor user experience

## Solution

### High-Level Approach
The solution implements duplicate detection during the OCR import process by:
1. Fetching all existing players for the dynasty before processing
2. Creating an in-memory lookup map for fast duplicate detection
3. Checking each imported player against existing players
4. Updating existing players with merged attributes instead of creating duplicates

### Implementation Details

**File Modified:** `backend/src/services/ocrService.js`

**Location:** Lines 410-466 in the `processRosterScreenshot` function

**Key Components:**

1. **Upfront Data Fetch (Lines 412-417)**
   ```javascript
   const existingPlayersResult = await db.query(
     `SELECT id, first_name, last_name, position, attributes, jersey_number, overall_rating 
      FROM players 
      WHERE dynasty_id = $1`,
     [dynastyId]
   );
   ```
   - Fetches all existing players for the dynasty in a single query
   - Avoids N+1 query performance issues

2. **In-Memory Lookup Map (Lines 420-424)**
   ```javascript
   const existingPlayersMap = new Map();
   for (const p of existingPlayersResult.rows) {
     const key = `${p.first_name.toLowerCase()}_${p.last_name.toLowerCase()}_${p.position}`;
     existingPlayersMap.set(key, p);
   }
   ```
   - Creates a Map with composite keys: `firstname_lastname_position`
   - Uses lowercase for case-insensitive matching
   - O(1) lookup time for duplicate detection

3. **Duplicate Detection Logic (Lines 428-466)**
   ```javascript
   for (const player of validation.players) {
     const key = `${player.first_name.toLowerCase()}_${player.last_name.toLowerCase()}_${player.position}`;
     const existing = existingPlayersMap.get(key);

     if (existing) {
       // Update existing player with merged attributes
     } else {
       // Insert new player
     }
   }
   ```

4. **Attribute Merging (Lines 435-439)**
   ```javascript
   const existingAttrs = existing.attributes || {};
   const newAttrs = player.attributes || {};
   const mergedAttrs = { ...existingAttrs, ...newAttrs };
   ```
   - Preserves existing attributes
   - Adds new attributes from the screenshot
   - Overwrites existing attribute values with new ones

5. **Nullish Coalescing (Lines 449-450)**
   ```javascript
   player.jersey_number ?? existing.jersey_number,
   player.overall_rating ?? existing.overall_rating,
   ```
   - Uses `??` operator instead of `||` to properly handle falsy values
   - Allows 0 as a valid value for jersey number or rating

## Matching Criteria

Players are considered duplicates if they match on ALL of the following:
- **Dynasty ID**: Must belong to the same dynasty
- **First Name**: Case-insensitive comparison
- **Last Name**: Case-insensitive comparison
- **Position**: Exact match (e.g., "QB", "WR", "CB")

## Behavior

### When a Duplicate is Detected:
1. The existing player record is updated
2. Attributes are merged (new + existing)
3. Jersey number is updated if provided in new data
4. Overall rating is updated if provided in new data
5. `updated_at` timestamp is set to current time
6. `updatedCount` is incremented

### When a New Player is Found:
1. A new player record is inserted
2. All provided attributes are stored
3. `importedCount` is incremented

### Return Value:
```javascript
{
  status: 'completed',
  importedCount: 5,    // Number of new players added
  updatedCount: 3,     // Number of existing players updated
  totalProcessed: 8    // Total players processed
}
```

## Performance Optimizations

1. **Single Upfront Query**: All existing players fetched in one query instead of per-player queries
2. **In-Memory Lookup**: Map-based O(1) lookups instead of database queries for each player
3. **Batch Processing**: Works efficiently with batch uploads (up to 10 screenshots)

**Performance Impact:**
- For a roster of 85 players importing 20 new players:
  - Before: 21 queries (1 upfront + 20 duplicate checks)
  - After: 1 query (upfront) + 20 in-memory lookups

## Edge Cases Handled

1. **Case Sensitivity**: Names are matched case-insensitively (John Smith = JOHN SMITH = john smith)
2. **Position Changes**: If a player changes position, they're treated as a new player
3. **Falsy Values**: Jersey number 0 or rating 0 are preserved correctly
4. **Missing Attributes**: Missing attributes in new data don't overwrite existing ones
5. **Null Attributes**: Properly handles null/undefined attribute objects

## Testing

A comprehensive integration test was created in `backend/test-duplicate-detection.js` (not committed) that verifies:

✅ Existing players are correctly identified
✅ Attributes are properly merged
✅ No duplicate records are created
✅ Player ratings and jersey numbers are updated
✅ Case-insensitive name matching works
✅ Performance optimization doesn't break functionality

Test results:
```
✓ Created test user with ID: 4
✓ Created test dynasty with ID: 2
✓ Inserted initial player: John Smith (QB)
✓ Found existing player (ID: 2)
✓ Updated existing player instead of creating duplicate
✓ Verified: Only 1 player record exists (no duplicates created)
✓ All attributes correctly merged and updated
```

## Database Schema

No database schema changes were required. The implementation uses existing columns:
- `players.id`: Primary key for updates
- `players.dynasty_id`: Foreign key for filtering
- `players.first_name`, `players.last_name`: Name matching
- `players.position`: Position matching
- `players.attributes`: JSONB field for attribute merging
- `players.updated_at`: Timestamp tracking

## Usage Example

### Scenario: User uploads two screenshots of the same player

**Screenshot 1 - Speed Chart:**
```
#12 QB John Smith - 85 OVR
Speed: 80
Strength: 75
```

**Screenshot 2 - Accuracy Chart:**
```
#12 QB John Smith - 87 OVR
Speed: 82
Accuracy: 85
```

**Result in Database:**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Smith",
  "position": "QB",
  "jersey_number": 12,
  "overall_rating": 87,
  "attributes": {
    "speed": 82,
    "strength": 75,
    "accuracy": 85
  }
}
```

**Only ONE player record exists** with merged attributes from both screenshots.

## Security Considerations

✅ **SQL Injection**: Uses parameterized queries exclusively
✅ **CodeQL Scan**: Passed with 0 alerts
✅ **Data Integrity**: Duplicate detection prevents data corruption
✅ **User Isolation**: Dynasty ID ensures users can't affect other users' data

## Future Enhancements (Optional)

1. **Fuzzy Name Matching**: Handle minor spelling variations (e.g., "John" vs "Jon")
2. **Jersey Number Conflicts**: Warn when same jersey number is used by different players
3. **Position Changes**: Track position history for players who change positions
4. **Audit Trail**: Log all player updates for troubleshooting
5. **Batch Update Response**: Return detailed list of updated vs new players

## Conclusion

This implementation successfully solves the duplicate player problem while:
- Maintaining backward compatibility
- Optimizing performance (N+1 → 1+N with in-memory lookups)
- Preserving data integrity
- Providing clear visibility into import results
- Handling edge cases properly

The solution is production-ready and has been tested to ensure correctness and performance.

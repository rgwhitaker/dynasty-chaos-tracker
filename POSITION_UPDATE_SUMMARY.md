# Position System Update Summary

## Overview
Updated the Dynasty Chaos Tracker to use the correct College Football 26 in-game position names throughout the entire application.

## Changes Made

### 1. Roster Positions (21 total)
Changed from generic positions to exact in-game positions:

**Offense (10 positions)**
- ✅ Kept: QB, FB, WR, TE, LT, LG, C, RG, RT
- ❌ Changed: `RB` → `HB` (Halfback is the official CFB26 name)

**Defense (9 positions)**
- ✅ Kept: DT, CB, FS, SS
- ❌ Removed: Generic positions like `OL`, `OT`, `OG`, `DL`, `DE`, `LE`, `RE`, `LB`, `MLB`, `OLB`, `LOLB`, `ROLB`
- ✅ Added: `LEDG` (Left Edge), `REDG` (Right Edge), `SAM`, `MIKE`, `WILL` (linebacker positions)

**Special Teams (2 positions)**
- ✅ Kept: K, P

### 2. Depth Chart Positions (35 total)
Added support for all depth chart positions including:
- All 21 roster positions
- 14 special/situational positions: KR, PR, KOS, LS, 3DRB, PWHB, SLWR, RLE, RRE, RDT, SUBLB, SLCB, NT, GAD

### 3. Files Modified

#### Backend
1. **`backend/src/constants/playerAttributes.js`**
   - Added `ROSTER_POSITIONS` constant (21 positions)
   - Added `DEPTH_CHART_POSITIONS` constant (35 positions)
   - Made `POSITIONS` an alias for `ROSTER_POSITIONS` (backward compatibility)

2. **`backend/src/services/ocrService.js`**
   - Updated `validatePlayerData()` to use correct 21 roster positions
   - Updated regex patterns to support 4-letter positions (`{1,4}` instead of `{1,3}`)

3. **`backend/src/services/depthChartService.js`**
   - Updated `getDepthChartPositions()` with correct position names
   - Changed RB → HB, LE → LEDG, RE → REDG, LOLB/MLB/ROLB → SAM/MIKE/WILL
   - Added all special/situational depth chart positions

4. **`backend/src/services/exportService.js`**
   - Updated PDF export position groups to use correct positions

5. **`backend/test-ocr-parsing.js`**
   - Updated test cases to use HB instead of RB
   - Added tests for 4-letter positions (SAM, MIKE, WILL, LEDG, REDG)
   - All 11 tests pass

#### Frontend
6. **`frontend/src/constants/playerAttributes.js`**
   - Added `ROSTER_POSITIONS` constant
   - Added `DEPTH_CHART_POSITIONS` constant
   - Made `POSITIONS` an alias for backward compatibility

7. **`frontend/src/pages/RosterDepthChart.js`**
   - Updated `POSITION_GROUPS` to use correct positions
   - Changed position groupings to match in-game structure

#### Documentation
8. **`POSITION_SYSTEM.md`** (NEW)
   - Comprehensive documentation of the position system
   - Lists all roster and depth chart positions
   - Explains the difference between roster and depth chart positions
   - Provides migration notes for old position names

9. **`POSITION_UPDATE_SUMMARY.md`** (THIS FILE)
   - Summary of all changes made

## Testing

### Unit Tests
All OCR parsing tests pass (11/11):
```
✓ Pattern 1: Jersey Position Name Overall
✓ Pattern 2: Position Jersey Name Overall
✓ Pattern 3: Name Position Jersey Overall
✓ Mixed case names
✓ With noise and invalid lines
✓ Single name players
✓ Linebacker positions (SAM, MIKE, WILL)
✓ Defensive line positions (LEDG, REDG, DT)
✓ Edge case overall ratings
✓ Invalid overall ratings (validation)
✓ Empty or whitespace only input
```

### Constant Verification
Verified that constants are correctly loaded:
- **Roster Positions (21):** QB, HB, FB, WR, TE, LT, LG, C, RG, RT, LEDG, REDG, DT, SAM, MIKE, WILL, CB, FS, SS, K, P
- **Depth Chart Positions (35):** All roster positions + KR, PR, KOS, LS, 3DRB, PWHB, SLWR, RLE, RRE, RDT, SUBLB, SLCB, NT, GAD

## Breaking Changes

### Data Migration Required
If you have existing players in the database with old position names, they need to be updated:

```sql
-- Update RB to HB
UPDATE players SET position = 'HB' WHERE position = 'RB';

-- Update edge positions
UPDATE players SET position = 'LEDG' WHERE position = 'LE' OR position = 'DE' AND jersey_number < 50;
UPDATE players SET position = 'REDG' WHERE position = 'RE' OR position = 'DE' AND jersey_number >= 50;

-- Update linebacker positions (requires manual review based on team scheme)
-- UPDATE players SET position = 'SAM' WHERE position = 'LOLB' AND ...;
-- UPDATE players SET position = 'MIKE' WHERE position = 'MLB';
-- UPDATE players SET position = 'WILL' WHERE position = 'ROLB' AND ...;
```

**Note:** Linebacker position mapping requires knowledge of your team's defensive scheme:
- **SAM (Strong)** - Usually on the tight end side
- **MIKE (Middle)** - Middle linebacker, QB of the defense  
- **WILL (Weak)** - Weak side linebacker

### Validation Changes
The OCR import and player creation endpoints now only accept the 21 official roster positions. Attempts to use old position codes will fail validation with an error message.

## Backward Compatibility

The `POSITIONS` constant is maintained as an alias for `ROSTER_POSITIONS` to prevent breaking existing code that imports it. However, any code using deprecated position names will need to be updated.

## Next Steps

1. ✅ Update all position constants
2. ✅ Update OCR validation
3. ✅ Update depth chart service
4. ✅ Update export service
5. ✅ Update frontend position groups
6. ✅ Add comprehensive tests
7. ✅ Create documentation
8. ⏳ Migration script for existing data (if needed)
9. ⏳ Frontend UI updates to display new position names

## Impact

### User-Facing Changes
- Position labels will now show the correct in-game names (HB not RB, LEDG not LE, etc.)
- Depth charts will support all 35 positions from the game
- OCR import will correctly recognize all roster positions including 4-letter ones

### Developer Changes
- All code should use `ROSTER_POSITIONS` for player creation/validation
- Use `DEPTH_CHART_POSITIONS` for depth chart operations
- Update any hardcoded position references to use the new names

## Benefits

1. **Accuracy** - Matches the exact position names from College Football 26
2. **Completeness** - Supports all 35 depth chart positions, not just basic positions
3. **Clarity** - Clear distinction between roster and depth chart positions
4. **Extensibility** - Easy to add new positions if the game is updated
5. **Consistency** - Same position names throughout backend and frontend

## References

- Problem statement: Fixed in-game roster positions per user requirements
- Documentation: See `POSITION_SYSTEM.md` for full details
- Constants: `backend/src/constants/playerAttributes.js` and `frontend/src/constants/playerAttributes.js`

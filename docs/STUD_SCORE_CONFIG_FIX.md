# Stud Score Config Screen Fix

## Issue
The stud score configuration screen was not functional - users could not select attributes for calculating stud scores for each position and archetype.

## Root Cause
Position mapping mismatch between data storage and retrieval:

- **Storage**: Default weights were stored using position groups (QB, RB, OL, DL, LB, DB, K, P)
- **Retrieval**: Frontend queried using specific roster positions (HB, FB, LT, LG, CB, FS, etc.)
- **Result**: No weights found for most positions, leaving the UI empty

### Example
When a user selected "HB" (Halfback):
- Frontend requested weights for position "HB"
- Database only had weights for position "RB" (Running Back)
- Query returned empty array
- UI showed "No attributes configured"

## Solution

### 1. Backend Service Fix
**File**: `backend/src/services/studScoreService.js`

**Change**: Modified `getOrCreateDefaultPreset()` function to store weights for all specific roster positions.

**Before**:
```javascript
// Stored only position groups
for (const [position, weights] of Object.entries(DEFAULT_WEIGHTS)) {
  // position = 'RB', 'OL', 'DL', etc.
  for (const [attr, weight] of Object.entries(weights)) {
    // Insert weight for position group
  }
}
```

**After**:
```javascript
// Store weights for each specific roster position
for (const [rosterPosition, positionGroup] of Object.entries(POSITION_GROUP_MAP)) {
  // rosterPosition = 'HB', 'FB', 'LT', 'LG', etc.
  // positionGroup = 'RB', 'OL', etc.
  const weights = DEFAULT_WEIGHTS[positionGroup];
  if (weights) {
    for (const [attr, weight] of Object.entries(weights)) {
      // Insert weight for specific roster position
    }
  }
}
```

### 2. Database Migration
**File**: `backend/database/migrations/20260215_2000_fix_position_mapping_weights.sql`

**Purpose**: Backfill missing weights for existing user presets.

**What it does**:
1. Iterates through all existing weight presets
2. For each preset, checks all 21 roster positions
3. If weights are missing for a position, inserts default weights based on position group
4. Uses explicit existence check for idempotency

**Positions Fixed**:
- Offense: QB, HB, FB, WR, TE, LT, LG, C, RG, RT
- Defense: LEDG, REDG, DT, SAM, MIKE, WILL, CB, FS, SS
- Special Teams: K, P

## Position Group Mapping
```
HB, FB → RB (Running Back weights)
LT, LG, C, RG, RT → OL (Offensive Line weights)
LEDG, REDG, DT → DL (Defensive Line weights)
SAM, MIKE, WILL → LB (Linebacker weights)
CB, FS, SS → DB (Defensive Back weights)
QB, WR, TE, K, P → Same as group name
```

## Testing

### Verification Script
Created `/tmp/test-position-mapping.js` to verify the fix:

**Results**:
- ✓ OLD approach: Cannot find weights for HB, LT, CB
- ✓ NEW approach: All 21 positions have weights
- ✓ HB correctly maps to RB weights
- ✓ LT correctly maps to OL weights
- ✓ CB correctly maps to DB weights

### Code Quality
- ✓ Code Review: Passed with no issues
- ✓ Security Scan (CodeQL): Passed with 0 alerts

## Impact

### Before Fix
- User opens Stud Score Config screen
- Selects any position except QB, WR, TE, K, P
- Sees "No attributes configured for this position"
- Cannot configure weights
- Feature is broken

### After Fix
- User opens Stud Score Config screen
- Selects any position
- Sees all relevant attributes with default weights
- Can adjust sliders to customize weights
- Can save configuration
- Feature works as designed

## Files Changed
1. `backend/src/services/studScoreService.js` - Fixed getOrCreateDefaultPreset()
2. `backend/database/migrations/20260215_2000_fix_position_mapping_weights.sql` - Backfill migration

## Deployment Notes

### New Installations
- Fix is automatic via updated `getOrCreateDefaultPreset()` function
- First preset creation will have all positions configured

### Existing Installations
- Run migration `20260215_2000_fix_position_mapping_weights.sql`
- Migration is idempotent (safe to run multiple times)
- Existing custom weights are preserved
- Only missing weights are added

### Migration Command
```bash
# If using the migration system
npm run migrate

# Or manually with psql
psql -d dynasty_tracker -f backend/database/migrations/20260215_2000_fix_position_mapping_weights.sql
```

## Related Code

### Position Groups (`POSITION_GROUP_MAP`)
Defined in: `backend/src/services/studScoreService.js`

### Default Weights (`DEFAULT_WEIGHTS`)
Defined in: `backend/src/services/studScoreService.js`

Contains default attribute weights for each position group:
- QB: THP, SAC, MAC, DAC, TUP, AWR, SPD, AGI
- RB: SPD, ACC, AGI, CAR, BTK, CTH, AWR
- WR: SPD, ACC, CTH, SPC, SRR, MRR, DRR, RLS, CIT, AWR
- TE: CTH, SRR, RBK, SPD, STR, AWR
- OL: STR, PBK, RBK, AWR, AGI
- DL: PMV, FMV, BSH, STR, PUR, TAK, AWR
- LB: TAK, PUR, PRC, MCV, ZCV, BSH, SPD, AWR
- DB: MCV, ZCV, SPD, ACC, AGI, CTH, PRC, AWR
- K: KPW, KAC, AWR
- P: KPW, KAC, AWR

### Frontend Component
`frontend/src/pages/StudScoreConfig.js` - No changes required

The frontend already had correct logic to:
1. Query weights by specific roster position
2. Fall back to default weights if none exist
3. Display attributes with sliders

The issue was backend data storage, not frontend logic.

## Future Considerations

### If Position Mappings Change
If new positions are added or mappings change:
1. Update `POSITION_GROUP_MAP` in `studScoreService.js`
2. Update `DEFAULT_WEIGHTS` if new position groups are needed
3. Create a new migration to add weights for new positions

### If Default Weights Change
Changing `DEFAULT_WEIGHTS` affects:
- New presets (automatic)
- Existing presets (require migration)

Consider versioning or providing an "Update to Latest Defaults" feature.

## Summary
This fix resolves a critical bug where the stud score configuration screen was completely non-functional for most positions. Users can now properly configure attribute weights for all 21 roster positions, enabling the full functionality of the stud score calculation system.

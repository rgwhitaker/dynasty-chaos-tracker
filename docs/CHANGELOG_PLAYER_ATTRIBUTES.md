# Player Attributes Update - Summary of Changes

This document summarizes the changes made to update the player attributes system.

## Overview

Updated the Dynasty Chaos Tracker to support all 55 player ratings from College Football 26, plus physical attributes (Height & Weight) and Development Trait.

## Files Changed

### 1. Backend Changes

#### New Files:
- `backend/src/constants/playerAttributes.js` - Centralized constants for all player attributes
- `backend/database/migrations/20240101_0000_add_player_physical_attributes.sql` - Migration script for existing databases

#### Modified Files:
- `backend/database/init.sql` - Added height, weight, dev_trait columns to players and recruits tables
- `backend/src/controllers/playerController.js` - Updated to handle new physical attributes
- `backend/src/services/studScoreService.js` - Updated to use CFB26 attribute abbreviations

### 2. Frontend Changes

#### New Files:
- `frontend/src/constants/playerAttributes.js` - Frontend constants matching backend

#### Modified Files:
- `frontend/src/pages/RosterManagement.js` - Added form fields for height, weight, and dev trait; updated display

### 3. Documentation

#### New Files:
- `PLAYER_ATTRIBUTES.md` - Comprehensive documentation of all 55 player ratings
- `verify-attributes.js` - Verification script to ensure constants are correct

#### Modified Files:
- `README.md` - Updated to reference new player attributes

## Player Attributes Supported

### 55 Player Ratings
All CFB26 ratings: OVR, SPD, ACC, AGI, COD, STR, AWR, CAR, BCV, BTK, TRK, SFA, SPM, JKM, CTH, CIT, SPC, SRR, MRR, DRR, RLS, JMP, THP, SAC, MAC, DAC, RUN, TUP, BSK, PAC, PBK, PBP, PBF, RBK, RBP, RBF, LBK, IBL, PRC, TAK, POW, BSH, FMV, PMV, PUR, MCV, ZCV, PRS, RET, KPW, KAC, STA, TGH, INJ, LSP

### Physical Attributes
- Height (string, e.g., "6'2\"")
- Weight (integer, pounds)

### Development Trait
- Normal
- Impact
- Star
- Elite

## Database Schema Changes

### Added Columns to `players` table:
```sql
height VARCHAR(10)      -- Player height
weight INTEGER          -- Player weight in pounds
dev_trait VARCHAR(20)   -- Development trait
```

### Added Columns to `recruits` table:
```sql
height VARCHAR(10)      -- Recruit height
weight INTEGER          -- Recruit weight in pounds
dev_trait VARCHAR(20)   -- Development trait
```

The 55 ratings continue to be stored in the `attributes` JSONB column for flexibility.

## API Changes

### Player Creation/Update
New optional fields:
- `height` (string)
- `weight` (integer)
- `dev_trait` (string, one of: Normal, Impact, Star, Elite)

Example:
```javascript
{
  "first_name": "John",
  "last_name": "Doe",
  "position": "QB",
  "jersey_number": 12,
  "year": "JR",
  "overall_rating": 87,
  "height": "6'3\"",
  "weight": 225,
  "dev_trait": "Star",
  "attributes": {
    "OVR": 87,
    "SPD": 82,
    // ... other ratings
  }
}
```

## Frontend Changes

### RosterManagement Form
Added three new input fields:
1. **Height** - Text field with placeholder "6'2\""
2. **Weight** - Number field (150-400 lbs)
3. **Dev Trait** - Dropdown select with Normal/Impact/Star/Elite options

### Player Display
Player cards now show:
- Height (when available)
- Weight (when available)
- Development Trait (when available)

## Stud Score Updates

Updated default weights to use CFB26 abbreviations:
- Old: `throw_power`, `throw_accuracy_short`, etc.
- New: `THP`, `SAC`, `MAC`, `DAC`, etc.

This makes the system consistent with the official CFB26 attribute names.

## Testing

Run the verification script to ensure all constants are properly defined:
```bash
node verify-attributes.js
```

Expected output:
- 55 Player Ratings ✓
- 2 Physical Attributes ✓
- 4 Development Traits ✓
- 21 Positions ✓
- 5 Years ✓
- All ratings have display names ✓

## Migration Instructions

### For New Installations
The updated `init.sql` will create tables with all new columns automatically.

### For Existing Databases

**Automatic (Recommended):**
Migrations are now automatically applied when the backend server starts. Simply restart your backend:

```bash
# With Docker
docker-compose restart backend

# Without Docker
cd backend
npm run dev
```

The migration system will:
1. Create a `migrations` table to track applied migrations
2. Automatically apply any pending migrations from `backend/database/migrations/`
3. Log the migration status to the console

**Manual (If needed):**
Run the migration script manually:
```bash
psql -U dynasty_user -d dynasty_tracker -f backend/database/migrations/20240101_0000_add_player_physical_attributes.sql
```

## Backward Compatibility

The changes are backward compatible:
- New columns are optional (nullable)
- Existing player records will have NULL for new fields
- API accepts requests with or without new fields
- Frontend gracefully handles missing values

## Next Steps

Users can now:
1. Add players with complete CFB26 attributes
2. Track height, weight, and development traits
3. Use OCR import (when extended to capture these attributes)
4. View comprehensive player information in the UI
5. Utilize all 55 ratings in Stud Score calculations

## References

- Full attribute documentation: `PLAYER_ATTRIBUTES.md`
- Backend constants: `backend/src/constants/playerAttributes.js`
- Frontend constants: `frontend/src/constants/playerAttributes.js`

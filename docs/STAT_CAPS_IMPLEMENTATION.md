# Stat Cap Tracking Implementation

## Overview

The stat cap tracking system is a comprehensive feature that captures player potential in College Football 25/26. Each player has position-specific stat groups with 20 upgrade blocks each. Some blocks are permanently capped (cannot be upgraded), and tracking both caps and current progress is essential for evaluating player potential alongside the stud score.

## Architecture

### Data Structure

Stat caps are stored in a JSONB column on both the `players` and `recruits` tables:

```json
{
  "Accuracy": {
    "purchased_blocks": 12,
    "capped_blocks": [14, 15, 16, 17, 18, 19, 20]
  },
  "Power": {
    "purchased_blocks": 8,
    "capped_blocks": [13, 14, 18, 19, 20]
  }
}
```

### Position Stat Groups

Each position has 6-7 stat groups in a specific order:

- **QB**: Accuracy, Power, IQ, Elusiveness, Quickness, Health
- **HB**: Quickness, Elusiveness, Hands, Power, Route Running, IQ
- **FB**: Blocking, Power, IQ, Quickness, Hands, Route Running
- **WR**: Quickness, Hands, Route Running, Elusiveness, Power, IQ
- **TE**: Route Running, Hands, Elusiveness, IQ, Power, Quickness
- **OL (T, G, C)**: Pass Blocking, Run Blocking, Power, IQ, Footwork, Quickness
- **EDGE (LEDG, REDG)**: Power Moves, Finesse Moves, Power, Quickness, Run Stopping, IQ
- **DT**: Pass Rushing, Power, Quickness, Run Stopping, IQ, Health
- **LB (SAM, WILL, MIKE)**: Quickness, Pass Coverage, Run Stopping, IQ, Power, Pass Rush
- **CB**: Man Coverage, Zone Coverage, Quickness, Hands, Power, Run Stopping
- **FS**: IQ, Pass Coverage, Quickness, Run Support, Power, Hands
- **SS**: Zone Coverage, Man Coverage, Quickness, Run Support, Power, Hands
- **K, P**: Kick Accuracy, IQ, Kick Power, Quickness, Throw Accuracy, Throw Power

## Backend Implementation

### Constants (`backend/src/constants/statCaps.js`)

Defines:
- `POSITION_STAT_GROUPS`: Mapping of positions to their stat groups
- `validateStatCaps(position, statCaps)`: Validates stat cap data structure
- `calculatePotentialScore(statCaps, position)`: Returns 0-100 score based on available blocks
- `getStatGroupsForPosition(position)`: Returns array of stat group names

### Database Migration

**File**: `backend/database/migrations/20260208_0216_add_stat_caps.sql`

Adds:
- `stat_caps JSONB` column to `players` table
- `stat_caps JSONB` column to `recruits` table
- GIN indexes for efficient JSONB queries
- Column comments documenting the structure

### Controller Updates (`backend/src/controllers/playerController.js`)

Enhanced to:
- Accept `stat_caps` in create/update operations
- Validate stat cap data using `validateStatCaps()`
- Return `potential_score` and `adjusted_stud_score` alongside `stud_score`
- Parse JSONB stat_caps for client consumption

### Service Updates (`backend/src/services/studScoreService.js`)

Added functions:
- `calculateAdjustedStudScore(studScore, potentialScore, potentialWeight)`: Calculates weighted combination of current performance and potential
  - Default weight: 70% current (stud score), 30% potential
  - Returns adjusted score on 0-100 scale

## Frontend Implementation

### Constants (`frontend/src/constants/statCaps.js`)

Mirrors backend constants with additional utilities:
- `POSITION_STAT_GROUPS`: Position to stat groups mapping
- `getStatGroupsForPosition(position)`: Get stat groups for a position
- `calculatePotentialScore(statCaps, position)`: Calculate potential score
- `getStatCapSummary(statCaps, position)`: Get comprehensive summary for display

### StatCapEditor Component (`frontend/src/components/StatCapEditor.js`)

Interactive visual editor for stat caps:
- **Props**:
  - `position`: Player position (required)
  - `statCaps`: Current stat caps object
  - `onChange`: Callback when stat caps change
  - `readOnly`: Display in read-only mode

- **Visual Design**:
  - 20 blocks per stat group displayed in a grid
  - Color-coded blocks:
    - **Orange (#ff9800)**: Purchased blocks
    - **Dark Gray (#424242)**: Available blocks
    - **Light Gray (#bdbdbd) with diagonal stripes**: Capped blocks
  - Hover effects and tooltips for user guidance
  - Legend explaining block types

- **Interaction**:
  - Number input for purchased blocks
  - Click individual blocks to toggle capped status
  - Validation prevents capping purchased blocks
  - Ensures purchased + capped ≤ 20

### RosterManagement Integration

Added StatCapEditor to:
- **Manual Player Entry Form**: After attributes section
- **Edit Player Dialog**: After attributes section
- Shows alert if position not selected

Handles:
- `stat_caps` in form data state
- `handleStatCapsChange()` and `handleEditStatCapsChange()` callbacks
- Includes stat_caps in create/update API calls

### RosterDepthChart Integration

Enhanced player detail dialog with:
- **Stat Cap Summary Cards**:
  - Purchased Blocks: Count / Total
  - Capped Blocks: Count
  - Available Blocks: Count
  - Potential Score: Percentage

- **Read-Only StatCapEditor**: Visual display of all stat groups
- **Score Display**: Shows stud score, potential score, and adjusted stud score

## Scoring System

### Stud Score (Unchanged)
Current performance based on weighted attributes:
```
StudScore = Σ(AttributeValue × Weight) / ΣWeights
```

### Potential Score (New)
Percentage of available (non-capped) blocks:
```
PotentialScore = (TotalBlocks - CappedBlocks) / TotalBlocks × 100
```

Example: Player with 6 stat groups × 20 blocks = 120 total
- 15 capped blocks = (120 - 15) / 120 × 100 = 87.5% potential

### Adjusted Stud Score (New)
Weighted combination of current and potential:
```
AdjustedScore = (StudScore × 0.7) + (PotentialScore × 0.3)
```

Default: 70% current performance, 30% potential

## Validation Rules

1. **Purchased Blocks**: Integer 0-20
2. **Capped Blocks**: Array of unique integers 1-20
3. **Combined**: `purchased_blocks + capped_blocks.length ≤ 20`
4. **Position**: Stat group names must match position's valid groups
5. **Cannot Cap Purchased**: Capped blocks must be > purchased_blocks

## API Examples

### Create Player with Stat Caps

```bash
POST /api/dynasties/:id/players
{
  "first_name": "John",
  "last_name": "Doe",
  "position": "QB",
  "stat_caps": {
    "Accuracy": {
      "purchased_blocks": 10,
      "capped_blocks": [18, 19, 20]
    },
    "Power": {
      "purchased_blocks": 5,
      "capped_blocks": [15, 16, 17, 18, 19, 20]
    }
  }
}
```

### Response

```json
{
  "id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "position": "QB",
  "stat_caps": { ... },
  "stud_score": 85.5,
  "potential_score": 92,
  "adjusted_stud_score": 87.5
}
```

## Usage Guide

### Creating a New Player

1. Fill in basic player information
2. Select position (required for stat caps)
3. Optionally enter attributes
4. Scroll to "Stat Caps" section
5. For each stat group:
   - Enter number of purchased blocks (0-20)
   - Click individual blocks to mark as capped
6. Submit form

### Editing Existing Player

1. Click Edit on player card
2. Modify stat caps in the dialog
3. Changes are saved to database on submit

### Viewing Player Details

1. Click on player card in depth chart
2. View stat cap summary:
   - Purchased, Capped, Available counts
   - Potential score percentage
   - Visual block display
3. See how potential affects adjusted stud score

## Future Enhancements

### Planned Features

1. **OCR Import**: Automatically detect stat caps from screenshots
2. **Position Archetypes**: Support for archetype-specific variations
3. **Historical Tracking**: Track stat cap changes across seasons
4. **Recruit Potential Prediction**: ML-based potential estimation
5. **Bulk Import/Export**: CSV/JSON import for stat caps
6. **Comparison Tool**: Compare potential between players
7. **Configurable Weights**: User-adjustable potential weighting

### Database Considerations

- JSONB storage is flexible for future schema evolution
- GIN indexes support efficient querying
- Consider materialized views for complex analytics

### Performance Optimization

- Cache potential score calculations
- Batch calculations for roster lists
- Consider denormalizing potential score to dedicated column if query performance becomes an issue

## Testing

### Backend Tests

```javascript
// Validation tests
test('validates stat caps data structure')
test('rejects invalid purchased blocks')
test('rejects invalid capped blocks')
test('rejects overlapping purchased and capped')

// Calculation tests
test('calculates potential score correctly')
test('handles missing stat caps gracefully')
test('calculates adjusted stud score with default weight')
```

### Frontend Tests

```javascript
// Component tests
test('renders StatCapEditor for valid position')
test('updates purchased blocks correctly')
test('toggles capped blocks on click')
test('prevents capping purchased blocks')

// Integration tests
test('saves stat caps on player creation')
test('loads stat caps on player edit')
test('displays stat caps in detail view')
```

## Troubleshooting

### Common Issues

**Issue**: Stat caps not saving
- **Solution**: Ensure position is selected before entering stat caps
- **Check**: Validation errors in response

**Issue**: Visual blocks not rendering
- **Solution**: Verify position has valid stat groups in POSITION_STAT_GROUPS
- **Check**: Browser console for errors

**Issue**: Potential score always 100%
- **Solution**: Check that stat_caps object has valid data
- **Verify**: Database contains JSONB data, not empty object

### Debug Tips

1. Check browser network tab for API responses
2. Inspect player object in Redux DevTools
3. Verify stat_caps column in database has data
4. Check migration ran successfully

## Migration Guide

### Running the Migration

```bash
# If using migration tool
npm run migrate

# Or manually with psql
psql -U dynasty_user -d dynasty_tracker -f backend/database/migrations/20260208_0216_add_stat_caps.sql
```

### Rollback (if needed)

```sql
-- Remove stat_caps columns
ALTER TABLE players DROP COLUMN IF EXISTS stat_caps;
ALTER TABLE recruits DROP COLUMN IF EXISTS stat_caps;

-- Remove indexes
DROP INDEX IF EXISTS idx_players_stat_caps;
DROP INDEX IF EXISTS idx_recruits_stat_caps;
```

## Best Practices

1. **Always validate position** before accepting stat caps
2. **Use read-only mode** for display-only contexts
3. **Include potential score** in player evaluation
4. **Document custom weights** if adjusting potential weight
5. **Test edge cases**: All capped, none capped, partial capping
6. **Keep frontend/backend constants in sync**

## Support

For questions or issues:
- Check this documentation
- Review code comments in implementation files
- Open an issue on GitHub

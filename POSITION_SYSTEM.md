# College Football 26 Position System

## Overview

The Dynasty Chaos Tracker uses the exact position names from College Football 26. There are two types of positions:

1. **Roster Positions** - The actual positions assigned to players on your roster
2. **Depth Chart Positions** - Includes roster positions PLUS special/situational positions that roster players can fill

## Roster Positions (21 Total)

These are the positions that players have on your roster:

### Offense (10 positions)
- **QB** - Quarterback
- **HB** - Halfback (Running Back)
- **FB** - Fullback
- **WR** - Wide Receiver
- **TE** - Tight End
- **LT** - Left Tackle
- **LG** - Left Guard
- **C** - Center
- **RG** - Right Guard
- **RT** - Right Tackle

### Defense (9 positions)
- **LEDG** - Left Edge (Defensive End/Edge Rusher)
- **REDG** - Right Edge (Defensive End/Edge Rusher)
- **DT** - Defensive Tackle
- **SAM** - SAM Linebacker (Strong-side)
- **MIKE** - MIKE Linebacker (Middle)
- **WILL** - WILL Linebacker (Weak-side)
- **CB** - Cornerback
- **FS** - Free Safety
- **SS** - Strong Safety

### Special Teams (2 positions)
- **K** - Kicker
- **P** - Punter

## Depth Chart Positions (35 Total)

The depth chart includes all 21 roster positions PLUS 14 special/situational positions:

### Special Teams Depth Chart Positions
- **KR** - Kick Returner
- **PR** - Punt Returner
- **KOS** - Kickoff Specialist
- **LS** - Long Snapper

### Situational Offense Positions
- **3DRB** - 3rd Down Running Back (passing down specialist)
- **PWHB** - Power Halfback (short yardage/goal line specialist)
- **SLWR** - Slot Wide Receiver

### Situational Defense Positions
- **RLE** - Rush Left End (pass rush specialist)
- **RRE** - Rush Right End (pass rush specialist)
- **RDT** - Rush Defensive Tackle (pass rush specialist)
- **SUBLB** - Sub Linebacker (nickel/dime packages)
- **SLCB** - Slot Cornerback (nickel/dime packages)
- **NT** - Nose Tackle (specific DT role in some formations)
- **GAD** - Goal Line/Adaptive Defense

## Position Mapping

Players with roster positions can fill multiple depth chart positions based on their skillset:

### Examples:
- **HB** roster players can fill: HB, 3DRB, PWHB, KR, PR depth chart spots
- **LEDG** roster players can fill: LEDG, RLE depth chart spots
- **CB** roster players can fill: CB, SLCB, KR, PR depth chart spots
- **DT** roster players can fill: DT, RDT, NT depth chart spots
- **SAM/MIKE/WILL** roster players can fill: their position, SUBLB depth chart spots

## Important Notes

### Why HB instead of RB?
College Football 26 uses "HB" (Halfback) as the official position name, not "RB" (Running Back). This is the traditional college football terminology.

### Why LEDG/REDG instead of LE/RE?
The game uses "LEDG" and "REDG" to distinguish these as edge rushers rather than traditional defensive ends.

### Why SAM/MIKE/WILL instead of MLB/OLB?
College Football uses the traditional linebacker designations:
- **SAM** - Strong-side linebacker (typically on the TE side)
- **MIKE** - Middle linebacker (QB of the defense)
- **WILL** - Weak-side linebacker (typically opposite the TE)

This is more specific than the generic MLB/OLB designations used in professional football.

## Database Schema

The `players` table stores the roster position in the `position` column (VARCHAR(10)):
```sql
position VARCHAR(10) NOT NULL
```

Valid values are the 21 roster positions listed above.

The `depth_charts` table can use any of the 35 depth chart positions:
```sql
position VARCHAR(10) NOT NULL
```

Valid values are all 35 depth chart positions (21 roster + 14 special positions).

## API Validation

### OCR Service
When importing players via OCR, only the 21 roster positions are valid. The OCR parser validates against this list.

### Player Controller
When manually creating/updating players, only the 21 roster positions are accepted.

### Depth Chart Service
The depth chart generation can use all 35 depth chart positions. Players are automatically placed in situational positions based on their attributes and stud scores.

## Migration Notes

If you have existing data using old position names:
- `RB` → should be `HB`
- `LE` → should be `LEDG`
- `RE` → should be `REDG`
- `MLB` → should be `MIKE`
- `LOLB` → should be `SAM` (if strong-side) or `WILL` (if weak-side)
- `ROLB` → should be `SAM` (if strong-side) or `WILL` (if weak-side)
- Generic `OL`, `OT`, `OG` → should be specific positions (LT, LG, C, RG, RT)
- Generic `DL`, `DE` → should be specific positions (LEDG, REDG, DT)
- Generic `LB` → should be specific positions (SAM, MIKE, WILL)
- Generic `DB`, `S` → should be specific positions (CB, FS, SS)

## Code References

### Position Constants
Located in `backend/src/constants/playerAttributes.js`:
- `ROSTER_POSITIONS` - Array of 21 valid roster positions
- `DEPTH_CHART_POSITIONS` - Array of 35 valid depth chart positions
- `POSITIONS` - Alias for ROSTER_POSITIONS (backward compatibility)

### Validation
Located in `backend/src/services/ocrService.js`:
- `validatePlayerData()` - Validates roster positions during OCR import

### Depth Chart Configuration
Located in `backend/src/services/depthChartService.js`:
- `getDepthChartPositions()` - Returns configuration for all depth chart positions organized by category

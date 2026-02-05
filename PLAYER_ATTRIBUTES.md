# Player Attributes Documentation

This document provides a comprehensive list of all player attributes used in the Dynasty Chaos Tracker for College Football 26.

## Overview

The Dynasty Chaos Tracker supports all 55 player ratings from College Football 26, plus physical attributes (Height & Weight) and Development Trait.

## Player Ratings (55 Total)

### Overall & Physical Attributes
- **OVR** - Overall Rating
- **SPD** - Speed
- **ACC** - Acceleration
- **AGI** - Agility
- **COD** - Change of Direction
- **STR** - Strength
- **AWR** - Awareness
- **JMP** - Jumping
- **STA** - Stamina
- **TGH** - Toughness
- **INJ** - Injury

### Ball Carrier Attributes
- **CAR** - Carrying
- **BCV** - Ball Carrier Vision
- **BTK** - Break Tackle
- **TRK** - Trucking
- **SFA** - Stiff Arm
- **SPM** - Spin Move
- **JKM** - Juke Move

### Receiving Attributes
- **CTH** - Catching
- **CIT** - Catch in Traffic
- **SPC** - Spectacular Catch
- **SRR** - Short Route Running
- **MRR** - Medium Route Running
- **DRR** - Deep Route Running
- **RLS** - Release

### Passing Attributes
- **THP** - Throw Power
- **SAC** - Short Accuracy
- **MAC** - Medium Accuracy
- **DAC** - Deep Accuracy
- **TUP** - Throw Under Pressure
- **BSK** - Break Sack
- **PAC** - Play Action

### Blocking Attributes
- **PBK** - Pass Block
- **PBP** - Pass Block Power
- **PBF** - Pass Block Finesse
- **RBK** - Run Block
- **RBP** - Run Block Power
- **RBF** - Run Block Finesse
- **LBK** - Lead Block
- **IBL** - Impact Blocking
- **RUN** - Run Blocking (general)

### Defensive Attributes
- **TAK** - Tackle
- **POW** - Power Moves
- **BSH** - Block Shedding
- **FMV** - Finesse Moves
- **PMV** - Power Moves (Defensive)
- **PUR** - Pursuit
- **PRC** - Play Recognition

### Coverage Attributes
- **MCV** - Man Coverage
- **ZCV** - Zone Coverage
- **PRS** - Press

### Special Teams Attributes
- **RET** - Return
- **KPW** - Kick Power
- **KAC** - Kick Accuracy
- **LSP** - Long Snapper

## Physical Attributes

- **Height** - Player height (e.g., "6'2\"")
- **Weight** - Player weight in pounds

## Development Trait

Players have one of four development traits that affect their progression:
- **Normal** - Standard development rate
- **Impact** - Above-average development rate
- **Star** - High development rate
- **Elite** - Maximum development rate

## Storage

All 55 ratings are stored in the `attributes` JSONB field in the database, allowing for flexible storage and querying. Physical attributes (height, weight) and development trait have dedicated columns in the database.

### Database Schema

```sql
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(10) NOT NULL,
    jersey_number INTEGER,
    year VARCHAR(20),
    overall_rating INTEGER,
    height VARCHAR(10),
    weight INTEGER,
    dev_trait VARCHAR(20),
    attributes JSONB,  -- Contains all 55 ratings
    -- ... other fields
);
```

## Position-Specific Attributes

Different positions use different subsets of these attributes:

### Quarterback (QB)
Key attributes: THP, SAC, MAC, DAC, TUP, PAC, BSK, AWR, SPD, AGI

### Running Back (RB)
Key attributes: SPD, ACC, AGI, CAR, BCV, BTK, TRK, SFA, SPM, JKM, CTH, AWR

### Wide Receiver (WR)
Key attributes: SPD, ACC, CTH, CIT, SPC, SRR, MRR, DRR, RLS, JMP, AWR

### Tight End (TE)
Key attributes: CTH, CIT, SRR, MRR, RLS, RBK, LBK, STR, SPD, AWR

### Offensive Line (OL, C, OG, OT)
Key attributes: STR, PBK, PBP, PBF, RBK, RBP, RBF, AWR, AGI

### Defensive Line (DL, DE, DT)
Key attributes: POW, FMV, PMV, BSH, STR, TAK, PUR, PRC, AWR

### Linebacker (LB, MLB, OLB)
Key attributes: TAK, PUR, PRC, BSH, MCV, ZCV, SPD, ACC, AGI, STR, AWR

### Defensive Back (CB, S, SS, FS)
Key attributes: MCV, ZCV, PRS, SPD, ACC, AGI, CTH, PRC, JMP, AWR

### Kicker (K)
Key attributes: KPW, KAC, AWR

### Punter (P)
Key attributes: KPW, KAC, AWR

## Usage in Stud Score Calculation

The Stud Score system allows users to assign custom weights to each attribute for each position. The system includes preset weight configurations optimized for different play styles:

```javascript
StudScore = Σ(AttributeValue × Weight) / ΣWeights
```

Users can create multiple weight presets for different schemes (e.g., "Run-Heavy Offense", "Air Raid", "3-4 Defense").

## API Usage

When creating or updating players via the API, attributes are sent as a JSON object:

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
    "ACC": 84,
    "AGI": 80,
    "STR": 75,
    "AWR": 88,
    "THP": 92,
    "SAC": 89,
    "MAC": 90,
    "DAC": 85,
    "TUP": 86,
    "PAC": 83,
    "BSK": 78,
    // ... additional attributes
  }
}
```

## Constants Files

Attribute constants are defined in:
- Backend: `/backend/src/constants/playerAttributes.js`
- Frontend: `/frontend/src/constants/playerAttributes.js`

These files export:
- `PLAYER_RATINGS` - Array of all 55 rating abbreviations
- `PHYSICAL_ATTRIBUTES` - Array of physical attribute names
- `DEV_TRAITS` - Array of development trait options
- `POSITIONS` - Array of all valid positions
- `YEARS` - Array of class years (FR, SO, JR, SR, GRAD)
- `ATTRIBUTE_DISPLAY_NAMES` - Mapping of abbreviations to full names

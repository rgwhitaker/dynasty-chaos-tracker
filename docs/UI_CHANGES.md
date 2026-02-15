# UI Changes Documentation

## Visual Changes to Roster Management Page

### Before
The manual player entry form had only basic fields:
- First Name
- Last Name
- Position
- Jersey Number
- Year
- Overall Rating
- Height
- Weight
- Dev Trait

**Total fields: 9**

### After
The manual player entry form now includes:

#### Basic Information Section (unchanged)
- First Name
- Last Name
- Position
- Jersey Number
- Year
- Overall Rating
- Height
- Weight
- Dev Trait

#### New: Player Attributes Section
**Header:**
```
Player Attributes (Optional)
Enter individual player ratings. All fields are optional. Values should be between 40-99.
```

**9 Collapsible Accordion Sections:**

1. **Physical Attributes ▼**
   - SPD - Speed
   - ACC - Acceleration
   - AGI - Agility
   - COD - Change of Direction
   - STR - Strength
   - JMP - Jumping
   - STA - Stamina
   - TGH - Toughness
   - INJ - Injury

2. **Awareness Attributes ▼**
   - AWR - Awareness
   - PRC - Play Recognition

3. **Ball Carrier Attributes ▼**
   - CAR - Carrying
   - BCV - Ball Carrier Vision
   - BTK - Break Tackle
   - TRK - Trucking
   - SFA - Stiff Arm
   - SPM - Spin Move
   - JKM - Juke Move

4. **Receiving Attributes ▼**
   - CTH - Catching
   - CIT - Catch in Traffic
   - SPC - Spectacular Catch
   - SRR - Short Route Running
   - MRR - Medium Route Running
   - DRR - Deep Route Running
   - RLS - Release

5. **Passing Attributes ▼**
   - THP - Throw Power
   - SAC - Short Accuracy
   - MAC - Medium Accuracy
   - DAC - Deep Accuracy
   - TUP - Throw Under Pressure
   - BSK - Break Sack
   - PAC - Play Action

6. **Blocking Attributes ▼**
   - PBK - Pass Block
   - PBP - Pass Block Power
   - PBF - Pass Block Finesse
   - RBK - Run Block
   - RBP - Run Block Power
   - RBF - Run Block Finesse
   - LBK - Lead Block
   - IBL - Impact Blocking
   - RUN - Throw on the Run

7. **Defense Attributes ▼**
   - TAK - Tackle
   - POW - Hit Power
   - BSH - Block Shedding
   - FMV - Finesse Moves
   - PMV - Power Moves
   - PUR - Pursuit

8. **Coverage Attributes ▼**
   - MCV - Man Coverage
   - ZCV - Zone Coverage
   - PRS - Press

9. **Special Teams Attributes ▼**
   - RET - Return
   - KPW - Kick Power
   - KAC - Kick Accuracy
   - LSP - Long Snapper

**Total fields: 9 basic + 55 attributes = 64 fields**

## UI/UX Features

### Layout
- All attributes organized in Material-UI Accordion components
- Accordions start collapsed (only headers visible)
- Click header to expand/collapse each section
- Smooth expand/collapse animation
- Expand arrow icon (▼) rotates when opened

### Form Field Properties
- **Input Type**: Number input with spinner controls
- **Size**: Small (compact display)
- **Label**: Shows both abbreviation and full name (e.g., "SPD - Speed")
- **Validation**: Min=40, Max=99
- **Optional**: All fields can be left empty
- **Grid Layout**: 
  - xs (mobile): 2 columns
  - sm (tablet): 3 columns
  - md+ (desktop): 4 columns

### Visual Hierarchy
```
┌─────────────────────────────────────────────────────┐
│ Manual Player Entry                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Basic Fields in Grid Layout]                      │
│ First Name    Last Name                            │
│ Position      Jersey #       Year                  │
│ Overall       Height         Weight    Dev Trait   │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Player Attributes (Optional)                        │
│ Enter individual player ratings...                 │
│                                                     │
│ ┌─ Physical Attributes ───────────────────────▼┐   │
│ │ (collapsed - click to expand)               │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─ Awareness Attributes ──────────────────────▼┐   │
│ │ (collapsed - click to expand)               │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [... 7 more collapsed sections ...]                │
│                                                     │
├─────────────────────────────────────────────────────┤
│                        [Cancel]  [Add Player]       │
└─────────────────────────────────────────────────────┘
```

### When Expanded (Example: Physical Attributes)
```
┌─ Physical Attributes ─────────────────────────▲┐
│                                               │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────┐│
│ │SPD-Speed│ │ACC-Accel│ │AGI-Agil.│ │COD-..││
│ │  [85]   │ │  [83]   │ │  [80]   │ │ [ ]  ││
│ └─────────┘ └─────────┘ └─────────┘ └──────┘│
│                                               │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────┐│
│ │STR-Str..│ │JMP-Jump.│ │STA-Stam.│ │TGH-..││
│ │  [78]   │ │  [ ]    │ │  [ ]    │ │ [ ]  ││
│ └─────────┘ └─────────┘ └─────────┘ └──────┘│
│                                               │
│ ┌─────────┐                                   │
│ │INJ-Inj..│                                   │
│ │  [ ]    │                                   │
│ └─────────┘                                   │
└───────────────────────────────────────────────┘
```

## Color Scheme
- Uses Material-UI default theme
- Primary color for expand icons
- Grey borders for accordions
- Standard text field styling with focus states
- Helper text in secondary color

## Responsive Behavior
- **Mobile (xs)**: 2 columns per row, smaller text
- **Tablet (sm)**: 3 columns per row
- **Desktop (md+)**: 4 columns per row
- Accordions stack vertically at all sizes
- Form buttons stack on small screens

## Accessibility
- All fields have proper labels
- Tab navigation works through all fields
- Accordion headers are keyboard accessible
- Screen reader announces expanded/collapsed state
- Form validation messages are announced

## User Workflow
1. Click "Add Player Manually" button
2. Fill in required basic information
3. Optionally expand any attribute category
4. Fill in desired attribute values (or leave empty)
5. Click "Add Player"
6. Success message appears
7. Form clears but stays open for adding another player
8. New player appears in roster list

## Key Improvements
✅ All 55 attributes now accessible
✅ Clean, organized interface (not overwhelming)
✅ Progressive disclosure (collapsed by default)
✅ Clear labeling (abbreviation + full name)
✅ Flexible input (all optional)
✅ Proper validation (40-99 range)
✅ Responsive design (works on all devices)
✅ Maintains existing functionality

# Stat Cap Tracking System - UI/UX Guide

## Visual Component Overview

### StatCapEditor Component

The StatCapEditor is the core UI component for managing stat caps. It displays as a series of stat group sections, each containing a grid of 20 blocks.

```
┌─────────────────────────────────────────────────────────────┐
│ Stat Caps (Click blocks to cap/uncap)                      │
│                                                             │
│ Set purchased blocks and click individual blocks to toggle │
│ capped status. Purchased blocks must start from block 1.   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Accuracy                                    Purchased: [10]│ │
│─────────────────────────────────────────────────────────────│
│ [🟧][🟧][🟧][🟧][🟧][🟧][🟧][🟧][🟧][🟧]                    │
│ [⬛][⬛][⬛][⬛][⬛][⬛][⬛][⬜][⬜][⬜]                    │
│                                                             │
│ Legend: [🟧] Purchased  [⬛] Available  [⬜] Capped        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Power                                       Purchased: [5]│ │
│─────────────────────────────────────────────────────────────│
│ [🟧][🟧][🟧][🟧][🟧][⬛][⬛][⬛][⬛][⬛]                    │
│ [⬛][⬛][⬛][⬛][⬜][⬜][⬜][⬜][⬜][⬜]                    │
│                                                             │
│ Legend: [🟧] Purchased  [⬛] Available  [⬜] Capped        │
└─────────────────────────────────────────────────────────────┘

(Continues for all 6 stat groups for QB)
```

### Block Visual States

**Purchased Block (Orange #ff9800)**
```
┌───┐
│🟧 │  Solid orange fill
└───┘  Cannot be clicked to cap (locked)
       Tooltip: "Block N - Purchased"
```

**Available Block (Dark Gray #424242)**
```
┌───┐
│⬛ │  Dark gray fill
└───┘  Click to mark as capped
       Hover: Slight scale increase
       Tooltip: "Block N - Available (click to cap)"
```

**Capped Block (Light Gray #bdbdbd with diagonal stripes)**
```
┌───┐
│⬜ │  Light gray with white diagonal stripes
└───┘  Click to uncap
       Hover: Slight scale increase
       Tooltip: "Block N - Capped (click to uncap)"
```

## Player Detail View (RosterDepthChart)

When viewing a player's details, the stat cap information is displayed prominently:

```
┌──────────────────────────────────────────────────────────────┐
│ John Doe                                               [✕]   │
│ #12  QB  JR  ⭐ Star                                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│ │Overall │  │  Stud  │  │Potential│ │Adjusted│            │
│ │        │  │  Score │  │         │ │ Score  │            │
│ │   87   │  │  85.5  │  │   92%   │ │  87.5  │            │
│ └────────┘  └────────┘  └────────┘  └────────┘            │
│                                                              │
│ Stat Caps Summary                                           │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│ │ Purchased  │ │  Capped    │ │ Available  │ │Potential │ │
│ │   58/120   │ │     10     │ │     52     │ │   92%    │ │
│ └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Accuracy                         Purchased: 10 | Capped: 3│ │
│ │ [🟧][🟧][🟧][🟧][🟧][🟧][🟧][🟧][🟧][🟧]                │
│ │ [⬛][⬛][⬛][⬛][⬛][⬛][⬛][⬜][⬜][⬜]                │
│ └────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Power                             Purchased: 5 | Capped: 6│ │
│ │ [🟧][🟧][🟧][🟧][🟧][⬛][⬛][⬛][⬛][⬛]                │
│ │ [⬛][⬛][⬛][⬛][⬜][⬜][⬜][⬜][⬜][⬜]                │
│ └────────────────────────────────────────────────────────┘  │
│ (... additional stat groups ...)                            │
│                                                              │
│ [Physical Attributes section follows...]                    │
└──────────────────────────────────────────────────────────────┘
```

## Manual Player Entry Form

The StatCapEditor appears after the attributes section:

```
┌──────────────────────────────────────────────────────────────┐
│ Manual Player Entry                        [Add Player]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ First Name: [John      ]  Last Name: [Doe        ]         │
│ Position:   [QB ▼]        Jersey #:  [12  ]  Year: [JR ▼] │
│                                                              │
│ Overall: [87  ]  Height: [6'2"  ]  Weight: [210  ]         │
│ Dev Trait: [Star ▼]                                        │
│                                                              │
│ ──────────────── Player Attributes (Optional) ─────────────  │
│                                                              │
│ ▼ Overall Attributes                                        │
│   OVR: [87]                                                 │
│                                                              │
│ ▼ Physical Attributes                                       │
│   SPD: [85]  ACC: [83]  AGI: [82]  ...                    │
│                                                              │
│ ──────────────────── Stat Caps ───────────────────────────  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Accuracy                              Purchased: [10]│ │  │
│ │ [🟧][🟧][🟧][🟧][🟧][🟧][🟧][🟧][🟧][🟧]             │  │
│ │ [⬛][⬛][⬛][⬛][⬛][⬛][⬛][⬜][⬜][⬜]             │  │
│ │ Legend: [🟧] Purchased [⬛] Available [⬜] Capped    │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ (... 5 more stat groups for QB ...)                        │
│                                                              │
│                                   [Cancel]  [Add Player]    │
└──────────────────────────────────────────────────────────────┘
```

## Interactive Behaviors

### Clicking a Block

**Available Block → Capped**
```
Before:  [⬛]    After:  [⬜]
         ↓              ↓
       Click         Capped
```

**Capped Block → Available**
```
Before:  [⬜]    After:  [⬛]
         ↓              ↓
       Click       Available
```

**Purchased Block (No Action)**
```
Before:  [🟧]    After:  [🟧]
         ↓              ↓
       Click      No change
               (Cursor: not-allowed)
```

### Validation Feedback

**Invalid: Too Many Blocks**
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Error                                           │
│                                                     │
│ Invalid stat caps data:                            │
│ • Combined purchased and capped blocks exceed 20   │
│   in Accuracy                                      │
└─────────────────────────────────────────────────────┘
```

**Invalid: Wrong Stat Group for Position**
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Error                                           │
│                                                     │
│ Invalid stat caps data:                            │
│ • Invalid stat group "Pass Blocking" for position  │
│   QB                                               │
└─────────────────────────────────────────────────────┘
```

## Responsive Design

### Desktop (>1200px)
- Blocks: 20 per row
- 2 stat groups visible at once
- Full labels and legends

### Tablet (768px - 1200px)
- Blocks: 20 per row (smaller)
- 1 stat group visible at once
- Abbreviated labels

### Mobile (<768px)
- Blocks: 10 per row (two rows of 10)
- Full-width stat groups
- Stacked layout
- Touch-optimized block size

## Color Palette

```
Purchased Blocks:  #ff9800 (Orange)
Available Blocks:  #424242 (Dark Gray)
Capped Blocks:     #bdbdbd (Light Gray)
Border:            #333333
Background:        #ffffff
Hover Highlight:   rgba(0, 0, 0, 0.04)
```

## Accessibility

- **Keyboard Navigation**: Tab through blocks, Enter/Space to toggle
- **Screen Readers**: Announce block number and state
- **High Contrast**: Sufficient contrast ratios (WCAG AA)
- **Touch Targets**: Minimum 44x44px on mobile
- **Tooltips**: Descriptive text for all interactive elements

## User Flow Examples

### Example 1: Creating a New QB with High Potential
1. User creates new QB
2. Sets Accuracy purchased_blocks = 15
3. Clicks blocks 19, 20 to cap them
4. Sets Power purchased_blocks = 12
5. No caps on Power
6. Result: High potential (98%) because only 2 blocks capped

### Example 2: Editing Existing Player
1. User clicks Edit on player
2. Dialog opens with current stat caps
3. User sees Accuracy has 10 purchased, 5 capped
4. Clicks block 18 to uncap it
5. Saves changes
6. Potential score increases from 90% to 92%

### Example 3: Viewing Player Potential
1. User clicks player card in depth chart
2. Detail dialog shows:
   - Stud Score: 85.5 (current performance)
   - Potential: 92% (available upgrade capacity)
   - Adjusted: 87.5 (weighted combination)
3. Visual display shows why: only 10/120 blocks capped
4. User can make informed roster decisions

## UI Component Hierarchy

```
RosterManagement (Page)
├── Manual Entry Form
│   ├── Basic Info Fields
│   ├── Attributes Accordion
│   └── StatCapEditor
│       ├── Position Check
│       ├── Stat Group 1
│       │   ├── Purchased Input
│       │   ├── Block Grid (20 blocks)
│       │   └── Legend
│       ├── Stat Group 2...
│       └── Stat Group N
└── Edit Player Dialog
    └── (Same structure as Manual Entry)

RosterDepthChart (Page)
└── Player Detail Dialog
    ├── Score Cards
    ├── Stat Cap Summary Cards
    └── StatCapEditor (Read-only)
        └── (Same structure, no interaction)
```

## Performance Optimizations

- **Lazy Rendering**: Only visible stat groups rendered initially
- **Memoization**: React.memo for StatCapEditor to prevent unnecessary re-renders
- **Debounced Updates**: Input changes debounced to reduce API calls
- **Optimistic UI**: Immediate visual feedback, background validation

## Future UI Enhancements

1. **Drag-to-Select**: Click and drag to cap multiple blocks at once
2. **Preset Patterns**: Quick buttons for common cap patterns (e.g., "Cap top 5")
3. **Import/Export**: Copy/paste stat caps between players
4. **Comparison View**: Side-by-side player potential comparison
5. **Mobile Gestures**: Swipe to cap/uncap on mobile
6. **Animation**: Smooth transitions when toggling blocks
7. **Bulk Edit**: Edit multiple players' stat caps at once

## Summary

The Stat Cap Tracking UI provides:
- ✅ Intuitive visual representation
- ✅ Interactive click-to-edit functionality
- ✅ Clear color coding and legends
- ✅ Comprehensive validation feedback
- ✅ Responsive design for all devices
- ✅ Accessible to all users
- ✅ Performance optimized
- ✅ Seamless integration with existing features

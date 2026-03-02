/**
 * Player Attributes and Constants for College Football 26
 * All player ratings, physical attributes, and development traits
 */

// All 55 player ratings
export const PLAYER_RATINGS = [
  'OVR',   // Overall Rating
  'SPD',   // Speed
  'ACC',   // Acceleration
  'AGI',   // Agility
  'COD',   // Change of Direction
  'STR',   // Strength
  'AWR',   // Awareness
  'CAR',   // Carrying
  'BCV',   // Ball Carrier Vision
  'BTK',   // Break Tackle
  'TRK',   // Trucking
  'SFA',   // Stiff Arm
  'SPM',   // Spin Move
  'JKM',   // Juke Move
  'CTH',   // Catching
  'CIT',   // Catch in Traffic
  'SPC',   // Spectacular Catch
  'SRR',   // Short Route Running
  'MRR',   // Medium Route Running
  'DRR',   // Deep Route Running
  'RLS',   // Release
  'JMP',   // Jumping
  'THP',   // Throw Power
  'SAC',   // Short Accuracy
  'MAC',   // Medium Accuracy
  'DAC',   // Deep Accuracy
  'RUN',   // Throw on the Run
  'TUP',   // Throw Under Pressure
  'BSK',   // Break Sack
  'PAC',   // Play Action
  'PBK',   // Pass Block
  'PBP',   // Pass Block Power
  'PBF',   // Pass Block Finesse
  'RBK',   // Run Block
  'RBP',   // Run Block Power
  'RBF',   // Run Block Finesse
  'LBK',   // Lead Block
  'IBL',   // Impact Blocking
  'PRC',   // Play Recognition
  'TAK',   // Tackle
  'POW',   // Hit Power
  'BSH',   // Block Shedding
  'FMV',   // Finesse Moves
  'PMV',   // Power Moves (Defensive)
  'PUR',   // Pursuit
  'MCV',   // Man Coverage
  'ZCV',   // Zone Coverage
  'PRS',   // Press
  'RET',   // Return
  'KPW',   // Kick Power
  'KAC',   // Kick Accuracy
  'STA',   // Stamina
  'TGH',   // Toughness
  'INJ',   // Injury
  'LSP'    // Long Snapper
];

// Physical attributes
export const PHYSICAL_ATTRIBUTES = [
  'height',  // Height (e.g., "6'2\"")
  'weight'   // Weight in pounds
];

// Development traits
export const DEV_TRAITS = [
  'Normal',
  'Impact',
  'Star',
  'Elite'
];

// Development trait colors (Material-UI color prop values)
export const DEV_TRAIT_COLORS = {
  'Elite': 'primary',   // blue
  'Star': 'success',    // green
  'Impact': 'warning',  // yellow
  'Normal': 'default'   // grey
};

// Roster positions (actual in-game player positions)
export const ROSTER_POSITIONS = [
  'QB', 'HB', 'FB', 'WR', 'TE',           // Offense skill positions
  'LT', 'LG', 'C', 'RG', 'RT',            // Offensive line
  'LEDG', 'REDG', 'DT',                   // Defensive line
  'SAM', 'MIKE', 'WILL',                  // Linebackers
  'CB', 'FS', 'SS',                        // Secondary
  'K', 'P'                                 // Special teams
];

// Depth chart positions (includes roster positions + special positions they can fill)
export const DEPTH_CHART_POSITIONS = [
  // Base roster positions
  'QB', 'HB', 'FB', 'WR', 'TE',
  'LT', 'LG', 'C', 'RG', 'RT',
  'LEDG', 'REDG', 'DT',
  'SAM', 'MIKE', 'WILL',
  'CB', 'FS', 'SS',
  'K', 'P',
  // Special depth chart positions
  'KR',      // Kick Return
  'PR',      // Punt Return
  'KOS',     // Kickoff Specialist
  'LS',      // Long Snapper
  '3DRB',    // 3rd Down Running Back
  'PWHB',    // Power Running Back
  'SLWR',    // Slot Wide Receiver
  'RLE',     // Rush Left End
  'RRE',     // Rush Right End
  'RDT',     // Rush Defensive Tackle
  'SUBLB',   // Sub Linebacker
  'SLCB',    // Slot Cornerback
  'NT',      // Nose Tackle
  'GAD'      // Goal Line/Adaptive Defense
];

// Legacy alias for backward compatibility
export const POSITIONS = ROSTER_POSITIONS;

// Position archetypes mapping (all known archetypes per position in College Football 26)
export const POSITION_ARCHETYPES = {
  QB: ['Pocket Passer', 'Dual Threat', 'Backfield Creator', 'Pure Runner'],
  HB: ['Backfield Threat', 'Contact Seeker', 'East/West Playmaker', 'Elusive Bruiser', 'North/South Receiver', 'North/South Blocker'],
  FB: ['Blocking', 'Utility'],
  WR: ['Contested Specialist', 'Elusive Route Runner', 'Gadget', 'Gritty Possession', 'Physical Route Runner', 'Route Artist', 'Speedster'],
  TE: ['Gritty Possession', 'Physical Route Runner', 'Pure Possession', 'Pure Blocker', 'Vertical Threat'],
  LT: ['Agile', 'Pass Protector', 'Raw Strength', 'Well Rounded'],
  LG: ['Agile', 'Pass Protector', 'Raw Strength', 'Well Rounded'],
  C: ['Agile', 'Pass Protector', 'Raw Strength', 'Well Rounded'],
  RG: ['Agile', 'Pass Protector', 'Raw Strength', 'Well Rounded'],
  RT: ['Agile', 'Pass Protector', 'Raw Strength', 'Well Rounded'],
  LEDG: ['Edge Setter', 'Speed Rusher', 'Power Rusher', 'Pure Power'],
  REDG: ['Edge Setter', 'Speed Rusher', 'Power Rusher', 'Pure Power'],
  DT: ['Gap Specialist', 'Power Rusher', 'Pure Power', 'Speed Rusher'],
  SAM: ['Lurker', 'Signal Caller', 'Thumper'],
  MIKE: ['Lurker', 'Signal Caller', 'Thumper'],
  WILL: ['Lurker', 'Signal Caller', 'Thumper'],
  CB: ['Zone', 'Bump and Run', 'Boundary', 'Field'],
  FS: ['Box Specialist', 'Hybrid', 'Coverage Specialist'],
  SS: ['Box Specialist', 'Hybrid', 'Coverage Specialist'],
  K: ['Accurate', 'Power'],
  P: ['Accurate', 'Power'],
};

// Year classifications
export const YEARS = ['FR', 'SO', 'JR', 'SR', 'GRAD'];

// Ability levels for player abilities
export const ABILITY_LEVELS = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum'];

// Archetype abilities mapping
// Each position+archetype combination has physical and mental abilities
const QB_MENTAL = ['Winning Time', 'The Natural', 'Field General', 'Headstrong', 'Adrenaline'];
const HB_MENTAL = ['Winning Time', 'The Natural', 'Team Player', 'Adrenaline', 'Rollercoaster'];
const FB_MENTAL = HB_MENTAL;
const WR_MENTAL = ['Winning Time', 'The Natural', 'Team Player', 'Best Friend', 'Adrenaline'];
const TE_MENTAL = WR_MENTAL;
const DL_MENTAL = ['Winning Time', 'The Natural', 'Team Player', 'Instinct', 'Adrenaline'];
const LB_MENTAL = DL_MENTAL;
const CB_MENTAL = ['Legion', 'Winning Time', 'The Natural', 'Team Player', 'Adrenaline'];
const SAFETY_MENTAL = CB_MENTAL;
const KP_MENTAL = ['Clutch Kicker', 'Clearheaded', 'Field Flip'];

export const ARCHETYPE_ABILITIES = {
  QB: {
    'Pocket Passer': {
      physical: ['Resistance', 'Step Up', 'Sleight of Hand', 'Dot!', 'On Time'],
      mental: QB_MENTAL,
    },
    'Dual Threat': {
      physical: ['Downhill', 'Extender', 'Option King', 'Dot!', 'Mobile Resistance'],
      mental: QB_MENTAL,
    },
    'Backfield Creator': {
      physical: ['Off Platform', 'Pull Down', 'On Time', 'Sleight of Hand', 'Mobile Deadeye'],
      mental: QB_MENTAL,
    },
    'Pure Runner': {
      physical: ['Magician', 'Option King', 'Shifty', 'Side Step', 'Workhorse'],
      mental: QB_MENTAL,
    },
  },
  HB: {
    'Contact Seeker': {
      physical: ['Downhill', 'Workhorse', 'Battering Ram', 'Ball Security', 'Balanced'],
      mental: HB_MENTAL,
    },
    'East/West Playmaker': {
      physical: ['Recoup', 'Shifty', 'Side Step', '360', 'Arm Bar'],
      mental: HB_MENTAL,
    },
    'Backfield Threat': {
      physical: ['360', 'Safety Valve', 'Takeoff', 'Side Step', 'Recoup'],
      mental: HB_MENTAL,
    },
    'Elusive Bruiser': {
      physical: ['Shifty', 'Headfirst', 'Side Step', 'Downhill', 'Arm Bar'],
      mental: HB_MENTAL,
    },
    'North/South Receiver': {
      physical: ['Balanced', 'Arm Bar', 'Safety Valve', 'Headfirst', 'Downhill'],
      mental: HB_MENTAL,
    },
    'North/South Blocker': {
      physical: ['Headfirst', 'Balanced', 'Sidekick', 'Ball Security', 'Strong Grip'],
      mental: HB_MENTAL,
    },
  },
  FB: {
    'Blocking': {
      physical: ['Strong Grip', 'Second Level', 'Pocket Shield', 'Sidekick', 'Screen Enforcer'],
      mental: FB_MENTAL,
    },
    'Utility': {
      physical: ['Safety Valve', 'Ball Security', 'Balanced', 'Recoup', 'Workhorse'],
      mental: FB_MENTAL,
    },
  },
  WR: {
    'Speedster': {
      physical: ['Side Step', 'Double Dip', 'Takeoff', 'Recoup', 'Shifty'],
      mental: WR_MENTAL,
    },
    'Elusive Route Runner': {
      physical: ['360', 'Cutter', 'Double Dip', 'Recoup', 'Side Step'],
      mental: WR_MENTAL,
    },
    'Physical Route Runner': {
      physical: ['Downhill', 'Press Pro', 'Sure Hands', '50/50', 'Cutter'],
      mental: WR_MENTAL,
    },
    'Contested Specialist': {
      physical: ['50/50', 'Workhorse', 'Balanced', 'Headfirst', 'Downhill'],
      mental: WR_MENTAL,
    },
    'Gritty Possession': {
      physical: ['Second Level', 'Outside Shield', 'Strong Grip', 'Workhorse', 'Sure Hands'],
      mental: WR_MENTAL,
    },
    'Gadget': {
      physical: ['Side Step', 'Shifty', 'Dot!', 'Cutter', 'Extender'],
      mental: WR_MENTAL,
    },
    'Route Artist': {
      physical: ['Cutter', 'Lay Out', 'Recoup', 'Double Dip', 'Sure Hands'],
      mental: WR_MENTAL,
    },
  },
  TE: {
    'Gritty Possession': {
      physical: ['Workhorse', 'Strong Grip', 'Sure Hands', 'Outside Shield', 'Battering Ram'],
      mental: TE_MENTAL,
    },
    'Physical Route Runner': {
      physical: ['Balanced', '50/50', 'Cutter', 'Downhill', 'Sure Hands'],
      mental: TE_MENTAL,
    },
    'Pure Possession': {
      physical: ['Sure Hands', 'Wear Down', 'Strong Grip', 'Outside Shield', 'Balanced'],
      mental: TE_MENTAL,
    },
    'Pure Blocker': {
      physical: ['Strong Grip', 'Outside Shield', 'Pocket Shield', 'Quick Drop'],
      mental: TE_MENTAL,
    },
    'Vertical Threat': {
      physical: ['Workhorse', 'Balanced', 'Takeoff', 'Recoup'],
      mental: TE_MENTAL,
    },
  },
  LT: {
    'Agile': {
      physical: ['Screen Enforcer', 'Quick Step', 'Option Shield', 'Outside Shield', 'Quick Drop'],
      mental: [],
    },
    'Pass Protector': {
      physical: ['Pocket Shield', 'Quick Drop', 'PA Shield', 'Strong Grip', 'Wear Down'],
      mental: [],
    },
    'Raw Strength': {
      physical: ['Strong Grip', 'Workhorse', 'Second Level', 'Inside Shield', 'Ground and Pound'],
      mental: [],
    },
    'Well Rounded': {
      physical: ['Option Shield', 'Pocket Shield', 'Strong Grip'],
      mental: [],
    },
  },
  LEDG: {
    'Edge Setter': {
      physical: ['Grip Breaker', 'Inside Disruptor', 'Outside Disruptor', 'Option Disruptor', 'Workhorse'],
      mental: DL_MENTAL,
    },
    'Power Rusher': {
      physical: ['Grip Breaker', 'Inside Disruptor', 'Outside Disruptor', 'Workhorse', 'Duress'],
      mental: DL_MENTAL,
    },
    'Speed Rusher': {
      physical: ['Pocket Disruptor', 'Quick Jump', 'Duress', 'Takedown', 'Recoup'],
      mental: DL_MENTAL,
    },
    'Pure Power': {
      physical: ['Workhorse', 'Grip Breaker', 'Pocket Disruptor'],
      mental: DL_MENTAL,
    },
  },
  DT: {
    'Gap Specialist': {
      physical: ['Pocket Disruptor', 'Rear Edge Physical Speed', 'Workhorse', 'Grip Breaker'],
      mental: DL_MENTAL,
    },
    'Power Rusher': {
      physical: ['Grip Breaker', 'Inside Disruptor', 'Outside Disruptor', 'Workhorse', 'Duress'],
      mental: DL_MENTAL,
    },
    'Pure Power': {
      physical: ['Workhorse', 'Grip Breaker', 'Pocket Disruptor'],
      mental: DL_MENTAL,
    },
    'Speed Rusher': {
      physical: ['Pocket Disruptor', 'Quick Jump', 'Duress', 'Takedown', 'Recoup'],
      mental: DL_MENTAL,
    },
  },
  SAM: {
    'Signal Caller': {
      physical: ['Take Down', 'Wrap Up', 'Workhorse', 'Blow Up', 'Hammer'],
      mental: LB_MENTAL,
    },
    'Lurker': {
      physical: ['Knockout', 'House Call', 'Robber', 'Bouncer', 'Wrap Up'],
      mental: LB_MENTAL,
    },
    'Thumper': {
      physical: ['Grip Breaker', 'Wrap Up', 'Aftershock', 'Blow Up', 'Hammer'],
      mental: LB_MENTAL,
    },
  },
  CB: {
    'Boundary': {
      physical: ['Jammer', 'Blanket Coverage', 'Lay Out', 'Wrap Up', 'Quick Jump'],
      mental: CB_MENTAL,
    },
    'Bump and Run': {
      physical: ['Blanket Coverage', 'Jammer', 'House Call', 'Ballhawk', 'Knockout'],
      mental: CB_MENTAL,
    },
    'Field': {
      physical: ['Wrap Up', 'Robber', 'Knockout', 'Blanket Coverage', 'Ballhawk'],
      mental: CB_MENTAL,
    },
    'Zone': {
      physical: ['Knockout', 'Lay Out', 'House Call', 'Ballhawk', 'Bouncer'],
      mental: CB_MENTAL,
    },
  },
  FS: {
    'Box Specialist': {
      physical: ['Aftershock', 'Wrap Up', 'Hammer', 'Blow Up', 'Workhorse'],
      mental: SAFETY_MENTAL,
    },
    'Coverage Specialist': {
      physical: ['Ballhawk', 'Lay Out', 'House Call', 'Robber', 'Knockout'],
      mental: SAFETY_MENTAL,
    },
    'Hybrid': {
      physical: ['Wrap Up', 'Hammer', 'Knockout', 'Aftershock', 'Blow Up'],
      mental: SAFETY_MENTAL,
    },
  },
  K: {
    'Accurate': {
      physical: ['Chip Shot', 'Deep Range', 'Mega Leg'],
      mental: KP_MENTAL,
    },
    'Power': {
      physical: ['Deep Range', 'Mega Leg', 'Coffin Corner'],
      mental: KP_MENTAL,
    },
  },
};

// Shared position abilities: positions that use the same abilities as another position
ARCHETYPE_ABILITIES.LG = ARCHETYPE_ABILITIES.LT;
ARCHETYPE_ABILITIES.C = ARCHETYPE_ABILITIES.LT;
ARCHETYPE_ABILITIES.RG = ARCHETYPE_ABILITIES.LT;
ARCHETYPE_ABILITIES.RT = ARCHETYPE_ABILITIES.LT;
ARCHETYPE_ABILITIES.REDG = ARCHETYPE_ABILITIES.LEDG;
ARCHETYPE_ABILITIES.MIKE = ARCHETYPE_ABILITIES.SAM;
ARCHETYPE_ABILITIES.WILL = ARCHETYPE_ABILITIES.SAM;
ARCHETYPE_ABILITIES.SS = ARCHETYPE_ABILITIES.FS;
ARCHETYPE_ABILITIES.P = ARCHETYPE_ABILITIES.K;

/**
 * Get abilities for a position/archetype combination
 * Returns { physical: [...], mental: [...] } or null if not found
 */
export const getAbilitiesForArchetype = (position, archetype) => {
  if (!position || !archetype) return null;
  const positionAbilities = ARCHETYPE_ABILITIES[position];
  if (!positionAbilities) return null;
  return positionAbilities[archetype] || null;
};

// Attribute name mapping (from abbreviations to full names for display)
export const ATTRIBUTE_DISPLAY_NAMES = {
  OVR: 'Overall',
  SPD: 'Speed',
  ACC: 'Acceleration',
  AGI: 'Agility',
  COD: 'Change of Direction',
  STR: 'Strength',
  AWR: 'Awareness',
  CAR: 'Carrying',
  BCV: 'Ball Carrier Vision',
  BTK: 'Break Tackle',
  TRK: 'Trucking',
  SFA: 'Stiff Arm',
  SPM: 'Spin Move',
  JKM: 'Juke Move',
  CTH: 'Catching',
  CIT: 'Catch in Traffic',
  SPC: 'Spectacular Catch',
  SRR: 'Short Route Running',
  MRR: 'Medium Route Running',
  DRR: 'Deep Route Running',
  RLS: 'Release',
  JMP: 'Jumping',
  THP: 'Throw Power',
  SAC: 'Short Accuracy',
  MAC: 'Medium Accuracy',
  DAC: 'Deep Accuracy',
  RUN: 'Throw on the Run',
  TUP: 'Throw Under Pressure',
  BSK: 'Break Sack',
  PAC: 'Play Action',
  PBK: 'Pass Block',
  PBP: 'Pass Block Power',
  PBF: 'Pass Block Finesse',
  RBK: 'Run Block',
  RBP: 'Run Block Power',
  RBF: 'Run Block Finesse',
  LBK: 'Lead Block',
  IBL: 'Impact Blocking',
  PRC: 'Play Recognition',
  TAK: 'Tackle',
  POW: 'Hit Power',
  BSH: 'Block Shedding',
  FMV: 'Finesse Moves',
  PMV: 'Power Moves',
  PUR: 'Pursuit',
  MCV: 'Man Coverage',
  ZCV: 'Zone Coverage',
  PRS: 'Press',
  RET: 'Return',
  KPW: 'Kick Power',
  KAC: 'Kick Accuracy',
  STA: 'Stamina',
  TGH: 'Toughness',
  INJ: 'Injury',
  LSP: 'Long Snapper'
};

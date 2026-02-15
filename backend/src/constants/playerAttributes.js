/**
 * Player Attributes and Constants for College Football 26
 * All player ratings, physical attributes, and development traits
 */

// All 55 player ratings
const PLAYER_RATINGS = [
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
  'RUN',   // Run Blocking
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
const PHYSICAL_ATTRIBUTES = [
  'height',  // Height (e.g., "6'2\"")
  'weight'   // Weight in pounds
];

// Development traits
const DEV_TRAITS = [
  'Normal',
  'Impact',
  'Star',
  'Elite'
];

// Development trait colors (Material-UI color prop values)
const DEV_TRAIT_COLORS = {
  'Elite': 'primary',   // blue
  'Star': 'success',    // green
  'Impact': 'warning',  // yellow
  'Normal': 'default'   // grey
};

// Roster positions (actual in-game player positions)
const ROSTER_POSITIONS = [
  'QB', 'HB', 'FB', 'WR', 'TE',           // Offense skill positions
  'LT', 'LG', 'C', 'RG', 'RT',            // Offensive line
  'LEDG', 'REDG', 'DT',                   // Defensive line
  'SAM', 'MIKE', 'WILL',                  // Linebackers
  'CB', 'FS', 'SS',                        // Secondary
  'K', 'P'                                 // Special teams
];

// Depth chart positions (includes roster positions + special positions they can fill)
const DEPTH_CHART_POSITIONS = [
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
const POSITIONS = ROSTER_POSITIONS;

// Position archetypes mapping (all known archetypes per position in College Football 26)
const POSITION_ARCHETYPES = {
  QB: ['Pocket Passer', 'Dual Threat', 'Backfield Creator', 'Pure Runner'],
  HB: ['Backfield Threat', 'Contact Seeker', 'Balanced', 'East/West Playmaker', 'Elusive', 'Bruiser'],
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
  DT: ['Gap Specialist', 'Power Rusher', 'Pure Power'],
  SAM: ['Lurker', 'Signal Caller', 'Take Down', 'Thumper'],
  MIKE: ['Lurker', 'Signal Caller', 'Take Down', 'Thumper'],
  WILL: ['Lurker', 'Signal Caller', 'Take Down', 'Thumper'],
  CB: ['Boundary Jammer', 'Blanket Coverage', 'Bump and Run', 'Coverage Specialist'],
  FS: ['Box Specialist', 'Hybrid', 'Coverage Specialist'],
  SS: ['Box Specialist', 'Hybrid', 'Coverage Specialist'],
  K: ['Accurate', 'Power'],
  P: ['Accurate', 'Power'],
};

// Year classifications
const YEARS = ['FR', 'SO', 'JR', 'SR', 'GRAD'];

// Attribute name mapping (from abbreviations to full names for display)
const ATTRIBUTE_DISPLAY_NAMES = {
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
  RUN: 'Run Blocking',
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

module.exports = {
  PLAYER_RATINGS,
  PHYSICAL_ATTRIBUTES,
  DEV_TRAITS,
  DEV_TRAIT_COLORS,
  POSITIONS,
  ROSTER_POSITIONS,
  DEPTH_CHART_POSITIONS,
  POSITION_ARCHETYPES,
  YEARS,
  ATTRIBUTE_DISPLAY_NAMES
};

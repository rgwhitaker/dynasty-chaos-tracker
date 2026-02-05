/**
 * Player Attributes and Constants for College Football 26
 * All player ratings, physical attributes, and development traits
 */

// All 54 player ratings
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
  'POW',   // Power Moves
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

// Position groups
export const POSITIONS = [
  'QB', 'RB', 'FB', 'WR', 'TE', 
  'OL', 'C', 'OG', 'OT',
  'DL', 'DE', 'DT', 
  'LB', 'MLB', 'OLB', 
  'CB', 'S', 'SS', 'FS',
  'K', 'P'
];

// Year classifications
export const YEARS = ['FR', 'SO', 'JR', 'SR', 'GRAD'];

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
  POW: 'Power Moves',
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

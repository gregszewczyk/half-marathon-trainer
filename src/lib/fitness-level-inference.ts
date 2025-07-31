// Smart fitness level inference based on personal bests
// Combines user selection with PB-based inference

export type FitnessLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

interface PersonalBests {
  pb5k?: string;
  pb10k?: string;
  pbHalfMarathon?: string;
  pbMarathon?: string;
  pbCustom?: string;
  pbCustomDistance?: string;
}

/**
 * Convert time string (MM:SS or H:MM:SS) to seconds
 */
function timeToSeconds(timeStr: string): number {
  if (!timeStr || timeStr.trim() === '') return 0;
  
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    // MM:SS format
    const minutes = parseInt(parts[0] || '0', 10) || 0;
    const seconds = parseInt(parts[1] || '0', 10) || 0;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // H:MM:SS format
    const hours = parseInt(parts[0] || '0', 10) || 0;
    const minutes = parseInt(parts[1] || '0', 10) || 0;
    const seconds = parseInt(parts[2] || '0', 10) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Infer fitness level from 5K personal best
 */
function inferFrom5K(pb5k: string): FitnessLevel | null {
  const seconds = timeToSeconds(pb5k);
  if (seconds === 0) return null;
  
  if (seconds <= 18 * 60) return 'ELITE';        // Sub-18:00 (3:36/km)
  if (seconds <= 22 * 60) return 'ADVANCED';     // Sub-22:00 (4:24/km)
  if (seconds <= 28 * 60) return 'INTERMEDIATE'; // Sub-28:00 (5:36/km)
  return 'BEGINNER';                             // 28:00+ (slower than 5:36/km)
}

/**
 * Infer fitness level from 10K personal best
 */
function inferFrom10K(pb10k: string): FitnessLevel | null {
  const seconds = timeToSeconds(pb10k);
  if (seconds === 0) return null;
  
  if (seconds <= 37 * 60) return 'ELITE';        // Sub-37:00 (3:42/km)
  if (seconds <= 45 * 60) return 'ADVANCED';     // Sub-45:00 (4:30/km)
  if (seconds <= 58 * 60) return 'INTERMEDIATE'; // Sub-58:00 (5:48/km)
  return 'BEGINNER';                             // 58:00+ (slower than 5:48/km)
}

/**
 * Infer fitness level from Half Marathon personal best
 */
function inferFromHalfMarathon(pbHalf: string): FitnessLevel | null {
  const seconds = timeToSeconds(pbHalf);
  if (seconds === 0) return null;
  
  if (seconds <= 75 * 60) return 'ELITE';        // Sub-1:15:00 (3:33/km)
  if (seconds <= 95 * 60) return 'ADVANCED';     // Sub-1:35:00 (4:30/km)  
  if (seconds <= 125 * 60) return 'INTERMEDIATE'; // Sub-2:05:00 (5:55/km)
  return 'BEGINNER';                             // 2:05:00+ (slower than 5:55/km)
}

/**
 * Infer fitness level from Marathon personal best
 */
function inferFromMarathon(pbMarathon: string): FitnessLevel | null {
  const seconds = timeToSeconds(pbMarathon);
  if (seconds === 0) return null;
  
  if (seconds <= 150 * 60) return 'ELITE';       // Sub-2:30:00 (3:33/km)
  if (seconds <= 200 * 60) return 'ADVANCED';    // Sub-3:20:00 (4:44/km)
  if (seconds <= 270 * 60) return 'INTERMEDIATE'; // Sub-4:30:00 (6:24/km)
  return 'BEGINNER';                             // 4:30:00+ (slower than 6:24/km)
}

/**
 * Smart fitness level inference that combines user selection with PB analysis
 */
export function inferFitnessLevel(
  userSelection: FitnessLevel,
  personalBests: PersonalBests
): FitnessLevel {
  // Collect all PB-based inferences
  const pbInferences: FitnessLevel[] = [];
  
  if (personalBests.pb5k) {
    const inference = inferFrom5K(personalBests.pb5k);
    if (inference) pbInferences.push(inference);
  }
  
  if (personalBests.pb10k) {
    const inference = inferFrom10K(personalBests.pb10k);
    if (inference) pbInferences.push(inference);
  }
  
  if (personalBests.pbHalfMarathon) {
    const inference = inferFromHalfMarathon(personalBests.pbHalfMarathon);
    if (inference) pbInferences.push(inference);
  }
  
  if (personalBests.pbMarathon) {
    const inference = inferFromMarathon(personalBests.pbMarathon);
    if (inference) pbInferences.push(inference);
  }
  
  // If no PBs provided, use user selection
  if (pbInferences.length === 0) {
    console.log(`🎯 Fitness level: ${userSelection} (user selection, no PBs provided)`);
    return userSelection;
  }
  
  // Calculate most common inference from PBs
  const levelCounts = pbInferences.reduce((acc, level) => {
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<FitnessLevel, number>);
  
  const sortedEntries = Object.entries(levelCounts).sort(([,a], [,b]) => b - a);
  if (sortedEntries.length === 0) {
    console.log(`🎯 Fitness level: ${userSelection} (user selection, no valid PB inferences)`);
    return userSelection;
  }
  
  const inferredLevel = sortedEntries[0]![0] as FitnessLevel;
  
  // Compare with user selection
  const levelOrder = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE'];
  const userIndex = levelOrder.indexOf(userSelection);
  const inferredIndex = levelOrder.indexOf(inferredLevel);
  
  // If PB inference is significantly different from user selection, use PB
  if (Math.abs(userIndex - inferredIndex) >= 2) {
    console.log(`🎯 Fitness level: ${inferredLevel} (PB override - user said ${userSelection}, but PBs suggest ${inferredLevel})`);
    return inferredLevel;
  }
  
  // If close, use the higher of the two (more conservative training)
  const finalLevel = userIndex > inferredIndex ? userSelection : inferredLevel;
  console.log(`🎯 Fitness level: ${finalLevel} (blend of user selection ${userSelection} and PB inference ${inferredLevel})`);
  
  return finalLevel;
}

/**
 * Get fitness level description for logging/display
 */
export function getFitnessLevelDescription(level: FitnessLevel): string {
  const descriptions = {
    BEGINNER: 'New to running or just starting',
    INTERMEDIATE: 'Regular runner, some race experience',
    ADVANCED: 'Experienced racer, consistent training',
    ELITE: 'Competitive runner, high performance'
  };
  return descriptions[level];
}
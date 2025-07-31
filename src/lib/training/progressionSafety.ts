/**
 * Training Progression Safety Boundaries
 * Based on research: "Weekly Distance Progression for Runners: Beyond the 10% Rule"
 * Implements evidence-based progression limits to prevent overuse injuries
 */

export interface UserTrainingProfile {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  raceType: '5K' | '10K' | 'Half Marathon' | 'Marathon';
  trainingDaysPerWeek: number;
  injuryHistory?: string[] | undefined;
  currentWeeklyDistance: number;
  weeksInCurrentVolume: number; // How long at current volume
}

export interface ProgressionResult {
  isValid: boolean;
  adjustedDistance: number;
  reasoning: string;
  method: 'percentage' | 'equilibrium' | 'acwr' | 'race_specific';
  warningLevel: 'safe' | 'caution' | 'danger';
}

export class ProgressionSafetyValidator {
  
  /**
   * Validates weekly distance increase against research-backed safety boundaries
   */
  static validateWeeklyIncrease(
    previousWeekDistance: number,
    proposedWeekDistance: number,
    userProfile: UserTrainingProfile,
    recentWeekDistances: number[] = [] // Last 4 weeks for ACWR calculation
  ): ProgressionResult {
    
    // Calculate percentage increase
    const percentageIncrease = (proposedWeekDistance - previousWeekDistance) / previousWeekDistance;
    
    // 1. Check basic percentage limits by experience level
    const percentageCheck = this.validatePercentageIncrease(
      percentageIncrease, 
      userProfile.fitnessLevel,
      userProfile.injuryHistory
    );
    
    // 2. Check Jack Daniels' Equilibrium Method
    const equilibriumCheck = this.validateEquilibriumMethod(
      previousWeekDistance,
      proposedWeekDistance,
      userProfile.trainingDaysPerWeek,
      userProfile.weeksInCurrentVolume
    );
    
    // 3. Check ACWR if we have historical data
    const acwrCheck = this.validateACWR(proposedWeekDistance, recentWeekDistances);
    
    // 4. Check race-specific volume limits
    const raceSpecificCheck = this.validateRaceSpecificVolume(
      proposedWeekDistance,
      userProfile.raceType,
      userProfile.fitnessLevel
    );
    
    // 5. Apply most restrictive limit
    const allChecks = [percentageCheck, equilibriumCheck, acwrCheck, raceSpecificCheck]
      .filter(check => check.isValid === false);
    
    if (allChecks.length === 0) {
      return {
        isValid: true,
        adjustedDistance: proposedWeekDistance,
        reasoning: 'Proposed increase meets all safety criteria',
        method: 'percentage',
        warningLevel: 'safe'
      };
    }
    
    // Return the most restrictive adjustment
    const mostRestrictive = allChecks.reduce((prev, current) => 
      prev.adjustedDistance < current.adjustedDistance ? prev : current
    );
    
    return mostRestrictive;
  }
  
  /**
   * Research-based percentage limits by experience level
   */
  private static validatePercentageIncrease(
    percentageIncrease: number,
    fitnessLevel: string,
    injuryHistory?: string[]
  ): ProgressionResult {
    
    const hasInjuryHistory = injuryHistory && injuryHistory.length > 0;
    
    // Conservative limits for injury-prone runners
    const maxIncreases = {
      beginner: hasInjuryHistory ? 0.08 : 0.10,    // 8-10% for beginners
      intermediate: hasInjuryHistory ? 0.10 : 0.15, // 10-15% for intermediate
      advanced: hasInjuryHistory ? 0.12 : 0.20      // 12-20% for advanced
    };
    
    const maxIncrease = maxIncreases[fitnessLevel as keyof typeof maxIncreases] || 0.10;
    
    if (percentageIncrease <= maxIncrease) {
      return {
        isValid: true,
        adjustedDistance: 0, // Not used when valid
        reasoning: `${Math.round(percentageIncrease * 100)}% increase is within safe limits for ${fitnessLevel} runners`,
        method: 'percentage',
        warningLevel: percentageIncrease > maxIncrease * 0.8 ? 'caution' : 'safe'
      };
    }
    
    return {
      isValid: false,
      adjustedDistance: Math.floor(maxIncrease * 100), // Return max safe percentage
      reasoning: `${Math.round(percentageIncrease * 100)}% increase exceeds safe limit of ${Math.round(maxIncrease * 100)}% for ${fitnessLevel}${hasInjuryHistory ? ' (with injury history)' : ''}`,
      method: 'percentage',
      warningLevel: 'danger'
    };
  }
  
  /**
   * Jack Daniels' Equilibrium Method validation
   * Max increase = number of training days per week
   */
  private static validateEquilibriumMethod(
    previousDistance: number,
    proposedDistance: number,
    trainingDaysPerWeek: number,
    weeksAtCurrentVolume: number
  ): ProgressionResult {
    
    const increase = proposedDistance - previousDistance;
    const maxIncrease = trainingDaysPerWeek; // Daniels' rule: max increase = training days
    
    // If they've been at current volume for <3 weeks, be more conservative
    const adjustedMaxIncrease = weeksAtCurrentVolume < 3 ? maxIncrease * 0.7 : maxIncrease;
    
    if (increase <= adjustedMaxIncrease) {
      return {
        isValid: true,
        adjustedDistance: 0,
        reasoning: `${increase}km increase follows Daniels' Equilibrium Method (max ${Math.round(adjustedMaxIncrease)}km)`,
        method: 'equilibrium',
        warningLevel: 'safe'
      };
    }
    
    return {
      isValid: false,
      adjustedDistance: previousDistance + adjustedMaxIncrease,
      reasoning: `${increase}km increase exceeds Daniels' limit of ${Math.round(adjustedMaxIncrease)}km (${trainingDaysPerWeek} training days${weeksAtCurrentVolume < 3 ? ', needs more adaptation time' : ''})`,
      method: 'equilibrium',
      warningLevel: 'danger'
    };
  }
  
  /**
   * Acute-Chronic Workload Ratio validation
   * Optimal range: 0.8-1.3, danger zone: >1.5
   */
  private static validateACWR(
    proposedDistance: number,
    recentWeekDistances: number[]
  ): ProgressionResult {
    
    if (recentWeekDistances.length < 4) {
      return {
        isValid: true,
        adjustedDistance: 0,
        reasoning: 'Insufficient historical data for ACWR calculation',
        method: 'acwr',
        warningLevel: 'safe'
      };
    }
    
    const chronicLoad = recentWeekDistances.reduce((sum, dist) => sum + dist, 0) / 4;
    const acwr = proposedDistance / chronicLoad;
    
    if (acwr >= 0.8 && acwr <= 1.3) {
      return {
        isValid: true,
        adjustedDistance: 0,
        reasoning: `ACWR of ${acwr.toFixed(2)} is in optimal range (0.8-1.3)`,
        method: 'acwr',
        warningLevel: 'safe'
      };
    }
    
    if (acwr > 1.5) {
      return {
        isValid: false,
        adjustedDistance: Math.floor(chronicLoad * 1.3), // Cap at 1.3 ACWR
        reasoning: `ACWR of ${acwr.toFixed(2)} exceeds danger threshold (>1.5)`,
        method: 'acwr',
        warningLevel: 'danger'
      };
    }
    
    // ACWR too low (under-training) - allow but warn
    return {
      isValid: true,
      adjustedDistance: 0,
      reasoning: `ACWR of ${acwr.toFixed(2)} is low but safe (may be under-training)`,
      method: 'acwr',
      warningLevel: 'caution'
    };
  }
  
  /**
   * Race-specific volume validation based on research
   */
  private static validateRaceSpecificVolume(
    proposedDistance: number,
    raceType: string,
    fitnessLevel: string
  ): ProgressionResult {
    
    // Research-based weekly volume ranges by race and fitness level
    const volumeRanges = {
      '5K': {
        beginner: { min: 8, max: 15, optimal: 12 },
        intermediate: { min: 20, max: 35, optimal: 28 },
        advanced: { min: 40, max: 55, optimal: 48 }
      },
      '10K': {
        beginner: { min: 10, max: 20, optimal: 15 },
        intermediate: { min: 20, max: 35, optimal: 28 },
        advanced: { min: 40, max: 55, optimal: 48 }
      },
      'Half Marathon': {
        beginner: { min: 20, max: 30, optimal: 25 },
        intermediate: { min: 30, max: 45, optimal: 38 },
        advanced: { min: 45, max: 60, optimal: 53 }
      },
      'Marathon': {
        beginner: { min: 30, max: 40, optimal: 35 },
        intermediate: { min: 40, max: 55, optimal: 48 },
        advanced: { min: 55, max: 70, optimal: 63 }
      }
    };
    
    const raceData = volumeRanges[raceType as keyof typeof volumeRanges];
    const range = raceData ? raceData[fitnessLevel as keyof typeof raceData] : null;
    
    if (!range) {
      return {
        isValid: true,
        adjustedDistance: 0,
        reasoning: 'Unknown race type or fitness level',
        method: 'race_specific',
        warningLevel: 'safe'
      };
    }
    
    if (proposedDistance <= range.max) {
      const warningLevel = proposedDistance > range.optimal ? 'caution' : 'safe';
      return {
        isValid: true,
        adjustedDistance: 0,
        reasoning: `${proposedDistance}km is within ${raceType} range for ${fitnessLevel} (${range.min}-${range.max}km)`,
        method: 'race_specific',
        warningLevel
      };
    }
    
    return {
      isValid: false,
      adjustedDistance: range.max,
      reasoning: `${proposedDistance}km exceeds research-based maximum of ${range.max}km for ${fitnessLevel} ${raceType} training`,
      method: 'race_specific',
      warningLevel: 'danger'
    };
  }
  
  /**
   * Check if a cutback week is needed based on research
   */
  static needsCutbackWeek(weeksAtCurrentVolume: number, fitnessLevel: string): boolean {
    // Research suggests cutback every 3-4 weeks
    const cutbackFrequency = fitnessLevel === 'beginner' ? 3 : 4;
    return weeksAtCurrentVolume >= cutbackFrequency;
  }
  
  /**
   * Calculate cutback week volume (15-30% reduction)
   */
  static calculateCutbackVolume(currentVolume: number, fitnessLevel: string): number {
    const reductionPercent = fitnessLevel === 'beginner' ? 0.25 : 0.20; // 25% for beginners, 20% for others
    return Math.floor(currentVolume * (1 - reductionPercent));
  }
}
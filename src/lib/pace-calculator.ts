// 🚀 COMPREHENSIVE PACE CALCULATOR
// Scientific pace zone calculations using McMillan Running Calculator and Jack Daniels VDOT formulas
// Replaces the simplistic pace calculations in TrainingCalendar.tsx

interface PersonalBests {
  pb5k?: string;
  pb10k?: string;
  pbHalfMarathon?: string;
  pbMarathon?: string;
  pbCustom?: string;
  pbCustomDistance?: number;
}

interface PaceZones {
  recovery: string;
  easy: string;
  marathon: string;
  threshold: string;
  interval: string;
  repetition: string;
}

interface PaceCalculatorConfig {
  fitnessLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';
  personalBests: PersonalBests;
  targetTime: string;
  targetDistance: number; // in km
}

export class PaceCalculator {
  private config: PaceCalculatorConfig;
  private vdot: number;

  constructor(config: PaceCalculatorConfig) {
    this.config = config;
    this.vdot = this.calculateVDOT();
  }

  /**
   * Calculate VDOT (VO2 Max equivalent) from personal bests using Jack Daniels formula
   */
  private calculateVDOT(): number {
    const { personalBests } = this.config;
    
    // Convert time string (MM:SS or HH:MM:SS) to seconds
    const timeToSeconds = (timeStr: string): number => {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        return (parts[0] || 0) * 60 + (parts[1] || 0);
      } else if (parts.length === 3) {
        return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
      }
      return 0;
    };

    // VDOT calculation using Jack Daniels formula
    const calculateVDOTFromRace = (timeSeconds: number, distanceKm: number): number => {
      const velocityMPS = (distanceKm * 1000) / timeSeconds; // meters per second
      const vo2 = -4.6 + 0.182258 * velocityMPS + 0.000104 * Math.pow(velocityMPS, 2);
      const percentVO2Max = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeSeconds) + 0.2989558 * Math.exp(-0.1932605 * timeSeconds);
      return vo2 / percentVO2Max;
    };

    let bestVDOT = 35; // Default for beginners

    // Calculate VDOT from available personal bests
    if (personalBests.pb5k) {
      const vdot5k = calculateVDOTFromRace(timeToSeconds(personalBests.pb5k), 5);
      bestVDOT = Math.max(bestVDOT, vdot5k);
    }

    if (personalBests.pb10k) {
      const vdot10k = calculateVDOTFromRace(timeToSeconds(personalBests.pb10k), 10);
      bestVDOT = Math.max(bestVDOT, vdot10k);
    }

    if (personalBests.pbHalfMarathon) {
      const vdotHM = calculateVDOTFromRace(timeToSeconds(personalBests.pbHalfMarathon), 21.0975);
      bestVDOT = Math.max(bestVDOT, vdotHM);
    }

    if (personalBests.pbMarathon) {
      const vdotM = calculateVDOTFromRace(timeToSeconds(personalBests.pbMarathon), 42.195);
      bestVDOT = Math.max(bestVDOT, vdotM);
    }

    if (personalBests.pbCustom && personalBests.pbCustomDistance) {
      const vdotCustom = calculateVDOTFromRace(timeToSeconds(personalBests.pbCustom), personalBests.pbCustomDistance);
      bestVDOT = Math.max(bestVDOT, vdotCustom);
    }

    // Apply fitness level scaling
    const fitnessMultipliers = {
      BEGINNER: 0.85,
      INTERMEDIATE: 1.0,
      ADVANCED: 1.1,
      ELITE: 1.2
    };

    const scaledVDOT = bestVDOT * fitnessMultipliers[this.config.fitnessLevel];
    
    console.log(`📊 VDOT Calculation: Raw=${bestVDOT.toFixed(1)}, Scaled=${scaledVDOT.toFixed(1)}, Level=${this.config.fitnessLevel}`);
    
    return Math.max(25, Math.min(85, scaledVDOT)); // Clamp between reasonable values
  }

  /**
   * Calculate training pace zones based on target race pace and fitness level
   */
  public calculatePaceZones(): PaceZones {
    // 🚀 FIXED: Use target race pace as baseline instead of flawed VDOT->velocity formula
    const targetTime = this.config.targetTime;
    const targetDistance = this.config.targetDistance;
    
    // Calculate target race pace in seconds per km
    const timeToSeconds = (timeStr: string): number => {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        return (parts[0] || 0) * 60 + (parts[1] || 0);
      } else if (parts.length === 3) {
        return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
      }
      return 7200; // Default 2 hours
    };

    const raceTimeSeconds = timeToSeconds(targetTime);
    const racePaceSeconds = raceTimeSeconds / targetDistance; // seconds per km for target race
    
    console.log(`🎯 Target: ${targetTime} for ${targetDistance}km = ${this.secondsToPace(racePaceSeconds)} per km`);
    
    // 🚀 FIXED: Use proven pace relationships based on running research
    const fitnessAdjustments = {
      BEGINNER: 1.1,    // 10% slower for safety
      INTERMEDIATE: 1.0, // No adjustment
      ADVANCED: 0.95,   // 5% faster
      ELITE: 0.90       // 10% faster
    };
    
    const adjustment = fitnessAdjustments[this.config.fitnessLevel];
    const adjustedRacePace = racePaceSeconds * adjustment;
    
    // Calculate training zones using established relationships
    const zones = {
      // Recovery: 60-90 seconds slower than race pace
      recovery: this.secondsToPace(adjustedRacePace + 75),
      
      // Easy: 45-60 seconds slower than race pace  
      easy: this.secondsToPace(adjustedRacePace + 50),
      
      // Marathon: slightly faster than target race pace (for half marathon training)
      marathon: this.secondsToPace(adjustedRacePace - 5),
      
      // Threshold: 15-25 seconds faster than race pace
      threshold: this.secondsToPace(adjustedRacePace - 20),
      
      // Interval: 30-40 seconds faster than race pace
      interval: this.secondsToPace(adjustedRacePace - 35),
      
      // Repetition: 50-60 seconds faster than race pace
      repetition: this.secondsToPace(adjustedRacePace - 55)
    };

    console.log('🎯 Fixed Pace Zones:', zones);
    return zones;
  }
  
  /**
   * Convert seconds to MM:SS pace format
   */
  private secondsToPace(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get pace for specific session type with contextual adjustments
   */
  public getPaceForSession(
    sessionType: string, 
    sessionSubType?: string, 
    distance?: number,
    weatherTemp?: number
  ): string {
    const zones = this.calculatePaceZones();
    
    // Base pace selection
    let basePace = zones.easy;
    
    switch (sessionSubType?.toLowerCase()) {
      case 'recovery':
        basePace = zones.recovery;
        break;
      case 'easy':
      case 'base':
        basePace = zones.easy;
        break;
      case 'long':
        // Long runs: slightly slower than marathon pace for aerobic development
        basePace = this.adjustPace(zones.marathon, 15); // 15 seconds slower
        break;
      case 'marathon':
      case 'mp':
        basePace = zones.marathon;
        break;
      case 'tempo':
      case 'threshold':
        basePace = zones.threshold;
        break;
      case 'intervals':
      case 'vo2max':
        basePace = zones.interval;
        break;
      case 'repetitions':
      case 'speed':
        basePace = zones.repetition;
        break;
      case 'fartlek':
        // Fartlek: mix of threshold and interval paces
        basePace = this.adjustPace(zones.threshold, -10); // 10 seconds faster than threshold
        break;
      case 'progression':
        // Progression runs start easy, finish at marathon/threshold
        basePace = zones.easy; // Start pace (could be enhanced to show range)
        break;
      default:
        basePace = zones.easy;
    }

    // Apply contextual adjustments
    let adjustedPace = basePace;

    // Distance adjustments for long runs
    if (distance && distance > 15 && sessionSubType?.toLowerCase() === 'long') {
      // Longer runs should be slower for aerobic development
      const distanceAdjustment = Math.min(20, (distance - 15) * 2); // Max 20 seconds slower
      adjustedPace = this.adjustPace(basePace, distanceAdjustment);
    }

    // Weather adjustments
    if (weatherTemp !== undefined) {
      const tempAdjustment = this.calculateTemperatureAdjustment(weatherTemp);
      adjustedPace = this.adjustPace(adjustedPace, tempAdjustment);
    }

    // Fitness level adjustments for safety
    const levelAdjustments = {
      BEGINNER: 15,    // 15 seconds slower for safety
      INTERMEDIATE: 0, // No adjustment
      ADVANCED: -5,    // 5 seconds faster
      ELITE: -10       // 10 seconds faster
    };

    const finalPace = this.adjustPace(adjustedPace, levelAdjustments[this.config.fitnessLevel]);
    
    console.log(`⏱️ Pace calculation: ${sessionSubType} ${distance ? distance + 'km' : ''} = ${finalPace} (base: ${basePace})`);
    
    return finalPace;
  }

  /**
   * Adjust pace by seconds (positive = slower, negative = faster)
   */
  private adjustPace(paceStr: string, adjustmentSeconds: number): string {
    const parts = paceStr.split(':').map(Number);
    const minutes = parts[0] || 0;
    const seconds = parts[1] || 0;
    const totalSeconds = minutes * 60 + seconds + adjustmentSeconds;
    
    // 🚀 FIXED: More reasonable pace limits - 2:30/km to 12:00/km
    const clampedSeconds = Math.max(150, Math.min(720, totalSeconds));
    
    const newMinutes = Math.floor(clampedSeconds / 60);
    const newSeconds = Math.round(clampedSeconds % 60);
    
    return `${newMinutes}:${newSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate temperature-based pace adjustment
   */
  private calculateTemperatureAdjustment(tempCelsius: number): number {
    // Optimal running temperature is around 10-15°C
    const optimalTemp = 12;
    const tempDiff = Math.abs(tempCelsius - optimalTemp);
    
    if (tempCelsius < -5) {
      return 20; // Very cold: 20 seconds slower
    } else if (tempCelsius > 25) {
      return Math.min(30, tempDiff * 1.5); // Hot weather: up to 30 seconds slower
    } else if (tempDiff > 10) {
      return Math.min(15, tempDiff * 0.8); // Moderate adjustment
    }
    
    return 0; // No adjustment for optimal conditions
  }

  /**
   * Predict race time for given distance based on current fitness
   */
  public predictRaceTime(distanceKm: number): string {
    // Use VDOT to predict race time using Jack Daniels equivalent performance table
    const raceIntensity = this.getRaceIntensity(distanceKm);
    const vo2Race = this.vdot * raceIntensity;
    
    // Convert VO2 to velocity
    const velocity = Math.sqrt((vo2Race + 4.6) / 0.182258 - 0.000104 * Math.pow(vo2Race + 4.6, 2));
    
    // Calculate race time
    const raceTimeSeconds = (distanceKm * 1000) / velocity;
    
    // Convert to HH:MM:SS format for longer distances
    const hours = Math.floor(raceTimeSeconds / 3600);
    const minutesFloat = (raceTimeSeconds % 3600) / 60;
    const minutes = Math.floor(minutesFloat);
    const secondsFloat = raceTimeSeconds % 60;
    const seconds = Math.round(secondsFloat);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Get race intensity (% of VO2 Max) for different distances
   */
  private getRaceIntensity(distanceKm: number): number {
    // Based on physiological research for race intensities
    if (distanceKm <= 1.5) return 1.05;      // Mile/1500m: 105%
    if (distanceKm <= 3) return 1.00;        // 3K: 100%
    if (distanceKm <= 5) return 0.98;        // 5K: 98%
    if (distanceKm <= 10) return 0.94;       // 10K: 94%
    if (distanceKm <= 15) return 0.90;       // 15K: 90%
    if (distanceKm <= 21.1) return 0.88;     // Half Marathon: 88%
    if (distanceKm <= 30) return 0.85;       // 30K: 85%
    if (distanceKm <= 42.2) return 0.83;     // Marathon: 83%
    return 0.80; // Ultra distances: 80%
  }

  /**
   * Get current VDOT value
   */
  public getVDOT(): number {
    return this.vdot;
  }

  /**
   * Get pace range for training zones
   */
  public getPaceRanges(): Record<string, { min: string; max: string; description: string }> {
    const zones = this.calculatePaceZones();
    
    return {
      recovery: {
        min: this.adjustPace(zones.recovery, -10),
        max: this.adjustPace(zones.recovery, 20),
        description: 'Very easy conversational pace for active recovery'
      },
      easy: {
        min: this.adjustPace(zones.easy, -10),
        max: this.adjustPace(zones.easy, 15),
        description: 'Comfortable conversational pace for aerobic base building'
      },
      marathon: {
        min: this.adjustPace(zones.marathon, -5),
        max: this.adjustPace(zones.marathon, 10),
        description: 'Sustainable race pace for marathon distance'
      },
      threshold: {
        min: this.adjustPace(zones.threshold, -5),
        max: this.adjustPace(zones.threshold, 10),
        description: 'Comfortably hard pace, lactate threshold'
      },
      interval: {
        min: this.adjustPace(zones.interval, -10),
        max: this.adjustPace(zones.interval, 5),
        description: 'Hard pace for VO2 Max development'
      },
      repetition: {
        min: this.adjustPace(zones.repetition, -15),
        max: this.adjustPace(zones.repetition, 5),
        description: 'Very fast pace for neuromuscular power and speed'
      }
    };
  }
}

/**
 * Factory function to create pace calculator from user profile
 */
export function createPaceCalculator(userProfile: {
  fitnessLevel?: string;
  pb5k?: string;
  pb10k?: string;
  pbHalfMarathon?: string;
  pbMarathon?: string;
  pbCustom?: string;
  pbCustomDistance?: number;
  targetTime?: string;
  raceType?: string;
}): PaceCalculator {
  const config: PaceCalculatorConfig = {
    fitnessLevel: (userProfile.fitnessLevel as any) || 'INTERMEDIATE',
    personalBests: {
      ...(userProfile.pb5k && { pb5k: userProfile.pb5k }),
      ...(userProfile.pb10k && { pb10k: userProfile.pb10k }),
      ...(userProfile.pbHalfMarathon && { pbHalfMarathon: userProfile.pbHalfMarathon }),
      ...(userProfile.pbMarathon && { pbMarathon: userProfile.pbMarathon }),
      ...(userProfile.pbCustom && { pbCustom: userProfile.pbCustom }),
      ...(userProfile.pbCustomDistance && { pbCustomDistance: userProfile.pbCustomDistance }),
    },
    targetTime: userProfile.targetTime || '2:00:00',
    targetDistance: userProfile.raceType === 'HALF_MARATHON' ? 21.0975 : 
                   userProfile.raceType === 'MARATHON' ? 42.195 : 21.0975
  };

  return new PaceCalculator(config);
}

export type { PaceZones, PaceCalculatorConfig };
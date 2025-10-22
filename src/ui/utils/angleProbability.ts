/**
 * Scientific angle probability calculations for different reaction mechanisms
 * Based on orbital symmetry, steric effects, and transition state geometry
 */

export interface AngleProbabilityResult {
  probability: number;
  description: string;
  isOptimal: boolean;
}

/**
 * Calculate reaction probability based on approach angle and reaction type
 * @param approachAngle - 0° = frontside, 90° = perpendicular, 180° = backside
 * @param reactionType - SN1, SN2, E1, E2, etc.
 * @returns Probability result with scientific explanation
 */
export const calculateAngleProbability = (approachAngle: number, reactionType: string): AngleProbabilityResult => {
  // approachAngle: 0° = frontside, 90° = perpendicular, 180° = backside
  
  if (reactionType.toLowerCase().includes('sn2')) {
    // SN2: MUST be backside attack (concerted mechanism)
    // Orbital symmetry requires nucleophile to approach from opposite side of leaving group
    if (approachAngle >= 160) {
      const probability = 1.0 - Math.pow((180 - approachAngle) / 20, 2); // Sharp falloff
      return {
        probability,
        description: 'Optimal backside attack for SN2',
        isOptimal: approachAngle >= 170
      };
    } else if (approachAngle >= 120) {
      const probability = 0.1 * Math.exp(-(160 - approachAngle) / 10); // Exponential decay
      return {
        probability,
        description: 'Suboptimal backside attack',
        isOptimal: false
      };
    } else {
      // Low angles (0-120°) - very poor but not impossible
      const probability = 0.01 * Math.exp(-approachAngle / 30); // Very low probability
      return {
        probability,
        description: 'Poor angle for SN2',
        isOptimal: false
      };
    }
  } 
  else if (reactionType.toLowerCase().includes('sn1')) {
    // SN1: Angle-insensitive (attacks planar carbocation intermediate)
    // Carbocation is sp2 hybridized, nucleophile can attack from any direction
    const probability = 0.7 + 0.3 * Math.random(); // 70-100% regardless of angle
    return {
      probability,
      description: 'SN1 is angle-insensitive (planar carbocation)',
      isOptimal: true
    };
  } 
  else if (reactionType.toLowerCase().includes('e2')) {
    // E2: Requires anti-periplanar geometry (H and leaving group opposite)
    // Transition state requires H-C-C-X dihedral angle of 180°
    const optimal = 180; // Anti-periplanar
    const deviation = Math.abs(approachAngle - optimal);
    if (deviation <= 20) {
      const probability = 1.0 - deviation / 40; // High probability near 180°
      return {
        probability,
        description: 'Optimal anti-periplanar geometry for E2',
        isOptimal: deviation <= 10
      };
    } else if (deviation <= 60) {
      const probability = 0.3 * Math.exp(-deviation / 20); // Moderate probability
      return {
        probability,
        description: 'Suboptimal geometry for E2',
        isOptimal: false
      };
    } else {
      return {
        probability: 0.05,
        description: 'Very low probability - syn elimination disfavored',
        isOptimal: false
      };
    }
  }
  else if (reactionType.toLowerCase().includes('e1')) {
    // E1: Like SN1, goes through carbocation intermediate
    // Angle-insensitive due to carbocation intermediate
    const probability = 0.6 + 0.4 * Math.random(); // Angle-insensitive
    return {
      probability,
      description: 'E1 is angle-insensitive (carbocation intermediate)',
      isOptimal: true
    };
  }
  
  // Default for unknown reaction types
  return {
    probability: 1.0,
    description: 'Unknown reaction type - assuming optimal',
    isOptimal: true
  };
};

/**
 * Get the optimal approach angle for a given reaction type
 * @param reactionType - SN1, SN2, E1, E2, etc.
 * @returns Optimal angle in degrees
 */
export const getOptimalAngle = (reactionType: string): number => {
  if (reactionType.toLowerCase().includes('sn2')) {
    return 180; // Backside attack required
  } else if (reactionType.toLowerCase().includes('e2')) {
    return 180; // Anti-periplanar required
  } else if (reactionType.toLowerCase().includes('sn1') || reactionType.toLowerCase().includes('e1')) {
    return 90; // Any angle works, but 90° is most general
  }
  return 90; // Default
};

/**
 * Check if an angle is optimal for the reaction type
 * @param approachAngle - Current approach angle
 * @param reactionType - Reaction mechanism type
 * @returns True if angle is optimal
 */
export const isOptimalAngle = (approachAngle: number, reactionType: string): boolean => {
  const optimal = getOptimalAngle(reactionType);
  const tolerance = reactionType.toLowerCase().includes('sn2') || reactionType.toLowerCase().includes('e2') ? 10 : 45;
  return Math.abs(approachAngle - optimal) <= tolerance;
};

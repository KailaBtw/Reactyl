/**
 * Reaction Configuration System
 * 
 * Data-driven configuration for different reaction types.
 * This replaces hardcoded behavior with configurable parameters.
 */

export interface PhysicsSettings {
  velocity: number;
  damping: number;
  mass: number;
  restitution: number;
  friction: number;
}

export interface OrientationSettings {
  method: 'backside-attack' | 'front-attack' | 'side-attack' | 'anti-coplanar' | 'generic';
  optimalApproachAngle: number;
  tolerance: number; // Degrees of tolerance from optimal angle
  rotationAxis: 'x' | 'y' | 'z';
  rotationAngle: number; // Radians
}

export interface CollisionSettings {
  detectionRadius: number;
  energyThreshold: number;
  orientationWeight: number;
  temperatureWeight: number;
  compatibilityWeight: number;
}

export interface VisualSettings {
  showTrajectories: boolean;
  showEnergyProfile: boolean;
  showBondChanges: boolean;
  animationSpeed: number;
  pauseAfterReaction: boolean;
  pauseDuration: number; // milliseconds
}

export interface ReactionTypeConfig {
  name: string;
  description: string;
  physics: PhysicsSettings;
  orientation: OrientationSettings;
  collision: CollisionSettings;
  visual: VisualSettings;
}

/**
 * Default configuration for all reaction types
 */
export const REACTION_CONFIG: { [key: string]: ReactionTypeConfig } = {
  sn2: {
    name: 'SN2 - Bimolecular Nucleophilic Substitution',
    description: 'Nucleophile attacks from the backside, causing simultaneous bond formation and breaking',
    physics: {
      velocity: 20.0,
      damping: 0.95,
      mass: 1.0,
      restitution: 0.3,
      friction: 0.1
    },
    orientation: {
      method: 'backside-attack',
      optimalApproachAngle: 180,
      tolerance: 10,
      rotationAxis: 'y',
      rotationAngle: -Math.PI // -180 degrees
    },
    collision: {
      detectionRadius: 2.0,
      energyThreshold: 80, // kJ/mol
      orientationWeight: 0.4,
      temperatureWeight: 0.3,
      compatibilityWeight: 0.3
    },
    visual: {
      showTrajectories: false,
      showEnergyProfile: true,
      showBondChanges: true,
      animationSpeed: 1.0,
      pauseAfterReaction: true,
      pauseDuration: 2000
    }
  },
  
  sn1: {
    name: 'SN1 - Unimolecular Nucleophilic Substitution',
    description: 'Substrate dissociates first, then nucleophile attacks the carbocation',
    physics: {
      velocity: 15.0,
      damping: 0.90,
      mass: 1.0,
      restitution: 0.2,
      friction: 0.05
    },
    orientation: {
      method: 'front-attack',
      optimalApproachAngle: 0,
      tolerance: 15,
      rotationAxis: 'y',
      rotationAngle: 0
    },
    collision: {
      detectionRadius: 1.5,
      energyThreshold: 100, // kJ/mol
      orientationWeight: 0.2,
      temperatureWeight: 0.5,
      compatibilityWeight: 0.3
    },
    visual: {
      showTrajectories: true,
      showEnergyProfile: true,
      showBondChanges: true,
      animationSpeed: 0.8,
      pauseAfterReaction: true,
      pauseDuration: 3000
    }
  },
  
  e2: {
    name: 'E2 - Bimolecular Elimination',
    description: 'Base abstracts proton while leaving group departs simultaneously',
    physics: {
      velocity: 18.0,
      damping: 0.92,
      mass: 1.0,
      restitution: 0.25,
      friction: 0.08
    },
    orientation: {
      method: 'anti-coplanar',
      optimalApproachAngle: 180,
      tolerance: 20,
      rotationAxis: 'z',
      rotationAngle: Math.PI / 2 // 90 degrees
    },
    collision: {
      detectionRadius: 2.5,
      energyThreshold: 120, // kJ/mol
      orientationWeight: 0.5,
      temperatureWeight: 0.3,
      compatibilityWeight: 0.2
    },
    visual: {
      showTrajectories: true,
      showEnergyProfile: true,
      showBondChanges: true,
      animationSpeed: 1.2,
      pauseAfterReaction: true,
      pauseDuration: 2500
    }
  },
  
  e1: {
    name: 'E1 - Unimolecular Elimination',
    description: 'Substrate dissociates first, then base abstracts proton',
    physics: {
      velocity: 12.0,
      damping: 0.88,
      mass: 1.0,
      restitution: 0.15,
      friction: 0.03
    },
    orientation: {
      method: 'generic',
      optimalApproachAngle: 90,
      tolerance: 30,
      rotationAxis: 'y',
      rotationAngle: 0
    },
    collision: {
      detectionRadius: 1.8,
      energyThreshold: 150, // kJ/mol
      orientationWeight: 0.1,
      temperatureWeight: 0.6,
      compatibilityWeight: 0.3
    },
    visual: {
      showTrajectories: true,
      showEnergyProfile: true,
      showBondChanges: true,
      animationSpeed: 0.6,
      pauseAfterReaction: true,
      pauseDuration: 4000
    }
  }
};

/**
 * Get configuration for a specific reaction type
 */
export function getReactionConfig(reactionType: string): ReactionTypeConfig {
  const config = REACTION_CONFIG[reactionType.toLowerCase()];
  if (!config) {
    throw new Error(`Unknown reaction type: ${reactionType}`);
  }
  return config;
}

/**
 * Get all available reaction types
 */
export function getAvailableReactionTypes(): string[] {
  return Object.keys(REACTION_CONFIG);
}

/**
 * Get reaction type display name
 */
export function getReactionTypeName(reactionType: string): string {
  const config = getReactionConfig(reactionType);
  return config.name;
}

/**
 * Get reaction type description
 */
export function getReactionTypeDescription(reactionType: string): string {
  const config = getReactionConfig(reactionType);
  return config.description;
}

/**
 * Check if a reaction type is supported
 */
export function isReactionTypeSupported(reactionType: string): boolean {
  return reactionType.toLowerCase() in REACTION_CONFIG;
}

/**
 * Get optimal approach angle for a reaction type
 */
export function getOptimalApproachAngle(reactionType: string): number {
  const config = getReactionConfig(reactionType);
  return config.orientation.optimalApproachAngle;
}

/**
 * Get orientation method for a reaction type
 */
export function getOrientationMethod(reactionType: string): string {
  const config = getReactionConfig(reactionType);
  return config.orientation.method;
}

/**
 * Get physics settings for a reaction type
 */
export function getPhysicsSettings(reactionType: string): PhysicsSettings {
  const config = getReactionConfig(reactionType);
  return config.physics;
}

/**
 * Get collision settings for a reaction type
 */
export function getCollisionSettings(reactionType: string): CollisionSettings {
  const config = getReactionConfig(reactionType);
  return config.collision;
}

/**
 * Get visual settings for a reaction type
 */
export function getVisualSettings(reactionType: string): VisualSettings {
  const config = getReactionConfig(reactionType);
  return config.visual;
}

/**
 * Update configuration for a reaction type
 */
export function updateReactionConfig(reactionType: string, updates: Partial<ReactionTypeConfig>): void {
  if (!isReactionTypeSupported(reactionType)) {
    throw new Error(`Cannot update unsupported reaction type: ${reactionType}`);
  }
  
  const currentConfig = getReactionConfig(reactionType);
  const updatedConfig = { ...currentConfig, ...updates };
  REACTION_CONFIG[reactionType.toLowerCase()] = updatedConfig;
}

/**
 * Create a custom reaction configuration
 */
export function createCustomReactionConfig(
  reactionType: string,
  config: ReactionTypeConfig
): void {
  REACTION_CONFIG[reactionType.toLowerCase()] = config;
}

/**
 * Reset configuration to defaults
 */
export function resetReactionConfig(reactionType: string): void {
  if (!isReactionTypeSupported(reactionType)) {
    throw new Error(`Cannot reset unsupported reaction type: ${reactionType}`);
  }
  
  // This would require storing the original config
  // For now, we'll just log a warning
  console.warn(`Reset not implemented for ${reactionType}`);
}

/**
 * Export all configurations
 */
export function exportAllConfigs(): { [key: string]: ReactionTypeConfig } {
  return { ...REACTION_CONFIG };
}

/**
 * Import configurations
 */
export function importConfigs(configs: { [key: string]: ReactionTypeConfig }): void {
  Object.keys(configs).forEach(key => {
    REACTION_CONFIG[key] = configs[key];
  });
}



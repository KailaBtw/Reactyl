/**
 * Physics Configuration Settings
 * 
 * Centralized configuration for physics parameters, encounter modes,
 * and default values used throughout the physics system.
 */

export interface PhysicsConfig {
  // Default spawn parameters
  defaultSpawnDistance: number;
  defaultRelativeVelocity: number;
  defaultImpactParameter: number;
  
  // Encounter mode definitions
  encounterModes: {
    inline: {
      description: string;
      defaultApproachAngle: number;
      spawnBehavior: 'nucleophile_behind_substrate';
    };
    perpendicular: {
      description: string;
      defaultApproachAngle: number;
      spawnBehavior: 'opposite_sides';
    };
  };
  
  // Physics engine settings
  physics: {
    damping: number;
    restitution: number;
    friction: number;
    sleepSpeedLimit: number;
    sleepTimeLimit: number;
  };
  
  // Velocity and positioning
  velocity: {
    maxRelativeVelocity: number;
    minRelativeVelocity: number;
    defaultApproachAngle: number;
  };
}

export const PHYSICS_CONFIG: PhysicsConfig = {
  defaultSpawnDistance: 20.0,
  defaultRelativeVelocity: 15.0,
  defaultImpactParameter: 0.0,
  
  encounterModes: {
    inline: {
      description: 'Nucleophile approaches from behind substrate (backside attack)',
      defaultApproachAngle: 180,
      spawnBehavior: 'nucleophile_behind_substrate'
    },
    perpendicular: {
      description: 'Molecules approach from opposite sides (side attack)',
      defaultApproachAngle: 90,
      spawnBehavior: 'opposite_sides'
    }
  },
  
  physics: {
    damping: 0.03,
    restitution: 0.1,
    friction: 0.1,
    sleepSpeedLimit: 0.05,
    sleepTimeLimit: 0.5
  },
  
  velocity: {
    maxRelativeVelocity: 50.0,
    minRelativeVelocity: 1.0,
    defaultApproachAngle: 180
  }
};

// Helper functions to get config values
export function getDefaultSpawnDistance(): number {
  return PHYSICS_CONFIG.defaultSpawnDistance;
}

export function getDefaultRelativeVelocity(): number {
  return PHYSICS_CONFIG.defaultRelativeVelocity;
}

export function getDefaultImpactParameter(): number {
  return PHYSICS_CONFIG.defaultImpactParameter;
}

export function getEncounterModeConfig(mode: 'inline' | 'perpendicular') {
  return PHYSICS_CONFIG.encounterModes[mode];
}

export function getPhysicsEngineConfig() {
  return PHYSICS_CONFIG.physics;
}

import * as THREE from 'three';

export type AttackMode = 'backside' | 'frontside' | 'perpendicular';

export interface AttackModeConfig {
  nucleophileYaw: number; // radians to rotate around Y after lookAt
  substrateYaw: number;   // radians to rotate around Y after lookAt
  substrateFacesNucleophile: boolean; // if true, substrate lookAt nucleophile before yaw
  productYaw: number;     // radians to rotate product around Y after reaction
}

export function getAttackModeConfig(reactionType: string, attackMode: AttackMode): AttackModeConfig {
  const type = reactionType.toLowerCase();
  const mode = attackMode.toLowerCase() as AttackMode;

  if (type === 'sn2') {
    switch (mode) {
      case 'backside':
        return {
          nucleophileYaw: Math.PI / 2,
          substrateYaw: Math.PI / 2,
          substrateFacesNucleophile: true,
          productYaw: Math.PI/2, // Flip product 180° for proper orientation
        };
      case 'frontside':
        return {
          nucleophileYaw: 0,
          substrateYaw: 0,
          substrateFacesNucleophile: true,
          productYaw: 0, // No rotation needed for frontside
        };
      case 'perpendicular':
        return {
          nucleophileYaw: Math.PI / 2,
          substrateYaw: 0,
          substrateFacesNucleophile: true,
          productYaw: Math.PI / 2, // 90° rotation for perpendicular
        };
    }
  }

  // Defaults for other reaction types: neutral facing
  return {
    nucleophileYaw: 0,
    substrateYaw: 0,
    substrateFacesNucleophile: true,
    productYaw: 0,
  };
}

// Small helper to compose lookAt with a yaw rotation
export function lookAtThenYaw(object: THREE.Object3D, target: THREE.Vector3, yawRadians: number): void {
  object.lookAt(target);
  if (yawRadians !== 0) {
    object.rotateY(yawRadians);
  }
}

// Helper to apply product orientation after reaction
export function applyProductOrientation(product: THREE.Object3D, yawRadians: number): void {
  if (yawRadians !== 0) {
    product.rotateY(yawRadians);
  }
}



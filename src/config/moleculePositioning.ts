import type * as THREE from 'three';
import { getAttackModeConfig, lookAtThenYaw as lookAtThenYawFromConfig } from './attackModes';

export interface MoleculeLike {
  group: THREE.Group;
  rotation: THREE.Euler;
  // Optional physics body with a quaternion compatible with Three.js (has x,y,z,w and optionally set())
  physicsBody?: {
    quaternion: {
      x: number;
      y: number;
      z: number;
      w: number;
      set?: (x: number, y: number, z: number, w: number) => void;
    };
  };
}

export type OrientationStrategy = (substrate: MoleculeLike, nucleophile: MoleculeLike) => void;
export type AttackMode = 'backside' | 'frontside' | 'perpendicular';

function syncPhysicsQuaternion(entity: MoleculeLike): void {
  if (!entity.physicsBody) return;
  const gq = entity.group.quaternion;
  const pq = entity.physicsBody.quaternion as any;
  if (typeof pq.set === 'function') {
    pq.set(gq.x, gq.y, gq.z, gq.w);
  } else {
    pq.x = gq.x;
    pq.y = gq.y;
    pq.z = gq.z;
    pq.w = gq.w;
  }
}

// Use shared helper from orientationConfig, keep local alias to avoid wide changes
const lookAtThenYaw = lookAtThenYawFromConfig;

export const orientSN2Backside: OrientationStrategy = (substrate, nucleophile) => {
  const cfg = getAttackModeConfig('sn2', 'backside');

  // 1) Aim nucleophile toward substrate electrophile center
  lookAtThenYaw(nucleophile.group, substrate.group.position, cfg.nucleophileYaw);
  nucleophile.rotation.copy(nucleophile.group.rotation);
  syncPhysicsQuaternion(nucleophile);

  // 2) Aim substrate toward nucleophile, then apply yaw rotation
  if (cfg.substrateFacesNucleophile) {
    substrate.group.lookAt(nucleophile.group.position);
  }
  if (cfg.substrateYaw !== 0) {
    substrate.group.rotateY(cfg.substrateYaw);
  }
  substrate.rotation.copy(substrate.group.rotation);
  syncPhysicsQuaternion(substrate);
};

export const orientSN1: OrientationStrategy = (substrate, nucleophile) => {
  substrate.group.rotation.set(0, 0, 0);
  nucleophile.group.rotation.set(0, 0, 0);
  substrate.rotation.copy(substrate.group.rotation);
  nucleophile.rotation.copy(nucleophile.group.rotation);
  syncPhysicsQuaternion(substrate);
  syncPhysicsQuaternion(nucleophile);
};

export const orientE2: OrientationStrategy = (substrate, nucleophile) => {
  substrate.group.rotation.set(0, 0, 0);
  nucleophile.group.rotation.set(0, 0, 0);
  substrate.rotation.copy(substrate.group.rotation);
  nucleophile.rotation.copy(nucleophile.group.rotation);
  syncPhysicsQuaternion(substrate);
  syncPhysicsQuaternion(nucleophile);
};

export function getOrientationStrategy(reactionType: string): OrientationStrategy {
  switch (reactionType.toLowerCase()) {
    case 'sn2':
      return orientSN2Backside;
    case 'sn1':
      return orientSN1;
    case 'e2':
      return orientE2;
    default:
      return orientSN1;
  }
}

// New nested selection API: reaction type outer, attack mode inner
export function getOrientationStrategyWithMode(
  reactionType: string,
  attackMode: AttackMode
): OrientationStrategy {
  const type = reactionType.toLowerCase();
  const mode = attackMode.toLowerCase() as AttackMode;

  if (type === 'sn2') {
    const cfg = getAttackModeConfig('sn2', mode);
    return (substrate, nucleophile) => {
      lookAtThenYaw(nucleophile.group, substrate.group.position, cfg.nucleophileYaw);
      nucleophile.rotation.copy(nucleophile.group.rotation);
      syncPhysicsQuaternion(nucleophile);

      if (cfg.substrateFacesNucleophile) {
        substrate.group.lookAt(nucleophile.group.position);
      }
      if (cfg.substrateYaw !== 0) {
        substrate.group.rotateY(cfg.substrateYaw);
      }
      substrate.rotation.copy(substrate.group.rotation);
      syncPhysicsQuaternion(substrate);
    };
  }

  // For SN1/E2 currently ignore mode
  if (type === 'sn1') return orientSN1;
  if (type === 'e2') return orientE2;
  return orientSN1;
}

import * as THREE from 'three';
import type { CannonPhysicsEngine } from '../physics/cannonPhysicsEngine';
import type { MoleculeManager } from '../types';

export interface MoleculeKinematics {
  velocity: THREE.Vector3;
}

export interface ReactionKinematics {
  substrate: MoleculeKinematics;
  nucleophile: MoleculeKinematics;
}

export interface PhysicsParams {
  approachAngle: number; // degrees
  relativeVelocity: number; // scene units
}

export function computeKinematics(params: PhysicsParams): ReactionKinematics {
  const approachAngleRad = (params.approachAngle * Math.PI) / 180;
  const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), approachAngleRad);

  const substrateVelocity = new THREE.Vector3(0, 0, 0);
  const nucleophileVelocity = direction.clone().negate().multiplyScalar(params.relativeVelocity);

  return {
    substrate: { velocity: substrateVelocity },
    nucleophile: { velocity: nucleophileVelocity },
  };
}

export function applyKinematics(
  physicsEngine: CannonPhysicsEngine,
  moleculeManager: MoleculeManager,
  substrateName: string,
  nucleophileName: string,
  kinematics: ReactionKinematics
): void {
  const substrateObj = moleculeManager.getMolecule(substrateName);
  const nucleophileObj = moleculeManager.getMolecule(nucleophileName);

  if (substrateObj) {
    physicsEngine.setVelocity(substrateObj, kinematics.substrate.velocity);
  }
  if (nucleophileObj) {
    physicsEngine.setVelocity(nucleophileObj, kinematics.nucleophile.velocity);
  }
}



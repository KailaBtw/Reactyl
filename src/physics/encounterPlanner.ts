/**
 * Physics Encounter Planner
 *
 * Business logic for planning and executing molecular encounters.
 * Uses configuration from config/physics/settings.ts
 */

import * as THREE from 'three';
import { getDefaultSpawnDistance } from '../config/physicsSettings';
import type { MoleculeManager } from '../types';
import type { CannonPhysicsEngine } from './cannonPhysicsEngine';

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

export interface SpawnParams extends PhysicsParams {
  impactParameter: number; // lateral offset
  spawnDistance?: number; // default from config
}

export type EncounterMode = 'inline' | 'perpendicular';

export interface EncounterParams extends PhysicsParams {
  impactParameter: number;
  spawnDistance?: number;
  mode: EncounterMode;
}

/**
 * Compute kinematics for molecules based on approach parameters
 */
export function computeKinematics(params: PhysicsParams): ReactionKinematics {
  const approachAngleRad = (params.approachAngle * Math.PI) / 180;
  const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    approachAngleRad
  );

  // Both molecules should move toward each other for a proper collision
  // Split the relative velocity between them (conservation of momentum)
  const halfVelocity = params.relativeVelocity / 2;

  const substrateVelocity = direction.clone().multiplyScalar(halfVelocity);
  const nucleophileVelocity = direction.clone().negate().multiplyScalar(halfVelocity);

  return {
    substrate: { velocity: substrateVelocity },
    nucleophile: { velocity: nucleophileVelocity },
  };
}

/**
 * Apply computed kinematics to molecules in the physics engine
 */
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

/**
 * Compute spawn positions for molecules based on encounter parameters
 */
export function computeSpawnPositions(params: SpawnParams): {
  substratePosition: THREE.Vector3;
  nucleophilePosition: THREE.Vector3;
} {
  const spawnDistance = params.spawnDistance ?? getDefaultSpawnDistance();
  const yawRad = (params.approachAngle * Math.PI) / 180;
  const direction = new THREE.Vector3(0, 0, 1)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad)
    .normalize();
  const right = new THREE.Vector3(1, 0, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad)
    .normalize();

  const halfDistance = spawnDistance * 0.5;
  const impactOffset = right.clone().multiplyScalar(params.impactParameter);
  const substratePosition = direction.clone().multiplyScalar(halfDistance).add(impactOffset);
  const nucleophilePosition = direction.clone().multiplyScalar(-halfDistance).sub(impactOffset);

  return { substratePosition, nucleophilePosition };
}

/**
 * Apply spawn positions to molecules in the physics engine
 */
export function applySpawnPositions(
  physicsEngine: CannonPhysicsEngine,
  moleculeManager: MoleculeManager,
  substrateName: string,
  nucleophileName: string,
  positions: { substratePosition: THREE.Vector3; nucleophilePosition: THREE.Vector3 }
): void {
  const substrateObj = moleculeManager.getMolecule(substrateName);
  const nucleophileObj = moleculeManager.getMolecule(nucleophileName);

  if (substrateObj) {
    substrateObj.group.position.copy(positions.substratePosition);
    physicsEngine.setPosition(substrateObj as any, positions.substratePosition);
  }
  if (nucleophileObj) {
    nucleophileObj.group.position.copy(positions.nucleophilePosition);
    physicsEngine.setPosition(nucleophileObj as any, positions.nucleophilePosition);
  }
}

/**
 * Compute complete encounter plan (positions + velocities) based on mode
 */
export function computeEncounter(params: EncounterParams): {
  substratePosition: THREE.Vector3;
  nucleophilePosition: THREE.Vector3;
  substrateVelocity: THREE.Vector3;
  nucleophileVelocity: THREE.Vector3;
} {
  const distance = params.spawnDistance ?? getDefaultSpawnDistance();
  const yawRad = (params.approachAngle * Math.PI) / 180;
  const d = new THREE.Vector3(0, 0, 1)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad)
    .normalize();
  const r = new THREE.Vector3(1, 0, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad)
    .normalize();

  if (params.mode === 'perpendicular') {
    // Start on opposite sides along the right vector, move toward center along ±right
    const half = distance * 0.5;
    const substratePosition = r.clone().multiplyScalar(+half);
    const nucleophilePosition = r.clone().multiplyScalar(-half);
    const substrateVelocity = r.clone().multiplyScalar(-params.relativeVelocity);
    const nucleophileVelocity = r.clone().multiplyScalar(+params.relativeVelocity);
    return { substratePosition, nucleophilePosition, substrateVelocity, nucleophileVelocity };
  }

  // Inline (backside/inline) default: symmetric positions along ±d with lateral impact offset
  const halfDistance = distance * 0.5;
  const impactOffset = r.clone().multiplyScalar(params.impactParameter);
  const substratePosition = d.clone().multiplyScalar(halfDistance).add(impactOffset);
  const nucleophilePosition = d.clone().multiplyScalar(-halfDistance).sub(impactOffset);
  const halfVelocity = params.relativeVelocity / 2;
  const substrateVelocity = d.clone().multiplyScalar(-halfVelocity);
  const nucleophileVelocity = d.clone().multiplyScalar(halfVelocity);

  console.log(
    `Computed encounter - relativeVelocity: ${params.relativeVelocity}, nucleophileVelocity:`,
    nucleophileVelocity
  );

  return { substratePosition, nucleophilePosition, substrateVelocity, nucleophileVelocity };
}

/**
 * Apply complete encounter plan to molecules
 */
export function applyEncounter(
  physicsEngine: CannonPhysicsEngine,
  moleculeManager: MoleculeManager,
  substrateName: string,
  nucleophileName: string,
  plan: {
    substratePosition: THREE.Vector3;
    nucleophilePosition: THREE.Vector3;
    substrateVelocity: THREE.Vector3;
    nucleophileVelocity: THREE.Vector3;
  }
): void {
  // Positions
  applySpawnPositions(physicsEngine, moleculeManager, substrateName, nucleophileName, {
    substratePosition: plan.substratePosition,
    nucleophilePosition: plan.nucleophilePosition,
  });
  // Velocities
  const substrateObj = moleculeManager.getMolecule(substrateName);
  const nucleophileObj = moleculeManager.getMolecule(nucleophileName);

  // Override: Force UI velocity directly with visual scaling for educational display
  const uiState = (window as any).uiState;
  if (uiState && uiState.relativeVelocity) {
    // Visual education scaling: Scale down for visible, educational movement
    const visualScale = 0.1; // Scale down by 10x for visual education
    const scaledVelocity = uiState.relativeVelocity * visualScale;

    console.log(
      `Visual override: UI velocity ${uiState.relativeVelocity} m/s scaled to ${scaledVelocity} m/s for education`
    );

    // Create velocity vectors based on scaled UI velocity
    const approachAngleRad = (uiState.approachAngle * Math.PI) / 180;
    const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      approachAngleRad
    );

    const substrateVelocity = direction.clone().multiplyScalar(-scaledVelocity);
    const nucleophileVelocity = direction.clone().multiplyScalar(scaledVelocity);

    if (substrateObj) {
      physicsEngine.setVelocity(substrateObj as any, substrateVelocity);
      console.log(`Override substrate velocity:`, substrateVelocity);
      // Ensure physics body is awake for movement
      const body = physicsEngine.getPhysicsBody(substrateObj);
      if (body) body.wakeUp();
    }
    if (nucleophileObj) {
      physicsEngine.setVelocity(nucleophileObj as any, nucleophileVelocity);
      console.log(`Override nucleophile velocity:`, nucleophileVelocity);
      // Ensure physics body is awake for movement
      const body = physicsEngine.getPhysicsBody(nucleophileObj);
      if (body) body.wakeUp();
    }
  } else {
    // Fallback to original plan
    if (substrateObj) {
      physicsEngine.setVelocity(substrateObj as any, plan.substrateVelocity);
      console.log(`Setting substrate velocity:`, plan.substrateVelocity);
    }
    if (nucleophileObj) {
      physicsEngine.setVelocity(nucleophileObj as any, plan.nucleophileVelocity);
      console.log(`Setting nucleophile velocity:`, plan.nucleophileVelocity);
    }
  }
}

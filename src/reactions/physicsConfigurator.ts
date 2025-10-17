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

export interface SpawnParams extends PhysicsParams {
  impactParameter: number; // lateral offset
  spawnDistance?: number; // default 8.0 units
}

export function computeSpawnPositions(params: SpawnParams): {
  substratePosition: THREE.Vector3;
  nucleophilePosition: THREE.Vector3;
} {
  const spawnDistance = params.spawnDistance ?? 8.0;
  const yawRad = (params.approachAngle * Math.PI) / 180;
  const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad).normalize();

  const substratePosition = new THREE.Vector3(0, 0, 0);
  // Place nucleophile behind along -direction, with lateral impact offset
  const nucleophilePosition = direction
    .clone()
    .multiplyScalar(-spawnDistance)
    .add(right.clone().multiplyScalar(params.impactParameter));

  return { substratePosition, nucleophilePosition };
}

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

// ===============================
// High-level encounter planning
// ===============================

export type EncounterMode = 'inline' | 'perpendicular';

export interface EncounterParams extends PhysicsParams {
  impactParameter: number;
  spawnDistance?: number;
  mode: EncounterMode;
}

export function computeEncounter(params: EncounterParams): {
  substratePosition: THREE.Vector3;
  nucleophilePosition: THREE.Vector3;
  substrateVelocity: THREE.Vector3;
  nucleophileVelocity: THREE.Vector3;
} {
  const distance = params.spawnDistance ?? 8.0;
  const yawRad = (params.approachAngle * Math.PI) / 180;
  const d = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad).normalize();
  const r = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad).normalize();
  const center = new THREE.Vector3(0, 0, 0);

  if (params.mode === 'perpendicular') {
    // Start on opposite sides along the right vector, move toward center along ±right
    const half = distance * 0.5;
    const substratePosition = r.clone().multiplyScalar(+half);
    const nucleophilePosition = r.clone().multiplyScalar(-half);
    const substrateVelocity = r.clone().multiplyScalar(-params.relativeVelocity);
    const nucleophileVelocity = r.clone().multiplyScalar(+params.relativeVelocity);
    return { substratePosition, nucleophilePosition, substrateVelocity, nucleophileVelocity };
  }

  // Inline (backside/inline) default: nucleophile behind substrate along -d with lateral impact offset
  const substratePosition = center.clone();
  const nucleophilePosition = d.clone().multiplyScalar(-distance).add(r.clone().multiplyScalar(params.impactParameter));
  const substrateVelocity = new THREE.Vector3(0, 0, 0);
  // Velocity toward substrate (origin) from nucleophile position is +d scaled
  const nucleophileVelocity = d.clone().multiplyScalar(params.relativeVelocity);
  return { substratePosition, nucleophilePosition, substrateVelocity, nucleophileVelocity };
}

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
  if (substrateObj) physicsEngine.setVelocity(substrateObj as any, plan.substrateVelocity);
  if (nucleophileObj) physicsEngine.setVelocity(nucleophileObj as any, plan.nucleophileVelocity);
}



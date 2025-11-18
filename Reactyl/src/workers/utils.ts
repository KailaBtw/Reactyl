/**
 * Serialization utilities for converting Three.js and Cannon.js objects
 * to/from plain JavaScript objects that can be transferred to/from workers
 */

import * as THREE from 'three';
import type { MolecularProperties } from '../chemistry/molecularPropertiesCalculator';
import type { CollisionData, MoleculeGroup, ReactionResult } from '../types';
import type {
  SerializableBodyData,
  SerializableCollisionData,
  SerializableMolecularProperties,
  SerializablePosition,
  SerializableQuaternion,
  SerializableReactionResult,
  SerializableVector3,
} from './types';

/**
 * Convert THREE.Vector3 to serializable format
 */
export function serializeVector3(vec: THREE.Vector3): SerializableVector3 {
  return { x: vec.x, y: vec.y, z: vec.z };
}

/**
 * Convert serializable format to THREE.Vector3
 */
export function deserializeVector3(data: SerializableVector3): THREE.Vector3 {
  return new THREE.Vector3(data.x, data.y, data.z);
}

/**
 * Convert THREE.Quaternion to serializable format
 */
export function serializeQuaternion(quat: THREE.Quaternion): SerializableQuaternion {
  return { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
}

/**
 * Convert serializable format to THREE.Quaternion
 */
export function deserializeQuaternion(data: SerializableQuaternion): THREE.Quaternion {
  return new THREE.Quaternion(data.x, data.y, data.z, data.w);
}

/**
 * Convert position object to serializable format
 */
export function serializePosition(pos: { x: number; y: number; z: number }): SerializablePosition {
  return { x: pos.x, y: pos.y, z: pos.z };
}

/**
 * Convert serializable format to position object
 */
export function deserializePosition(data: SerializablePosition): {
  x: number;
  y: number;
  z: number;
} {
  return { x: data.x, y: data.y, z: data.z };
}

/**
 * Serialize physics body data from Cannon.js body
 */
export function serializeBodyData(body: any, moleculeId: string): SerializableBodyData {
  return {
    id: moleculeId,
    position: { x: body.position.x, y: body.position.y, z: body.position.z },
    velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z },
    quaternion: {
      x: body.quaternion.x,
      y: body.quaternion.y,
      z: body.quaternion.z,
      w: body.quaternion.w,
    },
    angularVelocity: {
      x: body.angularVelocity.x,
      y: body.angularVelocity.y,
      z: body.angularVelocity.z,
    },
    mass: body.mass,
    radius: body.shapes?.[0]?.radius,
    isAwake: body.sleepState === 0,
  };
}

/**
 * Deserialize body data and apply to Cannon.js body
 */
export function deserializeBodyData(body: any, data: SerializableBodyData): void {
  body.position.set(data.position.x, data.position.y, data.position.z);
  body.velocity.set(data.velocity.x, data.velocity.y, data.velocity.z);
  body.quaternion.set(data.quaternion.x, data.quaternion.y, data.quaternion.z, data.quaternion.w);
  body.angularVelocity.set(data.angularVelocity.x, data.angularVelocity.y, data.angularVelocity.z);
}

/**
 * Serialize collision data
 */
export function serializeCollisionData(collision: CollisionData): SerializableCollisionData {
  return {
    relativeVelocity: serializeVector3(collision.relativeVelocity),
    collisionEnergy: collision.collisionEnergy,
    approachAngle: collision.approachAngle,
    impactPoint: serializeVector3(collision.impactPoint),
    moleculeOrientations: {
      substrate: serializeQuaternion(collision.moleculeOrientations.substrate),
      nucleophile: serializeQuaternion(collision.moleculeOrientations.nucleophile),
    },
  };
}

/**
 * Deserialize collision data
 */
export function deserializeCollisionData(data: SerializableCollisionData): CollisionData {
  return {
    relativeVelocity: deserializeVector3(data.relativeVelocity),
    collisionEnergy: data.collisionEnergy,
    approachAngle: data.approachAngle,
    impactPoint: deserializeVector3(data.impactPoint),
    moleculeOrientations: {
      substrate: deserializeQuaternion(data.moleculeOrientations.substrate),
      nucleophile: deserializeQuaternion(data.moleculeOrientations.nucleophile),
    },
  };
}

/**
 * Serialize reaction result
 */
export function serializeReactionResult(result: ReactionResult): SerializableReactionResult {
  return {
    occurs: result.occurs,
    probability: result.probability,
    reactionType: {
      id: result.reactionType.id,
      name: result.reactionType.name,
      mechanism: result.reactionType.mechanism,
      activationEnergy: result.reactionType.activationEnergy,
      optimalAngle: result.reactionType.optimalAngle,
      requiredFeatures: {
        substrate: result.reactionType.requiredFeatures.substrate.map(f => ({
          type: f.type,
          atoms: f.atoms,
          strength: f.strength,
        })),
        nucleophile: result.reactionType.requiredFeatures.nucleophile.map(f => ({
          type: f.type,
          atoms: f.atoms,
          strength: f.strength,
        })),
      },
    },
    collisionData: serializeCollisionData(result.collisionData),
  };
}

/**
 * Deserialize reaction result (note: substrate/nucleophile references need to be restored)
 */
export function deserializeReactionResult(
  data: SerializableReactionResult,
  substrate: MoleculeGroup,
  nucleophile: MoleculeGroup
): ReactionResult {
  return {
    occurs: data.occurs,
    probability: data.probability,
    reactionType: {
      id: data.reactionType.id,
      name: data.reactionType.name,
      mechanism: data.reactionType.mechanism as any,
      activationEnergy: data.reactionType.activationEnergy,
      optimalAngle: data.reactionType.optimalAngle,
      requiredFeatures: {
        substrate: data.reactionType.requiredFeatures.substrate.map(f => ({
          type: f.type as any,
          atoms: f.atoms,
          strength: f.strength,
        })),
        nucleophile: data.reactionType.requiredFeatures.nucleophile.map(f => ({
          type: f.type as any,
          atoms: f.atoms,
          strength: f.strength,
        })),
      },
      probabilityFactors: {
        temperature: () => 1, // Will be recalculated if needed
        orientation: () => 1,
      },
    },
    collisionData: deserializeCollisionData(data.collisionData),
    substrate,
    nucleophile,
  };
}

/**
 * Serialize molecular properties
 */
export function serializeMolecularProperties(
  props: MolecularProperties
): SerializableMolecularProperties {
  return {
    centerOfMass: serializeVector3(props.centerOfMass),
    momentOfInertia: serializeVector3(props.momentOfInertia),
    totalMass: props.totalMass,
    boundingRadius: props.boundingRadius,
    boundingBox: {
      min: serializeVector3(props.boundingBox.min),
      max: serializeVector3(props.boundingBox.max),
    },
    netCharge: props.netCharge,
    geometry: {
      type: props.geometry.type,
      symmetryFactor: props.geometry.symmetryFactor,
      principalAxes: props.geometry.principalAxes.map(axis => serializeVector3(axis)),
    },
    rotationalDegreesOfFreedom: props.rotationalDegreesOfFreedom,
    molecularFormula: props.molecularFormula,
  };
}

/**
 * Deserialize molecular properties (partial - some Three.js objects need reconstruction)
 */
export function deserializeMolecularProperties(
  data: SerializableMolecularProperties
): Partial<MolecularProperties> {
  return {
    centerOfMass: deserializeVector3(data.centerOfMass),
    momentOfInertia: deserializeVector3(data.momentOfInertia),
    totalMass: data.totalMass,
    boundingRadius: data.boundingRadius,
    boundingBox: new THREE.Box3(
      deserializeVector3(data.boundingBox.min),
      deserializeVector3(data.boundingBox.max)
    ),
    netCharge: data.netCharge,
    geometry: {
      type: data.geometry.type as any,
      symmetryFactor: data.geometry.symmetryFactor,
      principalAxes: data.geometry.principalAxes.map(axis => deserializeVector3(axis)),
    },
    rotationalDegreesOfFreedom: data.rotationalDegreesOfFreedom,
    molecularFormula: data.molecularFormula,
  };
}

/**
 * Shared TypeScript types for web worker communication
 * These types define the message protocol between main thread and workers
 */

// Serializable versions of Three.js types (can't transfer Three.js objects directly)
export interface SerializableVector3 {
  x: number;
  y: number;
  z: number;
}

export interface SerializableQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface SerializablePosition {
  x: number;
  y: number;
  z: number;
}

// Physics worker message types
export interface PhysicsWorkerMessage {
  type:
    | 'step'
    | 'addBody'
    | 'removeBody'
    | 'updateBody'
    | 'setVelocity'
    | 'setPosition'
    | 'init'
    | 'setTimeScale';
  id?: string;
  deltaTime?: number;
  bodyData?: SerializableBodyData;
  position?: SerializablePosition;
  velocity?: SerializableVector3;
  quaternion?: SerializableQuaternion;
  worldConfig?: SerializableWorldConfig;
  timeScale?: number;
}

export interface PhysicsWorkerResponse {
  type: 'stepComplete' | 'bodyAdded' | 'bodyRemoved' | 'error';
  id?: string;
  updatedBodies?: SerializableBodyData[];
  collisions?: SerializableCollisionPair[];
  error?: string;
  timestamp?: number;
}

export interface SerializableBodyData {
  id: string;
  position: SerializablePosition;
  velocity: SerializableVector3;
  quaternion: SerializableQuaternion;
  angularVelocity: SerializableVector3;
  mass: number;
  radius?: number;
  isAwake: boolean;
}

export interface SerializableCollisionPair {
  bodyAId: string;
  bodyBId: string;
  collisionPoint: SerializablePosition;
  collisionNormal: SerializablePosition;
  relativeVelocity: SerializableVector3;
}

export interface SerializableWorldConfig {
  gravity: SerializableVector3;
  timeScale: number;
  fixedTimeStep: number;
  maxSubSteps: number;
}

// Chemistry worker message types
export interface ChemistryWorkerMessage {
  type: 'detectReaction' | 'calculateProperties' | 'calculateMaxwellBoltzmann' | 'batch';
  id?: string;
  collisionData?: SerializableCollisionData;
  reactionType?: SerializableReactionType;
  temperature?: number;
  pressure?: number;
  moleculeData?: SerializableMoleculeData;
  molecularMass?: number;
  baseSpeed?: number;
  requests?: ChemistryWorkerMessage[]; // For batching
}

export interface ChemistryWorkerResponse {
  type: 'reactionResult' | 'propertiesResult' | 'velocityResult' | 'batchResult' | 'error';
  id?: string;
  reactionResult?: SerializableReactionResult;
  properties?: SerializableMolecularProperties;
  velocity?: number;
  results?: ChemistryWorkerResponse[]; // For batch responses
  error?: string;
}

export interface SerializableCollisionData {
  relativeVelocity: SerializableVector3;
  collisionEnergy: number;
  approachAngle: number;
  impactPoint: SerializablePosition;
  moleculeOrientations: {
    substrate: SerializableQuaternion;
    nucleophile: SerializableQuaternion;
  };
}

export interface SerializableReactionType {
  id: string;
  name: string;
  mechanism: string;
  activationEnergy: number;
  optimalAngle: number;
  requiredFeatures: {
    substrate: SerializableMolecularFeature[];
    nucleophile: SerializableMolecularFeature[];
  };
}

export interface SerializableMolecularFeature {
  type: string;
  atoms: string[];
  strength: number;
}

export interface SerializableReactionResult {
  occurs: boolean;
  probability: number;
  reactionType: SerializableReactionType;
  collisionData: SerializableCollisionData;
}

export interface SerializableMoleculeData {
  id: string;
  name: string;
  molFileContent?: string;
  atoms?: SerializableAtom[];
  bonds?: SerializableBond[];
  reactionFeatures?: SerializableReactionFeatures;
}

export interface SerializableAtom {
  element: string;
  position: SerializablePosition;
  mass: number;
  charge: number;
  index: number;
}

export interface SerializableBond {
  atom1Index: number;
  atom2Index: number;
  bondType: number;
}

export interface SerializableReactionFeatures {
  leavingGroups: Array<{ atomIndex: number; atomType: string; strength: number }>;
  nucleophiles: Array<{ atomIndex: number; atomType: string; strength: number }>;
  electrophiles: Array<{ atomIndex: number; atomType: string; strength: number }>;
}

export interface SerializableMolecularProperties {
  centerOfMass: SerializablePosition;
  momentOfInertia: SerializableVector3;
  totalMass: number;
  boundingRadius: number;
  boundingBox: {
    min: SerializablePosition;
    max: SerializablePosition;
  };
  netCharge: number;
  geometry: {
    type: string;
    symmetryFactor: number;
    principalAxes: SerializableVector3[];
  };
  rotationalDegreesOfFreedom: number;
  molecularFormula: string;
}

// Worker manager types
export interface WorkerConfig {
  useWorkers: boolean;
  physicsWorkerEnabled: boolean;
  chemistryWorkerEnabled: boolean;
  maxWorkerQueueSize: number;
}

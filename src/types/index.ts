import type * as THREE from 'three';

// Core Types

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Atom {
  position: {
    x: string;
    y: string;
    z: string;
  };
  type: string;
}

export interface MolHeader {
  name: string;
  program: string;
  comment: string;
  date: string;
}

export interface MolCounts {
  atoms: number;
  bonds: number;
  chiral: boolean;
}

export interface Limits {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface MolObject {
  atoms: Array<{
    position: { x: string; y: string; z: string };
    type: string;
  }>;
  bonds: Array<[string, string, string?]>;
}

export interface Molecule {
  name: string;
  CSID: string;
}

export interface MoleculesEnum {
  [key: string]: Molecule;
}

// Molecule Management Types

export interface MoleculeGroup {
  name: string;
  id: string; // Unique identifier for physics tracking
  position: Position;
  group: THREE.Group;
  add: (mesh: THREE.Mesh) => void;
  getGroup: () => THREE.Group;
  velocity: THREE.Vector3;
  radius: number;
  molObject: MolObject | null;
  // rotationController removed - using physics engine for rotation
  molecularProperties?: any; // TODO: Will be MolecularProperties type
  physicsBody?: any; // CANNON.Body reference for physics integration
  hasPhysics?: boolean; // Flag to indicate if molecule is in physics world
  reactionInProgress?: boolean; // Flag to prevent race conditions during reactions
  reactionFeatures?: ReactionFeatures; // Reaction compatibility features
  compatibleReactions?: string[]; // List of compatible reaction types
  isProduct?: boolean; // Flag to indicate if molecule is a reaction product
  addOutline: () => void; // Add red halo/glow outline to mark as product
  removeOutline: () => void; // Remove outline effect
}

export interface MoleculeManager {
  newMolecule: (name: string, position?: Position) => MoleculeGroup;
  getMolecule: (name: string) => MoleculeGroup | undefined;
  getAllMolecules: () => MoleculeGroup[];
  removeMolecule: (name: string) => boolean;
  debugMolecules: () => void;
  setInitialVelocities: (initialSpeed?: number) => void;
  setMoleculeVelocity: (
    moleculeName: string,
    targetPosition: THREE.Vector3,
    speed?: number
  ) => void;
  clearAllMolecules: (disposePhysics?: (molecule: MoleculeGroup) => void | Promise<void>) => void;
}

// Spatial Grid Types

export interface GridStats {
  totalCells: number;
  moleculesInGrid: number;
  averageMoleculesPerCell: number;
  totalChecks: number;
  actualCollisions: number;
}

export interface GridCellCoordinates {
  x: number;
  y: number;
  z: number;
}

// GUI Types

export interface AutoRotate {
  x: { switch?: boolean };
  y: { switch?: boolean };
  z: { switch?: boolean };
}

export interface LoadMoleculeFile {
  loadFile: () => void;
}

export interface StatsDisplay {
  totalCells: number;
  moleculesInGrid: number;
  totalChecks: number;
  actualCollisions: number;
}

export interface ValueDisplay {
  value: string;
}

// Reaction System Types

export interface ReactionType {
  id: string;
  name: string;
  mechanism: 'SN2' | 'SN1' | 'E2' | 'E1' | 'Addition' | 'Elimination';
  requiredFeatures: {
    substrate: MolecularFeature[];
    nucleophile: MolecularFeature[];
  };
  activationEnergy: number; // in kJ/mol
  optimalAngle: number; // in degrees
  probabilityFactors: {
    temperature: (T: number) => number;
    orientation: (angle: number) => number;
  };
}

export interface MolecularFeature {
  type: 'leaving_group' | 'nucleophile' | 'electrophile' | 'double_bond';
  atoms: string[]; // Atom types that qualify
  strength: number; // Relative reactivity
}

export interface ReactionCandidate {
  smiles: string;
  name: string;
  molFile: string;
  features: MolecularFeature[];
  compatibleReactions: string[];
}

export interface ReactionFeatures {
  leavingGroups: { atomIndex: number; atomType: string; strength: number }[];
  nucleophiles: { atomIndex: number; atomType: string; strength: number }[];
  electrophiles: { atomIndex: number; atomType: string; strength: number }[];
}

export interface CollisionData {
  relativeVelocity: THREE.Vector3;
  collisionEnergy: number; // in kJ/mol
  approachAngle: number; // in degrees
  impactPoint: THREE.Vector3;
  moleculeOrientations: {
    substrate: THREE.Quaternion;
    nucleophile: THREE.Quaternion;
  };
}

export interface CollisionSetup {
  substrate: MoleculeGroup;
  nucleophile: MoleculeGroup;
  approachAngle: number; // in degrees
  impactParameter: number; // offset from center
  relativeVelocity: number; // in m/s
  temperature: number; // in Kelvin
}

export interface ReactionAnimationStep {
  time: number; // 0 to 1
  bondChanges: {
    breaking: { atoms: [number, number]; strength: number }[];
    forming: { atoms: [number, number]; strength: number }[];
  };
  atomPositions: THREE.Vector3[];
  energy: number; // relative energy
}

export interface EnvironmentParameters {
  temperature: number; // in Kelvin
  pressure: number; // in atm (not applicable for solution-phase reactions)
  solvent: 'polar' | 'nonpolar' | 'protic' | 'aprotic';
  catalyst: string | null;
  collisionEnergy: number; // in kJ/mol
  approachAngle: number; // in degrees
  impactParameter: number; // in Angstroms
}

export interface MolecularData {
  cid: number; // PubChem Compound ID
  name?: string; // IUPAC name or common name
  title?: string; // Compound summary page title
  synonyms?: string[]; // Alternative names and common names
  smiles: string;
  inchi: string;
  molWeight: number;
  formula: string;
  mol3d?: string; // 3D MOL file content
  properties?: {
    pka?: number;
    logP?: number;
    polarSurfaceArea?: number;
  };
}

export interface ReactivityData {
  nucleophilicity: number; // on a 0-10 scale
  electrophilicity: number; // on a 0-10 scale
  leavingGroupAbility: number; // on a 0-10 scale
}

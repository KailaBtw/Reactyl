import * as THREE from "three";

// ===============================
//  Core Types
// ===============================

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Atom {
  x: number;
  y: number;
  z: number;
  symbol: string;
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
  header: MolHeader;
  counts: MolCounts;
  atoms: Atom[];
  bonds: any[];
  limits: Limits;
}

export interface Molecule {
  name: string;
  CSID: string;
}

export interface MoleculesEnum {
  [key: string]: Molecule;
}

// ===============================
//  Molecule Management Types
// ===============================

export interface MoleculeGroup {
  name: string;
  position: Position;
  group: THREE.Group;
  add: (mesh: THREE.Mesh) => void;
  getGroup: () => THREE.Group;
  velocity: THREE.Vector3;
  radius: number;
  boundingBox: BoundingBox | null;
  molObject: MolObject | null;
}

export interface MoleculeManager {
  newMolecule: (name: string, position?: Position) => MoleculeGroup;
  getMolecule: (name: string) => MoleculeGroup | undefined;
  getAllMolecules: () => MoleculeGroup[];
  removeMolecule: (name: string) => boolean;
  debugMolecules: () => void;
  setInitialVelocities: (initialSpeed?: number) => void;
  setMoleculeVelocity: (moleculeName: string, targetPosition: THREE.Vector3, speed?: number) => void;
}

// ===============================
//  Bounding Box Types
// ===============================

export interface AABB {
  type: 'AABB';
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  containsPoint: (point: THREE.Vector3) => boolean;
  intersectsBox: (box: AABB) => boolean;
  getRadius: () => number;
}

export interface OBB {
  type: 'OBB';
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  rotation: THREE.Matrix3;
  containsPoint: (point: THREE.Vector3) => boolean;
  intersectsBox: (box: OBB) => boolean;
  getRadius: () => number;
}

export interface ConvexHull {
  type: 'ConvexHull';
  points: THREE.Vector3[];
  center: THREE.Vector3;
  containsPoint: (point: THREE.Vector3) => boolean;
  intersectsBox: (box: ConvexHull) => boolean;
  getRadius: () => number;
}

export type BoundingBox = AABB | OBB | ConvexHull;

// ===============================
//  Spatial Grid Types
// ===============================

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

// ===============================
//  GUI Types
// ===============================

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
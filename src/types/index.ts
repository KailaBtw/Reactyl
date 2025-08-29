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
/**
 * Enhanced molecular structure types for StructureEngine
 * Extends existing MolecularData interface with chemical intelligence
 */

import * as THREE from 'three';
import type { MolObject, MolecularData } from './index';

export interface ReactionConditions {
  temperature?: number;
  solvent?: string;
  catalyst?: string;
  ph?: number;
  pressure?: number;
  concentration?: { [molecule: string]: number };
}

export interface ReactionSite {
  atomIndex: number;
  siteType: 'electrophile' | 'nucleophile' | 'leaving_group' | 'double_bond' | 'aromatic';
  reactivity: number;
  geometry: 'tetrahedral' | 'trigonal_planar' | 'linear' | 'bent';
}

export interface AtomReactivity {
  nucleophilicity: number;
  electrophilicity: number;
  leavingGroupAbility: number;
}

export interface EnhancedAtom {
  index: number;
  element: string;
  position: { x: number; y: number; z: number };
  charge: number;
  hybridization: 'sp' | 'sp2' | 'sp3' | 'aromatic';
  bonds: number[];
  reactivity: AtomReactivity;
}

export interface EnhancedBond {
  atomA: number;
  atomB: number;
  order: number;
  length: number;
  type: 'single' | 'double' | 'triple' | 'aromatic';
  isRotatable: boolean;
}

export interface MolecularGeometry {
  center: { x: number; y: number; z: number };
  boundingBox: { min: THREE.Vector3; max: THREE.Vector3 };
  principalAxes: THREE.Vector3[];
  moments: { Ixx: number; Iyy: number; Izz: number };
}

export interface CacheMetadata {
  sourceFile: string;
  parsedAt: number;
  version: string;
  hash: string;
}

/**
 * Enhanced molecular structure that extends existing MOL data
 */
export interface EnhancedMolecularJSON {
  // Original MOL data (preserved for compatibility)
  original: MolObject;
  
  // Enhanced structure data
  structure: {
    atoms: EnhancedAtom[];
    bonds: EnhancedBond[];
    geometry: MolecularGeometry;
  };
  
  // Cache integration
  cacheMetadata: CacheMetadata;
}

/**
 * Reaction step for pathway animation
 */
export interface ReactionStep {
  stepType: 'bond_breaking' | 'bond_forming' | 'rearrangement' | 'proton_transfer';
  involvedAtoms: number[];
  energyBarrier: number;
  duration: number;
  description: string;
}

/**
 * Complete reaction pathway
 */
export interface ReactionPathway {
  steps: ReactionStep[];
  intermediates: any[]; // Will be MolecularStructure when implemented
  transitionStates: any[]; // Will be TransitionState when implemented
  energyProfile: number[];
  rateConstants: number[];
}

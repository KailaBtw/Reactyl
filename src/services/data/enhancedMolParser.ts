/**
 * Enhanced MOL file parser that extends existing functionality
 * Converts MOL files to enhanced JSON structure for StructureEngine
 */

import * as THREE from 'three';
import { EnhancedMolecularPropertiesCalculator } from '../chemistry/molecularPropertiesCalculator';
import type { MolecularData } from '../types';
import type {
  AtomReactivity,
  CacheMetadata,
  EnhancedAtom,
  EnhancedBond,
  EnhancedMolecularJSON,
  MolecularGeometry,
} from '../types/enhanced-molecular';
import { molFileToJSON } from './molFileToJSON';

export class EnhancedMolParser {
  /**
   * Convert existing MolecularData to enhanced structure
   */
  static async convertToEnhanced(
    molecularData: MolecularData,
    name: string = 'unknown'
  ): Promise<EnhancedMolecularJSON> {
    if (!molecularData.mol3d) {
      throw new Error('No 3D MOL data available for enhancement');
    }

    // Parse existing MOL data
    const molObject = molFileToJSON(molecularData.mol3d);

    // Calculate enhanced properties
    const properties = EnhancedMolecularPropertiesCalculator.calculateFromMolObject(molObject);

    // Create enhanced atoms
    const enhancedAtoms: EnhancedAtom[] = molObject.atoms.map((atom, index) => ({
      index,
      element: atom.type,
      position: {
        x: parseFloat(atom.position.x),
        y: parseFloat(atom.position.y),
        z: parseFloat(atom.position.z),
      },
      charge: 0, // Could be enhanced from MOL charge data
      hybridization: EnhancedMolParser.determineHybridization(molObject, index),
      bonds: EnhancedMolParser.findConnectedAtoms(molObject, index),
      reactivity: EnhancedMolParser.calculateAtomReactivity(molObject, index, atom.type),
    }));

    // Create enhanced bonds
    const enhancedBonds: EnhancedBond[] = molObject.bonds.map((bond, index) => ({
      atomA: parseInt(bond[0]) - 1, // Convert to 0-based indexing
      atomB: parseInt(bond[1]) - 1,
      order: EnhancedMolParser.determineBondOrder(bond),
      length: EnhancedMolParser.calculateBondLength(molObject, bond),
      type: EnhancedMolParser.determineBondType(bond),
      isRotatable: EnhancedMolParser.isBondRotatable(molObject, bond),
    }));

    // Create molecular geometry
    const geometry: MolecularGeometry = {
      center: {
        x: properties.centerOfMass.x,
        y: properties.centerOfMass.y,
        z: properties.centerOfMass.z,
      },
      boundingBox: EnhancedMolParser.calculateBoundingBox(enhancedAtoms),
      principalAxes: properties.geometry?.principalAxes || [],
      moments: properties.geometry?.moments || { Ixx: 0, Iyy: 0, Izz: 0 },
    };

    // Create cache metadata
    const cacheMetadata: CacheMetadata = {
      sourceFile: name,
      parsedAt: Date.now(),
      version: '1.0',
      hash: EnhancedMolParser.generateStructureHash(molObject),
    };

    return {
      original: molObject,
      structure: {
        atoms: enhancedAtoms,
        bonds: enhancedBonds,
        geometry,
      },
      cacheMetadata,
    };
  }

  /**
   * Determine atom hybridization based on bonding pattern
   */
  private static determineHybridization(
    molObject: any,
    atomIndex: number
  ): 'sp' | 'sp2' | 'sp3' | 'aromatic' {
    const connectedBonds = EnhancedMolParser.findConnectedAtoms(molObject, atomIndex);
    const bondCount = connectedBonds.length;
    const atom = molObject.atoms[atomIndex];

    // Simple heuristic based on bond count and atom type
    if (atom.type === 'C') {
      switch (bondCount) {
        case 2:
          return 'sp';
        case 3:
          return 'sp2';
        case 4:
          return 'sp3';
        default:
          return 'sp3';
      }
    } else if (atom.type === 'N') {
      return bondCount === 3 ? 'sp2' : 'sp3';
    } else if (atom.type === 'O') {
      return bondCount === 2 ? 'sp3' : 'sp2';
    }

    return 'sp3'; // Default
  }

  /**
   * Find atoms connected to given atom index
   */
  private static findConnectedAtoms(molObject: any, atomIndex: number): number[] {
    const connected: number[] = [];
    const targetIndex = atomIndex + 1; // MOL files use 1-based indexing

    for (const bond of molObject.bonds) {
      const atomA = parseInt(bond[0]);
      const atomB = parseInt(bond[1]);

      if (atomA === targetIndex) {
        connected.push(atomB - 1); // Convert back to 0-based
      } else if (atomB === targetIndex) {
        connected.push(atomA - 1);
      }
    }

    return connected;
  }

  /**
   * Calculate atom reactivity based on element and environment
   */
  private static calculateAtomReactivity(
    molObject: any,
    atomIndex: number,
    element: string
  ): AtomReactivity {
    const connectedAtoms = EnhancedMolParser.findConnectedAtoms(molObject, atomIndex);

    // Basic reactivity heuristics
    let nucleophilicity = 0;
    let electrophilicity = 0;
    let leavingGroupAbility = 0;

    switch (element) {
      case 'C':
        electrophilicity = connectedAtoms.length < 4 ? 0.3 : 0.1;
        break;
      case 'O':
        nucleophilicity = 0.8;
        break;
      case 'N':
        nucleophilicity = 0.7;
        break;
      case 'Br':
        leavingGroupAbility = 0.9;
        break;
      case 'Cl':
        leavingGroupAbility = 0.7;
        break;
      case 'I':
        leavingGroupAbility = 0.95;
        break;
      case 'F':
        leavingGroupAbility = 0.2;
        break;
    }

    return { nucleophilicity, electrophilicity, leavingGroupAbility };
  }

  /**
   * Determine bond order from MOL bond data
   */
  private static determineBondOrder(bond: string[]): number {
    // MOL files can have bond order as third element
    return bond.length > 2 ? parseInt(bond[2]) || 1 : 1;
  }

  /**
   * Calculate bond length between two atoms
   */
  private static calculateBondLength(molObject: any, bond: string[]): number {
    const atomA = molObject.atoms[parseInt(bond[0]) - 1];
    const atomB = molObject.atoms[parseInt(bond[1]) - 1];

    const posA = new THREE.Vector3(
      parseFloat(atomA.position.x),
      parseFloat(atomA.position.y),
      parseFloat(atomA.position.z)
    );

    const posB = new THREE.Vector3(
      parseFloat(atomB.position.x),
      parseFloat(atomB.position.y),
      parseFloat(atomB.position.z)
    );

    return posA.distanceTo(posB);
  }

  /**
   * Determine bond type from order
   */
  private static determineBondType(bond: string[]): 'single' | 'double' | 'triple' | 'aromatic' {
    const order = EnhancedMolParser.determineBondOrder(bond);

    switch (order) {
      case 1:
        return 'single';
      case 2:
        return 'double';
      case 3:
        return 'triple';
      default:
        return 'single';
    }
  }

  /**
   * Check if bond is rotatable (single bonds usually are)
   */
  private static isBondRotatable(molObject: any, bond: string[]): boolean {
    const order = EnhancedMolParser.determineBondOrder(bond);
    return order === 1; // Only single bonds are typically rotatable
  }

  /**
   * Calculate bounding box for atoms
   */
  private static calculateBoundingBox(atoms: EnhancedAtom[]): {
    min: THREE.Vector3;
    max: THREE.Vector3;
  } {
    if (atoms.length === 0) {
      return { min: new THREE.Vector3(), max: new THREE.Vector3() };
    }

    const positions = atoms.map(
      atom => new THREE.Vector3(atom.position.x, atom.position.y, atom.position.z)
    );
    const box = new THREE.Box3().setFromPoints(positions);

    return { min: box.min, max: box.max };
  }

  /**
   * Generate hash for structure caching
   */
  private static generateStructureHash(molObject: any): string {
    const content = JSON.stringify({
      atomCount: molObject.atoms.length,
      bondCount: molObject.bonds.length,
      atoms: molObject.atoms.map((a: any) => ({ type: a.type, pos: a.position })),
      bonds: molObject.bonds,
    });

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }
}

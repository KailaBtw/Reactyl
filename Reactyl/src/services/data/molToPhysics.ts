import * as THREE from 'three';
import {
  type MolecularProperties,
  MolecularPropertiesCalculator,
  type Atom as PhysicsAtom,
} from '../../chemistry/molecularPropertiesCalculator';

// Import your existing MOL parsing types from molFileToJSON
import type { Atom as MolAtom, MolObject } from './molFileToJSON';

/**
 * Converts your parsed MOL file data to physics-ready format
 * This bridges your existing MOL parsing with the new rotation system
 */
export class MolToPhysicsConverter {
  /**
   * Convert MOL file atoms to physics atoms with proper mass data
   */
  static convertAtoms(molAtoms: MolAtom[]): PhysicsAtom[] {
    return molAtoms.map(atom => ({
      element: atom.type,
      position: new THREE.Vector3(
        parseFloat(atom.position.x),
        parseFloat(atom.position.y),
        parseFloat(atom.position.z)
      ),
      mass: MolToPhysicsConverter.getAtomicMass(atom.type),
    }));
  }

  /**
   * Calculate molecular properties from your parsed MOL data
   */
  static calculateProperties(molObject: MolObject): MolecularProperties {
    // Use enhanced calculator adapter to include bonds/charges/geometry
    return MolecularPropertiesCalculator.calculateFromMolObject(molObject as unknown);
  }

  /**
   * Get atomic mass for an element (same as MolecularPropertiesCalculator)
   */
  private static getAtomicMass(element: string): number {
    const ATOMIC_MASSES: Record<string, number> = {
      H: 1.008,
      C: 12.011,
      N: 14.007,
      O: 15.999,
      F: 18.998,
      P: 30.974,
      S: 32.066,
      Cl: 35.453,
      Br: 79.904,
      I: 126.9,
    };

    return ATOMIC_MASSES[element] || 12.0; // Default to carbon if unknown
  }

  /**
   * Create a summary of molecular properties for debugging
   */
  static getMolecularSummary(molObject: MolObject): {
    atomCount: number;
    bondCount: number;
    elements: Record<string, number>;
    totalMass: number;
    boundingRadius: number;
  } {
    const properties = MolToPhysicsConverter.calculateProperties(molObject);

    // Count elements
    const elements: Record<string, number> = {};
    molObject.atoms.forEach(atom => {
      elements[atom.type] = (elements[atom.type] || 0) + 1;
    });

    return {
      atomCount: molObject.atoms.length,
      bondCount: molObject.bonds.length,
      elements,
      totalMass: properties.totalMass,
      boundingRadius: properties.boundingRadius,
    };
  }

  /**
   * Validate that the MOL data is suitable for physics calculations
   */
  static validateMolData(molObject: MolObject): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!molObject.atoms || molObject.atoms.length === 0) {
      errors.push('No atoms found in MOL file');
    }

    if (!molObject.bonds || molObject.bonds.length === 0) {
      errors.push('No bonds found in MOL file');
    }

    // Check for invalid atom positions
    molObject.atoms.forEach((atom, index) => {
      const x = parseFloat(atom.position.x);
      const y = parseFloat(atom.position.y);
      const z = parseFloat(atom.position.z);

      if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) {
        errors.push(
          `Invalid position for atom ${index}: ${atom.position.x}, ${atom.position.y}, ${atom.position.z}`
        );
      }

      if (!atom.type || atom.type.trim() === '') {
        errors.push(`Missing element type for atom ${index}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

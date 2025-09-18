import * as THREE from 'three';
import { createMoleculeGroup } from '../services/moleculeManager';
import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';
import type { ReactionResult } from './reactionDetector';

/**
 * Interface for reaction product definitions
 */
export interface ReactionProduct {
  name: string;
  smiles: string;
  molFile?: string;
  structure: {
    atoms: Array<{
      element: string;
      position: THREE.Vector3;
      charge?: number;
    }>;
    bonds: Array<{
      atom1: number;
      atom2: number;
      order: number; // 1=single, 2=double, 3=triple
    }>;
  };
}

/**
 * Interface for leaving group products
 */
export interface LeavingGroupProduct {
  name: string;
  smiles: string;
  structure: {
    atoms: Array<{
      element: string;
      position: THREE.Vector3;
      charge?: number;
    }>;
    bonds: Array<{
      atom1: number;
      atom2: number;
      order: number;
    }>;
  };
}

/**
 * Reaction Product Generator
 * Creates product molecules based on reaction type and reactants
 */
export class ReactionProductGenerator {
  constructor() {
    log('ReactionProductGenerator initialized');
  }

  /**
   * Generate products for a successful reaction
   */
  generateProducts(
    reactionResult: ReactionResult,
    scene: THREE.Scene
  ): { mainProduct: MoleculeGroup; leavingGroup: MoleculeGroup } | null {
    if (!reactionResult.occurs) {
      log('No reaction occurred, no products to generate');
      return null;
    }

    const reactionType = reactionResult.reactionType;
    log(`Generating products for ${reactionType.name} reaction`);

    switch (reactionType.mechanism) {
      case 'SN2':
        return this.generateSN2Products(reactionResult, scene);
      case 'SN1':
        return this.generateSN1Products(reactionResult, scene);
      case 'E2':
        return this.generateE2Products(reactionResult, scene);
      case 'E1':
        return this.generateE1Products(reactionResult, scene);
      default:
        log(`Product generation not implemented for ${reactionType.mechanism}`);
        return null;
    }
  }

  /**
   * Generate SN2 reaction products
   */
  private generateSN2Products(
    reactionResult: ReactionResult,
    scene: THREE.Scene
  ): { mainProduct: MoleculeGroup; leavingGroup: MoleculeGroup } | null {
    const substrate = reactionResult.substrate;
    const nucleophile = reactionResult.nucleophile;

    log('Generating SN2 products: main product + leaving group');

    // Create main product (nucleophile + substrate without leaving group)
    const mainProduct = this.createSN2MainProduct(substrate, nucleophile);
    if (!mainProduct) return null;

    // Create leaving group product
    const leavingGroup = this.createLeavingGroupProduct(substrate);
    if (!leavingGroup) return null;

    // Add products to scene
    this.addProductToScene(mainProduct, scene, new THREE.Vector3(5, 0, 0));
    this.addProductToScene(leavingGroup, scene, new THREE.Vector3(-5, 0, 0));

    return { mainProduct, leavingGroup };
  }

  /**
   * Create main product for SN2 reaction
   */
  private createSN2MainProduct(
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup
  ): MoleculeGroup | null {
    try {
      // For demo purposes, create a simple product structure
      // In a real implementation, this would use molecular transformation algorithms

      const productStructure = this.buildSN2ProductStructure(substrate, nucleophile);
      const molObject = this.structureToMolObject(productStructure);

      // Optionally convert atoms (not strictly needed for demo visual spawn)
      // const physicsAtoms = MolToPhysicsConverter.convertAtoms(molObject.atoms);

      // Create a simple molecule group for demo
      const productGroup = createMoleculeGroup(
        `SN2_Product_${Date.now()}`,
        { x: 0, y: 0, z: 0 },
        3
      );
      // Attach molObject for downstream use if needed
      (productGroup as any).molObject = molObject;

      log(`Created SN2 main product: ${productGroup.name}`);
      return productGroup;
    } catch (error) {
      log(`Error creating SN2 main product: ${error}`);
      return null;
    }
  }

  /**
   * Create leaving group product
   */
  private createLeavingGroupProduct(_substrate: MoleculeGroup): MoleculeGroup | null {
    try {
      // Create simple leaving group (e.g., Br-, Cl-, I-)
      const leavingGroupStructure = this.buildLeavingGroupStructure();
      const molObject = this.structureToMolObject(leavingGroupStructure);

      // const physicsAtoms = MolToPhysicsConverter.convertAtoms(molObject.atoms);

      const leavingGroup = createMoleculeGroup(
        `LeavingGroup_${Date.now()}`,
        { x: 0, y: 0, z: 0 },
        2
      );
      (leavingGroup as any).molObject = molObject;

      log(`Created leaving group product: ${leavingGroup.name}`);
      return leavingGroup;
    } catch (error) {
      log(`Error creating leaving group product: ${error}`);
      return null;
    }
  }

  /**
   * Build SN2 product structure
   */
  private buildSN2ProductStructure(_substrate: MoleculeGroup, _nucleophile: MoleculeGroup): any {
    // Simplified structure for demo - in reality this would be more complex
    return {
      atoms: [
        { element: 'C', position: new THREE.Vector3(0, 0, 0) },
        { element: 'O', position: new THREE.Vector3(1.4, 0, 0) }, // From nucleophile
        { element: 'H', position: new THREE.Vector3(-0.7, 0.7, 0) }, // From substrate
        { element: 'H', position: new THREE.Vector3(-0.7, -0.7, 0) }, // From substrate
        { element: 'H', position: new THREE.Vector3(0, 0, 1.0) }, // From substrate
      ],
      bonds: [
        { atom1: 0, atom2: 1, order: 1 }, // C-O bond
        { atom1: 0, atom2: 2, order: 1 }, // C-H bonds
        { atom1: 0, atom2: 3, order: 1 },
        { atom1: 0, atom2: 4, order: 1 },
      ],
    };
  }

  /**
   * Build leaving group structure
   */
  private buildLeavingGroupStructure(): any {
    // Simple leaving group (e.g., Br-)
    return {
      atoms: [{ element: 'Br', position: new THREE.Vector3(0, 0, 0), charge: -1 }],
      bonds: [], // No bonds for simple ion
    };
  }

  /**
   * Convert structure to MOL object format
   */
  private structureToMolObject(structure: any): any {
    // Build a MolObject compatible with MolToPhysicsConverter.convertAtoms
    // Expected: atoms: { type: string, position: { x: string, y: string, z: string } }[]
    const atoms = Array.isArray(structure?.atoms) ? structure.atoms : [];
    const bonds = Array.isArray(structure?.bonds) ? structure.bonds : [];

    return {
      atoms: atoms.map((atom: any) => {
        const safeElement = atom?.element || 'C';
        const pos =
          atom?.position instanceof THREE.Vector3 ? atom.position : new THREE.Vector3(0, 0, 0);
        return {
          type: safeElement,
          position: {
            x: String(pos.x ?? 0),
            y: String(pos.y ?? 0),
            z: String(pos.z ?? 0),
          },
        };
      }),
      bonds: bonds.map((bond: any) => ({
        atom1: (bond?.atom1 ?? 0) + 1, // 1-indexed
        atom2: (bond?.atom2 ?? 0) + 1,
        order: bond?.order ?? 1,
      })),
    };
  }

  /**
   * Add product to scene
   */
  private addProductToScene(
    product: MoleculeGroup,
    scene: THREE.Scene,
    position: THREE.Vector3
  ): void {
    // Position the product
    product.group.position.copy(position);

    // Add to scene
    scene.add(product.group);

    // Add simple visual geometry so products are visible in the demo
    try {
      const mol = (product as any).molObject as {
        atoms?: Array<{ type: string; position: { x: string; y: string; z: string } }>;
      };
      const atoms = Array.isArray(mol?.atoms) ? mol!.atoms : [];

      // Basic color map by element
      const colorByElement: Record<string, number> = {
        H: 0xffffff,
        C: 0x333333,
        O: 0xff0000,
        N: 0x0000ff,
        F: 0x00ff00,
        Cl: 0x00ff00,
        Br: 0x8a2be2,
        I: 0x800080,
      };

      const defaultGeom = new THREE.SphereGeometry(0.5, 16, 16);
      atoms.forEach(atom => {
        const element = atom.type || 'C';
        const color = colorByElement[element] ?? 0x999999;
        const mat = new THREE.MeshPhongMaterial({ color });
        const sphere = new THREE.Mesh(defaultGeom, mat);
        const x = parseFloat(atom.position.x) || 0;
        const y = parseFloat(atom.position.y) || 0;
        const z = parseFloat(atom.position.z) || 0;
        sphere.position.set(x, y, z);
        product.group.add(sphere);
      });
    } catch (_e) {
      // If anything goes wrong, at least keep the empty group so the demo doesn't break
    }

    log(`Added product ${product.name} to scene at position`, position);
  }

  /**
   * Generate SN1 products (placeholder)
   */
  private generateSN1Products(
    _reactionResult: ReactionResult,
    _scene: THREE.Scene
  ): { mainProduct: MoleculeGroup; leavingGroup: MoleculeGroup } | null {
    log('SN1 product generation not yet implemented');
    return null;
  }

  /**
   * Generate E2 products (placeholder)
   */
  private generateE2Products(
    _reactionResult: ReactionResult,
    _scene: THREE.Scene
  ): { mainProduct: MoleculeGroup; leavingGroup: MoleculeGroup } | null {
    log('E2 product generation not yet implemented');
    return null;
  }

  /**
   * Generate E1 products (placeholder)
   */
  private generateE1Products(
    _reactionResult: ReactionResult,
    _scene: THREE.Scene
  ): { mainProduct: MoleculeGroup; leavingGroup: MoleculeGroup } | null {
    log('E1 product generation not yet implemented');
    return null;
  }

  /**
   * Get product information for display
   */
  getProductInfo(products: { mainProduct: MoleculeGroup; leavingGroup: MoleculeGroup }): {
    mainProductName: string;
    leavingGroupName: string;
    reactionEquation: string;
  } {
    return {
      mainProductName: products.mainProduct.name,
      leavingGroupName: products.leavingGroup.name,
      reactionEquation: `${products.mainProduct.name} + ${products.leavingGroup.name}`,
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    log('ReactionProductGenerator disposed');
  }
}

// Export singleton instance
export const reactionProductGenerator = new ReactionProductGenerator();

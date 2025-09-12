import * as THREE from 'three';
import { MolToPhysicsConverter } from '../data/molToPhysics';
import { createMoleculeManager } from '../services/moleculeManager';
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
  private moleculeManager: any;

  constructor() {
    this.moleculeManager = createMoleculeManager();
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

      // Convert atoms to physics format
      const physicsAtoms = MolToPhysicsConverter.convertAtoms(molObject.atoms);

      // Create molecule group
      const productGroup = this.moleculeManager.createMoleculeGroup(
        `SN2_Product_${Date.now()}`,
        physicsAtoms,
        molObject.bonds
      );

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

      // Convert atoms to physics format
      const physicsAtoms = MolToPhysicsConverter.convertAtoms(molObject.atoms);

      // Create molecule group
      const leavingGroup = this.moleculeManager.createMoleculeGroup(
        `LeavingGroup_${Date.now()}`,
        physicsAtoms,
        molObject.bonds
      );

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
    return {
      atoms: structure.atoms.map((atom: any) => ({
        element: atom.element,
        x: atom.position.x,
        y: atom.position.y,
        z: atom.position.z,
        charge: atom.charge || 0,
      })),
      bonds: structure.bonds.map((bond: any) => ({
        atom1: bond.atom1 + 1, // MOL files are 1-indexed
        atom2: bond.atom2 + 1,
        order: bond.order,
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

    // Add physics body if needed
    // (This would integrate with your physics engine)

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

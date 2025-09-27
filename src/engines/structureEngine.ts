/**
 * Core StructureEngine class
 * Orchestrates molecular structure manipulation and reaction handling
 */

import * as THREE from 'three';
import { ReactionRegistry } from './reactionRegistry';
import { SN2ReactionHandler } from './handlers/sn2ReactionHandler';
import { EnhancedMolParser } from '../data/enhancedMolParser';
import { enhancedCacheService } from '../services/enhancedCacheService';
import type { MoleculeGroup, MolecularData } from '../types';
import type { 
  EnhancedMolecularJSON, 
  ReactionConditions, 
  ReactionSite 
} from '../types/enhanced-molecular';
import type { MolecularStructure, TransitionState } from './reactionHandler';
import { log } from '../utils/debug';
import { ATOM_CONFIGS } from '../config/atomConfig';

export class StructureEngine {
  private structures: Map<string, MolecularStructure> = new Map();
  private transitionStates: Map<string, TransitionState> = new Map();
  private animationMixer: THREE.AnimationMixer;
  private reactionRegistry: ReactionRegistry;
  
  constructor(private scene: THREE.Scene) {
    this.animationMixer = new THREE.AnimationMixer(scene);
    this.reactionRegistry = new ReactionRegistry();
    this.initializeDefaultReactions();
    
    log('🏗️ StructureEngine initialized');
  }
  
  /**
   * Initialize built-in reaction types
   */
  private initializeDefaultReactions(): void {
    // Register built-in reaction handlers
    this.reactionRegistry.register('SN2', new SN2ReactionHandler());
    
    // Future handlers can be added here:
    // this.reactionRegistry.register('SN1', new SN1ReactionHandler());
    // this.reactionRegistry.register('E2', new E2ReactionHandler());
    // this.reactionRegistry.register('Addition', new AdditionReactionHandler());
    
    log(`✅ Registered ${this.reactionRegistry.getRegisteredTypes().length} default reaction handlers`);
  }
  
  /**
   * Register custom reaction handler
   */
  registerReaction(type: string, handler: any): void {
    this.reactionRegistry.register(type, handler);
  }
  
  /**
   * Get available reaction types
   */
  getAvailableReactionTypes(): string[] {
    return this.reactionRegistry.getRegisteredTypes();
  }
  
  /**
   * Create molecular structure from MolecularData
   */
  async createStructure(
    id: string,
    molecularData: MolecularData,
    position: THREE.Vector3 = new THREE.Vector3()
  ): Promise<MolecularStructure> {
    
    try {
      // Check cache first
      const cached = await enhancedCacheService.getEnhancedStructure(molecularData.cid.toString());
      let enhancedData: EnhancedMolecularJSON;
      
      if (cached) {
        enhancedData = cached;
        log(`💾 Using cached enhanced structure: ${id}`);
      } else {
        // Convert to enhanced structure
        enhancedData = await EnhancedMolParser.convertToEnhanced(molecularData, id);
        
        // Cache the enhanced structure
        await enhancedCacheService.saveEnhancedStructure(molecularData.cid.toString(), enhancedData);
        log(`🔄 Created and cached enhanced structure: ${id}`);
      }
      
      // Create MolecularStructure from enhanced data
      const structure: MolecularStructure = {
        atoms: enhancedData.structure.atoms,
        bonds: enhancedData.structure.bonds,
        geometry: new THREE.BufferGeometry(),
        mesh: new THREE.Group(),
        energy: 0
      };
      
      // Generate optimized 3D geometry
      await this.optimizeGeometry(structure);
      
      // Create Three.js visual representation
      this.createVisualRepresentation(structure, position);
      
      // Store structure
      this.structures.set(id, structure);
      this.scene.add(structure.mesh);
      
      log(`✅ Created structure: ${id} with ${structure.atoms.length} atoms`);
      return structure;
      
    } catch (error) {
      log(`❌ Failed to create structure ${id}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Orient molecules for optimal reaction geometry
   */
  async orientForReaction(
    reactantIds: string[],
    reactionType: string,
    conditions?: ReactionConditions
  ): Promise<void> {
    
    const reactionHandler = this.reactionRegistry.getHandler(reactionType);
    if (!reactionHandler) {
      throw new Error(`No handler registered for reaction type: ${reactionType}`);
    }
    
    const reactants = reactantIds.map(id => this.structures.get(id)).filter(Boolean) as MolecularStructure[];
    if (reactants.length === 0) {
      log('⚠️ No valid structures found for reaction orientation');
      return;
    }
    
    log(`🎯 Orienting ${reactants.length} molecules for ${reactionType} reaction`);
    
    try {
      await reactionHandler.orientMolecules(reactants, conditions);
      log(`✅ ${reactionType} orientation complete`);
    } catch (error) {
      log(`❌ Failed to orient molecules for ${reactionType}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Detect possible reactions between molecules
   */
  async detectPossibleReactions(
    reactantIds: string[],
    conditions?: ReactionConditions
  ): Promise<Array<{ type: string; confidence: number; sites: ReactionSite[] }>> {
    
    const reactants = reactantIds.map(id => this.structures.get(id)).filter(Boolean) as MolecularStructure[];
    const possibleReactions: Array<{ type: string; confidence: number; sites: ReactionSite[] }> = [];
    
    log(`🔍 Detecting possible reactions for ${reactants.length} molecules`);
    
    // Test each registered reaction handler
    for (const [reactionType, handler] of this.reactionRegistry.getAllHandlers()) {
      try {
        const validation = handler.validateReaction(reactants, conditions);
        
        if (validation.feasible) {
          const sites = handler.identifyReactionSites(reactants);
          
          possibleReactions.push({
            type: reactionType,
            confidence: validation.confidence,
            sites
          });
          
          log(`✅ Possible reaction: ${reactionType} (confidence: ${(validation.confidence * 100).toFixed(1)}%)`);
        }
      } catch (error) {
        log(`⚠️ Error testing ${reactionType}: ${error}`);
      }
    }
    
    // Sort by confidence
    const sortedReactions = possibleReactions.sort((a, b) => b.confidence - a.confidence);
    
    log(`🎯 Found ${sortedReactions.length} possible reactions`);
    return sortedReactions;
  }
  
  /**
   * Create transition state using reaction handler
   */
  async createTransitionState(
    reactantIds: string[],
    productIds: string[],
    reactionType: string,
    conditions?: ReactionConditions
  ): Promise<TransitionState> {
    
    const reactionHandler = this.reactionRegistry.getHandler(reactionType);
    if (!reactionHandler) {
      throw new Error(`No handler registered for reaction type: ${reactionType}`);
    }
    
    const reactants = reactantIds.map(id => this.structures.get(id)).filter(Boolean) as MolecularStructure[];
    const products = productIds.map(id => this.structures.get(id)).filter(Boolean) as MolecularStructure[];
    
    log(`🔬 Creating transition state for ${reactionType}`);
    
    const transitionState = await reactionHandler.calculateTransitionState(
      reactants,
      products,
      conditions
    );
    
    const tsId = `ts_${reactantIds.join('_')}_${productIds.join('_')}_${reactionType}`;
    this.transitionStates.set(tsId, transitionState);
    
    log(`✅ Created transition state: ${tsId}`);
    return transitionState;
  }
  
  /**
   * Animate reaction pathway
   */
  async animateReaction(
    transitionStateId: string,
    duration: number = 3000
  ): Promise<void> {
    
    const ts = this.transitionStates.get(transitionStateId);
    if (!ts) {
      throw new Error(`Transition state not found: ${transitionStateId}`);
    }
    
    log(`🎬 Animating reaction: ${transitionStateId} (${duration}ms)`);
    
    try {
      const timeline = await this.createReactionTimeline(ts, duration);
      
      return new Promise((resolve) => {
        timeline.onComplete(() => {
          log(`✅ Reaction animation complete: ${transitionStateId}`);
          resolve();
        });
        timeline.play();
      });
    } catch (error) {
      log(`❌ Failed to animate reaction: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get optimal conditions for a reaction
   */
  getOptimalConditions(reactantIds: string[], reactionType: string): ReactionConditions {
    const reactionHandler = this.reactionRegistry.getHandler(reactionType);
    if (!reactionHandler) {
      throw new Error(`No handler registered for reaction type: ${reactionType}`);
    }
    
    const reactants = reactantIds.map(id => this.structures.get(id)).filter(Boolean) as MolecularStructure[];
    return reactionHandler.getOptimalConditions(reactants);
  }
  
  /**
   * Dynamic bond manipulation
   */
  modifyBond(
    structureId: string,
    atomA: number,
    atomB: number,
    newLength: number,
    newOrder: number,
    animate: boolean = true
  ): void {
    
    const structure = this.structures.get(structureId);
    if (!structure) {
      log(`⚠️ Structure not found: ${structureId}`);
      return;
    }
    
    const bond = structure.bonds.find(b => 
      (b.atomA === atomA && b.atomB === atomB) ||
      (b.atomA === atomB && b.atomB === atomA)
    );
    
    if (!bond) {
      log(`⚠️ Bond not found: ${atomA}-${atomB} in ${structureId}`);
      return;
    }
    
    if (animate) {
      this.animateBondChange(structure, bond, newLength, newOrder, 500);
    } else {
      bond.length = newLength;
      bond.order = newOrder;
      this.updateBondGeometry(structure, bond);
    }
    
    log(`🔗 Modified bond ${atomA}-${atomB}: length=${newLength}Å, order=${newOrder}`);
  }
  
  /**
   * Integration with existing MoleculeGroup system
   */
  integrateWithMoleculeGroup(structureId: string, moleculeGroup: MoleculeGroup): void {
    const structure = this.structures.get(structureId);
    if (!structure) {
      log(`⚠️ Structure not found for integration: ${structureId}`);
      return;
    }
    
    // Replace Three.js geometry with enhanced structure
    moleculeGroup.group.clear();
    moleculeGroup.group.add(structure.mesh);
    
    // Update molecular properties (convert back to existing format)
    if (structure.atoms.length > 0) {
      moleculeGroup.molObject = this.convertToMolObject(structure);
    }
    
    // Maintain physics integration
    if (moleculeGroup.physicsBody) {
      this.updatePhysicsBody(moleculeGroup, structure);
    }
    
    log(`🔗 Integrated structure ${structureId} with MoleculeGroup ${moleculeGroup.name}`);
  }
  
  /**
   * Export structure data
   */
  exportStructure(structureId: string, format: 'mol' | 'xyz' | 'pdb'): string {
    const structure = this.structures.get(structureId);
    if (!structure) {
      log(`⚠️ Structure not found for export: ${structureId}`);
      return '';
    }
    
    switch (format) {
      case 'mol':
        return this.exportToMOL(structure);
      case 'xyz':
        return this.exportToXYZ(structure);
      case 'pdb':
        return this.exportToPDB(structure);
      default:
        return '';
    }
  }
  
  /**
   * Get structure statistics
   */
  getStats(): {
    totalStructures: number;
    totalTransitionStates: number;
    availableReactions: string[];
    cacheStats: any;
  } {
    return {
      totalStructures: this.structures.size,
      totalTransitionStates: this.transitionStates.size,
      availableReactions: this.getAvailableReactionTypes(),
      cacheStats: this.reactionRegistry.getStats()
    };
  }
  
  /**
   * Cleanup and disposal
   */
  dispose(): void {
    for (const [id, structure] of this.structures) {
      if (structure.geometry) {
        structure.geometry.dispose();
      }
      if (structure.mesh) {
        this.scene.remove(structure.mesh);
      }
    }
    
    this.structures.clear();
    this.transitionStates.clear();
    this.animationMixer.stopAllAction();
    this.reactionRegistry.clear();
    
    log('🗑️ StructureEngine disposed');
  }
  
  // ===================================================================
  // Private helper methods
  // ===================================================================
  
  /**
   * Optimize molecular geometry using simple force field
   */
  private async optimizeGeometry(structure: MolecularStructure): Promise<void> {
    // Simple geometry optimization - could be enhanced
    log(`🔧 Optimizing geometry for ${structure.atoms.length} atoms`);
    
    // For now, just ensure reasonable bond lengths
    for (const bond of structure.bonds) {
      if (bond.length < 0.5 || bond.length > 3.0) {
        // Adjust unreasonable bond lengths
        bond.length = this.getIdealBondLength(
          structure.atoms[bond.atomA].element,
          structure.atoms[bond.atomB].element,
          bond.order
        );
      }
    }
  }
  
  /**
   * Create Three.js visual representation
   */
  private createVisualRepresentation(structure: MolecularStructure, position: THREE.Vector3): void {
    structure.mesh = new THREE.Group();
    structure.mesh.position.copy(position);
    
    // Create atom spheres
    for (const atom of structure.atoms) {
      const atomMesh = this.createAtomMesh(atom);
      structure.mesh.add(atomMesh);
    }
    
    // Create bond cylinders
    for (const bond of structure.bonds) {
      const bondMesh = this.createBondMesh(structure, bond);
      if (bondMesh) {
        structure.mesh.add(bondMesh);
      }
    }
    
    log(`🎨 Created visual representation with ${structure.mesh.children.length} objects`);
  }
  
  /**
   * Create atom mesh
   */
  private createAtomMesh(atom: any): THREE.Mesh {
    const radius = this.getAtomRadius(atom.element);
    const color = this.getAtomColor(atom.element);
    
    const geometry = new THREE.SphereGeometry(radius, 16, 12);
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(atom.position.x, atom.position.y, atom.position.z);
    mesh.userData = { type: 'atom', element: atom.element, atomIndex: atom.index };
    
    return mesh;
  }
  
  /**
   * Create bond mesh
   */
  private createBondMesh(structure: MolecularStructure, bond: any): THREE.Mesh | null {
    const atomA = structure.atoms[bond.atomA];
    const atomB = structure.atoms[bond.atomB];
    
    if (!atomA || !atomB) return null;
    
    const posA = new THREE.Vector3(atomA.position.x, atomA.position.y, atomA.position.z);
    const posB = new THREE.Vector3(atomB.position.x, atomB.position.y, atomB.position.z);
    
    const distance = posA.distanceTo(posB);
    // Use proper proportions relative to atomic radii
    // Bonds should be ~1/2 the size of the smallest atom (H = 0.3)
    // This gives better visibility while maintaining proper proportions
    const radius = bond.order === 1 ? 0.15 : bond.order === 2 ? 0.2 : 0.25;
    
    const geometry = new THREE.CylinderGeometry(radius, radius, distance, 8);
    const material = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position and orient the bond
    const midpoint = posA.clone().add(posB).multiplyScalar(0.5);
    mesh.position.copy(midpoint);
    mesh.lookAt(posB);
    mesh.rotateX(Math.PI / 2);
    
    mesh.userData = { type: 'bond', bondIndex: bond.atomA + '-' + bond.atomB };
    
    return mesh;
  }
  
  /**
   * Get ideal bond length for atom pair
   */
  private getIdealBondLength(elementA: string, elementB: string, order: number): number {
    const bondLengths: { [key: string]: number } = {
      'C-C-1': 1.54, 'C-C-2': 1.34, 'C-C-3': 1.20,
      'C-H-1': 1.09, 'C-O-1': 1.43, 'C-O-2': 1.23,
      'C-N-1': 1.47, 'C-N-2': 1.28, 'C-N-3': 1.16,
      'C-Br-1': 1.94, 'C-Cl-1': 1.77, 'C-F-1': 1.35,
      'O-H-1': 0.96, 'N-H-1': 1.01
    };
    
    const key = `${elementA}-${elementB}-${order}`;
    return bondLengths[key] || bondLengths[`${elementB}-${elementA}-${order}`] || 1.5;
  }
  
  /**
   * Get atom radius for visualization
   */
  private getAtomRadius(element: string): number {
    // Use centralized atom configuration
    const config = ATOM_CONFIGS[element];
    return config ? config.radius : 0.5; // Default to oxygen size
  }
  
  /**
   * Get atom color for visualization
   */
  private getAtomColor(element: string): number {
    // Use centralized atom configuration
    const config = ATOM_CONFIGS[element];
    return config ? config.color : 0x888888; // Default gray
  }
  
  /**
   * Animate bond change
   */
  private animateBondChange(structure: MolecularStructure, bond: any, newLength: number, newOrder: number, duration: number): void {
    // Simple animation implementation
    const startLength = bond.length;
    const startOrder = bond.order;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      bond.length = startLength + (newLength - startLength) * progress;
      bond.order = startOrder + (newOrder - startOrder) * progress;
      
      this.updateBondGeometry(structure, bond);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  /**
   * Update bond geometry after modification
   */
  private updateBondGeometry(structure: MolecularStructure, bond: any): void {
    // Find and update the bond mesh in the visual representation
    if (structure.mesh) {
      const bondMesh = structure.mesh.children.find((child: any) => 
        child.userData?.type === 'bond' && 
        child.userData?.bondIndex === `${bond.atomA}-${bond.atomB}`
      );
      
      if (bondMesh) {
        // Update bond mesh geometry
        // Implementation would update cylinder geometry based on new bond parameters
      }
    }
  }
  
  /**
   * Convert structure back to MolObject format for compatibility
   */
  private convertToMolObject(structure: MolecularStructure): any {
    return {
      atoms: structure.atoms.map(atom => ({
        position: {
          x: atom.position.x.toString(),
          y: atom.position.y.toString(),
          z: atom.position.z.toString()
        },
        type: atom.element
      })),
      bonds: structure.bonds.map(bond => [
        (bond.atomA + 1).toString(), // Convert back to 1-based indexing
        (bond.atomB + 1).toString(),
        bond.order.toString()
      ])
    };
  }
  
  /**
   * Update physics body to match structure
   */
  private updatePhysicsBody(moleculeGroup: MoleculeGroup, structure: MolecularStructure): void {
    // Integration with existing physics system
    log(`🎯 Updating physics body for ${moleculeGroup.name}`);
    // Implementation would update the physics body shape and properties
  }
  
  /**
   * Create reaction timeline for animation
   */
  private async createReactionTimeline(ts: TransitionState, duration: number): Promise<any> {
    // Simple timeline implementation
    return {
      play: () => {
        log(`▶️ Playing reaction timeline`);
        // Animation implementation would go here
      },
      onComplete: (callback: () => void) => {
        setTimeout(callback, duration);
      }
    };
  }
  
  /**
   * Export to MOL format
   */
  private exportToMOL(structure: MolecularStructure): string {
    let mol = `Generated by StructureEngine\n\n\n`;
    mol += `${structure.atoms.length.toString().padStart(3)}${structure.bonds.length.toString().padStart(3)}  0  0  0  0  0  0  0  0999 V2000\n`;
    
    // Atoms
    for (const atom of structure.atoms) {
      mol += `${atom.position.x.toFixed(4).padStart(10)}${atom.position.y.toFixed(4).padStart(10)}${atom.position.z.toFixed(4).padStart(10)} ${atom.element.padEnd(3)}0  0  0  0  0  0  0  0  0  0  0  0\n`;
    }
    
    // Bonds
    for (const bond of structure.bonds) {
      mol += `${(bond.atomA + 1).toString().padStart(3)}${(bond.atomB + 1).toString().padStart(3)}${bond.order.toString().padStart(3)}  0  0  0  0\n`;
    }
    
    mol += 'M  END\n';
    return mol;
  }
  
  /**
   * Export to XYZ format
   */
  private exportToXYZ(structure: MolecularStructure): string {
    let xyz = `${structure.atoms.length}\nGenerated by StructureEngine\n`;
    
    for (const atom of structure.atoms) {
      xyz += `${atom.element} ${atom.position.x.toFixed(6)} ${atom.position.y.toFixed(6)} ${atom.position.z.toFixed(6)}\n`;
    }
    
    return xyz;
  }
  
  /**
   * Export to PDB format
   */
  private exportToPDB(structure: MolecularStructure): string {
    let pdb = 'HEADER    Generated by StructureEngine\n';
    
    for (let i = 0; i < structure.atoms.length; i++) {
      const atom = structure.atoms[i];
      pdb += `ATOM  ${(i + 1).toString().padStart(5)} ${atom.element.padEnd(4)} MOL A   1    `;
      pdb += `${atom.position.x.toFixed(3).padStart(8)}${atom.position.y.toFixed(3).padStart(8)}${atom.position.z.toFixed(3).padStart(8)}`;
      pdb += '  1.00  0.00           ' + atom.element.padEnd(2) + '\n';
    }
    
    pdb += 'END\n';
    return pdb;
  }
}

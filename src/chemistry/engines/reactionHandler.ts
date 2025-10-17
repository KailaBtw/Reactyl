/**
 * Abstract base class for all reaction handlers
 * Provides the interface that all reaction types must implement
 */

import type { 
  ReactionConditions, 
  ReactionSite, 
  ReactionPathway 
} from '../types/enhanced-molecular';

// Forward declaration - will be defined in structureEngine.ts
export interface MolecularStructure {
  atoms: any[];
  bonds: any[];
  geometry: any;
  mesh: any;
  energy: number;
}

export interface TransitionState {
  reactants: MolecularStructure;
  products: MolecularStructure;
  transitionGeometry: MolecularStructure;
  reactionCoordinate: number;
  energyProfile: number[];
}

/**
 * Abstract base class for all reaction handlers
 */
export abstract class ReactionHandler {
  abstract readonly reactionType: string;
  abstract readonly description: string;
  
  /**
   * Identify potential reaction sites in molecules
   */
  abstract identifyReactionSites(structures: MolecularStructure[]): ReactionSite[];
  
  /**
   * Orient molecules for optimal reaction geometry
   */
  abstract orientMolecules(
    structures: MolecularStructure[], 
    conditions?: ReactionConditions
  ): Promise<void>;
  
  /**
   * Calculate transition state geometry
   */
  abstract calculateTransitionState(
    reactants: MolecularStructure[],
    products: MolecularStructure[],
    conditions?: ReactionConditions
  ): Promise<TransitionState>;
  
  /**
   * Generate reaction pathway
   */
  abstract generatePathway(
    reactants: MolecularStructure[],
    products: MolecularStructure[],
    conditions?: ReactionConditions
  ): Promise<ReactionPathway>;
  
  /**
   * Validate if reaction is feasible
   */
  abstract validateReaction(
    reactants: MolecularStructure[],
    conditions?: ReactionConditions
  ): { feasible: boolean; reason?: string; confidence: number };
  
  /**
   * Get optimal reaction conditions
   */
  abstract getOptimalConditions(reactants: MolecularStructure[]): ReactionConditions;
  
  // ===================================================================
  // Helper methods that subclasses can use
  // ===================================================================
  
  /**
   * Find atoms of specific element type
   */
  protected findAtomsByElement(structure: MolecularStructure, element: string): number[] {
    return structure.atoms
      .map((atom, index) => ({ atom, index }))
      .filter(({ atom }) => atom.element === element)
      .map(({ index }) => index);
  }
  
  /**
   * Calculate distance between two atoms
   */
  protected calculateAtomDistance(
    structure: MolecularStructure, 
    atomA: number, 
    atomB: number
  ): number {
    const posA = structure.atoms[atomA].position;
    const posB = structure.atoms[atomB].position;
    
    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const dz = posA.z - posB.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * Find bonds connected to an atom
   */
  protected findConnectedBonds(structure: MolecularStructure, atomIndex: number): any[] {
    return structure.bonds.filter(bond => 
      bond.atomA === atomIndex || bond.atomB === atomIndex
    );
  }
  
  /**
   * Simple animation utility for moving molecules
   */
  protected async animateToPosition(
    mesh: any,
    targetPosition: { x: number; y: number; z: number },
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const startPosition = {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z
      };
      
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing function
        const easedProgress = this.easeInOutCubic(progress);
        
        mesh.position.x = startPosition.x + (targetPosition.x - startPosition.x) * easedProgress;
        mesh.position.y = startPosition.y + (targetPosition.y - startPosition.y) * easedProgress;
        mesh.position.z = startPosition.z + (targetPosition.z - startPosition.z) * easedProgress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }
  
  /**
   * Smooth easing function
   */
  protected easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * Generate a simple MD5-like hash for caching
   */
  protected generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * SN2 Reaction Handler
 * Implements bimolecular nucleophilic substitution with backside attack
 */

import * as THREE from 'three';
import { ReactionHandler, type MolecularStructure, type TransitionState } from '../reactionHandler';
import type { 
  ReactionConditions, 
  ReactionSite, 
  ReactionPathway,
  ReactionStep 
} from '../../types/enhanced-molecular';
import { log } from '../../utils/debug';

export class SN2ReactionHandler extends ReactionHandler {
  readonly reactionType = 'SN2';
  readonly description = 'Bimolecular nucleophilic substitution with backside attack';
  
  /**
   * Identify SN2 reaction sites
   */
  identifyReactionSites(structures: MolecularStructure[]): ReactionSite[] {
    const sites: ReactionSite[] = [];
    
    for (const structure of structures) {
      // Find electrophilic carbons with leaving groups
      for (let i = 0; i < structure.atoms.length; i++) {
        const atom = structure.atoms[i];
        
        if (atom.element === 'C' && this.hasLeavingGroup(structure, i)) {
          sites.push({
            atomIndex: i,
            siteType: 'electrophile',
            reactivity: this.calculateElectrophilicity(structure, i),
            geometry: 'tetrahedral'
          });
        }
        
        // Find nucleophilic centers
        if (this.isNucleophile(atom)) {
          sites.push({
            atomIndex: i,
            siteType: 'nucleophile',
            reactivity: this.calculateNucleophilicity(structure, i),
            geometry: this.determineAtomGeometry(structure, i)
          });
        }
        
        // Find leaving groups
        if (this.isLeavingGroup(atom)) {
          sites.push({
            atomIndex: i,
            siteType: 'leaving_group',
            reactivity: atom.reactivity?.leavingGroupAbility || 0,
            geometry: 'linear'
          });
        }
      }
    }
    
    return sites;
  }
  
  /**
   * Orient molecules for SN2 backside attack
   */
  async orientMolecules(
    structures: MolecularStructure[], 
    conditions?: ReactionConditions
  ): Promise<void> {
    if (structures.length < 2) {
      log('⚠️ SN2 requires at least 2 molecules');
      return;
    }
    
    const [substrate, nucleophile] = structures;
    
    // Find best reaction sites
    const electrophile = this.findBestElectrophile(substrate);
    const nucleophileCenter = this.findBestNucleophile(nucleophile);
    const leavingGroup = this.findLeavingGroup(substrate, electrophile?.atomIndex);
    
    if (!electrophile || !nucleophileCenter || !leavingGroup) {
      log('⚠️ Could not find suitable SN2 reaction sites');
      return;
    }
    
    log(`🎯 SN2 orientation: electrophile C${electrophile.atomIndex}, nucleophile ${nucleophileCenter.atomIndex}, leaving group ${leavingGroup.atomIndex}`);
    
    // Calculate backside attack vector (180° from leaving group)
    const attackVector = this.calculateBacksideAttackVector(
      substrate.atoms[electrophile.atomIndex].position,
      substrate.atoms[leavingGroup.atomIndex].position
    );
    
    // Position nucleophile for optimal approach
    const approachDistance = this.getApproachDistance(conditions);
    const targetPosition = {
      x: substrate.atoms[electrophile.atomIndex].position.x + attackVector.x * approachDistance,
      y: substrate.atoms[electrophile.atomIndex].position.y + attackVector.y * approachDistance,
      z: substrate.atoms[electrophile.atomIndex].position.z + attackVector.z * approachDistance
    };
    
    // Animate nucleophile to target position
    await this.animateToPosition(nucleophile.mesh, targetPosition, 1500);
    
    // Orient nucleophilic atom toward electrophile
    await this.orientAtomToward(
      nucleophile,
      nucleophileCenter.atomIndex,
      substrate.atoms[electrophile.atomIndex].position
    );
    
    log('✅ SN2 orientation complete');
  }
  
  /**
   * Calculate SN2 transition state
   */
  async calculateTransitionState(
    reactants: MolecularStructure[],
    products: MolecularStructure[],
    conditions?: ReactionConditions
  ): Promise<TransitionState> {
    
    const [substrate, nucleophile] = reactants;
    
    // Create transition state geometry by interpolating structures
    const transitionGeometry = await this.interpolateStructures(reactants, products, 0.5);
    
    // Modify bond lengths for SN2 transition state
    const electrophileIndex = this.findBestElectrophile(substrate)?.atomIndex;
    const nucleophileIndex = this.findBestNucleophile(nucleophile)?.atomIndex;
    const leavingGroupIndex = this.findLeavingGroup(substrate, electrophileIndex)?.atomIndex;
    
    if (electrophileIndex !== undefined && nucleophileIndex !== undefined && leavingGroupIndex !== undefined) {
      // Elongate leaving bond, shorten forming bond for transition state
      this.modifyBondInStructure(transitionGeometry, electrophileIndex, leavingGroupIndex, 2.1); // Å
      this.modifyBondInStructure(transitionGeometry, electrophileIndex, nucleophileIndex, 2.3); // Å
    }
    
    return {
      reactants: this.combineStructures(reactants),
      products: this.combineStructures(products),
      transitionGeometry,
      reactionCoordinate: 0.5,
      energyProfile: this.calculateSN2EnergyProfile(reactants, products, conditions)
    };
  }
  
  /**
   * Generate SN2 reaction pathway
   */
  async generatePathway(
    reactants: MolecularStructure[],
    products: MolecularStructure[],
    conditions?: ReactionConditions
  ): Promise<ReactionPathway> {
    
    const steps: ReactionStep[] = [
      {
        stepType: 'bond_forming',
        involvedAtoms: [0, 1], // Will be updated with actual indices
        energyBarrier: 75, // kJ/mol typical for SN2
        duration: 1000, // ms for animation
        description: 'Nucleophile approaches electrophilic carbon'
      },
      {
        stepType: 'bond_breaking',
        involvedAtoms: [0, 2], // Will be updated with actual indices
        energyBarrier: 0, // Concurrent with bond formation
        duration: 1000,
        description: 'Leaving group departs with bond breaking'
      }
    ];
    
    const transitionState = await this.calculateTransitionState(reactants, products, conditions);
    
    return {
      steps,
      intermediates: [], // SN2 has no stable intermediates
      transitionStates: [transitionState],
      energyProfile: transitionState.energyProfile,
      rateConstants: [this.calculateRateConstant(conditions)]
    };
  }
  
  /**
   * Validate SN2 reaction feasibility
   */
  validateReaction(
    reactants: MolecularStructure[],
    conditions?: ReactionConditions
  ): { feasible: boolean; reason?: string; confidence: number } {
    
    if (reactants.length !== 2) {
      return { 
        feasible: false, 
        reason: 'SN2 requires exactly 2 reactants (substrate + nucleophile)', 
        confidence: 1.0 
      };
    }
    
    const [substrate, nucleophile] = reactants;
    
    // Check for electrophilic center
    const electrophile = this.findBestElectrophile(substrate);
    if (!electrophile) {
      return { 
        feasible: false, 
        reason: 'No suitable electrophilic center found', 
        confidence: 0.9 
      };
    }
    
    // Check for nucleophile
    const nucleophileCenter = this.findBestNucleophile(nucleophile);
    if (!nucleophileCenter) {
      return { 
        feasible: false, 
        reason: 'No suitable nucleophile found', 
        confidence: 0.9 
      };
    }
    
    // Check for leaving group
    const leavingGroup = this.findLeavingGroup(substrate, electrophile.atomIndex);
    if (!leavingGroup) {
      return { 
        feasible: false, 
        reason: 'No suitable leaving group found', 
        confidence: 0.8 
      };
    }
    
    // Check for steric hindrance
    const sterics = this.calculateStericHindrance(substrate, electrophile.atomIndex);
    if (sterics > 0.8) {
      return { 
        feasible: false, 
        reason: 'Too much steric hindrance for SN2 mechanism', 
        confidence: 0.7 
      };
    }
    
    // Calculate overall confidence
    const confidence = Math.min(
      0.95,
      0.85 - sterics * 0.3 + electrophile.reactivity * 0.1 + nucleophileCenter.reactivity * 0.1
    );
    
    return { feasible: true, confidence };
  }
  
  /**
   * Get optimal conditions for SN2
   */
  getOptimalConditions(reactants: MolecularStructure[]): ReactionConditions {
    return {
      temperature: 298, // Room temperature favors SN2
      solvent: 'polar_aprotic', // DMF, DMSO, acetone
      ph: 8, // Slightly basic to deprotonate nucleophile
      pressure: 1, // Standard pressure
      concentration: { 
        substrate: 0.05, // M
        nucleophile: 0.1  // Excess nucleophile
      }
    };
  }
  
  // ===================================================================
  // Private helper methods
  // ===================================================================
  
  /**
   * Check if atom has a leaving group attached
   */
  private hasLeavingGroup(structure: MolecularStructure, carbonIndex: number): boolean {
    const connectedBonds = this.findConnectedBonds(structure, carbonIndex);
    
    return connectedBonds.some(bond => {
      const otherAtomIndex = bond.atomA === carbonIndex ? bond.atomB : bond.atomA;
      const otherAtom = structure.atoms[otherAtomIndex];
      return this.isLeavingGroup(otherAtom);
    });
  }
  
  /**
   * Check if atom is a nucleophile
   */
  private isNucleophile(atom: any): boolean {
    return atom.reactivity?.nucleophilicity > 0.5;
  }
  
  /**
   * Check if atom is a leaving group
   */
  private isLeavingGroup(atom: any): boolean {
    return atom.reactivity?.leavingGroupAbility > 0.5;
  }
  
  /**
   * Find best electrophilic center
   */
  private findBestElectrophile(structure: MolecularStructure): { atomIndex: number; reactivity: number } | null {
    let bestElectrophile = null;
    let maxReactivity = 0;
    
    for (let i = 0; i < structure.atoms.length; i++) {
      const atom = structure.atoms[i];
      if (atom.element === 'C' && this.hasLeavingGroup(structure, i)) {
        const reactivity = this.calculateElectrophilicity(structure, i);
        if (reactivity > maxReactivity) {
          maxReactivity = reactivity;
          bestElectrophile = { atomIndex: i, reactivity };
        }
      }
    }
    
    return bestElectrophile;
  }
  
  /**
   * Find best nucleophilic center
   */
  private findBestNucleophile(structure: MolecularStructure): { atomIndex: number; reactivity: number } | null {
    let bestNucleophile = null;
    let maxReactivity = 0;
    
    for (let i = 0; i < structure.atoms.length; i++) {
      const atom = structure.atoms[i];
      if (this.isNucleophile(atom)) {
        const reactivity = this.calculateNucleophilicity(structure, i);
        if (reactivity > maxReactivity) {
          maxReactivity = reactivity;
          bestNucleophile = { atomIndex: i, reactivity };
        }
      }
    }
    
    return bestNucleophile;
  }
  
  /**
   * Find leaving group attached to electrophilic center
   */
  private findLeavingGroup(structure: MolecularStructure, electrophileIndex?: number): { atomIndex: number; reactivity: number } | null {
    if (electrophileIndex === undefined) return null;
    
    const connectedBonds = this.findConnectedBonds(structure, electrophileIndex);
    
    for (const bond of connectedBonds) {
      const otherAtomIndex = bond.atomA === electrophileIndex ? bond.atomB : bond.atomA;
      const otherAtom = structure.atoms[otherAtomIndex];
      
      if (this.isLeavingGroup(otherAtom)) {
        return {
          atomIndex: otherAtomIndex,
          reactivity: otherAtom.reactivity?.leavingGroupAbility || 0
        };
      }
    }
    
    return null;
  }
  
  /**
   * Calculate backside attack vector
   */
  private calculateBacksideAttackVector(
    electrophilePos: { x: number; y: number; z: number },
    leavingGroupPos: { x: number; y: number; z: number }
  ): { x: number; y: number; z: number } {
    
    // Vector from electrophile to leaving group
    const lgVector = {
      x: leavingGroupPos.x - electrophilePos.x,
      y: leavingGroupPos.y - electrophilePos.y,
      z: leavingGroupPos.z - electrophilePos.z
    };
    
    // Normalize the vector
    const length = Math.sqrt(lgVector.x * lgVector.x + lgVector.y * lgVector.y + lgVector.z * lgVector.z);
    
    if (length === 0) {
      return { x: 0, y: 0, z: -1 }; // Default direction
    }
    
    // Return opposite direction (backside attack)
    return {
      x: -lgVector.x / length,
      y: -lgVector.y / length,
      z: -lgVector.z / length
    };
  }
  
  /**
   * Get approach distance based on conditions
   */
  private getApproachDistance(conditions?: ReactionConditions): number {
    const baseDist = 3.0; // Angstroms
    
    if (!conditions) return baseDist;
    
    // Adjust based on solvent
    switch (conditions.solvent) {
      case 'polar': return baseDist * 0.9;
      case 'nonpolar': return baseDist * 1.1;
      default: return baseDist;
    }
  }
  
  /**
   * Calculate electrophilicity of carbon center
   */
  private calculateElectrophilicity(structure: MolecularStructure, atomIndex: number): number {
    const atom = structure.atoms[atomIndex];
    let electrophilicity = atom.reactivity?.electrophilicity || 0;
    
    // Enhance based on leaving group quality
    const connectedBonds = this.findConnectedBonds(structure, atomIndex);
    for (const bond of connectedBonds) {
      const otherAtomIndex = bond.atomA === atomIndex ? bond.atomB : bond.atomA;
      const otherAtom = structure.atoms[otherAtomIndex];
      if (this.isLeavingGroup(otherAtom)) {
        electrophilicity += otherAtom.reactivity?.leavingGroupAbility * 0.5 || 0;
      }
    }
    
    return Math.min(1.0, electrophilicity);
  }
  
  /**
   * Calculate nucleophilicity
   */
  private calculateNucleophilicity(structure: MolecularStructure, atomIndex: number): number {
    const atom = structure.atoms[atomIndex];
    return atom.reactivity?.nucleophilicity || 0;
  }
  
  /**
   * Calculate steric hindrance around electrophilic center
   */
  private calculateStericHindrance(structure: MolecularStructure, atomIndex: number): number {
    const connectedBonds = this.findConnectedBonds(structure, atomIndex);
    const substituentCount = connectedBonds.length;
    
    // Simple steric hindrance model
    switch (substituentCount) {
      case 1: return 0.0; // Methyl cation (theoretical)
      case 2: return 0.1; // Primary
      case 3: return 0.3; // Secondary
      case 4: return 0.9; // Tertiary (very hindered for SN2)
      default: return 1.0; // Impossible geometry
    }
  }
  
  /**
   * Determine atom geometry
   */
  private determineAtomGeometry(structure: MolecularStructure, atomIndex: number): 'tetrahedral' | 'trigonal_planar' | 'linear' | 'bent' {
    const connectedBonds = this.findConnectedBonds(structure, atomIndex);
    const bondCount = connectedBonds.length;
    
    switch (bondCount) {
      case 2: return 'linear';
      case 3: return 'trigonal_planar';
      case 4: return 'tetrahedral';
      default: return 'bent';
    }
  }
  
  /**
   * Orient atom toward target position
   */
  private async orientAtomToward(
    structure: MolecularStructure,
    atomIndex: number,
    targetPos: { x: number; y: number; z: number }
  ): Promise<void> {
    // Simple implementation - could be enhanced with proper quaternion rotation
    log(`🎯 Orienting atom ${atomIndex} toward target position`);
    // Implementation would involve rotating the entire molecule
    // to align the specified atom with the target direction
  }
  
  /**
   * Interpolate between reactant and product structures
   */
  private async interpolateStructures(
    reactants: MolecularStructure[],
    products: MolecularStructure[],
    t: number
  ): Promise<MolecularStructure> {
    // Simple implementation - would need more sophisticated interpolation
    const combined = this.combineStructures(reactants);
    combined.energy = this.calculateInterpolatedEnergy(reactants, products, t);
    return combined;
  }
  
  /**
   * Combine multiple structures into one
   */
  private combineStructures(structures: MolecularStructure[]): MolecularStructure {
    const combined: MolecularStructure = {
      atoms: [],
      bonds: [],
      geometry: structures[0]?.geometry || {},
      mesh: structures[0]?.mesh || null,
      energy: 0
    };
    
    let atomOffset = 0;
    
    for (const structure of structures) {
      // Add atoms with offset indices
      for (const atom of structure.atoms) {
        combined.atoms.push({ ...atom, index: atom.index + atomOffset });
      }
      
      // Add bonds with offset indices
      for (const bond of structure.bonds) {
        combined.bonds.push({
          ...bond,
          atomA: bond.atomA + atomOffset,
          atomB: bond.atomB + atomOffset
        });
      }
      
      atomOffset += structure.atoms.length;
      combined.energy += structure.energy;
    }
    
    return combined;
  }
  
  /**
   * Modify bond length in structure
   */
  private modifyBondInStructure(
    structure: MolecularStructure, 
    atomA: number, 
    atomB: number, 
    newLength: number
  ): void {
    const bond = structure.bonds.find(b => 
      (b.atomA === atomA && b.atomB === atomB) ||
      (b.atomA === atomB && b.atomB === atomA)
    );
    
    if (bond) {
      bond.length = newLength;
    }
  }
  
  /**
   * Calculate SN2 energy profile
   */
  private calculateSN2EnergyProfile(
    reactants: MolecularStructure[],
    products: MolecularStructure[],
    conditions?: ReactionConditions
  ): number[] {
    const points = 50;
    const profile: number[] = [];
    const barrier = 75; // kJ/mol typical SN2 barrier
    
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      // Gaussian-like barrier with maximum at t=0.5
      const energy = barrier * Math.exp(-Math.pow((t - 0.5) * 4, 2));
      profile.push(energy);
    }
    
    return profile;
  }
  
  /**
   * Calculate interpolated energy
   */
  private calculateInterpolatedEnergy(
    reactants: MolecularStructure[],
    products: MolecularStructure[],
    t: number
  ): number {
    const reactantEnergy = reactants.reduce((sum, r) => sum + r.energy, 0);
    const productEnergy = products.reduce((sum, p) => sum + p.energy, 0);
    
    // Simple linear interpolation with barrier
    const barrier = 75; // kJ/mol
    const barrierContribution = barrier * Math.sin(t * Math.PI);
    
    return reactantEnergy * (1 - t) + productEnergy * t + barrierContribution;
  }
  
  /**
   * Calculate rate constant
   */
  private calculateRateConstant(conditions?: ReactionConditions): number {
    const temperature = conditions?.temperature || 298; // K
    const activationEnergy = 75000; // J/mol
    const R = 8.314; // J/(mol·K)
    const A = 1e10; // Pre-exponential factor
    
    return A * Math.exp(-activationEnergy / (R * temperature));
  }
}

/**
 * Reaction Coordinator
 * 
 * Handles spawn conditions, molecular positioning, and orientation for reactions
 * Integrates with MolecularManipulator and StructureEngine for intelligent setup
 * 
 * Key Features:
 * - Smart molecular positioning based on reaction type
 * - Proper approach angles for collision systems
 * - Reaction-specific orientation (SN2 backside attack, E2 anti-periplanar, etc.)
 * - Integration with existing physics and visualization systems
 * - Support for multiple reaction mechanisms
 */

import * as THREE from 'three';
import { log } from '../utils/debug';
import type { MoleculeManager } from '../types';
import { MolecularManipulator } from './molecularManipulator';
import { StructureEngine } from './structureEngine';

// ===================================================================
// INTERFACES & TYPES
// ===================================================================

export interface ReactionSetupConfig {
  reactionType: 'SN2' | 'SN1' | 'E2' | 'E1' | 'Addition' | 'Elimination';
  temperature?: number;
  solvent?: string;
  approachAngle?: number;
  collisionEnergy?: number;
  separationDistance?: number;
  orientationMode?: 'optimal' | 'random' | 'custom';
}

export interface MolecularPositioning {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity?: THREE.Vector3;
  approachVector?: THREE.Vector3;
}

export interface ReactionGeometry {
  substrate: MolecularPositioning;
  reagent: MolecularPositioning;
  products?: MolecularPositioning[];
  transitionState?: THREE.Vector3;
  reactionAxis?: THREE.Vector3;
}

export interface CollisionParameters {
  approachAngle: number;
  impactParameter: number;
  collisionEnergy: number;
  reactionProbability: number;
  trajectoryType: 'linear' | 'curved' | 'orbital';
}

// ===================================================================
// REACTION COORDINATOR CLASS
// ===================================================================

export class ReactionCoordinator {
  private scene: THREE.Scene;
  private molecularManipulator: MolecularManipulator;
  private structureEngine: StructureEngine;
  
  // Reaction-specific positioning configurations
  private readonly REACTION_CONFIGS = {
    SN2: {
      approachAngle: 180, // Perfect backside attack
      separationDistance: 4.0, // Angstroms
      orientationTolerance: 15, // degrees
      collisionEnergy: 25, // kJ/mol
      trajectoryType: 'linear' as const
    },
    SN1: {
      approachAngle: 90, // Side approach (doesn't matter as much)
      separationDistance: 3.5,
      orientationTolerance: 45,
      collisionEnergy: 15,
      trajectoryType: 'curved' as const
    },
    E2: {
      approachAngle: 180, // Anti-periplanar requirement
      separationDistance: 3.8,
      orientationTolerance: 10, // Very strict for E2
      collisionEnergy: 30,
      trajectoryType: 'linear' as const
    },
    E1: {
      approachAngle: 120,
      separationDistance: 3.5,
      orientationTolerance: 30,
      collisionEnergy: 20,
      trajectoryType: 'curved' as const
    },
    Addition: {
      approachAngle: 90, // Perpendicular to π-system
      separationDistance: 3.2,
      orientationTolerance: 20,
      collisionEnergy: 20,
      trajectoryType: 'orbital' as const
    },
    Elimination: {
      approachAngle: 160,
      separationDistance: 3.6,
      orientationTolerance: 25,
      collisionEnergy: 25,
      trajectoryType: 'linear' as const
    }
  };
  
  constructor(
    scene: THREE.Scene,
    molecularManipulator: MolecularManipulator,
    structureEngine: StructureEngine
  ) {
    this.scene = scene;
    this.molecularManipulator = molecularManipulator;
    this.structureEngine = structureEngine;
    
    log('🎯 ReactionCoordinator initialized');
  }
  
  // ===================================================================
  // MAIN COORDINATION METHODS
  // ===================================================================
  
  /**
   * Set up molecules for optimal reaction conditions
   */
  async coordinateReaction(
    moleculeManager: MoleculeManager,
    config: ReactionSetupConfig
  ): Promise<{
    geometry: ReactionGeometry;
    collisionParams: CollisionParameters;
    success: boolean;
    warnings?: string[];
  }> {
    log(`🎯 Coordinating ${config.reactionType} reaction setup...`);
    
    const molecules = moleculeManager.getAllMolecules();
    if (molecules.length < 2) {
      return {
        geometry: this.getDefaultGeometry(),
        collisionParams: this.getDefaultCollisionParams(),
        success: false,
        warnings: ['Need at least 2 molecules for reaction coordination']
      };
    }
    
    const [substrate, reagent] = molecules;
    const reactionConfig = this.REACTION_CONFIGS[config.reactionType];
    const warnings: string[] = [];
    
    try {
      // Step 1: Analyze molecular structures
      const substrateAnalysis = await this.analyzeMolecularStructure(substrate, config.reactionType);
      const reagentAnalysis = await this.analyzeMolecularStructure(reagent, config.reactionType);
      
      // Step 2: Calculate optimal positioning
      const geometry = await this.calculateOptimalGeometry(
        substrate,
        reagent,
        substrateAnalysis,
        reagentAnalysis,
        config
      );
      
      // Step 3: Apply positioning to actual molecules
      await this.applyMolecularPositioning(substrate, geometry.substrate);
      await this.applyMolecularPositioning(reagent, geometry.reagent);
      
      // Step 4: Set up collision parameters
      const collisionParams = this.calculateCollisionParameters(
        geometry,
        config,
        reactionConfig
      );
      
      // Step 5: Validate setup
      const validation = this.validateReactionSetup(geometry, collisionParams, config);
      if (!validation.isValid) {
        warnings.push(...validation.warnings);
      }
      
      log(`✅ ${config.reactionType} reaction coordinated successfully`);
      log(`📍 Substrate: ${this.formatVector(geometry.substrate.position)}`);
      log(`📍 Reagent: ${this.formatVector(geometry.reagent.position)}`);
      log(`🎯 Approach angle: ${collisionParams.approachAngle.toFixed(1)}°`);
      
      return {
        geometry,
        collisionParams,
        success: true,
        warnings: warnings.length > 0 ? warnings : undefined
      };
      
    } catch (error) {
      log(`❌ Failed to coordinate reaction: ${error.message}`);
      return {
        geometry: this.getDefaultGeometry(),
        collisionParams: this.getDefaultCollisionParams(),
        success: false,
        warnings: [`Coordination failed: ${error.message}`]
      };
    }
  }
  
  /**
   * Quick setup for demo reactions with sensible defaults
   */
  async setupDemoReaction(
    moleculeManager: MoleculeManager,
    reactionType: ReactionSetupConfig['reactionType'] = 'SN2'
  ): Promise<boolean> {
    log(`🎬 Setting up demo ${reactionType} reaction...`);
    
    const config: ReactionSetupConfig = {
      reactionType,
      temperature: 298, // Room temperature
      solvent: 'polar',
      orientationMode: 'optimal'
    };
    
    const result = await this.coordinateReaction(moleculeManager, config);
    
    if (result.success) {
      log(`🎬 Demo ${reactionType} setup complete!`);
      if (result.warnings) {
        result.warnings.forEach(warning => log(`⚠️ ${warning}`));
      }
    } else {
      log(`❌ Demo ${reactionType} setup failed`);
    }
    
    return result.success;
  }
  
  // ===================================================================
  // MOLECULAR STRUCTURE ANALYSIS
  // ===================================================================
  
  /**
   * Analyze molecular structure for reaction-specific features
   */
  private async analyzeMolecularStructure(
    molecule: any,
    reactionType: string
  ): Promise<{
    reactionSites: Array<{ atomIndex: number; type: string; reactivity: number; }>;
    geometry: string;
    orientation: THREE.Vector3;
    center: THREE.Vector3;
  }> {
    
    // Get molecule center
    const center = this.calculateMoleculeCenter(molecule);
    
    // Determine primary orientation axis
    const orientation = this.calculatePrimaryAxis(molecule);
    
    // Find reaction-specific sites
    const reactionSites = this.identifyReactionSites(molecule, reactionType);
    
    // Determine molecular geometry
    const geometry = this.determineMolecularGeometry(molecule);
    
    return {
      reactionSites,
      geometry,
      orientation,
      center
    };
  }
  
  /**
   * Identify reaction-specific sites in molecule
   */
  private identifyReactionSites(molecule: any, reactionType: string): Array<{
    atomIndex: number;
    type: string;
    reactivity: number;
  }> {
    const sites: Array<{ atomIndex: number; type: string; reactivity: number; }> = [];
    
    if (!molecule.molObject || !molecule.molObject.atoms) {
      return sites;
    }
    
    const atoms = molecule.molObject.atoms;
    
    switch (reactionType) {
      case 'SN2':
        // Look for electrophilic carbons and leaving groups
        atoms.forEach((atom: any, index: number) => {
          if (atom.type === 'C') {
            // Check for leaving groups attached to carbon
            const hasLeavingGroup = this.hasLeavingGroupAttached(atoms, index);
            if (hasLeavingGroup) {
              sites.push({
                atomIndex: index,
                type: 'electrophile',
                reactivity: 0.8
              });
            }
          } else if (['Br', 'Cl', 'I', 'F'].includes(atom.type)) {
            sites.push({
              atomIndex: index,
              type: 'leaving_group',
              reactivity: this.getLeavingGroupAbility(atom.type)
            });
          } else if (['O', 'N', 'S'].includes(atom.type)) {
            sites.push({
              atomIndex: index,
              type: 'nucleophile',
              reactivity: this.getNucleophilicity(atom.type)
            });
          }
        });
        break;
        
      case 'E2':
        // Look for β-hydrogens and leaving groups
        atoms.forEach((atom: any, index: number) => {
          if (atom.type === 'H') {
            const isBetaH = this.isBetaHydrogen(atoms, index);
            if (isBetaH) {
              sites.push({
                atomIndex: index,
                type: 'beta_hydrogen',
                reactivity: 0.7
              });
            }
          }
        });
        break;
        
      case 'Addition':
        // Look for double bonds and π-systems
        // This would require bond analysis from molObject
        break;
    }
    
    return sites;
  }
  
  // ===================================================================
  // GEOMETRIC CALCULATIONS
  // ===================================================================
  
  /**
   * Calculate optimal molecular geometry for reaction
   */
  private async calculateOptimalGeometry(
    substrate: any,
    reagent: any,
    substrateAnalysis: any,
    reagentAnalysis: any,
    config: ReactionSetupConfig
  ): Promise<ReactionGeometry> {
    
    const reactionConfig = this.REACTION_CONFIGS[config.reactionType];
    const separationDistance = config.separationDistance || reactionConfig.separationDistance;
    
    // Calculate substrate position (usually at origin or slightly offset)
    const substratePosition = new THREE.Vector3(0, 0, 0);
    
    // Calculate reagent position based on reaction type
    let reagentPosition: THREE.Vector3;
    let approachVector: THREE.Vector3;
    
    switch (config.reactionType) {
      case 'SN2':
        reagentPosition = this.calculateSN2ReagentPosition(
          substrateAnalysis,
          reagentAnalysis,
          separationDistance
        );
        approachVector = new THREE.Vector3(-1, 0, 0); // Backside attack
        break;
        
      case 'E2':
        reagentPosition = this.calculateE2ReagentPosition(
          substrateAnalysis,
          reagentAnalysis,
          separationDistance
        );
        approachVector = this.calculateAntiPeriplanarVector(substrateAnalysis);
        break;
        
      case 'Addition':
        reagentPosition = this.calculateAdditionReagentPosition(
          substrateAnalysis,
          reagentAnalysis,
          separationDistance
        );
        approachVector = new THREE.Vector3(0, 0, 1); // Perpendicular to π-system
        break;
        
      default:
        reagentPosition = new THREE.Vector3(separationDistance, 0, 0);
        approachVector = new THREE.Vector3(-1, 0, 0);
    }
    
    // Calculate rotations for optimal orientation
    const substrateRotation = this.calculateOptimalRotation(substrate, config.reactionType, 'substrate');
    const reagentRotation = this.calculateOptimalRotation(reagent, config.reactionType, 'reagent');
    
    // Calculate velocities for collision
    const collisionVelocity = this.calculateCollisionVelocity(
      reagentPosition,
      substratePosition,
      config.collisionEnergy || reactionConfig.collisionEnergy
    );
    
    return {
      substrate: {
        position: substratePosition,
        rotation: substrateRotation,
        velocity: new THREE.Vector3(0, 0, 0), // Substrate typically stationary
        approachVector: new THREE.Vector3(0, 0, 0)
      },
      reagent: {
        position: reagentPosition,
        rotation: reagentRotation,
        velocity: collisionVelocity,
        approachVector: approachVector
      },
      reactionAxis: approachVector.clone().normalize(),
      transitionState: this.calculateTransitionStatePosition(substratePosition, reagentPosition)
    };
  }
  
  /**
   * Calculate SN2-specific reagent positioning (backside attack)
   */
  private calculateSN2ReagentPosition(
    substrateAnalysis: any,
    reagentAnalysis: any,
    separationDistance: number
  ): THREE.Vector3 {
    
    // Find the leaving group position to determine backside attack vector
    const leavingGroupSite = substrateAnalysis.reactionSites.find((site: any) => 
      site.type === 'leaving_group'
    );
    
    if (leavingGroupSite) {
      // Position reagent on opposite side of leaving group
      const leavingGroupVector = new THREE.Vector3(1, 0, 0); // Simplified - would use actual LG position
      const backsideVector = leavingGroupVector.clone().negate().normalize();
      return backsideVector.multiplyScalar(separationDistance);
    }
    
    // Default backside position
    return new THREE.Vector3(-separationDistance, 0, 0);
  }
  
  /**
   * Calculate E2-specific reagent positioning (anti-periplanar)
   */
  private calculateE2ReagentPosition(
    substrateAnalysis: any,
    reagentAnalysis: any,
    separationDistance: number
  ): THREE.Vector3 {
    
    // Position base to abstract β-hydrogen in anti-periplanar fashion
    const betaHSite = substrateAnalysis.reactionSites.find((site: any) => 
      site.type === 'beta_hydrogen'
    );
    
    if (betaHSite) {
      // Position base on opposite side of β-H from leaving group
      const antiPeriplanarVector = this.calculateAntiPeriplanarVector(substrateAnalysis);
      return antiPeriplanarVector.multiplyScalar(separationDistance);
    }
    
    // Default position
    return new THREE.Vector3(0, separationDistance, 0);
  }
  
  /**
   * Calculate Addition-specific reagent positioning (perpendicular to π-system)
   */
  private calculateAdditionReagentPosition(
    substrateAnalysis: any,
    reagentAnalysis: any,
    separationDistance: number
  ): THREE.Vector3 {
    
    // Position reagent perpendicular to π-system for optimal orbital overlap
    return new THREE.Vector3(0, 0, separationDistance);
  }
  
  // ===================================================================
  // POSITIONING APPLICATION
  // ===================================================================
  
  /**
   * Apply calculated positioning to actual molecule
   */
  private async applyMolecularPositioning(
    molecule: any,
    positioning: MolecularPositioning
  ): Promise<void> {
    
    if (!molecule.group) {
      log(`⚠️ Molecule ${molecule.name} has no Three.js group`);
      return;
    }
    
    // Apply position
    molecule.group.position.copy(positioning.position);
    
    // Apply rotation
    molecule.group.rotation.copy(positioning.rotation);
    
    // Apply velocity if physics body exists
    if (molecule.physicsBody && positioning.velocity) {
      molecule.physicsBody.velocity.set(
        positioning.velocity.x,
        positioning.velocity.y,
        positioning.velocity.z
      );
    }
    
    log(`📍 Positioned ${molecule.name} at ${this.formatVector(positioning.position)}`);
  }
  
  // ===================================================================
  // COLLISION PARAMETER CALCULATION
  // ===================================================================
  
  /**
   * Calculate collision parameters for physics system
   */
  private calculateCollisionParameters(
    geometry: ReactionGeometry,
    config: ReactionSetupConfig,
    reactionConfig: any
  ): CollisionParameters {
    
    const distance = geometry.substrate.position.distanceTo(geometry.reagent.position);
    const approachAngle = config.approachAngle || reactionConfig.approachAngle;
    
    return {
      approachAngle: approachAngle,
      impactParameter: 0.0, // Head-on collision for demo
      collisionEnergy: config.collisionEnergy || reactionConfig.collisionEnergy,
      reactionProbability: this.calculateReactionProbability(config, distance),
      trajectoryType: reactionConfig.trajectoryType
    };
  }
  
  /**
   * Calculate reaction probability based on conditions
   */
  private calculateReactionProbability(
    config: ReactionSetupConfig,
    distance: number
  ): number {
    
    let baseProbability = 0.8; // High for demo purposes
    
    // Adjust for temperature (higher T = higher probability)
    if (config.temperature) {
      const tempFactor = Math.min(config.temperature / 298, 2.0); // Cap at 2x
      baseProbability *= tempFactor;
    }
    
    // Adjust for distance (closer = higher probability)
    const distanceFactor = Math.max(0.5, 4.0 / distance);
    baseProbability *= distanceFactor;
    
    return Math.min(baseProbability, 1.0);
  }
  
  // ===================================================================
  // VALIDATION & QUALITY CHECKS
  // ===================================================================
  
  /**
   * Validate reaction setup quality
   */
  private validateReactionSetup(
    geometry: ReactionGeometry,
    collisionParams: CollisionParameters,
    config: ReactionSetupConfig
  ): { isValid: boolean; warnings: string[]; } {
    
    const warnings: string[] = [];
    let isValid = true;
    
    // Check separation distance
    const distance = geometry.substrate.position.distanceTo(geometry.reagent.position);
    const reactionConfig = this.REACTION_CONFIGS[config.reactionType];
    
    if (distance < 2.0) {
      warnings.push('Molecules too close - may cause unrealistic collisions');
      isValid = false;
    } else if (distance > 8.0) {
      warnings.push('Molecules too far apart - collision may not occur');
    }
    
    // Check approach angle for reaction type
    const angleTolerance = reactionConfig.orientationTolerance;
    const expectedAngle = reactionConfig.approachAngle;
    const actualAngle = collisionParams.approachAngle;
    
    if (Math.abs(actualAngle - expectedAngle) > angleTolerance) {
      warnings.push(
        `Suboptimal approach angle: ${actualAngle.toFixed(1)}° ` +
        `(expected ${expectedAngle}° ± ${angleTolerance}°)`
      );
    }
    
    // Check reaction probability
    if (collisionParams.reactionProbability < 0.5) {
      warnings.push(`Low reaction probability: ${(collisionParams.reactionProbability * 100).toFixed(1)}%`);
    }
    
    return { isValid, warnings };
  }
  
  // ===================================================================
  // UTILITY METHODS
  // ===================================================================
  
  private calculateMoleculeCenter(molecule: any): THREE.Vector3 {
    if (molecule.group && molecule.group.position) {
      return molecule.group.position.clone();
    }
    return new THREE.Vector3(0, 0, 0);
  }
  
  private calculatePrimaryAxis(molecule: any): THREE.Vector3 {
    // Simplified - would analyze actual molecular geometry
    return new THREE.Vector3(1, 0, 0);
  }
  
  private determineMolecularGeometry(molecule: any): string {
    // Simplified geometry determination
    if (!molecule.molObject || !molecule.molObject.atoms) return 'unknown';
    
    const atomCount = molecule.molObject.atoms.length;
    if (atomCount <= 2) return 'linear';
    if (atomCount <= 4) return 'tetrahedral';
    return 'complex';
  }
  
  private hasLeavingGroupAttached(atoms: any[], carbonIndex: number): boolean {
    // Simplified check for leaving groups
    return atoms.some((atom: any) => ['Br', 'Cl', 'I', 'F'].includes(atom.type));
  }
  
  private getLeavingGroupAbility(element: string): number {
    const abilities: { [key: string]: number } = {
      'I': 0.9,   // Best leaving group
      'Br': 0.8,
      'Cl': 0.6,
      'F': 0.3    // Poor leaving group
    };
    return abilities[element] || 0.5;
  }
  
  private getNucleophilicity(element: string): number {
    const nucleophilicities: { [key: string]: number } = {
      'N': 0.9,   // Good nucleophile
      'O': 0.7,
      'S': 0.8
    };
    return nucleophilicities[element] || 0.5;
  }
  
  private isBetaHydrogen(atoms: any[], hydrogenIndex: number): boolean {
    // Simplified β-hydrogen identification
    return atoms[hydrogenIndex].type === 'H';
  }
  
  private calculateAntiPeriplanarVector(substrateAnalysis: any): THREE.Vector3 {
    // Simplified anti-periplanar vector calculation
    return new THREE.Vector3(0, 1, 0);
  }
  
  private calculateOptimalRotation(
    molecule: any,
    reactionType: string,
    role: 'substrate' | 'reagent'
  ): THREE.Euler {
    // Simplified rotation calculation
    return new THREE.Euler(0, 0, 0);
  }
  
  private calculateCollisionVelocity(
    from: THREE.Vector3,
    to: THREE.Vector3,
    energy: number
  ): THREE.Vector3 {
    const direction = to.clone().sub(from).normalize();
    const speed = Math.sqrt(2 * energy / 100); // Simplified energy to velocity conversion
    return direction.multiplyScalar(speed);
  }
  
  private calculateTransitionStatePosition(
    substratePos: THREE.Vector3,
    reagentPos: THREE.Vector3
  ): THREE.Vector3 {
    return substratePos.clone().lerp(reagentPos, 0.5);
  }
  
  private calculateReactionProbability(config: ReactionSetupConfig, distance: number): number {
    let probability = 0.85; // High for demo
    
    // Adjust based on distance
    if (distance > 5.0) probability *= 0.7;
    if (distance < 2.5) probability *= 1.2;
    
    // Adjust based on temperature
    if (config.temperature && config.temperature > 350) {
      probability *= 1.1;
    }
    
    return Math.min(probability, 1.0);
  }
  
  private formatVector(vec: THREE.Vector3): string {
    return `(${vec.x.toFixed(2)}, ${vec.y.toFixed(2)}, ${vec.z.toFixed(2)})`;
  }
  
  private getDefaultGeometry(): ReactionGeometry {
    return {
      substrate: {
        position: new THREE.Vector3(-2, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0)
      },
      reagent: {
        position: new THREE.Vector3(2, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        velocity: new THREE.Vector3(-1, 0, 0)
      }
    };
  }
  
  private getDefaultCollisionParams(): CollisionParameters {
    return {
      approachAngle: 180,
      impactParameter: 0.0,
      collisionEnergy: 25,
      reactionProbability: 0.8,
      trajectoryType: 'linear'
    };
  }
  
  /**
   * Get reaction coordinator statistics
   */
  getStats(): {
    reactionsCoordinated: number;
    successRate: number;
    averageSetupTime: number;
  } {
    // Would track actual statistics in production
    return {
      reactionsCoordinated: 0,
      successRate: 1.0,
      averageSetupTime: 150 // ms
    };
  }
  
  /**
   * Cleanup and disposal
   */
  dispose(): void {
    log('🧹 ReactionCoordinator disposed');
  }
}

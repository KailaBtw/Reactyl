import * as THREE from 'three';
// Removed old ChemistryReactionSystem import - using unified approach
import { CannonPhysicsEngine, physicsEngine } from '../physics/cannonPhysicsEngine';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { drawMolecule } from '../components/moleculeDrawer';
import { ChemicalDataService } from '../chemistry/chemicalDataService';
import { REACTION_TYPES } from '../chemistry/reactionDatabase';
// Orientation handled simplistically (identity rotations); detailed strategies not needed
import { computeEncounter, applyEncounter } from '../physics/encounterPlanner';
import type { MoleculeManager } from '../types';
import { log } from '../utils/debug';
import { reactionAnimationManager } from '../animations/ReactionAnimationManager';

/**
 * Reaction State Interface
 * Single source of truth for all reaction-related state
 */
export interface ReactionState {
  molecules: {
    substrate: MoleculeState | null;
    nucleophile: MoleculeState | null;
  };
  physics: {
    velocities: THREE.Vector3[];
    orientations: THREE.Quaternion[];
    isSimulationActive: boolean;
  };
  reaction: {
    type: string;
    progress: number;
    approachAngle: number;
    isInProgress: boolean;
  };
  visual: {
    needsUpdate: boolean;
    lastUpdateTime: number;
  };
}

export interface MoleculeState {
  group: THREE.Group;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  name: string;
  cid: string;
}

/**
 * Reaction Parameters Interface
 */
export interface ReactionParams {
  substrateMolecule: { cid: string; name: string };
  nucleophileMolecule: { cid: string; name: string };
  reactionType: string;
  temperature: number;
  approachAngle: number;
  impactParameter: number;
  relativeVelocity: number;
}

/**
 * Reaction Orchestrator
 * 
 * Central coordination layer that unifies all reaction-related systems:
 * - Chemistry Reaction System
 * - Physics Engine
 * - Collision Event System
 * - Visual Rendering
 * 
 * This replaces the fragmented approach with a single, coordinated system.
 */
export class ReactionOrchestrator {
  // Removed old chemistrySystem - using unified approach
  private physicsEngine: CannonPhysicsEngine = physicsEngine; // Use global physics engine;
  private collisionSystem: typeof collisionEventSystem;
  private moleculeManager: MoleculeManager;
  private scene: THREE.Scene;
  private chemicalDataService: ChemicalDataService;
  
  // Unified state management
  private state: ReactionState;
  private isInitialized: boolean = false;
  
  constructor(scene: THREE.Scene, moleculeManager: MoleculeManager) {
    this.scene = scene;
    this.moleculeManager = moleculeManager;
    // Removed old chemistrySystem initialization - using unified approach
    // this.physicsEngine is already set to the global physics engine
    this.collisionSystem = collisionEventSystem;
    this.chemicalDataService = new ChemicalDataService();
    
    // Initialize unified state
    this.state = {
      molecules: {
        substrate: null,
        nucleophile: null
      },
      physics: {
        velocities: [],
        orientations: [],
        isSimulationActive: false
      },
      reaction: {
        type: '',
        progress: 0,
        approachAngle: 0,
        isInProgress: false
      },
      visual: {
        needsUpdate: false,
        lastUpdateTime: 0
      }
    };
    
    this.initializeSystems();
  }
  
  /**
   * Initialize all systems with proper coordination
   */
  private initializeSystems(): void {
    try {
      // Clear any existing handlers to ensure our handler is first
      this.collisionSystem.clearAllHandlers();
      
      // Set up collision event handlers (register first to be called first)
      this.collisionSystem.registerHandler((event: any) => {
        this.handleCollisionEvent(event);
      });
      
      // Initialize physics engine
      this.physicsEngine.resume();
      
      this.isInitialized = true;
    } catch (error) {
      log(`System initialization failed: ${error}`);
      throw error;
    }
  }
  
  /**
   * Main entry point for running any chemical reaction
   * This replaces the fragmented approach with unified coordination
   */
  async runReaction(params: ReactionParams): Promise<void> {
    
    if (!this.isInitialized) {
      throw new Error('ReactionOrchestrator not initialized');
    }
    
    if (this.state.reaction.isInProgress) {
      return;
    }
    
    try {
      // 1. Clear existing state
      await this.clearExistingState();
      
      // 2. Load molecules with proper orientation
      await this.loadMoleculesWithOrientation(params);
      
      // 3. Set up physics with correct velocities
      this.configurePhysics(params);
      
      // 4. Configure collision detection
      this.configureCollisionDetection(params);
      
      // 5. Start unified simulation
      this.startUnifiedSimulation();
    } catch (error) {
      log(`Unified reaction failed: ${error}`);
      this.state.reaction.isInProgress = false;
      throw error;
    }
  }
  
  /**
   * Clear all existing state and molecules
   */
  private async clearExistingState(): Promise<void> {
    // Clear all physics bodies
    this.physicsEngine.clearAllBodies();
    
    // Clear molecules from scene
    this.moleculeManager.clearAllMolecules();
    
    // Reset physics
    this.physicsEngine.pause();
    
    // Reset state
    this.state.molecules.substrate = null;
    this.state.molecules.nucleophile = null;
    this.state.reaction.isInProgress = false;
    this.state.reaction.progress = 0;
  }

  
  /**
   * Load molecules with proper orientation for the reaction type
   */
  private async loadMoleculesWithOrientation(params: ReactionParams): Promise<void> {
    try {
      // Try to load molecules, with fallback to demo molecules
      let substrate, nucleophile;
      
      // Retry mechanism for molecule loading
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          log(`Attempting to load substrate (attempt ${retryCount + 1}/${maxRetries}): ${params.substrateMolecule.name} (CID: ${params.substrateMolecule.cid})`);
          // Load substrate molecule
          substrate = await this.loadMolecule(
            params.substrateMolecule.cid,
            params.substrateMolecule.name,
            { x: 0, y: 0, z: 7.5 }, // Substrate positioned away from center
            false // No random rotation for precise positioning
          );
          
          log(`Attempting to load nucleophile (attempt ${retryCount + 1}/${maxRetries}): ${params.nucleophileMolecule.name} (CID: ${params.nucleophileMolecule.cid})`);
          // Load nucleophile molecule
          nucleophile = await this.loadMolecule(
            params.nucleophileMolecule.cid,
            params.nucleophileMolecule.name,
            { x: 0, y: 0, z: -7.5 }, // Nucleophile positioned away from center
            false // No random rotation for precise positioning
          );
          
          log(`Molecules loaded successfully: substrate=${!!substrate}, nucleophile=${!!nucleophile}`);
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          log(`Attempt ${retryCount}/${maxRetries} failed: ${error}`);
          
          if (retryCount >= maxRetries) {
            log(`Molecule loading failed after ${maxRetries} attempts`);
            throw new Error(`Failed to load molecules after ${maxRetries} attempts. Substrate: ${params.substrateMolecule.name}, Nucleophile: ${params.nucleophileMolecule.name}. Error: ${error}`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Store in unified state
      this.state.molecules.substrate = this.createMoleculeState(substrate);
      this.state.molecules.nucleophile = this.createMoleculeState(nucleophile);
      
      // Apply reaction-specific orientation
      this.orientMoleculesForReaction(params.reactionType);
    } catch (error) {
      log(`Molecule loading failed: ${error}`);
      throw error;
    }
  }
  
  /**
   * Load a single molecule with error handling
   */
  private async loadMolecule(cid: string, name: string, position: { x: number; y: number; z: number }, applyRandomRotation: boolean): Promise<any> {
    try {
      // First, fetch the molecule data using ChemicalDataService
      const molecularData = await this.chemicalDataService.fetchMoleculeByCID(cid);
      
      if (!molecularData || !molecularData.mol3d) {
        throw new Error(`No MOL data available for ${name} (CID: ${cid})`);
      }
      
      // Now draw the molecule with the actual MOL data
      drawMolecule(
        molecularData.mol3d,
        this.moleculeManager,
        this.scene,
        position,
        name,
        applyRandomRotation
      );
      
      
      // Get the molecule from the molecule manager
      const molecule = this.moleculeManager.getMolecule(name);
      
      if (!molecule) {
        throw new Error(`Failed to load molecule ${name} (CID: ${cid})`);
      }
      
      return molecule;
    } catch (error) {
      log(`Failed to load molecule ${name}: ${error}`);
      log(`Error details:`, error);
      throw error;
    }
  }
  

  /**
   * Create molecule state object for unified state management
   */
  private createMoleculeState(molecule: any): MoleculeState {
    return {
      group: molecule.group,
      position: molecule.group.position.clone(),
      rotation: molecule.group.rotation.clone(),
      quaternion: molecule.group.quaternion.clone(),
      velocity: molecule.velocity ? molecule.velocity.clone() : new THREE.Vector3(),
      name: molecule.name,
      cid: molecule.cid || 'unknown'
    };
  }
  
  /**
   * Orient molecules for the specific reaction type
   */
  private orientMoleculesForReaction(reactionType: string): void {
    if (!this.state.molecules.substrate || !this.state.molecules.nucleophile) {
      throw new Error('Molecules not loaded for orientation');
    }
    
    const substrate = this.state.molecules.substrate;
    const nucleophile = this.state.molecules.nucleophile;

    // Decomplicate: keep both molecules with identity rotation; encounter planner handles positions/velocities.
    substrate.group.quaternion.set(0, 0, 0, 1);
    substrate.group.rotation.set(0, 0, 0);
    // // Adjust substrate to face correctly: rotate 90° around Y
    substrate.group.rotateY(3 * Math.PI / 2);
    substrate.rotation.copy(substrate.group.rotation);

    nucleophile.group.quaternion.set(0, 0, 0, 1);
    nucleophile.group.rotation.set(0, 0, 0);
    nucleophile.rotation.copy(nucleophile.group.rotation);

    // Sync to physics bodies
    this.syncOrientationToPhysics(substrate);
    this.syncOrientationToPhysics(nucleophile);
  }
  
  // Orientation helpers consolidated into orientationStrategies.ts
  
  /**
   * Sync visual orientation to physics bodies
   * This prevents physics from overriding our orientation changes
   */
  private syncOrientationToPhysics(molecule: MoleculeState): void {
    try {
      // Get the molecule object from the molecule manager
      const moleculeObj = this.moleculeManager.getMolecule(molecule.name);
      if (!moleculeObj) {
        log(`Molecule object not found for ${molecule.name}`);
        return;
      }
      
      // Sync orientation to physics body
      const body = this.physicsEngine.getPhysicsBody(moleculeObj);
      if (body) {
        const q = molecule.group.quaternion;
        body.quaternion.set(q.x, q.y, q.z, q.w);
      }
    } catch (error) {
      log(`Failed to sync orientation to physics: ${error}`);
    }
  }
  
  /**
   * Configure physics with correct velocities and parameters
   */
  private configurePhysics(params: ReactionParams): void {
    if (!this.state.molecules.substrate || !this.state.molecules.nucleophile) {
      throw new Error('Molecules not loaded for physics configuration');
    }
    
    const substrate = this.state.molecules.substrate;
    const nucleophile = this.state.molecules.nucleophile;

    // Plan a deterministic encounter (perpendicular or inline) and apply positions + velocities
    const mode = Math.abs(params.approachAngle % 180) === 90 ? 'perpendicular' : 'inline';
    const plan = computeEncounter({
      approachAngle: params.approachAngle,
      relativeVelocity: params.relativeVelocity,
      impactParameter: params.impactParameter,
      mode,
    } as any);
    applyEncounter(
      this.physicsEngine,
      this.moleculeManager,
      substrate.name,
      nucleophile.name,
      plan
    );

    // Update state
    this.state.physics.velocities = [plan.substrateVelocity.clone(), plan.nucleophileVelocity.clone()];
    this.state.reaction.approachAngle = params.approachAngle;
    
    log(`Physics configured - approach angle: ${params.approachAngle}°, velocity: ${params.relativeVelocity}`);
  }
  
  /**
   * Configure collision detection system
   */
  private configureCollisionDetection(params: ReactionParams): void {
    // Get the full reaction type from the database
    const reactionType = REACTION_TYPES[params.reactionType.toLowerCase()];
    if (!reactionType) {
      log(`Unknown reaction type: ${params.reactionType}`);
      return;
    }
    
    // Reaction type loaded from database
    this.collisionSystem.resetReactionState(); // Reset collision system state
    this.collisionSystem.setReactionType(reactionType);
    this.collisionSystem.setTemperature(params.temperature);
    this.collisionSystem.setTestingMode(true); // Force 100% success for demo
    
    this.state.reaction.type = params.reactionType;
  }
  
  // (removed unused name mapping helper)
  
  /**
   * Start the unified simulation
   */
  private startUnifiedSimulation(): void {
    this.state.physics.isSimulationActive = true;
    this.state.reaction.isInProgress = true;
    this.state.visual.needsUpdate = true;
    
    this.physicsEngine.resume();
  }
  
  /**
   * Handle collision events from the collision system
   */
  private handleCollisionEvent(event: any): void {
    // Check if we're in rate simulation mode - if so, skip pause logic
    const uiState = (window as any).uiState;
    const isRateMode = uiState && uiState.simulationMode === 'rate';
    
    if (isRateMode) {
      return; // Let the rate simulator handle collisions without pausing
    }
    
    // Check if reaction occurred
    if (event.reactionResult?.occurs) {
      // IMMEDIATELY stop physics simulation to prevent molecules from flying away
      this.physicsEngine.pause();
      this.state.physics.isSimulationActive = false;
      
      // Also stop the unified simulation loop
      if ((window as any).unifiedSimulation) {
        (window as any).unifiedSimulation.pause('Reaction in progress');
      }
      
      // Process the collision through unified system
      this.executeUnifiedReaction();
      
      // Update reaction progress
      this.state.reaction.progress = 1.0;
      this.state.visual.needsUpdate = true;
    }
  }

  /**
   * Execute reaction using unified approach
   */
  private executeUnifiedReaction(): void {
    // Get molecules from state
    const substrate = this.state.molecules.substrate;
    const nucleophile = this.state.molecules.nucleophile;
    
    if (!substrate || !nucleophile) {
      return;
    }
    
    // Apply reaction-specific transformations
    this.applyReactionTransformations(substrate, nucleophile, this.state.reaction.type);
  }

  /**
   * Apply reaction-specific transformations
   */
  private applyReactionTransformations(substrate: MoleculeState, nucleophile: MoleculeState, reactionType: string): void {
    switch (reactionType.toLowerCase()) {
      case 'sn2':
        this.applySN2Transformations(substrate, nucleophile);
        break;
      case 'sn1':
        this.applySN1Transformations(substrate, nucleophile);
        break;
      case 'e2':
        this.applyE2Transformations(substrate, nucleophile);
        break;
      default:
        log(`Unknown reaction type: ${reactionType}`);
    }
  }

  /**
   * Apply SN2-specific transformations (Walden inversion + leaving group departure)
   */
  private applySN2Transformations(substrate: MoleculeState, nucleophile: MoleculeState): void {
    try {
      // Use the animation manager for coordinated SN2 animation sequence
      reactionAnimationManager.animateSN2Reaction(substrate, nucleophile, {
      waldenInversion: {
        duration: 1000,
        onStart: () => {},
        onComplete: () => {}
      },
      leavingGroupDeparture: {
        duration: 1500,
        distance: 5.0,
        fadeOut: true,
        onStart: () => {},
        onComplete: () => {}
      },
      delayBetweenAnimations: 1000,
      onStart: () => {},
      onComplete: () => {
        // Ensure final Walden inversion orientation matches backside attack (umbrella flip)
        this.applyWaldenInversionCorrection(substrate, nucleophile);
        // Resume physics simulation after correction
        this.physicsEngine.resume();
      }
      });
    } catch (error) {
      log(`Error in applySN2Transformations: ${error}`);
      console.error('SN2 transformation error:', error);
    }
  }


  /**
   * Apply SN1-specific transformations
   */
  private applySN1Transformations(_substrate: MoleculeState, _nucleophile: MoleculeState): void {
    // SN1 doesn't require specific orientation changes
  }

  /**
   * Apply E2-specific transformations
   */
  private applyE2Transformations(_substrate: MoleculeState, _nucleophile: MoleculeState): void {
    // E2 requires anti-coplanar orientation
  }
  
  /**
   * Ensure the Walden inversion leaves substrate oriented opposite to the original
   * Using the attack axis (vector from substrate to nucleophile) as rotation axis.
   */
  private applyWaldenInversionCorrection(substrate: MoleculeState, nucleophile: MoleculeState): void {
    const attackAxis = new THREE.Vector3()
      .subVectors(nucleophile.group.position, substrate.group.position)
      .normalize();
    if (attackAxis.lengthSq() === 0) return;
    const q = new THREE.Quaternion().setFromAxisAngle(attackAxis, Math.PI);
    substrate.group.applyQuaternion(q);
    substrate.rotation.copy(substrate.group.rotation);
    this.syncOrientationToPhysics(substrate);
  }
  
  /**
   * Get current reaction state
   */
  getState(): ReactionState {
    return { ...this.state };
  }

  /**
   * Get physics engine for external access
   */
  getPhysicsEngine(): CannonPhysicsEngine {
    return this.physicsEngine;
  }
  
  /**
   * Check if reaction is in progress
   */
  isReactionInProgress(): boolean {
    return this.state.reaction.isInProgress;
  }
  
  /**
   * Stop the current reaction
   */
  stopReaction(): void {
    this.state.physics.isSimulationActive = false;
    this.state.reaction.isInProgress = false;
    this.state.reaction.progress = 0;
    
    this.physicsEngine.pause();
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopReaction();
    this.clearExistingState();
  }
}

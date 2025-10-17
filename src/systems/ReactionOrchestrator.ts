import * as THREE from 'three';
// Removed old ChemistryReactionSystem import - using unified approach
import { CannonPhysicsEngine, physicsEngine } from '../physics/cannonPhysicsEngine';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { drawMolecule } from '../components/moleculeDrawer';
import { ChemicalDataService } from '../chemistry/chemicalDataService';
import { REACTION_TYPES } from '../chemistry/reactionDatabase';
import { getOrientationStrategy } from '../config/molecule/positioning';
import { computeEncounter, applyEncounter } from '../reactions/physicsConfigurator';
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
    log('🎯 ReactionOrchestrator initialized - unified system ready');
  }
  
  /**
   * Initialize all systems with proper coordination
   */
  private initializeSystems(): void {
    try {
      // Clear any existing handlers to ensure our handler is first
      log('🧹 Clearing all collision handlers to ensure unified system takes priority');
      this.collisionSystem.clearAllHandlers();
      
      // Set up collision event handlers (register first to be called first)
      log('🎯 Registering ReactionOrchestrator collision handler');
      this.collisionSystem.registerHandler((event: any) => {
        this.handleCollisionEvent(event);
      });
      
      // Initialize physics engine
      this.physicsEngine.resume();
      
      this.isInitialized = true;
      log('✅ All systems initialized and coordinated');
    } catch (error) {
      log(`❌ System initialization failed: ${error}`);
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
      log('⚠️ Reaction already in progress, skipping duplicate call');
      return;
    }
    
    log(`🎯 Starting unified reaction: ${params.reactionType}`);
    
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
      
      log(`✅ Unified ${params.reactionType} reaction started successfully`);
    } catch (error) {
      log(`❌ Unified reaction failed: ${error}`);
      this.state.reaction.isInProgress = false;
      throw error;
    }
  }
  
  /**
   * Clear all existing state and molecules
   */
  private async clearExistingState(): Promise<void> {
    log('🧹 Clearing existing state...');
    
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
    
    log('✅ Existing state cleared');
  }

  
  /**
   * Load molecules with proper orientation for the reaction type
   */
  private async loadMoleculesWithOrientation(params: ReactionParams): Promise<void> {
    log(`🧪 Loading molecules for ${params.reactionType} reaction...`);
    
    try {
      // Try to load molecules, with fallback to demo molecules
      let substrate, nucleophile;
      
      // Retry mechanism for molecule loading
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          log(`🔧 Attempting to load substrate (attempt ${retryCount + 1}/${maxRetries}): ${params.substrateMolecule.name} (CID: ${params.substrateMolecule.cid})`);
          // Load substrate molecule
          substrate = await this.loadMolecule(
            params.substrateMolecule.cid,
            params.substrateMolecule.name,
            { x: 0, y: 0, z: 7.5 }, // Substrate positioned away from center
            false // No random rotation for precise positioning
          );
          
          log(`🔧 Attempting to load nucleophile (attempt ${retryCount + 1}/${maxRetries}): ${params.nucleophileMolecule.name} (CID: ${params.nucleophileMolecule.cid})`);
          // Load nucleophile molecule
          nucleophile = await this.loadMolecule(
            params.nucleophileMolecule.cid,
            params.nucleophileMolecule.name,
            { x: 0, y: 0, z: -7.5 }, // Nucleophile positioned away from center
            false // No random rotation for precise positioning
          );
          
          log(`🔧 Molecules loaded successfully: substrate=${!!substrate}, nucleophile=${!!nucleophile}`);
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          log(`⚠️ Attempt ${retryCount}/${maxRetries} failed: ${error}`);
          
          if (retryCount >= maxRetries) {
            log(`❌ Molecule loading failed after ${maxRetries} attempts`);
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
      try {
        this.orientMoleculesForReaction(params.reactionType);
      } catch (error) {
        throw error;
      }
      
      log('✅ Molecules loaded and oriented');
    } catch (error) {
      log(`❌ Molecule loading failed: ${error}`);
      throw error;
    }
  }
  
  /**
   * Load a single molecule with error handling
   */
  private async loadMolecule(cid: string, name: string, position: { x: number; y: number; z: number }, applyRandomRotation: boolean): Promise<any> {
    try {
      log(`🧪 Loading molecule: ${name} (CID: ${cid})`);
      log(`🧪 Position: (${position.x}, ${position.y}, ${position.z})`);
      
      // First, fetch the molecule data using ChemicalDataService
      const molecularData = await this.chemicalDataService.fetchMoleculeByCID(cid);
      
      if (!molecularData || !molecularData.mol3d) {
        throw new Error(`No MOL data available for ${name} (CID: ${cid})`);
      }
      
      log(`✅ Fetched MOL data for ${name}: ${molecularData.mol3d.length} characters`);
      
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
      
      log(`Retrieved molecule ${name} with ID: ${molecule.id}`);
      
      log(`✅ Successfully loaded molecule: ${name}`);
      return molecule;
    } catch (error) {
      log(`❌ Failed to load molecule ${name}: ${error}`);
      log(`❌ Error details:`, error);
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
    
    log(`🔄 Orienting molecules for ${reactionType} reaction...`);
    
    const substrate = this.state.molecules.substrate;
    const nucleophile = this.state.molecules.nucleophile;

    // Ensure deterministic starting orientation for substrate (no 90° offsets)
    substrate.group.quaternion.set(0, 0, 0, 1);
    substrate.group.rotation.set(0, 0, 0);
    substrate.rotation.copy(substrate.group.rotation);
    // If a rotation controller exists, reset it as well
    if ((substrate as any).rotationController?.reset) {
      try { (substrate as any).rotationController.reset(); } catch { /* no-op */ }
    }
    // Sync to physics so subsequent orientation steps start from a clean baseline
    this.syncOrientationToPhysics(substrate);
    
    const orient = getOrientationStrategy(reactionType);
    orient(substrate, nucleophile);
    
    // Sync orientation to physics bodies
    this.syncOrientationToPhysics(substrate);
    this.syncOrientationToPhysics(nucleophile);
    
    log(`✅ Molecules oriented for ${reactionType} reaction`);
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
        log(`⚠️ Molecule object not found for ${molecule.name}`);
        return;
      }
      
      // Sync orientation to physics body
      const body = this.physicsEngine.getPhysicsBody(moleculeObj);
      if (body) {
        const q = molecule.group.quaternion;
        body.quaternion.set(q.x, q.y, q.z, q.w);
        log(`✅ Synced orientation to physics for ${molecule.name}`);
      } else {
        log(`⚠️ No physics body found for ${molecule.name}`);
      }
    } catch (error) {
      log(`⚠️ Failed to sync orientation to physics: ${error}`);
    }
  }
  
  /**
   * Configure physics with correct velocities and parameters
   */
  private configurePhysics(params: ReactionParams): void {
    log('⚙️ Configuring physics parameters...');
    
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
    
    log(`✅ Physics configured - approach angle: ${params.approachAngle}°, velocity: ${params.relativeVelocity}`);
  }
  
  /**
   * Configure collision detection system
   */
  private configureCollisionDetection(params: ReactionParams): void {
    log('🔍 Configuring collision detection...');
    
    // Get the full reaction type from the database
    const reactionType = REACTION_TYPES[params.reactionType.toLowerCase()];
    if (!reactionType) {
      log(`❌ Unknown reaction type: ${params.reactionType}`);
      return;
    }
    
    // Reaction type loaded from database
    this.collisionSystem.resetReactionState(); // Reset collision system state
    this.collisionSystem.setReactionType(reactionType);
    this.collisionSystem.setTemperature(params.temperature);
    this.collisionSystem.setTestingMode(true); // Force 100% success for demo
    
    this.state.reaction.type = params.reactionType;
    
    log(`✅ Collision detection configured for ${params.reactionType}`);
  }
  
  // (removed unused name mapping helper)
  
  /**
   * Start the unified simulation
   */
  private startUnifiedSimulation(): void {
    log('🚀 Starting unified simulation...');
    
    this.state.physics.isSimulationActive = true;
    this.state.reaction.isInProgress = true;
    this.state.visual.needsUpdate = true;
    
    this.physicsEngine.resume();
    
    log('✅ Unified simulation started');
  }
  
  /**
   * Handle collision events from the collision system
   */
  private handleCollisionEvent(event: any): void {
    log('🎯 REACTION ORCHESTRATOR: Collision detected in unified system');
    log(`🎯 REACTION ORCHESTRATOR: Event data:`, event);
    log(`🎯 REACTION ORCHESTRATOR: Event keys:`, Object.keys(event));
    log(`🎯 REACTION ORCHESTRATOR: reactionResult:`, event.reactionResult);
    log(`🎯 REACTION ORCHESTRATOR: reactionResult.occurs:`, event.reactionResult?.occurs);
    
    // Check if reaction occurred
    if (event.reactionResult?.occurs) {
      log('🎯 REACTION ORCHESTRATOR: Reaction occurred, executing unified reaction');
      
      // IMMEDIATELY stop physics simulation to prevent molecules from flying away
      log('🛑 IMMEDIATELY stopping physics simulation for reaction animation');
      this.physicsEngine.pause();
      this.state.physics.isSimulationActive = false;
      
      // Also stop the unified simulation loop
      if ((window as any).unifiedSimulation) {
        (window as any).unifiedSimulation.pause('Reaction in progress');
        log('🛑 Unified simulation paused for reaction');
      }
      
      // Process the collision through unified system
      this.executeUnifiedReaction();
      
      // Update reaction progress
      this.state.reaction.progress = 1.0;
      this.state.visual.needsUpdate = true;
      
      log('✅ REACTION ORCHESTRATOR: Collision processed by unified system');
    } else {
      log('🎯 REACTION ORCHESTRATOR: No reaction occurred, skipping');
      log(`🎯 REACTION ORCHESTRATOR: Reason: reactionResult=${event.reactionResult}, occurs=${event.reactionResult?.occurs}`);
    }
  }

  /**
   * Execute reaction using unified approach
   */
  private executeUnifiedReaction(): void {
    log('🧪 Executing unified reaction...');
    
    // Get molecules from state
    const substrate = this.state.molecules.substrate;
    const nucleophile = this.state.molecules.nucleophile;
    
    log(`🧪 Substrate available: ${!!substrate}, Nucleophile available: ${!!nucleophile}`);
    log(`🧪 Reaction type: ${this.state.reaction.type}`);
    
    if (!substrate || !nucleophile) {
      log('⚠️ Molecules not available for reaction');
      return;
    }
    
    // Apply reaction-specific transformations
    log('🧪 Calling applyReactionTransformations...');
    this.applyReactionTransformations(substrate, nucleophile, this.state.reaction.type);
    
    log('✅ Unified reaction executed');
  }

  /**
   * Apply reaction-specific transformations
   */
  private applyReactionTransformations(substrate: MoleculeState, nucleophile: MoleculeState, reactionType: string): void {
    log(`🔄 Applying ${reactionType} transformations...`);
    
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
        log(`⚠️ Unknown reaction type: ${reactionType}`);
    }
  }

  /**
   * Apply SN2-specific transformations (Walden inversion + leaving group departure)
   */
  private applySN2Transformations(substrate: MoleculeState, nucleophile: MoleculeState): void {
    log('🔄 Applying SN2 transformations using animation manager...');
    log(`🔄 Substrate: ${substrate.name}, Nucleophile: ${nucleophile.name}`);
    
    try {
      // Check if animation manager is available
      log(`🔄 reactionAnimationManager available: ${!!reactionAnimationManager}`);
      log(`🔄 reactionAnimationManager type: ${typeof reactionAnimationManager}`);
      
      // Use the animation manager for coordinated SN2 animation sequence
      log('🔄 Calling reactionAnimationManager.animateSN2Reaction...');
      reactionAnimationManager.animateSN2Reaction(substrate, nucleophile, {
      waldenInversion: {
        duration: 1000,
        onStart: () => log('🎬 Starting Walden inversion...'),
        onComplete: () => log('✅ Walden inversion complete')
      },
      leavingGroupDeparture: {
        duration: 1500,
        distance: 5.0,
        fadeOut: true,
        onStart: () => log('🚀 Starting leaving group departure...'),
        onComplete: () => log('✅ Leaving group departure complete')
      },
      delayBetweenAnimations: 1000,
      onStart: () => log('🎬 Starting SN2 reaction animation sequence...'),
      onComplete: () => {
        log('🎉 SN2 reaction animation sequence complete!');
        // Ensure final Walden inversion orientation matches backside attack (umbrella flip)
        this.applyWaldenInversionCorrection(substrate, nucleophile);
        // Resume physics simulation after correction
        this.physicsEngine.resume();
        log('▶️ Physics simulation resumed after reaction');
      }
      });
      
      log('✅ SN2 animation sequence started');
    } catch (error) {
      log(`❌ Error in applySN2Transformations: ${error}`);
      console.error('SN2 transformation error:', error);
    }
  }


  /**
   * Apply SN1-specific transformations
   */
  private applySN1Transformations(_substrate: MoleculeState, _nucleophile: MoleculeState): void {
    log('🔄 Applying SN1 transformations...');
    // SN1 doesn't require specific orientation changes
    log('✅ SN1 transformations applied');
  }

  /**
   * Apply E2-specific transformations
   */
  private applyE2Transformations(_substrate: MoleculeState, _nucleophile: MoleculeState): void {
    log('🔄 Applying E2 transformations...');
    // E2 requires anti-coplanar orientation
    log('✅ E2 transformations applied');
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
    log('⏹️ Stopping unified reaction...');
    
    this.state.physics.isSimulationActive = false;
    this.state.reaction.isInProgress = false;
    this.state.reaction.progress = 0;
    
    this.physicsEngine.pause();
    
    log('✅ Unified reaction stopped');
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    log('🧹 Disposing ReactionOrchestrator...');
    
    this.stopReaction();
    this.clearExistingState();
    
    log('✅ ReactionOrchestrator disposed');
  }
}

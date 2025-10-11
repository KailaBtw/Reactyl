import * as THREE from 'three';
import { StructureEngine } from '../engines/structureEngine';
import { ChemicalDataService } from './chemicalDataService';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
import { drawMolecule } from '../components/moleculeDrawer';
import { getReactionType } from './reactionDatabase';
import type { MoleculeManager } from '../types';
import { log } from '../utils/debug';

/**
 * Chemistry Reaction System
 * 
 * The single, production-ready system for running any chemical reaction
 * with any molecules using the StructureEngine architecture.
 * 
 * This consolidates all reaction logic into the chemistry domain.
 */
export class ChemistryReactionSystem {
  private structureEngine: StructureEngine;
  private chemicalService: ChemicalDataService;
  private isReactionInProgress: boolean = false;
  
  constructor(scene: THREE.Scene) {
    this.structureEngine = new StructureEngine(scene);
    this.chemicalService = new ChemicalDataService();
    
    this.setupReactionHandlers();
    log('🧪 Chemistry Reaction System initialized');
  }

  /**
   * Set up reaction event handlers
   */
  private setupReactionHandlers(): void {
    collisionEventSystem.registerHandler(event => {
      if (event.reactionResult?.occurs) {
        this.executeCollisionReaction(event);
      }
    });
  }

  /**
   * Execute reaction triggered by collision event
   */
  private executeCollisionReaction(event: any): void {
    try {
      const substrate = event.moleculeA;
      const nucleophile = event.moleculeB;
      const reactionType = event.reactionResult?.reactionType?.id || 'sn2';
      
      log(`🧪 Executing collision-triggered ${reactionType} reaction...`);
      log(`📍 Collision positions - Substrate: (${substrate.group.position.x.toFixed(2)}, ${substrate.group.position.y.toFixed(2)}, ${substrate.group.position.z.toFixed(2)})`);
      log(`📍 Collision positions - Nucleophile: (${nucleophile.group.position.x.toFixed(2)}, ${nucleophile.group.position.y.toFixed(2)}, ${nucleophile.group.position.z.toFixed(2)})`);
      log(`⚡ Collision energy: ${event.collisionData?.collisionEnergy?.toExponential(2)} kJ/mol`);
      log(`📐 Approach angle: ${event.collisionData?.approachAngle?.toFixed(1)}°`);
      
      // Execute the actual reaction transformation
      this.executeReaction(substrate, nucleophile, reactionType);
      
      log('✅ Collision-triggered reaction completed');
    } catch (error) {
      log(`❌ Collision reaction execution failed: ${error}`);
    }
  }

  /**
   * Run a chemical reaction with any molecules and reaction type
   */
  async runReaction(
    substrateMolecule: any,
    nucleophileMolecule: any,
    reactionType: string,
    moleculeManager: MoleculeManager,
    scene: THREE.Scene,
    timeControls: any,
    reactionParams: any
  ): Promise<void> {
    console.log('🔥🔥🔥 CHEMISTRY SYSTEM RUNREACTION CALLED 🔥🔥🔥');
    console.log('🔥🔥🔥 CHEMISTRY SYSTEM RUNREACTION CALLED 🔥🔥🔥');
    console.log('🔥🔥🔥 CHEMISTRY SYSTEM RUNREACTION CALLED 🔥🔥🔥');
    log(`🚀 CHEMISTRY REACTION SYSTEM runReaction CALLED with ${reactionType}`);
    
    // Prevent duplicate reactions
    if (this.isReactionInProgress) {
      log('⚠️ Reaction already in progress, skipping duplicate call');
      return;
    }
    
    this.isReactionInProgress = true;
    log(`🧪 Running ${reactionType} chemical reaction...`);

    try {
      // Clear existing molecules
      this.clearExistingMolecules(moleculeManager, scene);
      collisionEventSystem.setTestingMode(true);

      // Load molecules
      const molecules = await this.loadMolecules(
        substrateMolecule,
        nucleophileMolecule,
        moleculeManager,
        scene
      );

      if (molecules.length < 2) {
        throw new Error('Failed to load molecules');
      }

      const [substrate, nucleophile] = molecules;

      // Configure reaction
      console.log('🔥🔥🔥 ABOUT TO CALL CONFIGURE REACTION 🔥🔥🔥');
      log(`🚀 ABOUT TO CALL configureReaction in runReaction`);
      this.configureReaction(substrate, nucleophile, reactionType, reactionParams);
      console.log('🔥🔥🔥 COMPLETED CONFIGURE REACTION 🔥🔥🔥');
      log(`🚀 COMPLETED configureReaction in runReaction`);

      // Set up collision system
      this.setupCollisionSystem(molecules, reactionParams, reactionType);
      timeControls.isPlaying = true;
      this.executeReaction(substrate, nucleophile, reactionType);

      // Set up post-reaction monitoring
      this.setupPostReactionMonitoring(substrate, nucleophile, timeControls);

      log(`✅ ${reactionType} chemical reaction setup complete`);
    } catch (error) {
      log(`❌ ${reactionType} chemical reaction failed: ${error}`);
      this.isReactionInProgress = false; // Reset flag on error
      throw error;
    } finally {
      this.isReactionInProgress = false; // Reset flag when done
    }
  }

  /**
   * Load molecules for chemical reaction
   */
  private async loadMolecules(
    substrateMolecule: any,
    nucleophileMolecule: any,
    moleculeManager: MoleculeManager,
    scene: THREE.Scene
  ): Promise<any[]> {
    // Load substrate and nucleophile
    const substrate = await this.chemicalService.fetchMoleculeByCID(substrateMolecule.cid);
    const nucleophile = await this.chemicalService.fetchMoleculeByCID(nucleophileMolecule.cid);
    
    // Use helper to properly space molecules
    this.spawnMoleculesWithSpacing(substrate, nucleophile, moleculeManager, scene);

    // Get loaded molecules
    const molecules = moleculeManager.getAllMolecules();
    const substrateMol = molecules.find(m => m.name === 'substrate');
    const nucleophileMol = molecules.find(m => m.name === 'nucleophile');

    if (!substrateMol || !nucleophileMol) {
      throw new Error('Failed to load molecules');
    }

    return [substrateMol, nucleophileMol];
  }

  /**
   * Helper to spawn molecules with proper spacing and orientation
   */
  private spawnMoleculesWithSpacing(
    substrateData: any,
    nucleophileData: any,
    moleculeManager: MoleculeManager,
    scene: THREE.Scene
  ): void {
    // Calculate molecule sizes for proper spacing
    const substrateSize = this.calculateMoleculeSize(substrateData);
    const nucleophileSize = this.calculateMoleculeSize(nucleophileData);
    
    // Base separation distance (balanced for proper collision detection)
    const baseDistance = 6.0; // Reduced to allow proper collision
    const totalSeparation = baseDistance + substrateSize.radius + nucleophileSize.radius;
    
    log(`📏 Molecule sizes - Substrate: ${substrateSize.radius.toFixed(2)}, Nucleophile: ${nucleophileSize.radius.toFixed(2)}`);
    log(`📏 Total separation distance: ${totalSeparation.toFixed(2)}`);

    // Position substrate at origin
    drawMolecule(substrateData.mol3d || '', moleculeManager, scene, { x: 0, y: 0, z: 0 }, 'substrate', false);
    
    // Position nucleophile at safe distance along Z-axis
    const nucleophileZ = -totalSeparation;
    drawMolecule(nucleophileData.mol3d || '', moleculeManager, scene, { x: 0, y: 0, z: nucleophileZ }, 'nucleophile', false);
    
    log(`📍 Initial positions - Substrate: (0, 0, 0), Nucleophile: (0, 0, ${nucleophileZ.toFixed(2)})`);
  }

  /**
   * Calculate molecule size for spacing calculations
   */
  private calculateMoleculeSize(moleculeData: any): { radius: number; boundingBox: THREE.Box3 } {
    // Parse the MOL data to get atom positions
    const molObject = this.parseMolData(moleculeData.mol3d || '');
    
    if (!molObject || molObject.atoms.length === 0) {
      return { radius: 2.0, boundingBox: new THREE.Box3() }; // Default size
    }

    // Calculate bounding box
    const boundingBox = new THREE.Box3();
    molObject.atoms.forEach((atom: any) => {
      const position = new THREE.Vector3(
        parseFloat(atom.position.x),
        parseFloat(atom.position.y),
        parseFloat(atom.position.z)
      );
      boundingBox.expandByPoint(position);
    });

    // Calculate radius as half the diagonal of the bounding box
    const size = boundingBox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) / 2;

    return { radius: Math.max(radius, 1.0), boundingBox }; // Minimum radius of 1.0
  }

  /**
   * Parse MOL data (simple parser for size calculation)
   */
  private parseMolData(molData: string): any {
    try {
      // This is a simplified parser - in production you'd use the full molFileToJSON
      const lines = molData.split('\n');
      if (lines.length < 4) return null;
      
      const header = lines[3];
      const atomCount = parseInt(header.substring(0, 3));
      // const bondCount = parseInt(header.substring(3, 6)); // Not used in this simplified parser
      
      const atoms = [];
      for (let i = 0; i < atomCount; i++) {
        const line = lines[4 + i];
        if (line && line.length >= 30) {
          atoms.push({
            position: {
              x: parseFloat(line.substring(0, 10)),
              y: parseFloat(line.substring(10, 20)),
              z: parseFloat(line.substring(20, 30))
            },
            type: line.substring(31, 33).trim()
          });
        }
      }
      
      return { atoms, bonds: [] };
    } catch (error) {
      log(`⚠️ Failed to parse MOL data for size calculation: ${error}`);
      return null;
    }
  }

  /**
   * Configure chemical reaction
   */
  private configureReaction(substrate: any, nucleophile: any, reactionType: string, reactionParams: any): void {
    console.log('🔥🔥🔥 CONFIGURE REACTION CALLED 🔥🔥🔥');
    log(`🎯 CONFIGURE REACTION CALLED for ${reactionType}`);
    
    // Defaults
    const approachAngleDeg = reactionParams.approachAngle ?? 180; // yaw around Y (degrees)
    const impactParameter = reactionParams.impactParameter ?? 0.0; // lateral offset in scene units
    const relativeVelocity = reactionParams.relativeVelocity ?? 20.0; // arbitrary scene units

    log(`🎯 Configuring reaction: angle=${approachAngleDeg}°, impact=${impactParameter}, velocity=${relativeVelocity}`);

    // Keep substrate at origin, but reset its rotation
    substrate.group.rotation.set(0, 0, 0);
    substrate.group.position.set(0, 0, 0);

    // Compute approach direction from angle (yaw around Y axis)
    const yawRad = (approachAngleDeg * Math.PI) / 180;
    const baseDir = new THREE.Vector3(0, 0, 1); // +Z toward substrate
    const direction = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad).normalize();

    // Lateral (impact) direction: right vector relative to approach
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad).normalize();

    // Position nucleophile at a reasonable distance for collision
    const spawnDistance = 8.0; // Fixed distance for proper collision
    const newPos = direction.clone().multiplyScalar(-spawnDistance).add(right.clone().multiplyScalar(impactParameter));
    nucleophile.group.position.copy(newPos);
    nucleophile.group.rotation.set(0, 0, 0);
    
    log(`🎯 Positioning nucleophile at distance ${spawnDistance} in direction (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`);

    // Update matrices
    substrate.group.updateMatrixWorld();
    nucleophile.group.updateMatrixWorld();

    // Orient molecules for chemical reaction (keeps substrate neutral orientation, points nucleophile)
    log(`🎯 ABOUT TO CALL orientMoleculesForReaction for ${reactionType}`);
    this.orientMoleculesForReaction(substrate, nucleophile, reactionType);
    log(`🎯 COMPLETED orientMoleculesForReaction for ${reactionType}`);

    // Initial velocities (reduced for better collision detection)
    const adjustedVelocity = Math.min(relativeVelocity, 5.0); // Cap velocity at 5 m/s
    
    // Substrate stays stationary
    if (substrate.velocity) substrate.velocity.set(0, 0, 0);
    
    // Nucleophile moves toward substrate (opposite of direction vector)
    const towardSubstrate = direction.clone().negate(); // Reverse direction to move toward substrate
    if (nucleophile.velocity) nucleophile.velocity.copy(towardSubstrate.multiplyScalar(adjustedVelocity));

    log(`🎯 Velocity adjustment: Original=${relativeVelocity}, Adjusted=${adjustedVelocity}`);
    log(`🎯 Nucleophile direction toward substrate: (${towardSubstrate.x.toFixed(2)}, ${towardSubstrate.y.toFixed(2)}, ${towardSubstrate.z.toFixed(2)})`);

    // Apply velocities to physics engine
    this.applyVelocitiesToPhysics(substrate, nucleophile);

    log(`📍 Final positions - Substrate: (${substrate.group.position.x.toFixed(2)}, ${substrate.group.position.y.toFixed(2)}, ${substrate.group.position.z.toFixed(2)})`);
    log(`📍 Final positions - Nucleophile: (${nucleophile.group.position.x.toFixed(2)}, ${nucleophile.group.position.y.toFixed(2)}, ${nucleophile.group.position.z.toFixed(2)})`);
    log(`🚀 Nucleophile velocity: (${nucleophile.velocity.x.toFixed(2)}, ${nucleophile.velocity.y.toFixed(2)}, ${nucleophile.velocity.z.toFixed(2)})`);

    // Persist parameters (in case downstream tools read them)
    reactionParams.reactionType = reactionType;
    reactionParams.temperature = reactionParams.temperature ?? 1200;
    reactionParams.approachAngle = approachAngleDeg;
    reactionParams.impactParameter = impactParameter;
    reactionParams.relativeVelocity = relativeVelocity;
  }

  /**
   * Apply velocities to physics engine
   */
  private applyVelocitiesToPhysics(substrate: any, nucleophile: any): void {
    try {
      // Apply velocities to physics bodies
      if (physicsEngine && physicsEngine.setVelocity) {
        physicsEngine.setVelocity(substrate, substrate.velocity);
        physicsEngine.setVelocity(nucleophile, nucleophile.velocity);
        log('✅ Velocities applied to physics engine');
        log(`🔧 Physics velocities - Substrate: (${substrate.velocity.x.toFixed(2)}, ${substrate.velocity.y.toFixed(2)}, ${substrate.velocity.z.toFixed(2)})`);
        log(`🔧 Physics velocities - Nucleophile: (${nucleophile.velocity.x.toFixed(2)}, ${nucleophile.velocity.y.toFixed(2)}, ${nucleophile.velocity.z.toFixed(2)})`);
      } else {
        log('⚠️ Physics engine not available for velocity application');
      }
    } catch (error) {
      log(`⚠️ Failed to apply velocities to physics: ${error}`);
    }
  }

  /**
   * Orient molecules for chemical reaction
   */
  private orientMoleculesForReaction(substrate: any, nucleophile: any, reactionType: string): void {
    console.log('🔥🔥🔥 ORIENT MOLECULES FOR REACTION CALLED 🔥🔥🔥');
    try {
      log(`🔄 Starting orientation for ${reactionType} reaction...`);
      log(`🔄 Initial substrate position: (${substrate.group.position.x.toFixed(2)}, ${substrate.group.position.y.toFixed(2)}, ${substrate.group.position.z.toFixed(2)})`);
      log(`🔄 Initial nucleophile position: (${nucleophile.group.position.x.toFixed(2)}, ${nucleophile.group.position.y.toFixed(2)}, ${nucleophile.group.position.z.toFixed(2)})`);
      
      // Use StructureEngine for intelligent orientation
      
      // StructureEngine integration (optional - molecules work without it)
      // this.structureEngine.createStructure('substrate', substrate, substrate.group.position);
      // this.structureEngine.createStructure('nucleophile', nucleophile, nucleophile.group.position);
      
      // Orient for reaction type
      switch (reactionType.toLowerCase()) {
        case 'sn2':
          log('🔄 Applying SN2 backside attack orientation...');
          this.orientForSN2BacksideAttack(substrate, nucleophile);
          break;
        case 'sn1':
          log('🔄 Applying SN1 orientation...');
          this.orientForSN1Reaction(substrate, nucleophile);
          break;
        case 'e2':
          log('🔄 Applying E2 orientation...');
          this.orientForE2Reaction(substrate, nucleophile);
          break;
        default:
          log('🔄 Applying generic orientation...');
          this.orientForGenericReaction(substrate, nucleophile);
      }
      
      log(`✅ Molecules oriented for ${reactionType} chemical reaction`);
    } catch (error) {
      log(`❌ Orientation error: ${error}`);
      this.orientForGenericReaction(substrate, nucleophile);
    }
  }

  /**
   * Orient for SN2 backside attack
   */
  private orientForSN2BacksideAttack(substrate: any, nucleophile: any): void {
    // For SN2 backside attack:
    // - Nucleophile should point toward substrate
    // - Substrate leaving group should point AWAY from nucleophile (backside)
    
    const substratePosition = substrate.group.position;
    const nucleophilePosition = nucleophile.group.position;
    
    // Calculate direction from nucleophile to substrate
    const direction = substratePosition.clone().sub(nucleophilePosition).normalize();
    const awayFromNucleophile = direction.clone().negate();
    
    // Point nucleophile toward substrate
    nucleophile.group.lookAt(substratePosition);
    
    // Orient substrate so leaving group points AWAY from nucleophile
    // The leaving group (chlorine/bromine) should be on the opposite side from the nucleophile
    log(`🔄 Before rotation - Substrate rotation: (${substrate.group.rotation.x.toFixed(2)}, ${substrate.group.rotation.y.toFixed(2)}, ${substrate.group.rotation.z.toFixed(2)})`);
    
    substrate.group.rotation.set(0, 0, 0);
    
    // Rotate substrate to position leaving group away from nucleophile
    // For SN2 backside attack, we need the leaving group to point away from nucleophile
    substrate.group.rotateY(-Math.PI/2); // -90° rotation to point leaving group away from nucleophile
    
    log(`🔄 After rotation - Substrate rotation: (${substrate.group.rotation.x.toFixed(2)}, ${substrate.group.rotation.y.toFixed(2)}, ${substrate.group.rotation.z.toFixed(2)})`);
    log(`🔄 Nucleophile rotation: (${nucleophile.group.rotation.x.toFixed(2)}, ${nucleophile.group.rotation.y.toFixed(2)}, ${nucleophile.group.rotation.z.toFixed(2)})`);
    
    substrate.group.updateMatrixWorld();
    nucleophile.group.updateMatrixWorld();
    
    // CRITICAL: Update physics bodies to match visual orientation
    // Otherwise physics engine will override our orientation changes
    this.syncOrientationToPhysics(substrate);
    this.syncOrientationToPhysics(nucleophile);
    
    log('🔄 Oriented for SN2 backside attack - leaving group points away from nucleophile');
    log(`🎯 Substrate orientation: leaving group points in direction (${awayFromNucleophile.x.toFixed(2)}, ${awayFromNucleophile.y.toFixed(2)}, ${awayFromNucleophile.z.toFixed(2)})`);
  }
  
  /**
   * Sync visual molecule orientation to physics body
   * This prevents the physics engine from overriding our orientation changes
   */
  private syncOrientationToPhysics(molecule: any): void {
    try {
      const body = physicsEngine.getPhysicsBody(molecule);
      if (body) {
        // Update physics body quaternion to match visual molecule
        body.quaternion.copy(molecule.group.quaternion as any);
        log(`✅ Synced orientation to physics for ${molecule.name}`);
      } else {
        log(`⚠️ No physics body found for ${molecule.name}`);
      }
    } catch (error) {
      log(`⚠️ Failed to sync orientation to physics: ${error}`);
    }
  }

  /**
   * Orient for SN1 reaction
   */
  private orientForSN1Reaction(substrate: any, nucleophile: any): void {
    substrate.group.rotation.set(0, 0, 0);
    nucleophile.group.rotation.set(0, 0, 0);
    substrate.group.updateMatrixWorld();
    nucleophile.group.updateMatrixWorld();
  }

  /**
   * Orient for E2 elimination
   */
  private orientForE2Reaction(substrate: any, nucleophile: any): void {
    substrate.group.rotation.set(0, 0, 0);
    nucleophile.group.rotation.set(0, 0, 0);
    substrate.group.updateMatrixWorld();
    nucleophile.group.updateMatrixWorld();
  }

  /**
   * Orient for generic reaction
   */
  private orientForGenericReaction(substrate: any, nucleophile: any): void {
    substrate.group.rotation.set(0, 0, 0);
    nucleophile.group.rotation.set(0, 0, 0);
    substrate.group.updateMatrixWorld();
    nucleophile.group.updateMatrixWorld();
  }

  /**
   * Execute chemical reaction using StructureEngine
   */
  private executeReaction(substrate: any, _nucleophile: any, reactionType: string): void {
    console.log('🔥🔥🔥 EXECUTE REACTION CALLED 🔥🔥🔥');
    console.log('🔥🔥🔥 CHECKING ORIENTATION BEFORE REACTION 🔥🔥🔥');
    console.log(`🔥🔥🔥 Substrate rotation: (${substrate.group.rotation.x.toFixed(2)}, ${substrate.group.rotation.y.toFixed(2)}, ${substrate.group.rotation.z.toFixed(2)})`);
    console.log(`🔥🔥🔥 Nucleophile rotation: (${_nucleophile.group.rotation.x.toFixed(2)}, ${_nucleophile.group.rotation.y.toFixed(2)}, ${_nucleophile.group.rotation.z.toFixed(2)})`);
    try {
      log(`🧪 Executing ${reactionType} chemical reaction with StructureEngine...`);
      
      // Use StructureEngine for molecular manipulation
      
      // Apply stereochemistry inversion for SN2
      if (reactionType.toLowerCase() === 'sn2') {
        substrate.group.rotateY(Math.PI);
        log('✅ SN2 Walden inversion applied');
      }
      
      log(`✅ StructureEngine ${reactionType} chemical reaction complete`);
      
    } catch (error) {
      log(`❌ StructureEngine reaction failed: ${error}`);
      substrate.group.rotateY(Math.PI);
    }
  }

  /**
   * Set up collision system
   */
  private setupCollisionSystem(molecules: any[], reactionParams: any, reactionTypeString: string): void {
    try {
      const [substrate, nucleophile] = molecules;
      const reactionType = getReactionType(reactionTypeString.toLowerCase());
      
      if (!reactionType) {
        log('❌ Failed to get reaction type');
        return;
      }
      
      // Configure collision event system
      collisionEventSystem.setReactionType(reactionType);
      collisionEventSystem.setTemperature(reactionParams.temperature);
      
      reactionParams.substrate = substrate;
      reactionParams.nucleophile = nucleophile;
      reactionParams.collisionDistance = 3.0;
      reactionParams.minCollisionEnergy = 50;
      
      this.forceTestCollision(substrate, nucleophile);
      log('✅ Collision system setup complete');
    } catch (error) {
      log(`❌ Collision setup failed: ${error}`);
    }
  }

  /**
   * Force test collision
   */
  private forceTestCollision(substrate: any, nucleophile: any): void {
    log('🧪 Forcing test collision...');

    const testEvent = {
      moleculeA: substrate,
      moleculeB: nucleophile,
      collisionPoint: new THREE.Vector3(0, 0, 0),
      collisionNormal: new THREE.Vector3(1, 0, 0),
      relativeVelocity: new THREE.Vector3(-25, 0, 0),
      timestamp: performance.now() / 1000,
    };

    collisionEventSystem.emitCollision(testEvent);
    log('🧪 Test collision event emitted');
  }

  /**
   * Set up post-reaction monitoring
   */
  private setupPostReactionMonitoring(substrate: any, nucleophile: any, timeControls: any): void {
    log('⏸️ Starting post-reaction simulation pause monitoring');
    
    const SEPARATION_THRESHOLD = 6.0;
    const CHECK_INTERVAL = 100;
    const MAX_CHECKS = 30;
    
    let checkCount = 0;
    
    const pauseMonitorInterval = setInterval(() => {
      try {
        checkCount++;
        
        if (checkCount > MAX_CHECKS) {
          log('⏸️ Post-reaction monitoring timeout - pausing simulation');
          timeControls.isPlaying = false;
          clearInterval(pauseMonitorInterval);
          return;
        }
        
        const distance = substrate.group.position.distanceTo(nucleophile.group.position);
        const substratePos = substrate.group.position;
        const nucleophilePos = nucleophile.group.position;
        
        log(`📏 Check ${checkCount}: Separation = ${distance.toFixed(2)} units (threshold: ${SEPARATION_THRESHOLD})`);
        log(`📍 Substrate: (${substratePos.x.toFixed(2)}, ${substratePos.y.toFixed(2)}, ${substratePos.z.toFixed(2)})`);
        log(`📍 Nucleophile: (${nucleophilePos.x.toFixed(2)}, ${nucleophilePos.y.toFixed(2)}, ${nucleophilePos.z.toFixed(2)})`);
        
        if (distance >= SEPARATION_THRESHOLD) {
          log(`⏸️ Molecules separated by ${distance.toFixed(2)} units - pausing simulation`);
          timeControls.isPlaying = false;
          clearInterval(pauseMonitorInterval);
          log('✅ Post-reaction simulation pause completed');
        } else {
          log(`🔄 Still close together (${distance.toFixed(2)} units) - continuing simulation...`);
        }
      } catch (error) {
        log(`❌ Error in post-reaction monitoring: ${error}`);
        clearInterval(pauseMonitorInterval);
      }
    }, CHECK_INTERVAL);
  }

  /**
   * Clear existing molecules
   */
  private clearExistingMolecules(moleculeManager: MoleculeManager, scene: THREE.Scene): void {
    const molecules = moleculeManager.getAllMolecules();
    log(`🧹 Clearing ${molecules.length} existing molecules...`);
    
    for (const molecule of molecules) {
      try {
        // Remove from scene
        scene.remove(molecule.group);
        
        // Remove from molecule manager if method exists
        if ('removeMolecule' in moleculeManager) {
          (moleculeManager as any).removeMolecule?.(molecule.name);
        }
        
        // Dispose of any resources
        if (molecule.group) {
          molecule.group.clear();
        }
        
        log(`🗑️ Removed molecule: ${molecule.name}`);
      } catch (error) {
        log(`⚠️ Error removing molecule ${molecule.name}: ${error}`);
      }
    }
    
    // Force clear the molecule manager's internal state
    if ('clearAllMolecules' in moleculeManager) {
      (moleculeManager as any).clearAllMolecules?.();
    }
    
    log('🧹 Cleared existing molecules');
  }

  /**
   * Get available reaction types from StructureEngine
   */
  getAvailableReactionTypes(): string[] {
    return this.structureEngine.getAvailableReactionTypes();
  }

  /**
   * Get StructureEngine instance
   */
  getStructureEngine(): StructureEngine {
    return this.structureEngine;
  }
}

import * as THREE from 'three';
import { ChemicalDataService } from '../chemistry/chemicalDataService';
import { getReactionType } from '../chemistry/reactionDatabase';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { CollisionTrajectoryController } from '../physics/collisionTrajectoryController';
import type { MoleculeManager } from '../types';
import { log } from '../utils/debug';
import { drawMolecule } from './moleculeDrawer';

/**
 * Clean, organized Reaction Demo Manager
 * Handles SN2 reaction demonstrations with proper geometry
 */
export class ReactionDemo {
  protected chemicalService: ChemicalDataService;
  private trajectoryController: CollisionTrajectoryController;
  private reactionCompleted: boolean = false;

  // SN2 Demo Configuration
  private readonly DEMO_MOLECULES = [
    { cid: '6323', name: 'Methyl bromide', formula: 'CH3Br', leavingGroup: 'Br' },
    { cid: '6325', name: 'Methyl chloride', formula: 'CH3Cl', leavingGroup: 'Cl' },
    { cid: '961', name: 'Hydroxide ion', formula: 'OH⁻', nucleophilicCenter: 'O' },
  ];

  private readonly SN2_POSITIONS = {
    substrate: { x: 0, y: 0, z: 0 },      // At origin
    nucleophile: { x: 0, y: 0, z: -8 },   // Behind substrate for backside attack
  };

  private readonly SN2_VELOCITIES = {
    substrate: { x: 0, y: 0, z: 0 },      // Stationary
    nucleophile: { x: 0, y: 0, z: 2.0 },  // Approaching from behind
  };

  constructor(scene: THREE.Scene) {
    this.chemicalService = new ChemicalDataService();
    this.trajectoryController = new CollisionTrajectoryController(scene);
    this.setupReactionHandlers();
    log('ReactionDemo initialized');
  }

  /**
   * Setup reaction event handlers
   */
  private setupReactionHandlers(): void {
    collisionEventSystem.registerHandler(event => {
      if (event.reactionResult?.occurs) {
        this.reactionCompleted = true;
        log('✅ Demo reaction completed - stopping further test collisions');
        setTimeout(() => {
          this.trajectoryController.clearTrajectoryVisualization();
        }, 2000);
      }
    });
  }

  /**
   * Load demo molecules for SN2 reaction testing
   */
  async loadDemoMolecules(
    moleculeManager: MoleculeManager,
    scene: THREE.Scene,
    statusCallback: (status: string) => void
  ): Promise<void> {
    log('🎬 Loading SN2 demo molecules...');
    
    this.clearExistingMolecules(moleculeManager, scene);

    try {
      // Load substrate (use CH3Br by default) and nucleophile (OH⁻)
      const substrate = this.DEMO_MOLECULES[0]; // Methyl bromide
      const nucleophile = this.DEMO_MOLECULES[2]; // Hydroxide ion

      // Load substrate
      statusCallback(`Loading ${substrate.name}...`);
      await this.loadMolecule(substrate, moleculeManager, scene, this.SN2_POSITIONS.substrate, 0);
      
      // Load nucleophile
      statusCallback(`Loading ${nucleophile.name}...`);
      await this.loadMolecule(nucleophile, moleculeManager, scene, this.SN2_POSITIONS.nucleophile, 1);

      statusCallback('Demo molecules loaded!');
      log('🎉 SN2 demo molecules ready!');
    } catch (error) {
      statusCallback(`Error: ${error}`);
      log(`❌ Failed to load demo molecules: ${error}`);
    }
  }

  /**
   * Load a single molecule with proper SN2 orientation
   */
  private async loadMolecule(
    moleculeData: any,
    moleculeManager: MoleculeManager,
    scene: THREE.Scene,
    position: THREE.Vector3 | { x: number; y: number; z: number },
    index: number
  ): Promise<void> {
    const molecularData = await this.chemicalService.fetchMoleculeByCID(moleculeData.cid);
    const moleculeName = `demo_${moleculeData.name.replace(/\s+/g, '_')}`;

    // Draw the molecule
    drawMolecule(molecularData.mol3d || '', moleculeManager, scene, position, moleculeName);
    
    // Get the molecule and configure it
    const molecule = moleculeManager.getMolecule(moleculeName);
    if (!molecule) {
      throw new Error(`Failed to create molecule: ${moleculeName}`);
    }

    // Configure molecule for SN2 reaction
    this.configureMoleculeForSN2(molecule, moleculeData, index);
    
    log(`✅ Loaded ${moleculeData.name} at (${position.x}, ${position.y}, ${position.z})`);
  }

  /**
   * Configure a molecule for proper SN2 geometry
   */
  private configureMoleculeForSN2(molecule: any, moleculeData: any, index: number): void {
    // Set velocity
    if (index === 0) {
      // Substrate - stationary
      molecule.velocity.set(this.SN2_VELOCITIES.substrate.x, this.SN2_VELOCITIES.substrate.y, this.SN2_VELOCITIES.substrate.z);
      this.orientSubstrateForSN2(molecule, moleculeData.leavingGroup);
    } else if (index === 1) {
      // Nucleophile - approaching from behind
      molecule.velocity.set(this.SN2_VELOCITIES.nucleophile.x, this.SN2_VELOCITIES.nucleophile.y, this.SN2_VELOCITIES.nucleophile.z);
      this.orientNucleophileForSN2(molecule);
    }
  }

  /**
   * Orient substrate molecule for proper SN2 backside attack
   * Leaving group should point AWAY from nucleophile (positive Z direction)
   */
  private orientSubstrateForSN2(molecule: any, leavingGroupType: string): void {
    if (!molecule.molObject?.atoms) return;

    const atoms = molecule.molObject.atoms;
    const leavingGroupIndex = atoms.findIndex((atom: any) => atom.type === leavingGroupType);
    
    if (leavingGroupIndex === -1) {
      log(`⚠️ No ${leavingGroupType} leaving group found in substrate`);
      return;
    }

    const leavingGroup = atoms[leavingGroupIndex];
    const leavingGroupPos = new THREE.Vector3(
      parseFloat(leavingGroup.position.x),
      parseFloat(leavingGroup.position.y),
      parseFloat(leavingGroup.position.z)
    );

    // Rotate so leaving group points in positive Z direction (away from nucleophile)
    const currentDirection = leavingGroupPos.normalize();
    const targetDirection = new THREE.Vector3(0, 0, 1);
    
    const rotationAxis = currentDirection.clone().cross(targetDirection).normalize();
    const rotationAngle = Math.acos(Math.max(-1, Math.min(1, currentDirection.dot(targetDirection))));
    
    if (rotationAngle > 0.01) {
      molecule.group.rotateOnAxis(rotationAxis, rotationAngle);
      log(`🔄 Oriented substrate: ${leavingGroupType} leaving group points away from nucleophile`);
    }
  }

  /**
   * Orient nucleophile molecule for proper SN2 backside attack
   * Nucleophilic center should point TOWARD substrate (negative Z direction)
   */
  private orientNucleophileForSN2(molecule: any): void {
    if (!molecule.molObject?.atoms) return;

    const atoms = molecule.molObject.atoms;
    const nucleophilicCenterIndex = atoms.findIndex((atom: any) => atom.type === 'O');
    
    if (nucleophilicCenterIndex === -1) {
      log('⚠️ No O nucleophilic center found in nucleophile');
      return;
    }

    const nucleophilicCenter = atoms[nucleophilicCenterIndex];
    const nucleophilicPos = new THREE.Vector3(
      parseFloat(nucleophilicCenter.position.x),
      parseFloat(nucleophilicCenter.position.y),
      parseFloat(nucleophilicCenter.position.z)
    );

    // Rotate so nucleophilic center points in negative Z direction (toward substrate)
    const currentDirection = nucleophilicPos.normalize();
    const targetDirection = new THREE.Vector3(0, 0, -1);
    
    const rotationAxis = currentDirection.clone().cross(targetDirection).normalize();
    const rotationAngle = Math.acos(Math.max(-1, Math.min(1, currentDirection.dot(targetDirection))));
    
    if (rotationAngle > 0.01) {
      molecule.group.rotateOnAxis(rotationAxis, rotationAngle);
      log('🔄 Oriented nucleophile: O nucleophilic center points toward substrate');
    }
  }

  /**
   * Run the complete SN2 reaction demo
   */
  async runDemo(
    moleculeManager: MoleculeManager,
    scene: THREE.Scene,
    timeControls: any,
    reactionParams: any
  ): Promise<void> {
    log('🎬 Starting SN2 Reaction Demo...');
    this.reactionCompleted = false;

    // Auto-load molecules if needed
    let molecules = moleculeManager.getAllMolecules();
    if (molecules.length < 2) {
      log('🔄 Auto-loading demo molecules...');
      await this.loadDemoMolecules(moleculeManager, scene, (status) => {
        log(`Auto-loading: ${status}`);
      });
      molecules = moleculeManager.getAllMolecules();
    }

    if (molecules.length < 2) {
      log('❌ Failed to load demo molecules');
      return;
    }

    // Ensure proper SN2 geometry
    this.ensureSN2Geometry(molecules[0], molecules[1]);

    // Setup reaction parameters
    this.setupReactionParameters(molecules, reactionParams);

    // Setup collision system
    this.setupCollisionSystem(molecules, reactionParams);

    // Start demo animation
    this.startDemoAnimation(timeControls, molecules);
  }

  /**
   * Ensure molecules maintain proper SN2 geometry
   */
  private ensureSN2Geometry(substrate: any, nucleophile: any): void {
    log('🔧 Ensuring proper SN2 backside attack geometry...');

    // Re-orient molecules
    this.orientSubstrateForSN2(substrate, 'Cl'); // Default to Cl (CH3Cl substrate)
    this.orientNucleophileForSN2(nucleophile);

    // Ensure correct velocities
    substrate.velocity.set(0, 0, 0);
    nucleophile.velocity.set(0, 0, 2.0);

    // Log positions
    const substratePos = substrate.group.position;
    const nucleophilePos = nucleophile.group.position;
    
    log(`📍 Substrate: (${substratePos.x.toFixed(2)}, ${substratePos.y.toFixed(2)}, ${substratePos.z.toFixed(2)})`);
    log(`📍 Nucleophile: (${nucleophilePos.x.toFixed(2)}, ${nucleophilePos.y.toFixed(2)}, ${nucleophilePos.z.toFixed(2)})`);
    log(`📍 Distance: ${substratePos.distanceTo(nucleophilePos).toFixed(2)}`);
    
    if (nucleophilePos.z < substratePos.z) {
      log('✅ Proper SN2 backside attack geometry confirmed');
    } else {
      log('⚠️ Warning: Nucleophile may not be positioned for proper backside attack');
    }
  }

  /**
   * Setup reaction parameters for high probability
   */
  private setupReactionParameters(molecules: any[], reactionParams: any): void {
    reactionParams.substrateMolecule = molecules[0].name;
    reactionParams.nucleophileMolecule = molecules[1].name;
    reactionParams.reactionType = 'sn2';
    reactionParams.temperature = 1200; // High temperature for demo
    reactionParams.approachAngle = 180; // Perfect SN2 angle
    reactionParams.impactParameter = 0.0; // Head-on collision
    reactionParams.relativeVelocity = 20.0; // High velocity

    log(`🎯 Demo setup: ${reactionParams.substrateMolecule} + ${reactionParams.nucleophileMolecule}`);
  }

  /**
   * Setup collision detection system
   */
  private setupCollisionSystem(molecules: any[], reactionParams: any): void {
    const substrate = molecules[0];
    const nucleophile = molecules[1];
    const reactionType = getReactionType(reactionParams.reactionType);

    if (!reactionType) {
      log('❌ Failed to get SN2 reaction type');
      return;
    }

    // Configure collision system
    collisionEventSystem.setReactionType(reactionType);
    collisionEventSystem.setTemperature(reactionParams.temperature);

    // Setup trajectory controller
    this.trajectoryController.setupCollision({
      substrate,
      nucleophile,
      approachAngle: reactionParams.approachAngle,
      impactParameter: reactionParams.impactParameter,
      relativeVelocity: reactionParams.relativeVelocity,
      temperature: reactionParams.temperature,
    });

    log('✅ Collision system setup complete');
  }

  /**
   * Start the demo animation
   */
  private startDemoAnimation(timeControls: any, molecules: any[]): void {
    log('🚀 Starting demo animation in 2 seconds...');

    setTimeout(() => {
      timeControls.isPlaying = true;
      log('🎬 Demo animation started!');

      // Force test collision after 1 second
      setTimeout(() => {
        if (this.reactionCompleted || molecules.length < 2) {
          log('⚠️ Skipping test collision - reaction completed or molecules invalid');
          return;
        }

        this.forceTestCollision(molecules[0], molecules[1]);
      }, 1000);
    }, 2000);
  }

  /**
   * Force a test collision for demo purposes
   */
  protected forceTestCollision(substrate: any, nucleophile: any): void {
    log('🧪 Forcing test collision...');

    const testEvent = {
      moleculeA: substrate,
      moleculeB: nucleophile,
      collisionPoint: new THREE.Vector3(0, 0, 0),
      collisionNormal: new THREE.Vector3(1, 0, 0),
      relativeVelocity: new THREE.Vector3(-25, 0, 0),
      timestamp: performance.now() / 1000,
    };

    collisionEventSystem.emitCollision(testEvent as any);
    log('🧪 Test collision event emitted');
  }

  /**
   * Clear existing molecules from scene and manager
   */
  protected clearExistingMolecules(moleculeManager: MoleculeManager, scene: THREE.Scene): void {
    const existingMolecules = moleculeManager.getAllMolecules();
    
    for (const mol of existingMolecules) {
      scene.remove(mol.group);
    }
    
    if ('clearAllMolecules' in moleculeManager) {
      (moleculeManager as any).clearAllMolecules();
    }
    
    log('🧹 Cleared existing molecules');
  }

  /**
   * Get available demo molecules
   */
  getDemoMolecules(): Array<{ cid: string; name: string; formula: string }> {
    return this.DEMO_MOLECULES.map(mol => ({
      cid: mol.cid,
      name: mol.name,
      formula: mol.formula
    }));
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    log('ReactionDemo disposed');
  }
}
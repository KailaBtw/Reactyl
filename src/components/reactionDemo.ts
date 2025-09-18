import * as THREE from 'three';
import { ChemicalDataService } from '../chemistry/chemicalDataService';
import { getReactionType } from '../chemistry/reactionDatabase';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { CollisionTrajectoryController } from '../physics/collisionTrajectoryController';
import type { MoleculeManager } from '../types';
import { log } from '../utils/debug';
import { drawMolecule } from './moleculeDrawer';

/**
 * Reaction Demo Manager
 * Handles all demo functionality for the reaction system
 */
export class ReactionDemo {
  private chemicalService: ChemicalDataService;
  private trajectoryController: CollisionTrajectoryController;
  private reactionCompleted: boolean = false;

  constructor(scene: THREE.Scene) {
    this.chemicalService = new ChemicalDataService();
    this.trajectoryController = new CollisionTrajectoryController(scene);

    // Listen for successful reactions to mark demo as completed
    collisionEventSystem.registerHandler(event => {
      if (event.reactionResult?.occurs) {
        this.reactionCompleted = true;
        log('✅ Demo reaction completed - stopping further test collisions');

        // Clear trajectory visualization after reaction
        setTimeout(() => {
          this.trajectoryController.clearTrajectoryVisualization();
        }, 2000); // Clear after 2 seconds to let user see the result
      }
    });

    log('ReactionDemo initialized');
  }

  /**
   * Load demo molecules for reaction testing
   */
  async loadDemoMolecules(
    moleculeManager: MoleculeManager,
    scene: THREE.Scene,
    statusCallback: (status: string) => void
  ): Promise<void> {
    log('🎬 Loading demo molecules for reaction testing...');

    // Clear existing molecules first
    this.clearExistingMolecules(moleculeManager, scene);

    try {
      // Load some common molecules for SN2 reactions
      // Order: substrate first (left), nucleophile second (right)
      const demoMolecules = [
        { cid: '6325', name: 'Methyl chloride', formula: 'CH3Cl' }, // Substrate (left)
        { cid: '149', name: 'Methanol', formula: 'CH3OH' }, // Nucleophile (right)
      ];

      for (let i = 0; i < Math.min(2, demoMolecules.length); i++) {
        const mol = demoMolecules[i];
        statusCallback(`Loading ${mol.name}...`);

        const molecularData = await this.chemicalService.fetchMoleculeByCID(mol.cid);
        const moleculeName = `demo_${mol.name.replace(/\s+/g, '_')}`;

        // Position molecules with good separation for collision demo
        // Make them face each other for proper collision
        const positions = [
          { x: -8, y: 0, z: 0 }, // Substrate on the left
          { x: 8, y: 0, z: 0 }, // Nucleophile on the right
        ];

        drawMolecule(molecularData.mol3d || '', moleculeManager, scene, positions[i], moleculeName);

        // Add velocity to make molecules collide
        const molecule = moleculeManager.getMolecule(moleculeName);
        if (molecule) {
          if (i === 0) {
            // Substrate (left) - move right towards center
            molecule.velocity.set(1.5, 0, 0);
            log(`✅ Substrate ${mol.name} positioned LEFT, moving RIGHT`);
          } else if (i === 1) {
            // Nucleophile (right) - move left towards center
            molecule.velocity.set(-1.5, 0, 0);
            log(`✅ Nucleophile ${mol.name} positioned RIGHT, moving LEFT`);
          }
          log(
            `✅ Set velocity for ${mol.name}: (${molecule.velocity.x}, ${molecule.velocity.y}, ${molecule.velocity.z})`
          );
        }

        log(
          `✅ Loaded demo molecule: ${mol.name} (${mol.formula}) at position (${positions[i].x}, ${positions[i].y}, ${positions[i].z})`
        );

        // Small delay between molecules to prevent overlap
        if (i < Math.min(2, demoMolecules.length) - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      statusCallback('Demo molecules loaded!');
      log('🎉 Demo molecules ready! You can now run the reaction demo.');
    } catch (error) {
      statusCallback(`Error loading demo molecules: ${error}`);
      log(`❌ Failed to load demo molecules: ${error}`);
    }
  }

  /**
   * Run the complete reaction demo
   */
  async runDemo(
    moleculeManager: MoleculeManager,
    timeControls: any,
    reactionParams: any
  ): Promise<void> {
    log('🎬 Starting Reaction Demo...');

    // Reset reaction completion flag
    this.reactionCompleted = false;

    // Check if we have molecules loaded
    const molecules = moleculeManager.getAllMolecules();
    if (molecules.length < 2) {
      log('❌ Demo requires at least 2 molecules. Please load some molecules first.');
      return;
    }

    // Set up demo parameters for high reaction probability
    reactionParams.substrateMolecule = molecules[0].name;
    reactionParams.nucleophileMolecule = molecules[1].name;
    reactionParams.reactionType = 'sn2';
    reactionParams.temperature = 1200; // Much higher temperature for demo
    reactionParams.approachAngle = 180; // Perfect SN2 angle
    reactionParams.impactParameter = 0.0; // Head-on for max probability
    reactionParams.relativeVelocity = 20.0; // High velocity for more energy

    log(
      `🎯 Demo setup: ${reactionParams.substrateMolecule} + ${reactionParams.nucleophileMolecule}`
    );

    // Setup collision
    const substrate = moleculeManager.getMolecule(reactionParams.substrateMolecule);
    const nucleophile = moleculeManager.getMolecule(reactionParams.nucleophileMolecule);

    if (substrate && nucleophile) {
      const reactionType = getReactionType(reactionParams.reactionType);
      if (reactionType) {
        // Set the reaction type for detection
        collisionEventSystem.setReactionType(reactionType);
        collisionEventSystem.setTemperature(reactionParams.temperature);
        // No default scene; collision system resolves scene via reactant ancestry

        log(`✅ Reaction type set: ${reactionType.name} at ${reactionParams.temperature}K`);

        // Verify the reaction type was set
        const currentReactionType = collisionEventSystem.getReactionType();
        if (currentReactionType) {
          log(`✅ Verified reaction type is set: ${currentReactionType.name}`);
        } else {
          log(`❌ ERROR: Reaction type was not set properly!`);
        }

        // Check if molecules have physics bodies
        const substrateBody = physicsEngine.getPhysicsBody(substrate);
        const nucleophileBody = physicsEngine.getPhysicsBody(nucleophile);

        if (!substrateBody || !nucleophileBody) {
          log('❌ Physics bodies not found for molecules. They should be created automatically.');
        } else {
          log('✅ Physics bodies found for both molecules');
        }

        // Setup collision
        this.trajectoryController.setupCollision({
          substrate,
          nucleophile,
          approachAngle: reactionParams.approachAngle,
          impactParameter: reactionParams.impactParameter,
          relativeVelocity: reactionParams.relativeVelocity,
          temperature: reactionParams.temperature,
        });

        log('✅ Demo collision setup complete!');
        log('🚀 Starting demo animation in 2 seconds...');

        // Start animation after a short delay
        setTimeout(() => {
          timeControls.isPlaying = true;
          log('🎬 Demo animation started! Watch for reactions...');

          // Force a test reaction immediately to verify the system works
          setTimeout(() => {
            // Check if reaction has already completed or molecules are invalid
            if (
              this.reactionCompleted ||
              !substrate ||
              !nucleophile ||
              substrate.reactionInProgress ||
              nucleophile.reactionInProgress
            ) {
              log('⚠️ Skipping forced test collision - reaction completed or molecules invalid');
              return;
            }

            log('🧪 Testing reaction system with forced collision...');
            // Force a test reaction for demo purposes with high energy
            const testEvent = {
              moleculeA: substrate,
              moleculeB: nucleophile,
              collisionPoint: new THREE.Vector3(0, 0, 0),
              collisionNormal: new THREE.Vector3(1, 0, 0),
              relativeVelocity: new THREE.Vector3(-25, 0, 0), // Even higher velocity for energy
              timestamp: performance.now() / 1000,
            };

            // Manually trigger collision event for testing
            collisionEventSystem.emitCollision(testEvent as any);
            log('🧪 Test collision event emitted with high energy');
          }, 1000); // Reduced to 1 second for faster testing
        }, 2000);
      }
    }
  }

  /**
   * Clear existing molecules from scene and manager
   */
  private clearExistingMolecules(moleculeManager: MoleculeManager, scene: THREE.Scene): void {
    const existingMolecules = moleculeManager.getAllMolecules();
    for (const mol of existingMolecules) {
      scene.remove(mol.group);
    }
    // Clear molecules from manager (assuming there's a clear method)
    if ('clearAllMolecules' in moleculeManager) {
      (moleculeManager as any).clearAllMolecules();
    }
    log('🧹 Cleared existing molecules');
  }

  /**
   * Get demo molecule options
   */
  getDemoMolecules(): Array<{ cid: string; name: string; formula: string }> {
    return [
      { cid: '6323', name: 'Methyl bromide', formula: 'CH3Br' },
      { cid: '149', name: 'Methanol', formula: 'CH3OH' },
      { cid: '6325', name: 'Methyl chloride', formula: 'CH3Cl' },
      { cid: '887', name: 'Water', formula: 'H2O' },
    ];
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    log('ReactionDemo disposed');
  }
}

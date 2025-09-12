/**
 * Clean GUI Controls for Reaction System
 * Focused on reaction mechanics with minimal debug clutter
 */

import * as dat from 'dat.gui';
import type * as THREE from 'three';
import { getReactionType } from '../chemistry/reactionDatabase';
import { ReactionDetector } from '../chemistry/reactionDetector';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
import { CollisionEventSystem } from '../physics/collisionEventSystem';
import { CollisionTrajectoryController } from '../physics/collisionTrajectoryController';
import type { MoleculeManager } from '../types';
import { log } from '../utils/debug';
import { ReactionVisualizer } from './reactionVisualizer';

/**
 * Sets up the main GUI for the reaction system
 */
export function set_up_gui(moleculeManager: MoleculeManager, scene: THREE.Scene): void {
  const gui = new dat.GUI({ width: 300 });

  // --- Reaction System Controls ---
  addReactionSystemControls(gui, scene, moleculeManager);

  // --- Essential Debug Controls (minimal) ---
  addEssentialDebugControls(gui, scene, moleculeManager);
}

/**
 * Main reaction system controls
 */
function addReactionSystemControls(
  gui: dat.GUI,
  scene: THREE.Scene,
  moleculeManager: MoleculeManager
): void {
  const reactionFolder = gui.addFolder('🧪 Reaction System');

  // Initialize reaction system components
  const trajectoryController = new CollisionTrajectoryController(scene);
  const reactionDetector = new ReactionDetector();
  const reactionVisualizer = new ReactionVisualizer(scene);
  const collisionEventSystem = new CollisionEventSystem();

  // Get available molecules
  const availableMolecules = moleculeManager.getAllMolecules().map(mol => mol.name);

  // Reaction parameters
  const reactionParams = {
    reactionType: 'SN2_REACTION',
    temperature: 298,
    approachAngle: 180,
    impactParameter: 0.0,
    relativeVelocity: 5.0,
    substrateMolecule: availableMolecules[0] || '',
    nucleophileMolecule: availableMolecules[1] || '',
  };

  // Time controls (at the top)
  const timeControls = {
    isPlaying: false,
    timeScale: 1.0,
    play: () => {
      timeControls.isPlaying = true;
      log('Reaction simulation started');
    },
    pause: () => {
      timeControls.isPlaying = false;
      log('Reaction simulation paused');
    },
    reset: () => {
      timeControls.isPlaying = false;
      reactionVisualizer.stop();
      trajectoryController.reset();
      log('Reaction simulation reset');
    },
  };

  const timeFolder = reactionFolder.addFolder('⏱️ Time Controls');
  timeFolder.add(timeControls, 'isPlaying').name('Playing').listen();
  timeFolder.add(timeControls, 'timeScale', 0.1, 3.0).name('Time Scale');
  timeFolder.add(timeControls, 'play').name('▶️ Play');
  timeFolder.add(timeControls, 'pause').name('⏸️ Pause');
  timeFolder.add(timeControls, 'reset').name('⏹️ Reset');

  // Environment parameters
  const envFolder = reactionFolder.addFolder('🌡️ Environment');
  envFolder.add(reactionParams, 'temperature', 200, 500).name('Temperature (K)');

  // Collision parameters
  const collisionFolder = reactionFolder.addFolder('💥 Collision Parameters');
  collisionFolder.add(reactionParams, 'approachAngle', 0, 360).name('Approach Angle (°)');
  collisionFolder.add(reactionParams, 'impactParameter', 0, 5).name('Impact Parameter');
  collisionFolder.add(reactionParams, 'relativeVelocity', 1, 20).name('Relative Velocity');

  // Molecule selection
  const moleculeFolder = reactionFolder.addFolder('🧬 Molecules');
  moleculeFolder.add(reactionParams, 'substrateMolecule', availableMolecules).name('Substrate');
  moleculeFolder.add(reactionParams, 'nucleophileMolecule', availableMolecules).name('Nucleophile');

  // Reaction control buttons
  const controlFolder = reactionFolder.addFolder('🎮 Controls');

  controlFolder
    .add(
      {
        setupCollision: () => {
          const substrate = moleculeManager.getMolecule(reactionParams.substrateMolecule);
          const nucleophile = moleculeManager.getMolecule(reactionParams.nucleophileMolecule);

          if (!substrate || !nucleophile) {
            log('Please select both substrate and nucleophile molecules');
            return;
          }

          const reactionType = getReactionType(reactionParams.reactionType);
          if (!reactionType) {
            log('Invalid reaction type');
            return;
          }

          // Setup collision
          trajectoryController.setupCollision({
            substrate,
            nucleophile,
            approachAngle: reactionParams.approachAngle,
            impactParameter: reactionParams.impactParameter,
            relativeVelocity: reactionParams.relativeVelocity,
            temperature: reactionParams.temperature,
          });

          // Set reaction type for detection
          collisionEventSystem.setReactionType(reactionType);
          collisionEventSystem.setTemperature(reactionParams.temperature);

          // Auto-pause after setup
          timeControls.isPlaying = false;

          log(`Collision setup: ${substrate.name} + ${nucleophile.name} (${reactionType.name})`);
          log('Ready to play - click ▶️ Play to start simulation');
        },
      },
      'setupCollision'
    )
    .name('Setup Collision');

  controlFolder
    .add(
      {
        startReaction: () => {
          const substrate = moleculeManager.getMolecule(reactionParams.substrateMolecule);
          const nucleophile = moleculeManager.getMolecule(reactionParams.nucleophileMolecule);

          if (!substrate || !nucleophile) {
            log('Please select both substrate and nucleophile molecules first');
            return;
          }

          const _steps = reactionVisualizer.generateSN2Reaction(substrate, nucleophile, 0);
          reactionVisualizer.play();
          timeControls.isPlaying = true;
          log('Reaction animation started');
        },
      },
      'startReaction'
    )
    .name('Start Reaction Animation');

  controlFolder
    .add(
      {
        stopReaction: () => {
          reactionVisualizer.stop();
          trajectoryController.reset();
          timeControls.isPlaying = false;
          log('Reaction stopped');
        },
      },
      'stopReaction'
    )
    .name('Stop Reaction');

  // Real-time stats
  const statsDisplay = {
    distance: 0,
    relativeVelocity: 0,
    timeToCollision: 0,
    reactionProbability: 0,
  };

  const statsFolder = reactionFolder.addFolder('📊 Live Stats');
  statsFolder.add(statsDisplay, 'distance').name('Distance').listen();
  statsFolder.add(statsDisplay, 'relativeVelocity').name('Relative Velocity').listen();
  statsFolder.add(statsDisplay, 'timeToCollision').name('Time to Collision').listen();
  statsFolder.add(statsDisplay, 'reactionProbability').name('Reaction Probability (%)').listen();

  // Update stats periodically
  setInterval(() => {
    const setup = trajectoryController.getCurrentSetup();
    if (setup) {
      const substrate = moleculeManager.getMolecule(reactionParams.substrateMolecule);
      const nucleophile = moleculeManager.getMolecule(reactionParams.nucleophileMolecule);

      if (substrate && nucleophile) {
        const distance = substrate.position.distanceTo(nucleophile.position);
        const velocity = substrate.userData.velocity?.length() || 0;
        const timeToCollision = distance / (velocity || 1);

        statsDisplay.distance = distance;
        statsDisplay.relativeVelocity = velocity;
        statsDisplay.timeToCollision = timeToCollision;

        // Calculate reaction probability
        const reactionType = getReactionType(reactionParams.reactionType);
        if (reactionType) {
          const analysis = reactionDetector.detectReaction(
            { substrate, nucleophile, distance, relativeVelocity: velocity },
            reactionType,
            { temperature: reactionParams.temperature }
          );
          statsDisplay.reactionProbability = analysis.overallProbability * 100;
        }
      }
    }
  }, 100);

  // Open folders (time controls first)
  timeFolder.open();
  envFolder.open();
  collisionFolder.open();
  moleculeFolder.open();
  controlFolder.open();
  statsFolder.open();

  log('Reaction system controls added to GUI');
}

/**
 * Essential debug controls - minimal set for reaction system
 */
function addEssentialDebugControls(
  gui: dat.GUI,
  scene: THREE.Scene,
  moleculeManager: MoleculeManager
): void {
  const debugFolder = gui.addFolder('🔧 Essential Debug');

  // Basic scene controls
  const sceneControls = {
    showAxes: true,
    showStats: true,
    clearScene: () => {
      // Remove all molecules
      const molecules = moleculeManager.getAllMolecules();
      molecules.forEach(mol => {
        scene.remove(mol);
        moleculeManager.removeMolecule(mol.name);
      });
      log('Scene cleared');
    },
  };

  debugFolder
    .add(sceneControls, 'showAxes')
    .name('Show Axes')
    .onChange((value: boolean) => {
      const axes = scene.getObjectByName('axesHelper');
      if (axes) axes.visible = value;
    });

  debugFolder
    .add(sceneControls, 'showStats')
    .name('Show Stats')
    .onChange((value: boolean) => {
      const stats = document.getElementById('stats');
      if (stats) stats.style.display = value ? 'block' : 'none';
    });

  debugFolder.add(sceneControls, 'clearScene').name('🗑️ Clear All Molecules');

  // Physics engine stats (minimal)
  const physicsStats = {
    getStats: () => {
      const stats = physicsEngine.getStats();
      log(`Physics: ${stats.activeBodies} bodies, ${stats.contacts} contacts`);
    },
  };

  debugFolder.add(physicsStats, 'getStats').name('📊 Physics Stats');

  debugFolder.open();
  log('Essential debug controls added to GUI');
}

// Legacy function for compatibility
export function autoRotate(): void {
  // Placeholder for auto-rotate functionality
}

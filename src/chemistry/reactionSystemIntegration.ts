import type * as THREE from 'three';
import { ReactionVisualizer } from '../components/reactionVisualizer';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { CollisionTrajectoryController } from '../physics/collisionTrajectoryController';
import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';
import { chemicalDataService } from './chemicalDataService';
import { getReactionType } from './reactionDatabase';
import { ReactionDetector } from './reactionDetector';

/**
 * Main integration class for the reaction system
 */
export class ReactionSystemIntegration {
  private trajectoryController: CollisionTrajectoryController;
  private reactionVisualizer: ReactionVisualizer;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.trajectoryController = new CollisionTrajectoryController(scene);
    this.reactionDetector = new ReactionDetector();
    this.reactionVisualizer = new ReactionVisualizer(scene);

    log('ReactionSystemIntegration initialized');
  }

  /**
   * Setup a complete reaction simulation
   */
  async setupReaction(
    reactionTypeId: string,
    substrateName: string,
    nucleophileName: string,
    environment: {
      temperature?: number;
      approachAngle?: number;
      impactParameter?: number;
      relativeVelocity?: number;
    } = {}
  ): Promise<boolean> {
    try {
      log(`Setting up ${reactionTypeId} reaction: ${substrateName} + ${nucleophileName}`);

      // Get reaction type
      const reactionType = getReactionType(reactionTypeId);
      if (!reactionType) {
        log(`Unknown reaction type: ${reactionTypeId}`);
        return false;
      }

      // Set default environment parameters
      const params = {
        temperature: environment.temperature || 298,
        approachAngle: environment.approachAngle || reactionType.optimalAngle,
        impactParameter: environment.impactParameter || 0,
        relativeVelocity: environment.relativeVelocity || 10,
      };

      // Configure collision event system
      collisionEventSystem.setReactionType(reactionType);
      collisionEventSystem.setTemperature(params.temperature);

      log(`Reaction system configured: ${reactionType.name} at ${params.temperature}K`);
      return true;
    } catch (error) {
      log(`Failed to setup reaction: ${error}`);
      return false;
    }
  }

  /**
   * Setup collision between two molecules
   */
  setupCollision(
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup,
    params: {
      approachAngle?: number;
      impactParameter?: number;
      relativeVelocity?: number;
      temperature?: number;
    } = {}
  ): void {
    const collisionParams = {
      substrate,
      nucleophile,
      approachAngle: params.approachAngle || 180,
      impactParameter: params.impactParameter || 0,
      relativeVelocity: params.relativeVelocity || 10,
      temperature: params.temperature || 298,
    };

    this.trajectoryController.setupCollision(collisionParams);
    log(`Collision setup: ${substrate.name} + ${nucleophile.name}`);
  }

  /**
   * Start reaction animation
   */
  startReactionAnimation(substrate: MoleculeGroup, nucleophile: MoleculeGroup): void {
    const _steps = this.reactionVisualizer.generateSN2Reaction(substrate, nucleophile, 0);
    this.reactionVisualizer.play();
    log('Reaction animation started');
  }

  /**
   * Stop reaction animation
   */
  stopReactionAnimation(): void {
    this.reactionVisualizer.stop();
    this.trajectoryController.reset();
    log('Reaction animation stopped');
  }

  /**
   * Get reaction statistics
   */
  getReactionStats(): {
    collision: {
      distance: number;
      relativeVelocity: number;
      timeToCollision: number | null;
    };
    animation: {
      totalSteps: number;
      currentStep: number;
      progress: number;
      isPlaying: boolean;
      currentEnergy: number;
    };
  } {
    return {
      collision: this.trajectoryController.getCollisionStats(),
      animation: this.reactionVisualizer.getReactionStats(),
    };
  }

  /**
   * Update the system (call this in your animation loop)
   */
  update(): void {
    // Update trajectory visualization
    this.trajectoryController.updateTrajectoryVisualization();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.trajectoryController.dispose();
    this.reactionVisualizer.dispose();
    log('ReactionSystemIntegration disposed');
  }
}

/**
 * Helper function to test the reaction system
 */
export async function testReactionSystem(scene: THREE.Scene): Promise<void> {
  log('Testing reaction system...');

  const reactionSystem = new ReactionSystemIntegration(scene);

  try {
    // Test reaction setup
    const success = await reactionSystem.setupReaction('sn2', 'methyl_bromide', 'hydroxide');

    if (success) {
      log('✓ Reaction system test passed');
    } else {
      log('✗ Reaction system test failed');
    }

    // Test chemical data service
    try {
      const data = await chemicalDataService.fetchMoleculeByName('water');
      log(`✓ Chemical data service test passed: ${data.formula}`);
    } catch (error) {
      log(`✗ Chemical data service test failed: ${error}`);
    }
  } catch (error) {
    log(`✗ Reaction system test failed: ${error}`);
  } finally {
    reactionSystem.dispose();
  }
}

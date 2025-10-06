import * as THREE from 'three';
import { ReactionDemoCoordinator } from '../demo/reactionDemoCoordinator';
import type { MoleculeManager } from '../types';
import { log } from '../utils/debug';

/**
 * Enhanced Reaction Demo
 * 
 * A clean wrapper around the ReactionDemoCoordinator that uses the proper
 * StructureEngine architecture instead of the old placeholder system.
 */
export class EnhancedReactionDemo {
  private demoCoordinator: ReactionDemoCoordinator;
  
  constructor(scene: THREE.Scene) {
    this.demoCoordinator = new ReactionDemoCoordinator(scene);
    log('🚀 EnhancedReactionDemo initialized');
  }
  
  /**
   * Run enhanced SN2 demo using the proper StructureEngine architecture
   */
  async runEnhancedSN2Demo(
    moleculeManager: MoleculeManager,
    scene: THREE.Scene,
    timeControls: any,
    reactionParams: any
  ): Promise<void> {
    return this.demoCoordinator.runSN2Demo(moleculeManager, scene, timeControls, reactionParams);
  }

  /**
   * Get the StructureEngine instance
   */
  getStructureEngine() {
    return this.demoCoordinator.getStructureEngine();
  }

  /**
   * Get the MolecularManipulator instance
   */
  getMolecularManipulator() {
    return this.demoCoordinator.getMolecularManipulator();
  }

  /**
   * Get the ReactionCoordinator instance
   */
  getReactionCoordinator() {
    return this.demoCoordinator.getReactionCoordinator();
  }
}

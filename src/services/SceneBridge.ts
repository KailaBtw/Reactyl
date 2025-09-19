/**
 * Bridge service to connect React components with Three.js scene
 * This allows React components to interact with the 3D scene
 */

import * as THREE from 'three';
import type { MoleculeManager } from '../types';

class SceneBridge {
  private scene: THREE.Scene | null = null;
  private moleculeManager: MoleculeManager | null = null;

  /**
   * Initialize the bridge with scene and molecule manager
   */
  initialize(scene: THREE.Scene, moleculeManager: MoleculeManager): void {
    this.scene = scene;
    this.moleculeManager = moleculeManager;
    
    // Make available globally for React components
    (window as any).threeScene = scene;
    (window as any).moleculeManager = moleculeManager;
    
    console.log('SceneBridge initialized:', {
      scene: !!scene,
      moleculeManager: !!moleculeManager,
      sceneChildren: scene?.children?.length || 0
    });
  }

  /**
   * Get the current scene
   */
  getScene(): THREE.Scene | null {
    return this.scene;
  }

  /**
   * Get the current molecule manager
   */
  getMoleculeManager(): MoleculeManager | null {
    return this.moleculeManager;
  }

  /**
   * Check if bridge is initialized
   */
  isInitialized(): boolean {
    return this.scene !== null && this.moleculeManager !== null;
  }
}

// Export singleton instance
export const sceneBridge = new SceneBridge();

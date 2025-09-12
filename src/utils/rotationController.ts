import * as THREE from 'three';
import { RotationPhysicsEngine } from '../physics/rotationPhysicsEngine';
import type { MoleculeGroup } from '../types';
import { log } from './debug';

export interface RotationConfig {
  mode: 'realistic' | 'demo' | 'manual';
  temperature: number;
  speedMultiplier: number;
  dampingFactor: number;
  enableThermalNoise: boolean;
}

export interface RotationState {
  angularVelocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  temperature: number;
  mode: string;
}

export class RotationController {
  private config: RotationConfig;
  private physicsEngine: RotationPhysicsEngine;
  private molecule: MoleculeGroup | null = null;
  private isActive: boolean = true;

  constructor(config: Partial<RotationConfig> = {}) {
    this.config = {
      mode: 'realistic',
      temperature: 300,
      speedMultiplier: 1.0,
      dampingFactor: 0.98,
      enableThermalNoise: true,
      ...config,
    };

    this.physicsEngine = new RotationPhysicsEngine();
    log('RotationController initialized');
  }

  /**
   * Attach to a molecule
   */
  attachToMolecule(molecule: MoleculeGroup): void {
    this.molecule = molecule;
    this.physicsEngine.initializeMolecule(molecule, this.config);
    log(`RotationController attached to ${molecule.name}`);
  }

  /**
   * Set molecular properties (legacy method for compatibility)
   */
  setMolecule(molecularProperties: any): void {
    if (this.molecule) {
      (this.molecule as any).molecularProperties = molecularProperties;
      this.physicsEngine.initializeMolecule(this.molecule, this.config);
      log(`Molecular properties set for ${this.molecule.name}`);
    }
  }

  /**
   * Update rotation physics
   */
  update(deltaTime: number): void {
    if (!this.molecule || !this.isActive) return;

    this.physicsEngine.update(deltaTime, this.config);
    this.syncWithMolecule();
  }

  /**
   * Sync physics state with molecule
   */
  private syncWithMolecule(): void {
    if (!this.molecule) return;

    const state = this.physicsEngine.getRotationState();

    // Update molecule's quaternion
    this.molecule.group.quaternion.copy(state.quaternion);

    // Update molecule's rotation if needed
    const euler = new THREE.Euler().setFromQuaternion(state.quaternion);
    this.molecule.group.rotation.copy(euler);
  }

  /**
   * Apply rotation to a Three.js object (public method for compatibility)
   */
  applyToObject3D(object3D: THREE.Object3D): void {
    if (!this.isActive) return;

    const state = this.physicsEngine.getRotationState();

    // Update object's quaternion
    object3D.quaternion.copy(state.quaternion);

    // Update object's rotation if needed
    const euler = new THREE.Euler().setFromQuaternion(state.quaternion);
    object3D.rotation.copy(euler);
  }

  /**
   * Get current rotation state
   */
  getRotationState(): RotationState {
    return this.physicsEngine.getRotationState();
  }

  /**
   * Set rotation mode
   */
  setMode(mode: 'realistic' | 'demo' | 'manual'): void {
    this.config.mode = mode;
    this.physicsEngine.setMode(mode);
    log(`Rotation mode set to: ${mode}`);
  }

  /**
   * Set temperature
   */
  setTemperature(temperature: number): void {
    this.config.temperature = temperature;
    this.physicsEngine.setTemperature(temperature);
    log(`RotationController: Temperature set to: ${temperature}K`);
  }

  /**
   * Set speed multiplier
   */
  setSpeedMultiplier(multiplier: number): void {
    this.config.speedMultiplier = multiplier;
    this.physicsEngine.setSpeedMultiplier(multiplier);
    log(`Speed multiplier set to: ${multiplier}`);
  }

  /**
   * Reset rotation
   */
  reset(): void {
    if (this.molecule) {
      this.molecule.group.rotation.set(0, 0, 0);
      this.molecule.group.quaternion.set(0, 0, 0, 1);
    }
    this.physicsEngine.reset();
    log('Rotation reset');
  }

  /**
   * Enable/disable rotation
   */
  setActive(active: boolean): void {
    this.isActive = active;
    log(`Rotation ${active ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get configuration
   */
  getConfig(): RotationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RotationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.physicsEngine.updateConfig(this.config);
    log('Rotation configuration updated');
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.molecule = null;
    this.physicsEngine.dispose();
    log('RotationController disposed');
  }
}

import * as THREE from 'three';
import { MoleculeGroup } from '../types';
import { RotationConfig, RotationState } from './rotationController';
import { log } from './debug';

export class RotationPhysicsEngine {
  private rotationState: RotationState;
  private molecule: MoleculeGroup | null = null;
  private molecularProperties: any = null;
  private lastUpdateTime: number = 0;
  
  // Physics constants
  private readonly kB = 1.38e-23; // Boltzmann constant
  private readonly SPEED_SCALE = 0.1; // Scale factor for molecular rotation
  private readonly MIN_ROTATION_SPEED = 0.01;
  private readonly MAX_ROTATION_SPEED = 0.5;
  
  constructor() {
    this.rotationState = {
      angularVelocity: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      temperature: 300,
      mode: 'realistic'
    };
    
    log('RotationPhysicsEngine initialized');
  }
  
  /**
   * Initialize molecule for rotation physics
   */
  initializeMolecule(molecule: MoleculeGroup, config: RotationConfig): void {
    this.molecule = molecule;
    this.molecularProperties = (molecule as any).molecularProperties;
    this.rotationState.temperature = config.temperature;
    this.rotationState.mode = config.mode;
    
    // Initialize with random rotation
    this.rotationState.quaternion.setFromEuler(new THREE.Euler(
      (Math.random() - 0.5) * Math.PI,
      (Math.random() - 0.5) * Math.PI,
      (Math.random() - 0.5) * Math.PI
    ));
    
    // Initialize angular velocity based on temperature
    this.initializeAngularVelocity(config);
    
    log(`Rotation physics initialized for ${molecule.name}`);
  }
  
  /**
   * Initialize angular velocity based on temperature and molecular properties
   */
  private initializeAngularVelocity(config: RotationConfig): void {
    if (!this.molecularProperties) return;
    
    const temperature = config.temperature;
    const mass = this.molecularProperties.totalMass || 1.0;
    const radius = this.molecularProperties.boundingRadius || 1.0;
    
    // Calculate thermal rotational energy
    const thermalEnergy = this.kB * temperature;
    const momentOfInertia = 0.4 * mass * radius * radius; // Approximate for sphere
    
    // Calculate angular velocity magnitude
    const angularSpeed = Math.sqrt(2 * thermalEnergy / momentOfInertia) * this.SPEED_SCALE;
    
    // Clamp to reasonable range
    const clampedSpeed = Math.max(
      this.MIN_ROTATION_SPEED,
      Math.min(this.MAX_ROTATION_SPEED, angularSpeed)
    );
    
    // Set random direction
    this.rotationState.angularVelocity.set(
      (Math.random() - 0.5) * clampedSpeed,
      (Math.random() - 0.5) * clampedSpeed,
      (Math.random() - 0.5) * clampedSpeed
    );
  }
  
  /**
   * Update rotation physics
   */
  update(deltaTime: number, config: RotationConfig): void {
    if (!this.molecule || !this.molecularProperties) return;
    
    const currentTime = performance.now() / 1000;
    const actualDeltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    // Apply different rotation modes
    switch (config.mode) {
      case 'realistic':
        this.updateRealisticRotation(actualDeltaTime, config);
        break;
      case 'demo':
        this.updateDemoRotation(actualDeltaTime, config);
        break;
      case 'manual':
        // Manual mode - no automatic rotation
        break;
    }
    
    // Apply damping
    this.applyDamping(config.dampingFactor, actualDeltaTime);
    
    // Update quaternion from angular velocity
    this.updateQuaternion(actualDeltaTime);
  }
  
  /**
   * Update realistic rotation based on temperature and molecular properties
   */
  private updateRealisticRotation(deltaTime: number, config: RotationConfig): void {
    if (!this.molecularProperties) return;
    
    const temperature = config.temperature;
    const mass = this.molecularProperties.totalMass || 1.0;
    const radius = this.molecularProperties.boundingRadius || 1.0;
    
    // Debug logging (only log occasionally to avoid spam)
    if (Math.random() < 0.001) { // 0.1% chance to log
      log(`RotationPhysicsEngine: T=${temperature}K, mass=${mass.toFixed(2)}, radius=${radius.toFixed(2)}`);
    }
    
    // Calculate thermal noise (physically accurate)
    const thermalNoise = Math.sqrt(this.kB * temperature / mass) * 0.001;
    const noiseScale = config.enableThermalNoise ? 1.0 : 0.0;
    
    // Add thermal noise to angular velocity
    this.rotationState.angularVelocity.add(new THREE.Vector3(
      (Math.random() - 0.5) * thermalNoise * noiseScale,
      (Math.random() - 0.5) * thermalNoise * noiseScale,
      (Math.random() - 0.5) * thermalNoise * noiseScale
    ));
    
    // Apply speed multiplier
    this.rotationState.angularVelocity.multiplyScalar(config.speedMultiplier);
  }
  
  /**
   * Update demo rotation (simplified for demonstration)
   */
  private updateDemoRotation(deltaTime: number, config: RotationConfig): void {
    // Simple constant rotation for demo purposes
    const baseSpeed = 0.1 * config.speedMultiplier;
    
    this.rotationState.angularVelocity.set(
      baseSpeed * 0.5,
      baseSpeed * 0.3,
      baseSpeed * 0.7
    );
  }
  
  /**
   * Apply damping to angular velocity
   */
  private applyDamping(dampingFactor: number, deltaTime: number): void {
    const damping = Math.pow(dampingFactor, deltaTime);
    this.rotationState.angularVelocity.multiplyScalar(damping);
    
    // Stop very slow rotations
    if (this.rotationState.angularVelocity.length() < 0.001) {
      this.rotationState.angularVelocity.set(0, 0, 0);
    }
  }
  
  /**
   * Update quaternion from angular velocity
   */
  private updateQuaternion(deltaTime: number): void {
    const angularVel = this.rotationState.angularVelocity;
    const angularSpeed = angularVel.length();
    
    if (angularSpeed > 0.001) {
      const axis = angularVel.clone().normalize();
      const angle = angularSpeed * deltaTime;
      
      const deltaQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      this.rotationState.quaternion.multiplyQuaternions(deltaQuaternion, this.rotationState.quaternion);
      this.rotationState.quaternion.normalize();
    }
  }
  
  /**
   * Get current rotation state
   */
  getRotationState(): RotationState {
    return {
      angularVelocity: this.rotationState.angularVelocity.clone(),
      quaternion: this.rotationState.quaternion.clone(),
      temperature: this.rotationState.temperature,
      mode: this.rotationState.mode
    };
  }
  
  /**
   * Set rotation mode
   */
  setMode(mode: 'realistic' | 'demo' | 'manual'): void {
    this.rotationState.mode = mode;
    
    if (mode === 'manual') {
      this.rotationState.angularVelocity.set(0, 0, 0);
    }
  }
  
  /**
   * Set temperature
   */
  setTemperature(temperature: number): void {
    this.rotationState.temperature = temperature;
    log(`RotationPhysicsEngine: Temperature updated to ${temperature}K`);
  }
  
  /**
   * Set speed multiplier
   */
  setSpeedMultiplier(multiplier: number): void {
    // This is handled in the update method
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: RotationConfig): void {
    this.rotationState.temperature = config.temperature;
    this.rotationState.mode = config.mode;
  }
  
  /**
   * Reset rotation state
   */
  reset(): void {
    this.rotationState.angularVelocity.set(0, 0, 0);
    this.rotationState.quaternion.set(0, 0, 0, 1);
    this.lastUpdateTime = 0;
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.molecule = null;
    this.molecularProperties = null;
    log('RotationPhysicsEngine disposed');
  }
}

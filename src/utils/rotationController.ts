import * as THREE from 'three';
import { MolecularProperties } from './molecularPropertiesCalculator';
import { RotationState, RotationPhysicsEngine } from './rotationPhysicsEngine';

export interface RotationConfig {
  mode: 'realistic' | 'demo' | 'manual';
  temperature: number;
  speedMultiplier: number;
  dampingFactor: number;
  enableThermalNoise: boolean;
}

export class RotationController {
  private rotationState: RotationState;
  private config: RotationConfig;
  private molecularProperties: MolecularProperties | null = null;
  
  // Three.js objects for rotation management
  private rotationObject: THREE.Object3D;
  private matrix: THREE.Matrix4;
  
  // Time tracking
  private startTime: number;

  constructor(config: Partial<RotationConfig> = {}) {
    this.config = {
      mode: 'realistic',
      temperature: 300, // Kelvin
      speedMultiplier: 1.0,
      dampingFactor: 0.98,
      enableThermalNoise: true,
      ...config
    };

    // Initialize Three.js objects
    this.rotationObject = new THREE.Object3D();
    this.matrix = new THREE.Matrix4();
    this.startTime = performance.now() * 0.001;

    // Initialize rotation state
    this.rotationState = {
      angularVelocity: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      rotationSpeed: 0
    };
  }

  setMolecule(properties: MolecularProperties): void {
    this.molecularProperties = properties;
    this.updateRotationFromPhysics();
  }

  setTemperature(temperature: number): void {
    this.config.temperature = temperature;
    this.updateRotationFromPhysics();
  }

  setMode(mode: RotationConfig['mode']): void {
    this.config.mode = mode;
    this.updateRotationFromPhysics();
  }

  setSpeedMultiplier(multiplier: number): void {
    this.config.speedMultiplier = multiplier;
  }

  update(deltaTime: number): THREE.Matrix4 {
    if (!this.molecularProperties && this.config.mode !== 'demo') {
      return this.matrix;
    }

    switch (this.config.mode) {
      case 'realistic':
        return this.updateRealisticRotation(deltaTime);
      case 'demo':
        return this.updateDemoRotation();
      case 'manual':
        return this.matrix;
      default:
        return this.matrix;
    }
  }

  // Direct Three.js integration methods
  applyToObject3D(object: THREE.Object3D): void {
    object.quaternion.copy(this.rotationState.quaternion);
  }

  applyToMesh(mesh: THREE.Mesh): void {
    mesh.quaternion.copy(this.rotationState.quaternion);
  }

  getQuaternion(): THREE.Quaternion {
    return this.rotationState.quaternion.clone();
  }

  getMatrix4(): THREE.Matrix4 {
    return this.matrix.makeRotationFromQuaternion(this.rotationState.quaternion);
  }

  getRotationObject(): THREE.Object3D {
    this.rotationObject.quaternion.copy(this.rotationState.quaternion);
    return this.rotationObject;
  }

  getRotationState(): RotationState {
    return {
      angularVelocity: this.rotationState.angularVelocity.clone(),
      quaternion: this.rotationState.quaternion.clone(),
      euler: this.rotationState.euler.clone(),
      rotationSpeed: this.rotationState.rotationSpeed
    };
  }

  // Reset rotation to identity
  reset(): void {
    this.rotationState.quaternion.identity();
    this.rotationState.euler.set(0, 0, 0);
    this.rotationObject.quaternion.identity();
  }

  // Manual rotation control (useful for user interaction)
  addRotation(axis: THREE.Vector3, angle: number): void {
    const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), angle);
    this.rotationState.quaternion.multiplyQuaternions(deltaQuat, this.rotationState.quaternion);
    this.rotationState.quaternion.normalize();
  }

  private updateRotationFromPhysics(): void {
    if (!this.molecularProperties) return;

    this.rotationState = RotationPhysicsEngine.calculateRotationFromTemperature(
      this.molecularProperties,
      this.config.temperature
    );

    // Scale by molecular size
    this.rotationState = RotationPhysicsEngine.scaleRotationByMolecularSize(
      this.rotationState,
      this.molecularProperties
    );

    // Apply speed multiplier
    this.rotationState.angularVelocity.multiplyScalar(this.config.speedMultiplier);
  }

  private updateRealisticRotation(deltaTime: number): THREE.Matrix4 {
    // Update rotation state using physics engine
    this.rotationState = RotationPhysicsEngine.updateRotationState(
      this.rotationState,
      deltaTime,
      this.config.dampingFactor
    );

    // Add thermal noise if enabled
    if (this.config.enableThermalNoise) {
      this.rotationState = RotationPhysicsEngine.addThermalNoise(
        this.rotationState,
        this.config.temperature,
        deltaTime
      );
    }

    // Update matrix from quaternion
    this.matrix.makeRotationFromQuaternion(this.rotationState.quaternion);
    
    // Update rotation object
    this.rotationObject.quaternion.copy(this.rotationState.quaternion);

    return this.matrix;
  }

  private updateDemoRotation(): THREE.Matrix4 {
    const currentTime = (performance.now() * 0.001) - this.startTime;
    
    // Use physics engine for smooth demo rotation
    this.rotationState = RotationPhysicsEngine.createDemoRotation(currentTime * this.config.speedMultiplier);
    
    // Update matrix and object
    this.matrix.makeRotationFromQuaternion(this.rotationState.quaternion);
    this.rotationObject.quaternion.copy(this.rotationState.quaternion);

    return this.matrix;
  }
}

// Utility class for common Three.js molecular rotation tasks
export class MolecularRotationHelper {
  static createRotatingMolecule(
    geometry: THREE.BufferGeometry, 
    material: THREE.Material,
    rotationController: RotationController
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set up automatic rotation in render loop
    const originalOnBeforeRender = mesh.onBeforeRender;
    mesh.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      const deltaTime = 1/60; // Assume 60fps, or pass from your render loop
      rotationController.update(deltaTime);
      rotationController.applyToMesh(mesh);
      
      if (originalOnBeforeRender) {
        originalOnBeforeRender.call(mesh, renderer, scene, camera, geometry, material, group);
      }
    };

    return mesh;
  }

  static createRotationGroup(rotationController: RotationController): THREE.Group {
    const group = new THREE.Group();
    
    // Auto-update rotation
    const originalOnBeforeRender = group.onBeforeRender;
    group.onBeforeRender = (renderer, scene, camera, geometry, material, groupObj) => {
      const deltaTime = 1/60;
      rotationController.update(deltaTime);
      rotationController.applyToObject3D(group);
      
      if (originalOnBeforeRender) {
        originalOnBeforeRender.call(group, renderer, scene, camera, geometry, material, groupObj);
      }
    };

    return group;
  }

  static lerp(controller1: RotationController, controller2: RotationController, t: number): THREE.Quaternion {
    const q1 = controller1.getQuaternion();
    const q2 = controller2.getQuaternion();
    return q1.slerp(q2, t); // Spherical linear interpolation
  }
}

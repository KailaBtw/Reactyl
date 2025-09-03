import * as THREE from 'three';
import { MolecularProperties } from './molecularPropertiesCalculator';

export interface RotationState {
  angularVelocity: THREE.Vector3; // rad/s around each axis
  quaternion: THREE.Quaternion;   // current rotation as quaternion
  euler: THREE.Euler;            // current rotation as Euler angles
  rotationSpeed: number;         // magnitude of rotation
}

export class RotationPhysicsEngine {
  // Physical constants
  private static readonly BOLTZMANN_CONSTANT = 1.380649e-23; // J/K
  private static readonly AMU_TO_KG = 1.66054e-27; // atomic mass unit to kg
  private static readonly ANGSTROM_TO_M = 1e-10; // Angstrom to meters

  // Scaling factors for visualization
  private static readonly SPEED_SCALE = 1e8; // Reduced from 1e12 to 1e8 for more reasonable speeds
  private static readonly MIN_ROTATION_SPEED = 0.05; // Reduced minimum speed
  private static readonly MAX_ROTATION_SPEED = 2.0; // Maximum rotation speed cap

  static calculateRotationFromTemperature(
    properties: MolecularProperties, 
    temperature: number = 300 // Kelvin, room temperature default
  ): RotationState {
    
    // Convert moments of inertia to SI units (kg⋅m²)
    const I = properties.momentOfInertia.clone().multiplyScalar(
      this.AMU_TO_KG * this.ANGSTROM_TO_M * this.ANGSTROM_TO_M
    );

    // Calculate thermal rotational energy: E = (3/2) * k_B * T
    const thermalEnergy = 1.5 * this.BOLTZMANN_CONSTANT * temperature;

    // Calculate angular velocities: ω = √(2E / I)
    const angularVelocity = new THREE.Vector3(
      Math.sqrt(2 * thermalEnergy / Math.max(I.x, 1e-45)) * this.SPEED_SCALE,
      Math.sqrt(2 * thermalEnergy / Math.max(I.y, 1e-45)) * this.SPEED_SCALE,
      Math.sqrt(2 * thermalEnergy / Math.max(I.z, 1e-45)) * this.SPEED_SCALE
    );

    // Apply minimum and maximum rotation speed caps
    angularVelocity.x = Math.max(Math.min(angularVelocity.x, this.MAX_ROTATION_SPEED), this.MIN_ROTATION_SPEED);
    angularVelocity.y = Math.max(Math.min(angularVelocity.y, this.MAX_ROTATION_SPEED), this.MIN_ROTATION_SPEED);
    angularVelocity.z = Math.max(Math.min(angularVelocity.z, this.MAX_ROTATION_SPEED), this.MIN_ROTATION_SPEED);

    // Add some randomness for thermal motion (±10% instead of ±20%)
    const randomFactor = () => 0.9 + Math.random() * 0.2;
    angularVelocity.multiplyScalar(randomFactor());
    angularVelocity.x *= randomFactor();
    angularVelocity.y *= randomFactor();

    // Create initial rotation state using Three.js objects
    const euler = new THREE.Euler(0, 0, 0, 'XYZ');
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    const rotationSpeed = angularVelocity.length();

    return {
      angularVelocity,
      quaternion,
      euler,
      rotationSpeed
    };
  }

  static scaleRotationByMolecularSize(
    rotation: RotationState, 
    properties: MolecularProperties
  ): RotationState {
    // Smaller molecules rotate faster (inversely proportional to size)
    const sizeScale = 2.0 / (1.0 + properties.boundingRadius);
    
    return {
      angularVelocity: rotation.angularVelocity.clone().multiplyScalar(sizeScale),
      quaternion: rotation.quaternion.clone(),
      euler: rotation.euler.clone(),
      rotationSpeed: rotation.rotationSpeed * sizeScale
    };
  }

  static updateRotationState(
    rotationState: RotationState, 
    deltaTime: number,
    dampingFactor: number = 0.98
  ): RotationState {
    // Apply damping using Three.js vector operations
    const damping = Math.pow(dampingFactor, deltaTime);
    rotationState.angularVelocity.multiplyScalar(damping);

    // Calculate rotation increments
    const rotationIncrement = rotationState.angularVelocity.clone().multiplyScalar(deltaTime);

    // Create quaternion for this frame's rotation
    const deltaQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotationIncrement.x, rotationIncrement.y, rotationIncrement.z, 'XYZ')
    );

    // Apply rotation using quaternion multiplication (smoother than Euler)
    rotationState.quaternion.multiplyQuaternions(deltaQuat, rotationState.quaternion);
    rotationState.quaternion.normalize(); // Prevent drift

    // Update Euler representation
    rotationState.euler.setFromQuaternion(rotationState.quaternion, 'XYZ');
    
    // Update rotation speed
    rotationState.rotationSpeed = rotationState.angularVelocity.length();

    return rotationState;
  }

  static addThermalNoise(
    rotationState: RotationState, 
    temperature: number, 
    deltaTime: number
  ): RotationState {
    // Add small random rotations to simulate thermal motion (reduced intensity)
    const noiseScale = Math.sqrt(temperature / 300) * 0.002 * deltaTime; // Reduced from 0.01 to 0.002
    
    const noise = new THREE.Vector3(
      (Math.random() - 0.5) * noiseScale,
      (Math.random() - 0.5) * noiseScale,
      (Math.random() - 0.5) * noiseScale
    );

    // Create noise quaternion
    const noiseEuler = new THREE.Euler(noise.x, noise.y, noise.z, 'XYZ');
    const noiseQuat = new THREE.Quaternion().setFromEuler(noiseEuler);

    // Apply noise
    rotationState.quaternion.multiplyQuaternions(noiseQuat, rotationState.quaternion);
    rotationState.quaternion.normalize();

    return rotationState;
  }

  static createDemoRotation(time: number): RotationState {
    // Smooth, predictable rotation for demonstration
    const rotX = Math.sin(time * 0.5) * 0.3;
    const rotY = time * 0.8;
    const rotZ = Math.cos(time * 0.3) * 0.2;

    const euler = new THREE.Euler(rotX, rotY, rotZ, 'XYZ');
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    
    // Calculate angular velocity from time derivatives
    const angularVelocity = new THREE.Vector3(
      Math.cos(time * 0.5) * 0.15,
      0.8,
      -Math.sin(time * 0.3) * 0.06
    );

    return {
      angularVelocity,
      quaternion,
      euler,
      rotationSpeed: angularVelocity.length()
    };
  }

  static calculateTemperatureFromRotation(
    rotation: RotationState,
    properties: MolecularProperties
  ): number {
    // Reverse calculation: estimate temperature from rotation speed
    const avgAngularVel = (
      Math.abs(rotation.angularVelocity.x) + 
      Math.abs(rotation.angularVelocity.y) + 
      Math.abs(rotation.angularVelocity.z)
    ) / 3;

    const avgMomentOfInertia = (
      properties.momentOfInertia.x + 
      properties.momentOfInertia.y + 
      properties.momentOfInertia.z
    ) / 3;

    // Reverse the thermal energy calculation
    const scaledAngularVel = avgAngularVel / this.SPEED_SCALE;
    const momentSI = avgMomentOfInertia * this.AMU_TO_KG * this.ANGSTROM_TO_M ** 2;
    const energy = 0.5 * momentSI * scaledAngularVel ** 2;
    
    return (2 * energy) / (3 * this.BOLTZMANN_CONSTANT);
  }
}

import type * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { CollisionSetup } from '../types';
import { log } from '../utils/debug';
import { physicsEngine } from './cannonPhysicsEngine';

export class CollisionTrajectoryController {
  private trajectoryLine?: THREE.Line;
  private scene: THREE.Scene;
  private currentSetup?: CollisionSetup;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    log('CollisionTrajectoryController initialized');
  }

  /**
   * Setup controlled collision between two molecules
   */
  setupCollision(params: CollisionSetup): void {
    this.currentSetup = params;

    const substrateBody = physicsEngine.getPhysicsBody(params.substrate);
    const nucleophileBody = physicsEngine.getPhysicsBody(params.nucleophile);

    if (!substrateBody || !nucleophileBody) {
      console.error('Physics bodies not found for collision setup');
      return;
    }

    log(`Setting up collision: ${params.substrate.name} + ${params.nucleophile.name}`);

    // Get current positions and maintain relative positioning
    const substratePos = new THREE.Vector3().copy(params.substrate.group.position);
    const nucleophilePos = new THREE.Vector3().copy(params.nucleophile.group.position);

    // Calculate separation distance
    const separation = 15; // units apart

    // Keep substrate roughly in place, position nucleophile for collision
    substrateBody.position.copy(substratePos as any);

    // Calculate approach vector based on angle and impact parameter
    const angle = (params.approachAngle * Math.PI) / 180;
    const offset = params.impactParameter;

    // Position nucleophile relative to substrate for proper collision
    const approachVector = new THREE.Vector3(
      substratePos.x + Math.cos(angle) * separation,
      substratePos.y + offset,
      substratePos.z + Math.sin(angle) * separation
    );

    nucleophileBody.position.copy(approachVector as any);

    // Set velocity toward substrate
    const velocity = approachVector.normalize().multiplyScalar(-params.relativeVelocity);
    nucleophileBody.velocity.set(velocity.x, velocity.y, velocity.z);

    // Add thermal motion for realism
    this.addThermalMotion(substrateBody, params.temperature);
    this.addThermalMotion(nucleophileBody, params.temperature);

    // Visualize trajectory
    this.visualizeTrajectory(
      new THREE.Vector3().copy(nucleophileBody.position as any),
      new THREE.Vector3().copy(substrateBody.position as any)
    );

    log(
      `Collision setup complete: approach angle ${params.approachAngle}°, velocity ${params.relativeVelocity} m/s`
    );
  }

  /**
   * Add thermal motion to physics body
   */
  private addThermalMotion(body: CANNON.Body, temperature: number): void {
    const k_B = 1.38e-23; // Boltzmann constant
    const thermalEnergy = Math.sqrt((k_B * temperature) / body.mass);

    // Random thermal velocity components (scaled for molecular simulation)
    const scale = 1e-12; // Scale factor for molecular simulation
    body.velocity.x += (Math.random() - 0.5) * thermalEnergy * scale;
    body.velocity.y += (Math.random() - 0.5) * thermalEnergy * scale;
    body.velocity.z += (Math.random() - 0.5) * thermalEnergy * scale;
  }

  /**
   * Visualize collision trajectory - DISABLED to prevent visual artifacts
   */
  visualizeTrajectory(start: THREE.Vector3, end: THREE.Vector3): void {
    // Trajectory visualization disabled to prevent weird green lines
    log('🚫 Trajectory visualization disabled to prevent visual artifacts');
    return;

    // Arrow disabled to prevent visual artifacts
  }

  /**
   * Add directional arrow to trajectory
   */
  private addTrajectoryArrow(start: THREE.Vector3, end: THREE.Vector3): void {
    const _direction = new THREE.Vector3().subVectors(end, start).normalize();
    const arrowLength = 2;
    const arrowGeometry = new THREE.ConeGeometry(0.2, arrowLength, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

    // Position arrow at start point
    arrow.position.copy(start);

    // Orient arrow toward end point
    arrow.lookAt(end);
    arrow.rotateX(Math.PI / 2); // Adjust for cone orientation

    this.scene.add(arrow);

    // Store reference for cleanup
    (this.trajectoryLine as any).arrow = arrow;
  }

  /**
   * Predict collision point based on current velocities
   */
  predictCollisionPoint(): THREE.Vector3 | null {
    if (!this.currentSetup) return null;

    const substrateBody = physicsEngine.getPhysicsBody(this.currentSetup.substrate);
    const nucleophileBody = physicsEngine.getPhysicsBody(this.currentSetup.nucleophile);

    if (!substrateBody || !nucleophileBody) return null;

    // Simple linear prediction (ignoring acceleration)
    const substratePos = new THREE.Vector3().copy(substrateBody.position as any);
    const nucleophilePos = new THREE.Vector3().copy(nucleophileBody.position as any);
    const substrateVel = new THREE.Vector3().copy(substrateBody.velocity as any);
    const nucleophileVel = new THREE.Vector3().copy(nucleophileBody.velocity as any);

    // Relative position and velocity
    const relativePos = new THREE.Vector3().subVectors(nucleophilePos, substratePos);
    const relativeVel = new THREE.Vector3().subVectors(nucleophileVel, substrateVel);

    // Time to collision (if approaching)
    const relativeSpeed = relativeVel.length();
    if (relativeSpeed === 0) return null;

    const timeToCollision = -relativePos.dot(relativeVel) / (relativeSpeed * relativeSpeed);

    if (timeToCollision < 0) return null; // Moving apart

    // Predicted collision point
    const collisionPoint = new THREE.Vector3()
      .copy(substratePos)
      .add(substrateVel.clone().multiplyScalar(timeToCollision));

    return collisionPoint;
  }

  /**
   * Get current collision setup
   */
  getCurrentSetup(): CollisionSetup | undefined {
    return this.currentSetup;
  }

  /**
   * Update trajectory visualization in real-time
   */
  updateTrajectoryVisualization(): void {
    if (!this.currentSetup) return;

    const substrateBody = physicsEngine.getPhysicsBody(this.currentSetup.substrate);
    const nucleophileBody = physicsEngine.getPhysicsBody(this.currentSetup.nucleophile);

    if (!substrateBody || !nucleophileBody) return;

    const substratePos = new THREE.Vector3().copy(substrateBody.position as any);
    const nucleophilePos = new THREE.Vector3().copy(nucleophileBody.position as any);

    // Update trajectory line
    if (this.trajectoryLine) {
      const geometry = this.trajectoryLine.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position.array as Float32Array;

      positions[0] = nucleophilePos.x;
      positions[1] = nucleophilePos.y;
      positions[2] = nucleophilePos.z;
      positions[3] = substratePos.x;
      positions[4] = substratePos.y;
      positions[5] = substratePos.z;

      geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Reset collision setup
   */
  reset(): void {
    this.currentSetup = undefined;
    this.clearTrajectoryVisualization();
    log('Collision trajectory controller reset');
  }

  /**
   * Clear trajectory visualization
   */
  clearTrajectoryVisualization(): void {
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);

      // Remove arrow if it exists
      if ((this.trajectoryLine as any).arrow) {
        this.scene.remove((this.trajectoryLine as any).arrow);
      }

      this.trajectoryLine = undefined;
    }
  }

  /**
   * Get collision statistics
   */
  getCollisionStats(): {
    distance: number;
    relativeVelocity: number;
    timeToCollision: number | null;
  } {
    if (!this.currentSetup) {
      return { distance: 0, relativeVelocity: 0, timeToCollision: null };
    }

    const substrateBody = physicsEngine.getPhysicsBody(this.currentSetup.substrate);
    const nucleophileBody = physicsEngine.getPhysicsBody(this.currentSetup.nucleophile);

    if (!substrateBody || !nucleophileBody) {
      return { distance: 0, relativeVelocity: 0, timeToCollision: null };
    }

    const substratePos = new THREE.Vector3().copy(substrateBody.position as any);
    const nucleophilePos = new THREE.Vector3().copy(nucleophileBody.position as any);
    const substrateVel = new THREE.Vector3().copy(substrateBody.velocity as any);
    const nucleophileVel = new THREE.Vector3().copy(nucleophileBody.velocity as any);

    const distance = substratePos.distanceTo(nucleophilePos);
    const relativeVel = new THREE.Vector3().subVectors(nucleophileVel, substrateVel);
    const relativeVelocity = relativeVel.length();

    // Calculate time to collision
    const relativePos = new THREE.Vector3().subVectors(nucleophilePos, substratePos);
    const timeToCollision =
      relativeVelocity > 0
        ? -relativePos.dot(relativeVel) / (relativeVelocity * relativeVelocity)
        : null;

    return {
      distance,
      relativeVelocity,
      timeToCollision: timeToCollision && timeToCollision > 0 ? timeToCollision : null,
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clearTrajectoryVisualization();
    this.currentSetup = undefined;
    log('CollisionTrajectoryController disposed');
  }
}

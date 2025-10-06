import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { MolecularProperties } from '../chemistry/molecularPropertiesCalculator';
import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';
import { collisionEventSystem, createCollisionEvent } from './collisionEventSystem';

export interface PhysicsBodyData {
  body: CANNON.Body;
  molecule: MoleculeGroup;
  lastSync: number;
}

export interface PhysicsStats {
  bodyCount: number;
  contactCount: number;
  broadphaseType: string;
  solverIterations: number;
  worldTime: number;
}

export class CannonPhysicsEngine {
  private world: CANNON.World;
  private moleculeBodies: Map<string, PhysicsBodyData> = new Map(); // Use molecule ID as key
  private contactMaterial: CANNON.ContactMaterial;
  private defaultMaterial: CANNON.Material;
  private isPaused = false;
  private timeScale = 1.0;
  // Queue for collision events so we don't emit during Cannon internal step
  private pendingCollisionPairs: Array<{ a: MoleculeGroup; b: MoleculeGroup }> = [];

  constructor() {
    log('Initializing Cannon.js Physics Engine...');

    // Initialize Cannon.js world
    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, 0); // No gravity for molecular simulation
    const solver = new CANNON.GSSolver();
    solver.iterations = 7; // fewer iterations for speed
    solver.tolerance = 0.003; // looser tolerance for speed
    this.world.solver = solver;
    this.world.allowSleep = true; // enable body sleeping

    // Use SAP broadphase for better performance with many objects
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    // Create default material for molecular collisions
    this.defaultMaterial = new CANNON.Material('molecule');
    this.contactMaterial = new CANNON.ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
      friction: 0.05,
      restitution: 0.6,
      contactEquationStiffness: 5e6,
      contactEquationRelaxation: 4,
    });
    this.world.addContactMaterial(this.contactMaterial);

    // Setup collision event listeners
    this.setupCollisionEvents();

    log('Cannon.js Physics Engine initialized successfully');
  }

  /**
   * Add a molecule to the physics world
   */
  addMolecule(molecule: MoleculeGroup, molecularProperties: MolecularProperties): boolean {
    try {
      // Create physics shape from molecular properties
      const shape = this.createMoleculeShape(molecule, molecularProperties);
      if (!shape) {
        log(`Failed to create physics shape for ${molecule.name}`);
        return false;
      }

      // Create physics body with realistic mass
      const mass = Math.max(molecularProperties.totalMass, 1.0); // Minimum mass of 1
      const body = new CANNON.Body({
        mass: mass,
        shape: shape,
        material: this.defaultMaterial,
        type: CANNON.Body.DYNAMIC,
      });

      // Set initial position and rotation
      body.position.set(
        molecule.group.position.x,
        molecule.group.position.y,
        molecule.group.position.z
      );
      body.quaternion.set(
        molecule.group.quaternion.x,
        molecule.group.quaternion.y,
        molecule.group.quaternion.z,
        molecule.group.quaternion.w
      );

      // Set initial velocity
      body.velocity.set(molecule.velocity.x, molecule.velocity.y, molecule.velocity.z);

      // Set angular velocity if rotation controller exists
      if ((molecule as any).rotationController) {
        const rotState = (molecule as any).rotationController.getRotationState();
        body.angularVelocity.set(
          rotState.angularVelocity.x,
          rotState.angularVelocity.y,
          rotState.angularVelocity.z
        );
      }

      // Add damping for stability
      body.linearDamping = 0.03;
      body.angularDamping = 0.03;
      body.sleepSpeedLimit = 0.05; // below this speed, can sleep
      body.sleepTimeLimit = 0.5; // after this time, will sleep

      // Add to world
      this.world.addBody(body);

      // Store mapping using molecule ID
      this.moleculeBodies.set(molecule.id, {
        body,
        molecule,
        lastSync: performance.now(),
      });
      
      log(`Added ${molecule.name} to physics world with mass ${mass.toFixed(2)}`);
      
      return true;
    } catch (error) {
      log(`Physics engine error for ${molecule.name}: ${error}`);
      return false;
    }
  }

  /**
   * Remove a molecule from the physics world
   */
  removeMolecule(molecule: MoleculeGroup): void {
    const bodyData = this.moleculeBodies.get(molecule.id);
    if (bodyData) {
      this.world.removeBody(bodyData.body);
      this.moleculeBodies.delete(molecule.id);
      log(`Removed ${molecule.name} from physics world`);
    }
  }

  /**
   * Step the physics simulation
   */
  private accumulator = 0;
  private readonly fixedTimeStep = 1 / 60; // 60 Hz fixed timestep
  private readonly maxSubSteps = 2; // limit substeps per frame

  step(deltaTime: number): void {
    // Don't step if paused
    if (this.isPaused) {
      return;
    }

    // Apply time scale
    const scaledDeltaTime = deltaTime * this.timeScale;

    // Accumulate time and step with fixed timestep for stability and performance
    this.accumulator += Math.min(scaledDeltaTime, 0.1); // avoid spiral of death
    let substeps = 0;
    while (this.accumulator >= this.fixedTimeStep && substeps < this.maxSubSteps) {
      this.world.step(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
      substeps++;
    }

    // Sync Three.js objects with physics bodies
    for (const [, bodyData] of this.moleculeBodies.entries()) {
      this.syncMoleculeWithPhysics(bodyData.molecule, bodyData);
    }

    // Emit queued collision events AFTER stepping to avoid removing bodies during
    // Cannon's narrowphase, which can cause bi undefined errors
    if (this.pendingCollisionPairs.length > 0) {
      const pairs = this.pendingCollisionPairs.slice();
      this.pendingCollisionPairs.length = 0;
      for (const { a, b } of pairs) {
        // Skip if either molecule began a reaction since queuing
        if ((a as any).reactionInProgress || (b as any).reactionInProgress) continue;
        const collisionEvent = createCollisionEvent(a, b);
        collisionEventSystem.emitCollision(collisionEvent);
      }
    }
  }

  /**
   * Create physics shape from molecule
   */
  private createMoleculeShape(
    molecule: MoleculeGroup,
    properties: MolecularProperties
  ): CANNON.Shape | null {
    if (!molecule.molObject || !molecule.molObject.atoms) {
      return null;
    }

    // For molecular simulation, use sphere shapes for performance and stability
    // Convex hulls can be unstable with small, fast-moving objects
    const radius = Math.max(properties.boundingRadius, 0.5); // Minimum radius
    return new CANNON.Sphere(radius);

    // Alternative: Use Box shape for more accurate collisions
    // const halfExtents = properties.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    // return new CANNON.Box(new CANNON.Vec3(halfExtents.x, halfExtents.y, halfExtents.z));
  }

  /**
   * Synchronize Three.js molecule with physics body
   */
  private syncMoleculeWithPhysics(molecule: MoleculeGroup, bodyData: PhysicsBodyData): void {
    const { body } = bodyData;

    // Update Three.js position and rotation from physics
    molecule.group.position.copy(body.position as any);
    molecule.group.quaternion.copy(body.quaternion as any);

    // Update molecule velocity for compatibility with existing systems
    molecule.velocity.copy(body.velocity as any);

    // Update rotation controller if present
    if ((molecule as any).rotationController) {
      const rotController = (molecule as any).rotationController;
      const rotState = rotController.getRotationState();

      // Apply physics angular velocity to rotation controller
      rotState.angularVelocity.copy(body.angularVelocity as any);

      // Update quaternion from physics
      rotState.quaternion.copy(body.quaternion as any);
    }

    bodyData.lastSync = performance.now();
  }

  /**
   * Setup collision event listeners for reaction system integration
   */
  private setupCollisionEvents(): void {
    this.world.addEventListener('beginContact', (event: any) => {
      const { bodyA, bodyB } = event;

      // Find corresponding molecules
      let molA: MoleculeGroup | undefined;
      let molB: MoleculeGroup | undefined;

      for (const [, bodyData] of this.moleculeBodies.entries()) {
        if (bodyData.body === bodyA) molA = bodyData.molecule;
        if (bodyData.body === bodyB) molB = bodyData.molecule;
      }

      if (molA && molB) {
        // Guard against reactions already in progress
        if ((molA as any).reactionInProgress || (molB as any).reactionInProgress) return;
        // Queue the pair for emission after step completes
        this.pendingCollisionPairs.push({ a: molA, b: molB });
        log(`Physics collision detected between ${molA.name} and ${molB.name}`);
      }
    });

    this.world.addEventListener('endContact', (_event: any) => {
      // Handle collision end events if needed for reactions
    });
  }

  /**
   * Apply force to a molecule
   */
  applyForce(molecule: MoleculeGroup, force: THREE.Vector3, worldPoint?: THREE.Vector3): void {
    const bodyData = this.moleculeBodies.get(molecule.id);
    if (bodyData) {
      const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);
      if (worldPoint) {
        const cannonPoint = new CANNON.Vec3(worldPoint.x, worldPoint.y, worldPoint.z);
        bodyData.body.applyForce(cannonForce, cannonPoint);
      } else {
        bodyData.body.applyForce(cannonForce);
      }
    }
  }

  /**
   * Apply impulse to a molecule
   */
  applyImpulse(molecule: MoleculeGroup, impulse: THREE.Vector3, worldPoint?: THREE.Vector3): void {
    const bodyData = this.moleculeBodies.get(molecule.id);
    if (bodyData) {
      const cannonImpulse = new CANNON.Vec3(impulse.x, impulse.y, impulse.z);
      if (worldPoint) {
        const cannonPoint = new CANNON.Vec3(worldPoint.x, worldPoint.y, worldPoint.z);
        bodyData.body.applyImpulse(cannonImpulse, cannonPoint);
      } else {
        bodyData.body.applyImpulse(cannonImpulse);
      }
    }
  }


  /**
   * Get physics world for advanced operations
   */
  getWorld(): CANNON.World {
    return this.world;
  }

  /**
   * Get physics body for a molecule
   */
  getPhysicsBody(molecule: MoleculeGroup): CANNON.Body | null {
    const bodyData = this.moleculeBodies.get(molecule.id);
    return bodyData?.body || null;
  }

  /**
   * Get physics engine statistics
   */
  getStats(): PhysicsStats {
    return {
      bodyCount: this.moleculeBodies.size,
      contactCount: this.world.contacts.length,
      broadphaseType: this.world.broadphase.constructor.name,
      solverIterations: (this.world.solver as CANNON.GSSolver).iterations,
      worldTime: this.world.time,
    };
  }

  /**
   * Update physics parameters for tuning
   */
  updatePhysicsParameters(params: {
    gravity?: THREE.Vector3;
    iterations?: number;
    tolerance?: number;
    restitution?: number;
    friction?: number;
  }): void {
    if (params.gravity) {
      this.world.gravity.set(params.gravity.x, params.gravity.y, params.gravity.z);
    }
    if (params.iterations) {
      (this.world.solver as CANNON.GSSolver).iterations = params.iterations;
    }
    if (params.tolerance) {
      (this.world.solver as CANNON.GSSolver).tolerance = params.tolerance;
    }
    if (params.restitution !== undefined || params.friction !== undefined) {
      // Update contact material
      this.contactMaterial.restitution = params.restitution ?? this.contactMaterial.restitution;
      this.contactMaterial.friction = params.friction ?? this.contactMaterial.friction;
    }
  }

  /**
   * Pause the physics simulation
   */
  pause(): void {
    this.isPaused = true;
    log('Physics simulation paused');
  }

  /**
   * Resume the physics simulation
   */
  resume(): void {
    this.isPaused = false;
    log('Physics simulation resumed');
  }

  /**
   * Set the time scale for the simulation
   */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale); // Ensure non-negative
    log(`Physics time scale set to: ${this.timeScale}`);
  }

  /**
   * Get the current time scale
   */
  getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Check if the simulation is paused
   */
  isSimulationPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Set velocity for a molecule (unified state management)
   */
  setVelocity(molecule: MoleculeGroup, velocity: THREE.Vector3): void {
    const body = this.getPhysicsBody(molecule);
    if (body) {
      body.velocity.set(velocity.x, velocity.y, velocity.z);
      log(`✅ Set velocity for ${molecule.name}: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)})`);
    } else {
      log(`⚠️ No physics body found for ${molecule.name}`);
    }
  }

  /**
   * Get velocity for a molecule (unified state management)
   */
  getVelocity(molecule: MoleculeGroup): THREE.Vector3 | null {
    const body = this.getPhysicsBody(molecule);
    if (body) {
      return new THREE.Vector3(body.velocity.x, body.velocity.y, body.velocity.z);
    }
    return null;
  }

  /**
   * Set position for a molecule (unified state management)
   */
  setPosition(molecule: MoleculeGroup, position: THREE.Vector3): void {
    const body = this.getPhysicsBody(molecule);
    if (body) {
      body.position.set(position.x, position.y, position.z);
      log(`✅ Set position for ${molecule.name}: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    } else {
      log(`⚠️ No physics body found for ${molecule.name}`);
    }
  }

  /**
   * Get position for a molecule (unified state management)
   */
  getPosition(molecule: MoleculeGroup): THREE.Vector3 | null {
    const body = this.getPhysicsBody(molecule);
    if (body) {
      return new THREE.Vector3(body.position.x, body.position.y, body.position.z);
    }
    return null;
  }

  /**
   * Set orientation for a molecule (unified state management)
   */
  setOrientation(molecule: MoleculeGroup, quaternion: THREE.Quaternion): void {
    const body = this.getPhysicsBody(molecule);
    if (body) {
      body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
      log(`✅ Set orientation for ${molecule.name}`);
    } else {
      log(`⚠️ No physics body found for ${molecule.name}`);
    }
  }

  /**
   * Get orientation for a molecule (unified state management)
   */
  getOrientation(molecule: MoleculeGroup): THREE.Quaternion | null {
    const body = this.getPhysicsBody(molecule);
    if (body) {
      return new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    }
    return null;
  }

  /**
   * Clear all physics bodies without disposing the engine
   */
  clearAllBodies(): void {
    // Remove all bodies
    for (const [, bodyData] of this.moleculeBodies.entries()) {
      this.world.removeBody(bodyData.body);
    }
    this.moleculeBodies.clear();

    // Clear world contacts
    this.world.contacts.length = 0;
  }

  /**
   * Clean up physics world
   */
  dispose(): void {
    log('Disposing Cannon.js Physics Engine...');

    // Remove all bodies
    for (const [, bodyData] of this.moleculeBodies.entries()) {
      this.world.removeBody(bodyData.body);
    }
    this.moleculeBodies.clear();

    // Clear world
    this.world.contacts.length = 0;

    log('Cannon.js Physics Engine disposed');
  }
}

// Global physics engine instance
export const physicsEngine = new CannonPhysicsEngine();

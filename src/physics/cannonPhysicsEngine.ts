import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { MolecularProperties } from '../chemistry/molecularPropertiesCalculator';
import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';
import { collisionEventSystem, createCollisionEvent } from './collisionEventSystem';

// Extend Cannon.js Body type to include userData
interface CannonBodyWithUserData extends CANNON.Body {
  userData?: {
    molecule?: MoleculeGroup;
    moleculeId?: string;
    lastSync?: number;
  };
}

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
    this.world.allowSleep = true; // enable body sleeping (but individual bodies can disable it)

    // Use SAP broadphase for better performance with many objects
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    // Create default material for molecular collisions
    // SCIENTIFIC CORRECTION:
    // - Molecular collisions are ELASTIC (restitution = 1.0) unless reacting
    // - No friction between molecules (friction = 0.0)
    // - Energy is conserved in non-reactive collisions
    this.defaultMaterial = new CANNON.Material('molecule');
    this.contactMaterial = new CANNON.ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
      friction: 0.0, // No friction - molecules don't rub against each other
      restitution: 1.0, // Perfectly elastic - energy conserved in non-reactive collisions
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
      log(`Physics body for ${molecule.name} created at position (${body.position.x.toFixed(2)}, ${body.position.y.toFixed(2)}, ${body.position.z.toFixed(2)})`);
      body.quaternion.set(
        molecule.group.quaternion.x,
        molecule.group.quaternion.y,
        molecule.group.quaternion.z,
        molecule.group.quaternion.w
      );

      // Set initial velocity
      body.velocity.set(molecule.velocity.x, molecule.velocity.y, molecule.velocity.z);

      // Set random angular velocity for realistic molecular rotation
      // Angular velocity is proportional to linear velocity for realistic motion
      const linearSpeed = Math.sqrt(
        molecule.velocity.x * molecule.velocity.x +
        molecule.velocity.y * molecule.velocity.y +
        molecule.velocity.z * molecule.velocity.z
      );
      // Angular velocity in rad/s - molecules rotate as they move
      // Scale: ~0.5-2.0 rad/s for typical molecular speeds
      const angularSpeed = linearSpeed > 0 ? (0.5 + Math.random() * 1.5) * (linearSpeed / 10.0) : 0;
      const angularDirection = new CANNON.Vec3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).unit();
      body.angularVelocity.set(
        angularDirection.x * angularSpeed,
        angularDirection.y * angularSpeed,
        angularDirection.z * angularSpeed
      );

      // NO DAMPING - Newton's laws: objects in motion stay in motion
      // In a vacuum (molecular simulation), there's no air resistance or friction
      body.linearDamping = 0.0; // No linear damping
      body.angularDamping = 0.0; // No angular damping
      body.sleepSpeedLimit = 0.0001; // Very low threshold - bodies stay awake longer
      body.sleepTimeLimit = 10.0; // Long time before sleeping

      // Ensure body starts awake
      body.wakeUp();

      // Store molecule reference directly on physics body for direct sync
      (body as CannonBodyWithUserData).userData = {
        molecule: molecule,
        moleculeId: molecule.id,
        lastSync: performance.now()
      };

      // Add to world
      this.world.addBody(body);

      // Store mapping using molecule ID (for backward compatibility)
      this.moleculeBodies.set(molecule.id, {
        body,
        molecule,
        lastSync: performance.now(),
      });
      
      // Store body reference directly on molecule for faster access
      molecule.physicsBody = body;
      molecule.hasPhysics = true;
      
      log(`Added ${molecule.name} to physics world with mass ${mass.toFixed(2)}`);
      log(`Physics world now has ${this.world.bodies.length} bodies`);
      log(`MoleculeBodies map has ${this.moleculeBodies.size} entries`);
      
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
    // Use physicsBody directly from molecule if available, otherwise fall back to map lookup
    const body = molecule.physicsBody || this.moleculeBodies.get(molecule.id)?.body;
    
    if (body) {
      const bodyWithData = body as CannonBodyWithUserData;
      // Clear userData reference (physics and visual stored together!)
      if (bodyWithData.userData) {
        bodyWithData.userData.molecule = undefined;
        bodyWithData.userData.moleculeId = undefined;
      }
      
      this.world.removeBody(body);
      this.moleculeBodies.delete(molecule.id);
      
      // Clear the physicsBody reference
      molecule.physicsBody = undefined;
      molecule.hasPhysics = false;
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
    // Iterate directly through physics world bodies for better sync
    // Note: We sync every frame for smooth visuals, but logging is throttled
    let awakeCount = 0;
    let movingCount = 0;
    let totalVelMag = 0;
    
    for (const body of this.world.bodies) {
      const bodyWithData = body as CannonBodyWithUserData;
      // Skip if not a molecule body (no userData)
      if (!bodyWithData.userData || !bodyWithData.userData.molecule) {
        continue;
      }
      
      const molecule = bodyWithData.userData.molecule as MoleculeGroup;
      
      // Wake up bodies that have velocity but are sleeping
      // Cannon.js: sleepState 0 = AWAKE, 1 = SLEEPY, 2 = SLEEPING
      const velSq = body.velocity.x * body.velocity.x + 
                    body.velocity.y * body.velocity.y + 
                    body.velocity.z * body.velocity.z;
      const velMag = Math.sqrt(velSq);
      
      if (velSq > 0.0001) {
        movingCount++;
        totalVelMag += velMag;
        
        // CRITICAL: Keep bodies awake if they have velocity
        if (body.sleepState !== 0) {
          body.wakeUp();
        }
        // Force awake settings every frame for moving bodies
        body.sleepSpeedLimit = 0.0001;
        body.sleepTimeLimit = 10.0;
        body.allowSleep = false; // Disable sleep for moving bodies
        
        // NO DAMPING - Newton's laws: objects in motion stay in motion
        // Ensure damping stays at 0 every frame for moving bodies
        body.linearDamping = 0.0;
        body.angularDamping = 0.0;
      }
      
      if (body.sleepState === 0) {
        awakeCount++;
    }
      
      // Direct sync: physics body → visual group (stored together!)
      this.syncBodyToVisual(body, molecule);
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
    const radius = Math.max(properties.boundingRadius, 0.5);
    return new CANNON.Sphere(radius);
  }

  private createConvexHullVertices(molecule: MoleculeGroup): CANNON.Vec3[] | null {
    if (!molecule.molObject || !molecule.molObject.atoms) {
      return null;
    }

    // Get all atom positions in world space
    const points: CANNON.Vec3[] = [];
    for (const atom of molecule.molObject.atoms) {
      const localPos = new CANNON.Vec3(
        parseFloat(atom.position.x),
        parseFloat(atom.position.y),
        parseFloat(atom.position.z)
      );
      points.push(localPos);
    }

    if (points.length < 4) {
      return null; // Need at least 4 points for a 3D convex hull
    }

    // Simple convex hull algorithm for Cannon.js
    return this.computeConvexHull(points);
  }

  private computeConvexHull(points: CANNON.Vec3[]): CANNON.Vec3[] {
    if (points.length < 4) return points;

    const hull: CANNON.Vec3[] = [];

    // Find the point with lowest z coordinate
    let startPoint = points[0];
    for (const point of points) {
      if (point.z < startPoint.z || 
          (point.z === startPoint.z && point.y < startPoint.y) ||
          (point.z === startPoint.z && point.y === startPoint.y && point.x < startPoint.x)) {
        startPoint = point;
      }
    }

    let currentPoint = startPoint;
    hull.push(currentPoint);

    // Find next point by looking for the one that makes the smallest angle
    do {
      let nextPoint = points[0] === currentPoint ? points[1] : points[0];

      for (const point of points) {
        if (point === currentPoint) continue;

        // Check if this point is "more to the right" than nextPoint
        const cross = this.getCrossProduct(currentPoint, nextPoint, point);
        if (cross > 0 || 
            (cross === 0 && currentPoint.distanceTo(point) > currentPoint.distanceTo(nextPoint))) {
          nextPoint = point;
        }
      }

      if (nextPoint === startPoint) break; // Back to start

      hull.push(nextPoint);
      currentPoint = nextPoint;
    } while (currentPoint !== startPoint && hull.length < points.length); // Safety check

    return hull;
  }

  private getCrossProduct(a: CANNON.Vec3, b: CANNON.Vec3, c: CANNON.Vec3): number {
    const ab = b.clone().vsub(a);
    const ac = c.clone().vsub(a);
    
    // Cross product in 2D (looking down the z-axis)
    return ab.x * ac.y - ab.y * ac.x;
  }

  /**
   * Synchronize physics body directly to visual group
   * Both are stored together on body.userData for perfect sync
   */
  private syncBodyToVisual(body: CANNON.Body, molecule: MoleculeGroup): void {
    const bodyWithData = body as CannonBodyWithUserData;

    // Update Three.js position and rotation directly from physics body
    molecule.group.position.set(body.position.x, body.position.y, body.position.z);
    molecule.group.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);

    // Update molecule velocity for compatibility with existing systems
    molecule.velocity.set(body.velocity.x, body.velocity.y, body.velocity.z);

    // Update matrix to ensure Three.js renders the new position
    molecule.group.updateMatrixWorld(true);

    // Update lastSync timestamp
    if (bodyWithData.userData) {
      bodyWithData.userData.lastSync = performance.now();
    }
  }
  
  /**
   * Synchronize Three.js molecule with physics body (backward compatibility)
   */
  private syncMoleculeWithPhysics(molecule: MoleculeGroup, bodyData: PhysicsBodyData): void {
    this.syncBodyToVisual(bodyData.body, molecule);
  }

  /**
   * Setup collision event listeners for reaction system integration
   */
  private setupCollisionEvents(): void {
    this.world.addEventListener('beginContact', (event: any) => {
      const { bodyA, bodyB } = event;

      // Get molecules directly from body userData (stored together!)
      const bodyAWithData = bodyA as CannonBodyWithUserData;
      const bodyBWithData = bodyB as CannonBodyWithUserData;
      const molA = bodyAWithData.userData?.molecule as MoleculeGroup | undefined;
      const molB = bodyBWithData.userData?.molecule as MoleculeGroup | undefined;

      if (molA && molB) {
        // Guard against reactions already in progress
        if ((molA as any).reactionInProgress || (molB as any).reactionInProgress) return;
        // Queue the pair for emission after step completes
        this.pendingCollisionPairs.push({ a: molA, b: molB });
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
   * Ensures Cannon.js body is awake and moving
   */
  setVelocity(molecule: MoleculeGroup, velocity: THREE.Vector3): void {
    const body = this.getPhysicsBody(molecule);
    if (body) {
      // Set velocity directly on Cannon.js body
      body.velocity.set(velocity.x, velocity.y, velocity.z);
      
      // Set realistic angular velocity for molecular rotation
      // Angular velocity is proportional to linear velocity
      const linearSpeed = Math.sqrt(
        velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z
      );
      // Angular velocity in rad/s - molecules rotate as they move
      // Scale: ~0.5-2.0 rad/s for typical molecular speeds
      const angularSpeed = linearSpeed > 0 ? (0.5 + Math.random() * 1.5) * (linearSpeed / 10.0) : 0;
      const angularDirection = new CANNON.Vec3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).unit();
      body.angularVelocity.set(
        angularDirection.x * angularSpeed,
        angularDirection.y * angularSpeed,
        angularDirection.z * angularSpeed
      );
      
      // NO DAMPING - Newton's laws: objects in motion stay in motion
      body.linearDamping = 0.0;
      body.angularDamping = 0.0;
      
      // Wake up the body so Cannon.js processes its movement
      body.wakeUp();
      
      // Prevent body from sleeping immediately
      body.sleepSpeedLimit = 0.001;
      body.sleepTimeLimit = 2.0;
      
      // Update the molecule's velocity property for consistency
      molecule.velocity.copy(velocity);
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
      // Reduced logging frequency - only log occasionally
      if (Math.random() < 0.01) { // Log ~1% of the time
      log(`✅ Set position for ${molecule.name}: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
      }
    } else {
      // Only log errors occasionally
      if (Math.random() < 0.1) { // Log ~10% of errors
      log(`⚠️ No physics body found for ${molecule.name}`);
      }
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

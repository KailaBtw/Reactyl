/**
 * Physics Worker
 * Handles Cannon.js physics simulation in a web worker
 * Runs physics stepping and collision detection off the main thread
 */

import * as CANNON from 'cannon-es';
import type {
  PhysicsWorkerMessage,
  PhysicsWorkerResponse,
  SerializableBodyData,
  SerializableCollisionPair,
  SerializableWorldConfig,
} from './types';

// Worker context - no window, use self
declare const self: DedicatedWorkerGlobalScope;

class PhysicsWorker {
  private world: CANNON.World | null = null;
  private bodies: Map<string, CANNON.Body> = new Map();
  private accumulator = 0;
  private fixedTimeStep = 1 / 60; // 60 Hz
  private maxSubSteps = 2;
  private timeScale = 1.0;
  private isPaused = false;

  constructor() {
    this.setupMessageHandler();
  }

  /**
   * Setup message handler for worker
   */
  private setupMessageHandler(): void {
    self.onmessage = (event: MessageEvent<PhysicsWorkerMessage>) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handle incoming messages from main thread
   */
  private async handleMessage(message: PhysicsWorkerMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'init':
          this.initWorld(message.worldConfig);
          this.sendResponse({
            type: 'stepComplete',
            id: message.id,
            timestamp: performance.now(),
          });
          break;

        case 'step':
          if (!this.isPaused && this.world) {
            await this.step(message.deltaTime || 0);
            this.sendResponse({
              type: 'stepComplete',
              id: message.id,
              updatedBodies: this.getUpdatedBodies(),
              collisions: this.getCollisions(),
              timestamp: performance.now(),
            });
          }
          break;

        case 'addBody':
          if (message.bodyData) {
            this.addBody(message.bodyData);
            this.sendResponse({
              type: 'bodyAdded',
              id: message.id,
            });
          }
          break;

        case 'removeBody':
          if (message.id) {
            this.removeBody(message.id);
            this.sendResponse({
              type: 'bodyRemoved',
              id: message.id,
            });
          }
          break;

        case 'updateBody':
          if (message.bodyData) {
            this.updateBody(message.bodyData);
            this.sendResponse({
              type: 'stepComplete',
              id: message.id,
            });
          }
          break;

        case 'setVelocity':
          if (message.id && message.velocity) {
            this.setVelocity(message.id, message.velocity);
            this.sendResponse({
              type: 'stepComplete',
              id: message.id,
            });
          }
          break;

        case 'setPosition':
          if (message.id && message.position) {
            this.setPosition(message.id, message.position);
            this.sendResponse({
              type: 'stepComplete',
              id: message.id,
            });
          }
          break;

        default:
          this.sendError(`Unknown message type: ${(message as any).type}`, message.id);
      }
    } catch (error) {
      this.sendError(error instanceof Error ? error.message : 'Unknown error', message.id);
    }
  }

  /**
   * Initialize physics world
   */
  private initWorld(config?: SerializableWorldConfig): void {
    this.world = new CANNON.World();

    if (config) {
      this.world.gravity.set(config.gravity.x, config.gravity.y, config.gravity.z);
      this.timeScale = config.timeScale;
      this.fixedTimeStep = config.fixedTimeStep;
      this.maxSubSteps = config.maxSubSteps;
    } else {
      // Default config
      this.world.gravity.set(0, 0, 0); // No gravity for molecular simulation
      this.timeScale = 1.0;
      this.fixedTimeStep = 1 / 60;
      this.maxSubSteps = 2;
    }

    // Setup solver
    const solver = new CANNON.GSSolver();
    solver.iterations = 7;
    solver.tolerance = 0.003;
    this.world.solver = solver;
    this.world.allowSleep = true;

    // Use SAP broadphase for better performance
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    // Create default material
    const defaultMaterial = new CANNON.Material('molecule');
    const contactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
      friction: 0.0,
      restitution: 1.0,
      contactEquationStiffness: 5e6,
      contactEquationRelaxation: 4,
    });
    this.world.addContactMaterial(contactMaterial);

    // Setup collision detection
    this.world.addEventListener('beginContact', (event: any) => {
      // Collisions are handled in getCollisions() after stepping
    });
  }

  /**
   * Step physics simulation
   */
  private async step(deltaTime: number): Promise<void> {
    if (!this.world) return;

    const scaledDeltaTime = deltaTime * this.timeScale;
    this.accumulator += Math.min(scaledDeltaTime, 0.1); // Avoid spiral of death

    let substeps = 0;
    while (this.accumulator >= this.fixedTimeStep && substeps < this.maxSubSteps) {
      this.world.step(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
      substeps++;
    }

    // Update body wake/sleep states
    for (const body of this.world.bodies) {
      const velSq =
        body.velocity.x * body.velocity.x +
        body.velocity.y * body.velocity.y +
        body.velocity.z * body.velocity.z;

      if (velSq > 0.0001) {
        if (body.sleepState !== 0) {
          body.wakeUp();
        }
        body.sleepSpeedLimit = 0.0001;
        body.sleepTimeLimit = 10.0;
        body.allowSleep = false;
        body.linearDamping = 0.0;
        body.angularDamping = 0.0;
      }
    }
  }

  /**
   * Add body to physics world
   */
  private addBody(bodyData: SerializableBodyData): void {
    if (!this.world) return;

    // Create sphere shape (simplified - main thread handles complex shapes)
    const radius = bodyData.radius || 1.0;
    const shape = new CANNON.Sphere(radius);

    // Create body
    const body = new CANNON.Body({
      mass: bodyData.mass,
      shape: shape,
      type: CANNON.Body.DYNAMIC,
    });

    // Set position and velocity
    body.position.set(bodyData.position.x, bodyData.position.y, bodyData.position.z);
    body.velocity.set(bodyData.velocity.x, bodyData.velocity.y, bodyData.velocity.z);
    body.quaternion.set(
      bodyData.quaternion.x,
      bodyData.quaternion.y,
      bodyData.quaternion.z,
      bodyData.quaternion.w
    );
    body.angularVelocity.set(
      bodyData.angularVelocity.x,
      bodyData.angularVelocity.y,
      bodyData.angularVelocity.z
    );

    // Store body
    this.bodies.set(bodyData.id, body);
    this.world.addBody(body);
  }

  /**
   * Remove body from physics world
   */
  private removeBody(id: string): void {
    if (!this.world) return;

    const body = this.bodies.get(id);
    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(id);
    }
  }

  /**
   * Update body state
   */
  private updateBody(bodyData: SerializableBodyData): void {
    const body = this.bodies.get(bodyData.id);
    if (!body) {
      // Body doesn't exist, add it
      this.addBody(bodyData);
      return;
    }

    // Update position and velocity
    body.position.set(bodyData.position.x, bodyData.position.y, bodyData.position.z);
    body.velocity.set(bodyData.velocity.x, bodyData.velocity.y, bodyData.velocity.z);
    body.quaternion.set(
      bodyData.quaternion.x,
      bodyData.quaternion.y,
      bodyData.quaternion.z,
      bodyData.quaternion.w
    );
    body.angularVelocity.set(
      bodyData.angularVelocity.x,
      bodyData.angularVelocity.y,
      bodyData.angularVelocity.z
    );
  }

  /**
   * Set body velocity
   */
  private setVelocity(id: string, velocity: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(id);
    if (body) {
      body.velocity.set(velocity.x, velocity.y, velocity.z);
      body.wakeUp();
    }
  }

  /**
   * Set body position
   */
  private setPosition(id: string, position: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(id);
    if (body) {
      body.position.set(position.x, position.y, position.z);
      body.wakeUp();
    }
  }

  /**
   * Get updated body states
   */
  private getUpdatedBodies(): SerializableBodyData[] {
    const updated: SerializableBodyData[] = [];

    for (const [id, body] of this.bodies.entries()) {
      updated.push({
        id,
        position: { x: body.position.x, y: body.position.y, z: body.position.z },
        velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z },
        quaternion: {
          x: body.quaternion.x,
          y: body.quaternion.y,
          z: body.quaternion.z,
          w: body.quaternion.w,
        },
        angularVelocity: {
          x: body.angularVelocity.x,
          y: body.angularVelocity.y,
          z: body.angularVelocity.z,
        },
        mass: body.mass,
        radius: (body.shapes[0] as CANNON.Sphere)?.radius,
        isAwake: body.sleepState === 0,
      });
    }

    return updated;
  }

  /**
   * Get collision pairs from current step
   */
  private getCollisions(): SerializableCollisionPair[] {
    if (!this.world) return [];

    const collisions: SerializableCollisionPair[] = [];
    const contactPairs = new Set<string>();

    // Check all contacts in the world
    for (const contact of this.world.contacts) {
      const bodyA = contact.bi;
      const bodyB = contact.bj;

      // Find body IDs
      let bodyAId: string | null = null;
      let bodyBId: string | null = null;

      for (const [id, body] of this.bodies.entries()) {
        if (body === bodyA) bodyAId = id;
        if (body === bodyB) bodyBId = id;
      }

      if (bodyAId && bodyBId) {
        // Create unique pair key
        const pairKey = bodyAId < bodyBId ? `${bodyAId}-${bodyBId}` : `${bodyBId}-${bodyAId}`;

        if (!contactPairs.has(pairKey)) {
          contactPairs.add(pairKey);

          // Calculate collision point (midpoint of contact)
          const contactPoint = contact.contactPoint;
          const collisionPoint = {
            x: contactPoint.x,
            y: contactPoint.y,
            z: contactPoint.z,
          };

          // Calculate collision normal
          const normal = contact.ni;
          const collisionNormal = {
            x: normal.x,
            y: normal.y,
            z: normal.z,
          };

          // Calculate relative velocity
          const relativeVel = new CANNON.Vec3();
          bodyB.velocity.vsub(bodyA.velocity, relativeVel);
          const relativeVelocity = {
            x: relativeVel.x,
            y: relativeVel.y,
            z: relativeVel.z,
          };

          collisions.push({
            bodyAId,
            bodyBId,
            collisionPoint,
            collisionNormal,
            relativeVelocity,
          });
        }
      }
    }

    return collisions;
  }

  /**
   * Send response to main thread
   */
  private sendResponse(response: PhysicsWorkerResponse): void {
    self.postMessage(response);
  }

  /**
   * Send error response
   */
  private sendError(message: string, id?: string): void {
    self.postMessage({
      type: 'error',
      id,
      error: message,
    });
  }
}

// Initialize worker
new PhysicsWorker();

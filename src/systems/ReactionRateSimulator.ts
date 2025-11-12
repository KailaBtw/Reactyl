import * as THREE from 'three';
import { REACTION_TYPES } from '../chemistry/reactionDatabase';
import { ContainerVisualization } from '../components/ContainerVisualization';
import type { CannonPhysicsEngine } from '../physics/cannonPhysicsEngine';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { type ContainerBounds, MoleculeSpawner } from '../services/MoleculeSpawner';
import type { MoleculeManager } from '../types';
import { log } from '../utils/debug';

/**
 * Manages multi-molecule reaction rate simulations
 * Spawns multiple molecule pairs in a bounded volume and tracks reaction statistics
 */
export class ReactionRateSimulator {
  private scene: THREE.Scene;
  private physicsEngine: CannonPhysicsEngine;
  private moleculeManager: MoleculeManager;
  private moleculeSpawner: MoleculeSpawner;
  private moleculePairs: Array<{
    substrateId: string;
    nucleophileId: string;
    reacted: boolean;
  }> = [];

  private boundarySize = 50; // 50 units cubic volume - much larger for better visualization
  private reactionCount = 0;
  private startTime = 0;
  private collisionCount = 0;

  // Store simulation parameters for dynamic adjustments
  private substrateData: any = null;
  private nucleophileData: any = null;
  private temperature: number = 298;
  private nextPairIndex: number = 0;

  // Container visualization
  private containerVisualization: ContainerVisualization;

  constructor(
    scene: THREE.Scene,
    physicsEngine: CannonPhysicsEngine,
    moleculeManager: MoleculeManager
  ) {
    this.scene = scene;
    this.physicsEngine = physicsEngine;
    this.moleculeManager = moleculeManager;
    this.moleculeSpawner = new MoleculeSpawner(scene, moleculeManager);
    this.containerVisualization = new ContainerVisualization(scene, this.boundarySize);
  }

  /**
   * Initialize simulation with N molecule pairs
   */
  async initializeSimulation(
    substrateData: any,
    nucleophileData: any,
    particleCount: number,
    temperature: number,
    reactionType: string
  ): Promise<void> {
    // Wait a moment to ensure scene/backend is ready (prevents abort errors on reload)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Store simulation parameters for dynamic adjustments
    this.substrateData = substrateData;
    this.nucleophileData = nucleophileData;
    this.temperature = temperature;
    this.nextPairIndex = 0;

    // Clear existing molecules
    this.clear();

    // Set up collision event listener (registerHandler takes just the handler function)
    const collisionHandler = (event: any) => {
      this.handleCollision(event);
    };
    collisionEventSystem.registerHandler(collisionHandler);

    // Store handler reference for cleanup
    (this as any).collisionHandler = collisionHandler;

    // Set reaction type for collision detection
    const reactionTypeObj = REACTION_TYPES[reactionType];
    if (reactionTypeObj) {
      collisionEventSystem.setReactionType(reactionTypeObj);
    } else {
      collisionEventSystem.setReactionType(REACTION_TYPES.sn2);
    }

    // Set temperature for reaction calculations
    // Pressure effects removed - reactions are in solution where pressure has negligible effect
    collisionEventSystem.setTemperature(temperature);

    // Spawn molecule pairs with error handling
    for (let i = 0; i < particleCount; i++) {
      try {
        await this.spawnMoleculePair(substrateData, nucleophileData, i, temperature);
        this.nextPairIndex = i + 1;
      } catch (error: any) {
        // If it's an abort error, wait a bit longer and retry once
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.warn(`Spawn aborted for pair ${i}, waiting and retrying...`);
          await new Promise(resolve => setTimeout(resolve, 200));
          try {
            await this.spawnMoleculePair(substrateData, nucleophileData, i, temperature);
            this.nextPairIndex = i + 1;
          } catch (retryError) {
            console.error(`Failed to spawn molecule pair ${i} after retry:`, retryError);
            // Continue with next pair instead of crashing
          }
        } else {
          console.error(`Failed to spawn molecule pair ${i}:`, error);
          // Continue with next pair instead of crashing
        }
      }
    }

    this.startTime = performance.now();
    console.log(`Spawned ${this.moleculePairs.length} molecule pairs`);

    // Create container visualization
    this.containerVisualization.create();
  }

  /**
   * Spawn a single molecule pair at random position with temperature-based velocities
   * Now uses MoleculeSpawner for consistent spawning logic
   */
  private async spawnMoleculePair(
    substrateData: any,
    nucleophileData: any,
    index: number,
    temperature: number
  ): Promise<void> {
    const substrateId = `substrate_${index}`;
    const nucleophileId = `nucleophile_${index}`;

    try {
      // Define container bounds
      const bounds: ContainerBounds = {
        size: this.boundarySize,
        center: { x: 0, y: 0, z: 0 },
        padding: 0.1,
      };

      // Spawn substrate at random position
      const substrateMolecule = await this.moleculeSpawner.spawnMoleculeInContainer(
        substrateData.cid,
        substrateId,
        bounds,
        {
          applyRandomRotation: true,
          temperature,
          baseSpeed: 3.0, // Match updated baseSpeed
        }
      );

      // Spawn nucleophile near substrate (offset by 1.5 units)
      // Ensure nucleophile stays within bounds
      const substratePos = substrateMolecule.group.position;
      const halfSize = this.boundarySize / 2;
      const margin = 1.0; // Safety margin to keep within bounds
      const offset = 1.5;

      // Calculate nucleophile position, clamping to stay within bounds
      const nucleophilePosition = {
        x: Math.max(-halfSize + margin, Math.min(halfSize - margin, substratePos.x + offset)),
        y: Math.max(-halfSize + margin, Math.min(halfSize - margin, substratePos.y)),
        z: Math.max(-halfSize + margin, Math.min(halfSize - margin, substratePos.z)),
      };

      const nucleophileMolecule = await this.moleculeSpawner.spawnMolecule(
        nucleophileData.cid,
        nucleophileId,
        {
          position: nucleophilePosition,
          applyRandomRotation: true,
          temperature,
          baseSpeed: 3.0, // Match updated baseSpeed
        }
      );

      // Track pair
      this.moleculePairs.push({
        substrateId,
        nucleophileId,
        reacted: false,
      });

      // Spawned successfully (no verbose logging)
    } catch (error) {
      console.error(`Failed to spawn molecule pair ${index}:`, error);
    }
  }

  /**
   * Handle collision events
   */
  private handleCollision(event: any): void {
    this.collisionCount++;

    // Check if this collision resulted in a reaction
    // Event structure: { moleculeA, moleculeB, reactionResult: { occurs, ... } }
    const reactionOccurred = event.reactionResult?.occurs === true;

    if (reactionOccurred) {
      // Get molecule IDs from the event
      const moleculeAId = event.moleculeA?.name || event.moleculeA?.id;
      const moleculeBId = event.moleculeB?.name || event.moleculeB?.id;

      if (moleculeAId && moleculeBId) {
        // Mark the pair as reacted
        const pair = this.moleculePairs.find(
          p =>
            (p.substrateId === moleculeAId && p.nucleophileId === moleculeBId) ||
            (p.substrateId === moleculeBId && p.nucleophileId === moleculeAId)
        );

        if (pair && !pair.reacted) {
          pair.reacted = true;
          this.reactionCount++;
          log(`Reaction tracked: ${moleculeAId} + ${moleculeBId} (Total: ${this.reactionCount})`);
        }
      }
    }
  }

  /**
   * Handle boundary collisions (physics is updated elsewhere)
   */
  update(_deltaTime: number): void {
    // Check and handle boundary collisions for each molecule in pairs
    this.moleculePairs.forEach(pair => {
      this.handleBoundaryCollision(pair.substrateId);
      this.handleBoundaryCollision(pair.nucleophileId);
    });

    // Also check all molecules in the manager that match our naming pattern
    // This catches any molecules that might not be properly tracked in moleculePairs
    const allMolecules = this.moleculeManager.getAllMolecules();
    allMolecules.forEach(molecule => {
      const name = molecule.name;
      // Only check rate simulation molecules (substrate_X or nucleophile_X)
      if (
        (name.startsWith('substrate_') || name.startsWith('nucleophile_')) &&
        !this.moleculePairs.some(p => p.substrateId === name || p.nucleophileId === name)
      ) {
        // This molecule exists but isn't tracked - handle boundary collision anyway
        this.handleBoundaryCollision(name);
      }
    });
  }

  /**
   * Handle wall collisions (elastic bouncing)
   * Checks both visual and physics positions to prevent escape
   */
  private handleBoundaryCollision(moleculeId: string): void {
    const molecule = this.moleculeManager.getMolecule(moleculeId);
    if (!molecule) return;

    const halfSize = this.boundarySize / 2;
    const margin = 0.5; // Small margin to prevent edge cases

    // Get physics body position (source of truth)
    let physicsPos: { x: number; y: number; z: number } | null = null;
    if (molecule.hasPhysics && molecule.physicsBody) {
      const body = molecule.physicsBody as any;
      physicsPos = {
        x: body.position.x,
        y: body.position.y,
        z: body.position.z,
      };
    }

    // Use physics position if available, otherwise visual position
    const position = physicsPos || molecule.group.position;
    const currentVelocity = molecule.velocity.clone();
    let bounced = false;
    const clampedPos = { ...position };

    // Check each axis and clamp if needed
    // SCIENTIFIC CORRECTION: Perfectly elastic collisions (restitution = 1.0)
    // According to collision theory, molecular collisions with container walls are elastic
    // Energy is conserved - no energy loss on bounce
    if (Math.abs(position.x) > halfSize - margin) {
      currentVelocity.x *= -1.0; // Perfectly elastic bounce - energy conserved
      clampedPos.x = Math.sign(position.x) * (halfSize - margin);
      bounced = true;
    }

    if (Math.abs(position.y) > halfSize - margin) {
      currentVelocity.y *= -1.0; // Perfectly elastic bounce - energy conserved
      clampedPos.y = Math.sign(position.y) * (halfSize - margin);
      bounced = true;
    }

    if (Math.abs(position.z) > halfSize - margin) {
      currentVelocity.z *= -1.0; // Perfectly elastic bounce - energy conserved
      clampedPos.z = Math.sign(position.z) * (halfSize - margin);
      bounced = true;
    }

    if (bounced) {
      // Update physics body position and velocity
      if (molecule.hasPhysics && molecule.physicsBody) {
        const body = molecule.physicsBody as any;
        body.position.set(clampedPos.x, clampedPos.y, clampedPos.z);
        body.velocity.set(currentVelocity.x, currentVelocity.y, currentVelocity.z);

        // Preserve angular velocity during wall bounce (rotation continues)
        // Angular velocity may change slightly on bounce, but we keep it realistic
        // If angular velocity is zero, add some rotation
        const currentAngVel = body.angularVelocity;
        const angVelMag = Math.sqrt(
          currentAngVel.x * currentAngVel.x +
            currentAngVel.y * currentAngVel.y +
            currentAngVel.z * currentAngVel.z
        );

        // If no rotation, add some based on bounce direction
        if (angVelMag < 0.01) {
          const linearSpeed = Math.sqrt(
            currentVelocity.x * currentVelocity.x +
              currentVelocity.y * currentVelocity.y +
              currentVelocity.z * currentVelocity.z
          );
          const angularSpeed =
            linearSpeed > 0 ? (0.5 + Math.random() * 1.5) * (linearSpeed / 10.0) : 0.5;
          const angularDirection = new CANNON.Vec3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          ).unit();
          body.angularVelocity.set(
            angularDirection.x * angularSpeed,
            angularDirection.y * angularSpeed,
            angularDirection.z * angularSpeed
          );
        }

        body.wakeUp(); // Ensure body stays active
      }

      // Update visual position
      molecule.group.position.set(clampedPos.x, clampedPos.y, clampedPos.z);
      molecule.velocity.copy(currentVelocity);

      // Also update through physics engine for consistency
      this.physicsEngine.setVelocity(molecule, currentVelocity);
    }
  }

  /**
   * Get current simulation metrics
   *
   * SCIENTIFIC NOTES:
   * - Reaction rate is tracked as "reactions per second" (discrete molecules)
   * - True rate = change in concentration / time (mol dm⁻³ s⁻¹)
   * - For discrete molecules, "reactions per second" is acceptable
   * - As reactants are consumed, rate decreases (matches collision theory)
   */
  getMetrics(): {
    reactionRate: number; // reactions per second (average rate)
    remainingReactants: number; // percentage
    productsFormed: number; // count
    collisionCount: number; // total collisions
    elapsedTime: number; // seconds
  } {
    const elapsedTime = (performance.now() - this.startTime) / 1000; // seconds
    // Average reaction rate: total reactions / elapsed time
    // Note: This is average rate. Instantaneous rate would require tracking concentration changes over time intervals
    const reactionRate = elapsedTime > 0 ? this.reactionCount / elapsedTime : 0;
    const remainingPairs = this.moleculePairs.filter(p => !p.reacted).length;
    const remainingReactants = (remainingPairs / this.moleculePairs.length) * 100;

    return {
      reactionRate, // reactions per second
      remainingReactants, // percentage of unreacted pairs
      productsFormed: this.reactionCount,
      collisionCount: this.collisionCount,
      elapsedTime,
    };
  }

  /**
   * Get container bounds for spawning
   */
  getContainerBounds(): ContainerBounds {
    return {
      size: this.boundarySize,
      center: { x: 0, y: 0, z: 0 },
      padding: 0.1,
    };
  }

  /**
   * Spawn molecules to match a target concentration
   * Useful for adjusting concentration dynamically
   */
  async spawnForConcentration(
    substrateData: any,
    nucleophileData: any,
    substrateConcentration: number,
    nucleophileConcentration: number,
    temperature: number
  ): Promise<void> {
    const bounds = this.getContainerBounds();

    // Spawn substrate molecules
    const substrateMolecules = await this.moleculeSpawner.spawnForConcentration(
      substrateData.cid,
      'substrate',
      substrateConcentration,
      bounds,
      {
        applyRandomRotation: true,
        temperature,
        baseSpeed: 2.0,
      }
    );

    // Spawn nucleophile molecules
    const nucleophileMolecules = await this.moleculeSpawner.spawnForConcentration(
      nucleophileData.cid,
      'nucleophile',
      nucleophileConcentration,
      bounds,
      {
        applyRandomRotation: true,
        temperature,
        baseSpeed: 2.0,
      }
    );

    // Create pairs (match substrates with nucleophiles)
    this.moleculePairs = [];
    const minPairs = Math.min(substrateMolecules.length, nucleophileMolecules.length);
    for (let i = 0; i < minPairs; i++) {
      this.moleculePairs.push({
        substrateId: substrateMolecules[i].name,
        nucleophileId: nucleophileMolecules[i].name,
        reacted: false,
      });
    }

    console.log(
      `Spawned ${substrateMolecules.length} substrates and ${nucleophileMolecules.length} nucleophiles`
    );
    this.startTime = performance.now();
  }

  /**
   * Dispose of a molecule's resources (physics body, scene group, geometries, materials)
   */
  private disposeMolecule(molecule: any): void {
    if (!molecule) return;

    // Remove from physics engine
    if (molecule.hasPhysics && molecule.physicsBody) {
      this.physicsEngine.removeMolecule(molecule);
    }

    // Remove from scene and dispose resources
    if (molecule.group) {
      molecule.group.parent?.remove(molecule.group);
      molecule.group.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: any) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }

  /**
   * Calculate velocity using REAL Maxwell-Boltzmann distribution
   * v_rms = sqrt(3kT/m)
   * This is the same calculation used in MoleculeSpawner
   */
  private calculateMaxwellBoltzmannVelocity(
    temperature: number,
    molecularMassAmu: number,
    baseSpeed?: number
  ): number {
    // Constants (same as MoleculeSpawner)
    const BOLTZMANN_CONSTANT = 1.380649e-23; // J/K
    const AMU_TO_KG = 1.660539e-27; // kg per atomic mass unit

    const massKg = molecularMassAmu * AMU_TO_KG;

    // REAL Maxwell-Boltzmann: v_rms = sqrt(3kT/m)
    const v_rms = Math.sqrt((3 * BOLTZMANN_CONSTANT * temperature) / massKg);

    // Reference values for scaling
    const referenceTemp = 298; // Room temperature
    const referenceVrms = Math.sqrt((3 * BOLTZMANN_CONSTANT * referenceTemp) / massKg);

    // Use baseSpeed as the reference visualization speed at room temperature
    // Then scale proportionally based on the ratio of v_rms values
    // Increased base speed for better visibility (was 3.0 m/s, now 12.0 m/s)
    // This makes temperature differences much more noticeable
    const referenceBaseSpeed = baseSpeed || 12.0; // Default 12 m/s at room temp for better visibility
    const speedRatio = v_rms / referenceVrms; // How much faster/slower than room temp

    // Final speed: scale baseSpeed by the temperature ratio
    // This ensures: higher T → higher v_rms → higher speed (CORRECT!)
    return referenceBaseSpeed * speedRatio;
  }

  /**
   * Update velocities of all molecules based on new temperature
   * Uses REAL Maxwell-Boltzmann distribution: v_rms = sqrt(3kT/m)
   *
   * OPTIMIZED: Instead of recalculating from scratch, scale existing velocities
   * proportionally using the temperature ratio. This is physically accurate and MUCH faster.
   *
   * From Maxwell-Boltzmann: v_rms ∝ sqrt(T)
   * So: v_new = v_old * sqrt(T_new / T_old)
   */
  updateTemperature(newTemperature: number): void {
    const oldTemperature = this.temperature;

    // Skip if temperature hasn't changed significantly
    if (Math.abs(newTemperature - oldTemperature) < 0.1) {
      return;
    }

    this.temperature = newTemperature;

    // Update collision event system temperature
    collisionEventSystem.setTemperature(newTemperature);

    // Calculate velocity scaling factor using REAL Maxwell-Boltzmann physics
    // v_rms = sqrt(3kT/m), so v_new / v_old = sqrt(T_new / T_old)
    const temperatureRatio = newTemperature / oldTemperature;
    const velocityScaleFactor = Math.sqrt(temperatureRatio);

    // Update all molecules by scaling their existing velocities
    // This is MUCH faster than recalculating from scratch and physically accurate
    for (const pair of this.moleculePairs) {
      const substrate = this.moleculeManager.getMolecule(pair.substrateId);
      const nucleophile = this.moleculeManager.getMolecule(pair.nucleophileId);

      if (substrate && substrate.hasPhysics && substrate.physicsBody) {
        // Scale existing velocity directly (preserves direction, scales magnitude)
        const currentVel = substrate.velocity;
        const newVelocity = new THREE.Vector3(
          currentVel.x * velocityScaleFactor,
          currentVel.y * velocityScaleFactor,
          currentVel.z * velocityScaleFactor
        );
        this.physicsEngine.setVelocity(substrate, newVelocity);
      }

      if (nucleophile && nucleophile.hasPhysics && nucleophile.physicsBody) {
        // Scale existing velocity directly (preserves direction, scales magnitude)
        const currentVel = nucleophile.velocity;
        const newVelocity = new THREE.Vector3(
          currentVel.x * velocityScaleFactor,
          currentVel.y * velocityScaleFactor,
          currentVel.z * velocityScaleFactor
        );
        this.physicsEngine.setVelocity(nucleophile, newVelocity);
      }
    }
  }

  /**
   * Adjust concentration by adding or removing molecule pairs dynamically
   * @param targetParticleCount Target number of molecule pairs
   * @param temperature Optional temperature - if not provided, uses current stored temperature
   */
  async adjustConcentration(targetParticleCount: number, temperature?: number): Promise<void> {
    if (!this.substrateData || !this.nucleophileData) {
      return;
    }

    // Use provided temperature or fall back to stored temperature
    const spawnTemperature = temperature !== undefined ? temperature : this.temperature;

    // Update stored temperature if provided
    if (temperature !== undefined) {
      this.temperature = temperature;
      collisionEventSystem.setTemperature(temperature);
    }

    const currentCount = this.moleculePairs.length;
    const difference = targetParticleCount - currentCount;

    if (difference === 0) return;

    if (difference > 0) {
      // Add molecules - batch spawn for efficiency
      const spawnPromises: Promise<void>[] = [];
      for (let i = 0; i < difference; i++) {
        const index = this.nextPairIndex++;
        spawnPromises.push(
          this.spawnMoleculePair(this.substrateData, this.nucleophileData, index, spawnTemperature)
        );
      }
      await Promise.all(spawnPromises);
    } else {
      // Remove molecules - batch removal for efficiency
      const toRemove = Math.abs(difference);

      // Prefer removing non-reacted pairs
      const nonReactedPairs = this.moleculePairs.filter(p => !p.reacted);
      const reactedPairs = this.moleculePairs.filter(p => p.reacted);

      // Select pairs to remove
      const pairsToRemove = [
        ...nonReactedPairs.slice(0, Math.min(toRemove, nonReactedPairs.length)),
        ...reactedPairs.slice(0, Math.max(0, toRemove - nonReactedPairs.length)),
      ];

      // Shuffle for random removal
      for (let i = pairsToRemove.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairsToRemove[i], pairsToRemove[j]] = [pairsToRemove[j], pairsToRemove[i]];
      }

      // Remove pairs efficiently
      const indicesToRemove = new Set<number>();
      for (let i = 0; i < Math.min(toRemove, pairsToRemove.length); i++) {
        const pair = pairsToRemove[i];
        const substrateMolecule = this.moleculeManager.getMolecule(pair.substrateId);
        const nucleophileMolecule = this.moleculeManager.getMolecule(pair.nucleophileId);

        this.disposeMolecule(substrateMolecule);
        this.disposeMolecule(nucleophileMolecule);

        this.moleculeManager.removeMolecule(pair.substrateId);
        this.moleculeManager.removeMolecule(pair.nucleophileId);

        // Find and mark for removal from tracking array
        const index = this.moleculePairs.findIndex(
          p => p.substrateId === pair.substrateId && p.nucleophileId === pair.nucleophileId
        );
        if (index !== -1) {
          indicesToRemove.add(index);
        }
      }

      // Remove from tracking array in reverse order to maintain indices
      Array.from(indicesToRemove)
        .sort((a, b) => b - a)
        .forEach(idx => {
          this.moleculePairs.splice(idx, 1);
        });
    }
  }

  /**
   * Get the molecule spawner instance (for external access)
   */
  getMoleculeSpawner(): MoleculeSpawner {
    return this.moleculeSpawner;
  }

  /**
   * Show container visualization (call when switching to rate mode)
   */
  showContainer(): void {
    this.containerVisualization.create();
  }

  /**
   * Hide container visualization (call when switching away from rate mode)
   */
  hideContainer(): void {
    this.containerVisualization.remove();
  }

  /**
   * Clear all molecules and reset state
   * Uses moleculeManager.clearAllMolecules() - visual cleanup is automatic, physics cleanup is async
   */
  clear(): void {
    // Clear all rate simulation molecules
    // Visual objects are automatically disposed, physics bodies are disposed async
    this.moleculeManager.clearAllMolecules(
      // Dispose physics body callback (called async after visual cleanup)
      molecule => {
        if (molecule.hasPhysics && molecule.physicsBody) {
          this.physicsEngine.removeMolecule(molecule);
        }
      }
    );

    // Reset state
    this.moleculePairs = [];
    this.reactionCount = 0;
    this.collisionCount = 0;
    this.startTime = 0;
    this.nextPairIndex = 0;

    // Unregister collision handler
    if ((this as any).collisionHandler) {
      collisionEventSystem.unregisterHandler((this as any).collisionHandler);
      (this as any).collisionHandler = null;
    }

    // Remove container visualization
    this.containerVisualization.remove();
  }
}

// Export singleton instance (will be initialized by ThreeJSBridge)
export let reactionRateSimulator: ReactionRateSimulator | null = null;

export function initializeReactionRateSimulator(
  scene: THREE.Scene,
  physicsEngine: CannonPhysicsEngine,
  moleculeManager: MoleculeManager
): void {
  reactionRateSimulator = new ReactionRateSimulator(scene, physicsEngine, moleculeManager);
}

import * as THREE from 'three';
import type { CannonPhysicsEngine } from '../physics/cannonPhysicsEngine';
import type { MoleculeManager } from '../types';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { MoleculeSpawner, ContainerBounds } from '../services/MoleculeSpawner';
import { ContainerVisualization } from '../components/ContainerVisualization';
import { REACTION_TYPES } from '../chemistry/reactionDatabase';
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
    console.log(`Initializing rate simulation with ${particleCount} pairs at ${temperature}K`);
    
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
      log(`⚠️ Unknown reaction type: ${reactionType}, using sn2 as default`);
      collisionEventSystem.setReactionType(REACTION_TYPES.sn2);
    }
    
    // Set temperature for reaction calculations
    collisionEventSystem.setTemperature(temperature);
    
    // Spawn molecule pairs
    for (let i = 0; i < particleCount; i++) {
      await this.spawnMoleculePair(substrateData, nucleophileData, i, temperature);
      this.nextPairIndex = i + 1;
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
        padding: 0.1
      };
      
      // Spawn substrate at random position
      const substrateMolecule = await this.moleculeSpawner.spawnMoleculeInContainer(
        substrateData.cid,
        substrateId,
        bounds,
        {
          applyRandomRotation: true,
          temperature,
          baseSpeed: 2.0
        }
      );
      
      // Spawn nucleophile near substrate (offset by 1.5 units)
      const substratePos = substrateMolecule.group.position;
      const nucleophilePosition = {
        x: substratePos.x + 1.5,
        y: substratePos.y,
        z: substratePos.z
      };
      
      const nucleophileMolecule = await this.moleculeSpawner.spawnMolecule(
        nucleophileData.cid,
        nucleophileId,
        {
          position: nucleophilePosition,
          applyRandomRotation: true,
          temperature,
          baseSpeed: 2.0
        }
      );
      
      // Track pair
      this.moleculePairs.push({
        substrateId,
        nucleophileId,
        reacted: false
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
    if (event.reactionResult?.occurs) {
      this.reactionCount++;
      
      // Get molecule IDs from the event
      const moleculeAId = event.moleculeA?.name || event.moleculeA?.id;
      const moleculeBId = event.moleculeB?.name || event.moleculeB?.id;
      
      if (moleculeAId && moleculeBId) {
      // Mark the pair as reacted
      const pair = this.moleculePairs.find(
          p => (p.substrateId === moleculeAId && p.nucleophileId === moleculeBId) ||
               (p.substrateId === moleculeBId && p.nucleophileId === moleculeAId)
      );
      
        if (pair && !pair.reacted) {
        pair.reacted = true;
          log(`✅ Reaction tracked: ${moleculeAId} + ${moleculeBId} (Total: ${this.reactionCount})`);
        }
      }
    }
  }

  /**
   * Handle boundary collisions (physics is updated elsewhere)
   */
  update(_deltaTime: number): void {
    // Check and handle boundary collisions for each molecule
    this.moleculePairs.forEach(pair => {
      this.handleBoundaryCollision(pair.substrateId);
      this.handleBoundaryCollision(pair.nucleophileId);
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
        z: body.position.z
      };
    }
    
    // Use physics position if available, otherwise visual position
    const position = physicsPos || molecule.group.position;
    const currentVelocity = molecule.velocity.clone();
    let bounced = false;
    const clampedPos = { ...position };
    
    // Check each axis and clamp if needed
    if (Math.abs(position.x) > halfSize - margin) {
      currentVelocity.x *= -0.9; // Slightly inelastic bounce
      clampedPos.x = Math.sign(position.x) * (halfSize - margin);
      bounced = true;
    }
    
    if (Math.abs(position.y) > halfSize - margin) {
      currentVelocity.y *= -0.9;
      clampedPos.y = Math.sign(position.y) * (halfSize - margin);
      bounced = true;
    }
    
    if (Math.abs(position.z) > halfSize - margin) {
      currentVelocity.z *= -0.9;
      clampedPos.z = Math.sign(position.z) * (halfSize - margin);
      bounced = true;
    }
    
    if (bounced) {
      // Update physics body position and velocity
      if (molecule.hasPhysics && molecule.physicsBody) {
        const body = molecule.physicsBody as any;
        body.position.set(clampedPos.x, clampedPos.y, clampedPos.z);
        body.velocity.set(currentVelocity.x, currentVelocity.y, currentVelocity.z);
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
   */
  getMetrics(): {
    reactionRate: number;
    remainingReactants: number;
    productsFormed: number;
    collisionCount: number;
    elapsedTime: number;
  } {
    const elapsedTime = (performance.now() - this.startTime) / 1000; // seconds
    const reactionRate = elapsedTime > 0 ? this.reactionCount / elapsedTime : 0;
    const remainingPairs = this.moleculePairs.filter(p => !p.reacted).length;
    const remainingReactants = (remainingPairs / this.moleculePairs.length) * 100;
    
    return {
      reactionRate,
      remainingReactants,
      productsFormed: this.reactionCount,
      collisionCount: this.collisionCount,
      elapsedTime
    };
  }

  /**
   * Get container bounds for spawning
   */
  getContainerBounds(): ContainerBounds {
    return {
      size: this.boundarySize,
      center: { x: 0, y: 0, z: 0 },
      padding: 0.1
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
        baseSpeed: 2.0
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
        baseSpeed: 2.0
      }
    );
    
    // Create pairs (match substrates with nucleophiles)
    this.moleculePairs = [];
    const minPairs = Math.min(substrateMolecules.length, nucleophileMolecules.length);
    for (let i = 0; i < minPairs; i++) {
      this.moleculePairs.push({
        substrateId: substrateMolecules[i].name,
        nucleophileId: nucleophileMolecules[i].name,
        reacted: false
      });
    }
    
    console.log(`Spawned ${substrateMolecules.length} substrates and ${nucleophileMolecules.length} nucleophiles`);
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
   * Adjust concentration by adding or removing molecule pairs dynamically
   * @param targetParticleCount Target number of molecule pairs
   */
  async adjustConcentration(targetParticleCount: number): Promise<void> {
    if (!this.substrateData || !this.nucleophileData) {
      return;
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
          this.spawnMoleculePair(this.substrateData, this.nucleophileData, index, this.temperature)
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
        ...reactedPairs.slice(0, Math.max(0, toRemove - nonReactedPairs.length))
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
      Array.from(indicesToRemove).sort((a, b) => b - a).forEach(idx => {
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
   */
  clear(): void {
    // Remove all molecules using molecule manager
    this.moleculePairs.forEach(pair => {
      try {
        this.moleculeManager.removeMolecule(pair.substrateId);
        this.moleculeManager.removeMolecule(pair.nucleophileId);
      } catch (error) {
        console.warn(`Failed to remove molecule pair:`, error);
      }
    });
    
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


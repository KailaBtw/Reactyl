import * as THREE from 'three';
import type { CannonPhysicsEngine } from '../physics/cannonPhysicsEngine';
import type { MoleculeManager } from '../types';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { MoleculeSpawner, ContainerBounds } from '../services/MoleculeSpawner';

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
  
  constructor(
    scene: THREE.Scene,
    physicsEngine: CannonPhysicsEngine,
    moleculeManager: MoleculeManager
  ) {
    this.scene = scene;
    this.physicsEngine = physicsEngine;
    this.moleculeManager = moleculeManager;
    this.moleculeSpawner = new MoleculeSpawner(scene, moleculeManager);
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
    
    // Clear existing molecules
    this.clear();
    
    // Set up collision event listener (registerHandler takes just the handler function)
    const collisionHandler = (event: any) => {
      this.handleCollision(event);
    };
    collisionEventSystem.registerHandler(collisionHandler);
    
    // Store handler reference for cleanup
    (this as any).collisionHandler = collisionHandler;
    
    // Set temperature (reaction type detection happens automatically via collision detection)
    collisionEventSystem.setTemperature(temperature);
    
    // Spawn molecule pairs
    for (let i = 0; i < particleCount; i++) {
      await this.spawnMoleculePair(substrateData, nucleophileData, i, temperature);
    }
    
    this.startTime = performance.now();
    console.log(`Spawned ${this.moleculePairs.length} molecule pairs`);
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
      
      console.log(`Spawned pair ${index}: ${substrateId} and ${nucleophileId}`);
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
    if (event.reactionOccurred) {
      this.reactionCount++;
      
      // Mark the pair as reacted
      const pair = this.moleculePairs.find(
        p => (p.substrateId === event.substrateId && p.nucleophileId === event.nucleophileId) ||
             (p.substrateId === event.nucleophileId && p.nucleophileId === event.substrateId)
      );
      
      if (pair) {
        pair.reacted = true;
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
   */
  private handleBoundaryCollision(moleculeId: string): void {
    const molecule = this.moleculeManager.getMolecule(moleculeId);
    if (!molecule) return;
    
    const halfSize = this.boundarySize / 2;
    const position = molecule.group.position;
    const currentVelocity = molecule.velocity.clone();
    let bounced = false;
    
    // Check each axis and bounce if needed
    if (Math.abs(position.x) > halfSize) {
      currentVelocity.x *= -0.9; // Slightly inelastic
      position.x = Math.sign(position.x) * halfSize;
      bounced = true;
    }
    
    if (Math.abs(position.y) > halfSize) {
      currentVelocity.y *= -0.9;
      position.y = Math.sign(position.y) * halfSize;
      bounced = true;
    }
    
    if (Math.abs(position.z) > halfSize) {
      currentVelocity.z *= -0.9;
      position.z = Math.sign(position.z) * halfSize;
      bounced = true;
    }
    
    if (bounced) {
      // Apply reversed velocity through physics engine
      if (molecule.hasPhysics && molecule.physicsBody) {
        this.physicsEngine.setVelocity(molecule, currentVelocity);
      } else {
        // Fallback: set velocity through molecule manager
        this.moleculeManager.setMoleculeVelocity(moleculeId, currentVelocity, 0);
      }
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
   * Adjust concentration by adding or removing molecules
   */
  async adjustConcentration(
    substrateData: any,
    nucleophileData: any,
    currentSubstrateConc: number,
    targetSubstrateConc: number,
    currentNucleophileConc: number,
    targetNucleophileConc: number,
    temperature: number
  ): Promise<void> {
    const bounds = this.getContainerBounds();
    
    // Adjust substrate concentration
    await this.moleculeSpawner.adjustConcentration(
      substrateData.cid,
      'substrate',
      currentSubstrateConc,
      targetSubstrateConc,
      bounds,
      {
        applyRandomRotation: true,
        temperature,
        baseSpeed: 2.0
      }
    );
    
    // Adjust nucleophile concentration
    await this.moleculeSpawner.adjustConcentration(
      nucleophileData.cid,
      'nucleophile',
      currentNucleophileConc,
      targetNucleophileConc,
      bounds,
      {
        applyRandomRotation: true,
        temperature,
        baseSpeed: 2.0
      }
    );
    
    // Rebuild pairs from current molecules
    const allMolecules = this.moleculeManager.getAllMolecules();
    const substrates = allMolecules.filter(m => m.name.startsWith('substrate_'));
    const nucleophiles = allMolecules.filter(m => m.name.startsWith('nucleophile_'));
    
    this.moleculePairs = [];
    const minPairs = Math.min(substrates.length, nucleophiles.length);
    for (let i = 0; i < minPairs; i++) {
      this.moleculePairs.push({
        substrateId: substrates[i].name,
        nucleophileId: nucleophiles[i].name,
        reacted: false
      });
    }
    
    console.log(`Adjusted concentration: ${substrates.length} substrates, ${nucleophiles.length} nucleophiles`);
  }

  /**
   * Get the molecule spawner instance (for external access)
   */
  getMoleculeSpawner(): MoleculeSpawner {
    return this.moleculeSpawner;
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
    
    // Unregister collision handler
    if ((this as any).collisionHandler) {
      collisionEventSystem.unregisterHandler((this as any).collisionHandler);
      (this as any).collisionHandler = null;
    }
    
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


import * as THREE from 'three';
import type { CannonPhysicsEngine } from '../physics/cannonPhysicsEngine';
import type { MoleculeManager } from '../types';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { ChemicalDataService } from '../chemistry/chemicalDataService';
import { drawMolecule } from '../components/moleculeDrawer';

/**
 * Manages multi-molecule reaction rate simulations
 * Spawns multiple molecule pairs in a bounded volume and tracks reaction statistics
 */
export class ReactionRateSimulator {
  private scene: THREE.Scene;
  private physicsEngine: CannonPhysicsEngine;
  private moleculeManager: MoleculeManager;
  private chemicalDataService: ChemicalDataService;
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
    this.chemicalDataService = new ChemicalDataService();
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
   */
  private async spawnMoleculePair(
    substrateData: any,
    nucleophileData: any,
    index: number,
    temperature: number
  ): Promise<void> {
    // Random position within bounded volume
    const x = (Math.random() - 0.5) * this.boundarySize * 0.8;
    const y = (Math.random() - 0.5) * this.boundarySize * 0.8;
    const z = (Math.random() - 0.5) * this.boundarySize * 0.8;
    
    // Create substrate using actual molecule drawer
    const substrateId = `substrate_${index}`;
    const substratePosition = { x: x - 1.5, y, z };
    
    try {
      // Fetch molecule data
      const substrateMolecularData = await this.chemicalDataService.fetchMoleculeByCID(substrateData.cid);
      
      if (!substrateMolecularData || !substrateMolecularData.mol3d) {
        console.warn(`No 3D data for substrate ${substrateData.name}, skipping pair ${index}`);
        return;
      }
      
      // Draw substrate molecule
      drawMolecule(
        substrateMolecularData.mol3d,
        this.moleculeManager,
        this.scene,
        substratePosition,
        substrateId,
        true // Apply random rotation
      );
      
      // Get the created molecule
      const substrateMolecule = this.moleculeManager.getMolecule(substrateId);
      if (!substrateMolecule) {
        console.warn(`Failed to create substrate ${substrateId}`);
        return;
      }
      
      // Create nucleophile
      const nucleophileId = `nucleophile_${index}`;
      const nucleophilePosition = { x: x + 1.5, y, z };
      
      const nucleophileMolecularData = await this.chemicalDataService.fetchMoleculeByCID(nucleophileData.cid);
      
      if (!nucleophileMolecularData || !nucleophileMolecularData.mol3d) {
        console.warn(`No 3D data for nucleophile ${nucleophileData.name}, cleaning up substrate`);
        this.moleculeManager.removeMolecule(substrateId);
        return;
      }
      
      // Draw nucleophile molecule
      drawMolecule(
        nucleophileMolecularData.mol3d,
        this.moleculeManager,
        this.scene,
        nucleophilePosition,
        nucleophileId,
        true // Apply random rotation
      );
      
      const nucleophileMolecule = this.moleculeManager.getMolecule(nucleophileId);
      if (!nucleophileMolecule) {
        console.warn(`Failed to create nucleophile ${nucleophileId}`);
        this.moleculeManager.removeMolecule(substrateId);
        return;
      }
      
      // Add to physics with temperature-scaled velocities
      const temperatureFactor = Math.sqrt(temperature / 298); // Maxwell-Boltzmann
      const baseSpeed = 2.0; // Increased from 0.5 for more visible movement
      
      // Random velocities (normalized direction, then scaled)
      const substrateDirection = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();
      
      const nucleophileDirection = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();
      
      const substrateVelocity = substrateDirection.multiplyScalar(baseSpeed * temperatureFactor);
      const nucleophileVelocity = nucleophileDirection.multiplyScalar(baseSpeed * temperatureFactor);
      
      // drawMolecule should have already added physics bodies, but give it a moment to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Update molecule velocity property
      substrateMolecule.velocity.copy(substrateVelocity);
      nucleophileMolecule.velocity.copy(nucleophileVelocity);
      
      // Set velocities using physics engine - pass molecule object (matches applyEncounter pattern)
      // This is the same way ReactionOrchestrator does it in configurePhysics -> applyEncounter
      if (substrateMolecule.hasPhysics) {
        this.physicsEngine.setVelocity(substrateMolecule as any, substrateVelocity);
        console.log(`Set substrate velocity: ${substrateVelocity.length.toFixed(2)} m/s`);
      } else {
        console.warn(`Substrate ${substrateId} has no physics body, using molecule manager`);
        this.moleculeManager.setMoleculeVelocity(substrateId, substrateVelocity, 0);
      }
      
      if (nucleophileMolecule.hasPhysics) {
        this.physicsEngine.setVelocity(nucleophileMolecule as any, nucleophileVelocity);
        console.log(`Set nucleophile velocity: ${nucleophileVelocity.length.toFixed(2)} m/s`);
      } else {
        console.warn(`Nucleophile ${nucleophileId} has no physics body, using molecule manager`);
        this.moleculeManager.setMoleculeVelocity(nucleophileId, nucleophileVelocity, 0);
      }
      
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


import * as THREE from "three";
import { MoleculeGroup } from "../types";

/**
 * Collision event data passed to reaction handlers
 */
export interface CollisionEvent {
  moleculeA: MoleculeGroup;
  moleculeB: MoleculeGroup;
  collisionPoint: THREE.Vector3;
  collisionNormal: THREE.Vector3;
  relativeVelocity: THREE.Vector3;
  timestamp: number;
}

/**
 * Type for collision event handlers
 */
export type CollisionEventHandler = (event: CollisionEvent) => void;

/**
 * Collision event system for reaction mechanics
 */
class CollisionEventSystem {
  private eventHandlers: CollisionEventHandler[] = [];
  private collisionHistory: Map<string, number> = new Map(); // Prevent duplicate events
  private readonly collisionCooldown = 0.1; // 100ms cooldown between same molecule collisions

  /**
   * Register a collision event handler
   * @param handler - Function to call when collisions occur
   */
  registerHandler(handler: CollisionEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Unregister a collision event handler
   * @param handler - Handler to remove
   */
  unregisterHandler(handler: CollisionEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit a collision event to all registered handlers
   * @param event - Collision event data
   */
  emitCollision(event: CollisionEvent): void {
    // Check cooldown to prevent spam
    const key = this.getCollisionKey(event.moleculeA, event.moleculeB);
    const now = performance.now() / 1000;
    
    if (this.collisionHistory.has(key)) {
      const lastCollision = this.collisionHistory.get(key)!;
      if (now - lastCollision < this.collisionCooldown) {
        return; // Still in cooldown
      }
    }
    
    // Update collision history
    this.collisionHistory.set(key, now);
    
    // Emit to all handlers
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in collision event handler:', error);
      }
    }
  }

  /**
   * Generate a unique key for a molecule pair
   * @param molA - First molecule
   * @param molB - Second molecule
   * @returns Unique collision key
   */
  private getCollisionKey(molA: MoleculeGroup, molB: MoleculeGroup): string {
    // Sort by name to ensure consistent key regardless of order
    const names = [molA.name, molB.name].sort();
    return `${names[0]}-${names[1]}`;
  }

  /**
   * Clear collision history (useful for scene resets)
   */
  clearHistory(): void {
    this.collisionHistory.clear();
  }

  /**
   * Get collision statistics for debugging
   */
  getStats(): { totalHandlers: number; historySize: number } {
    return {
      totalHandlers: this.eventHandlers.length,
      historySize: this.collisionHistory.size
    };
  }
}

// Export singleton instance
export const collisionEventSystem = new CollisionEventSystem();

/**
 * Helper function to create collision events from detected collisions
 * @param molA - First colliding molecule
 * @param molB - Second colliding molecule
 * @returns Collision event data
 */
export function createCollisionEvent(molA: MoleculeGroup, molB: MoleculeGroup): CollisionEvent {
  const collisionPoint = new THREE.Vector3()
    .addVectors(molA.group.position, molB.group.position)
    .multiplyScalar(0.5);
  
  const collisionNormal = new THREE.Vector3()
    .subVectors(molB.group.position, molA.group.position)
    .normalize();
  
  const relativeVelocity = new THREE.Vector3()
    .subVectors(molB.velocity, molA.velocity);
  
  return {
    moleculeA: molA,
    moleculeB: molB,
    collisionPoint,
    collisionNormal,
    relativeVelocity,
    timestamp: performance.now() / 1000
  };
}

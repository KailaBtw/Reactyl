import { MoleculeGroup } from "../types";
import { collisionEventSystem, CollisionEvent, CollisionEventHandler } from "./collisionEventSystem";

/**
 * Reaction collision interface for easy integration with reaction mechanics
 */
export class ReactionCollisionInterface {
  private reactionHandlers: Map<string, CollisionEventHandler> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    // Auto-register with collision event system
    collisionEventSystem.registerHandler(this.handleCollision.bind(this));
  }

  /**
   * Enable/disable collision reaction processing
   * @param enabled - Whether to process collision reactions
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Register a reaction handler for specific molecule types
   * @param moleculeTypeA - First molecule type identifier
   * @param moleculeTypeB - Second molecule type identifier  
   * @param handler - Reaction handler function
   */
  registerReaction(
    moleculeTypeA: string, 
    moleculeTypeB: string, 
    handler: (molA: MoleculeGroup, molB: MoleculeGroup, event: CollisionEvent) => void
  ): void {
    const key = this.getReactionKey(moleculeTypeA, moleculeTypeB);
    
    const collisionHandler: CollisionEventHandler = (event) => {
      if (!this.isEnabled) return;
      
      // Check if this collision involves the registered molecule types
      if (this.matchesReactionTypes(event.moleculeA, event.moleculeB, moleculeTypeA, moleculeTypeB)) {
        try {
          handler(event.moleculeA, event.moleculeB, event);
        } catch (error) {
          console.error(`Error in reaction handler for ${key}:`, error);
        }
      }
    };
    
    this.reactionHandlers.set(key, collisionHandler);
  }

  /**
   * Unregister a reaction handler
   * @param moleculeTypeA - First molecule type identifier
   * @param moleculeTypeB - Second molecule type identifier
   */
  unregisterReaction(moleculeTypeA: string, moleculeTypeB: string): void {
    const key = this.getReactionKey(moleculeTypeA, moleculeTypeB);
    this.reactionHandlers.delete(key);
  }

  /**
   * Check if two molecules match the registered reaction types
   * @param molA - First molecule
   * @param molB - Second molecule
   * @param typeA - First expected type
   * @param typeB - Second expected type
   * @returns True if types match (order-independent)
   */
  private matchesReactionTypes(
    molA: MoleculeGroup, 
    molB: MoleculeGroup, 
    typeA: string, 
    typeB: string
  ): boolean {
    const molAType = this.getMoleculeType(molA);
    const molBType = this.getMoleculeType(molB);
    
    // Check both orderings (A-B and B-A)
    return (molAType === typeA && molBType === typeB) || 
           (molAType === typeB && molBType === typeA);
  }

  /**
   * Extract molecule type from molecule data
   * @param molecule - Molecule to get type for
   * @returns Molecule type identifier
   */
  private getMoleculeType(molecule: MoleculeGroup): string {
    // Use molecule name as type identifier
    // In the future, this could be enhanced to use chemical properties
    return molecule.name || 'unknown';
  }

  /**
   * Generate unique key for reaction registration
   * @param typeA - First molecule type
   * @param typeB - Second molecule type
   * @returns Unique reaction key
   */
  private getReactionKey(typeA: string, typeB: string): string {
    // Sort to ensure consistent key regardless of registration order
    const types = [typeA, typeB].sort();
    return `${types[0]}-${types[1]}`;
  }

  /**
   * Handle collision events and route to appropriate reaction handlers
   * @param event - Collision event
   */
  private handleCollision(event: CollisionEvent): void {
    if (!this.isEnabled) return;
    
    // Route to all registered reaction handlers
    for (const [key, handler] of this.reactionHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in reaction handler ${key}:`, error);
      }
    }
  }

  /**
   * Get statistics about registered reactions
   * @returns Reaction statistics
   */
  getStats(): { totalReactions: number; enabled: boolean } {
    return {
      totalReactions: this.reactionHandlers.size,
      enabled: this.isEnabled
    };
  }

  /**
   * Clear all registered reactions
   */
  clearReactions(): void {
    this.reactionHandlers.clear();
  }
}

// Export singleton instance
export const reactionCollisionInterface = new ReactionCollisionInterface();

/**
 * Convenience function to register a simple reaction
 * @param moleculeTypeA - First molecule type
 * @param moleculeTypeB - Second molecule type
 * @param reactionFunction - Function to execute on collision
 */
export function registerReaction(
  moleculeTypeA: string,
  moleculeTypeB: string,
  reactionFunction: (molA: MoleculeGroup, molB: MoleculeGroup, event: CollisionEvent) => void
): void {
  reactionCollisionInterface.registerReaction(moleculeTypeA, moleculeTypeB, reactionFunction);
}

/**
 * Example usage for reaction mechanics:
 * 
 * // Register SN2 reaction between alkyl halide and nucleophile
 * registerReaction('alkyl_halide', 'nucleophile', (molA, molB, event) => {
 *   // Check collision energy, molecular orientation, etc.
 *   if (event.relativeVelocity.length() > MIN_REACTION_ENERGY) {
 *     // Trigger SN2 reaction
 *     triggerSN2Reaction(molA, molB);
 *   }
 * });
 * 
 * // Register acid-base reaction
 * registerReaction('acid', 'base', (molA, molB, event) => {
 *   // Check pH, molecular structure, etc.
 *   triggerAcidBaseReaction(molA, molB);
 * });
 */

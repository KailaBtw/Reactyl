import * as THREE from 'three';
import { ReactionDetector, type ReactionResult } from '../chemistry/reactionDetector';
import type { CollisionData, MoleculeGroup, ReactionType } from '../types';
import { log } from '../utils/debug';
import { reactionEventBus } from '../events/ReactionEventBus';
import { calculateAngleProbability } from '../ui/utils/angleProbability';
// reactionDemo removed - using chemistry reaction system

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
  collisionData?: CollisionData;
  reactionResult?: ReactionResult;
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
  private reactionDetector: ReactionDetector;
  private currentReactionType: ReactionType | null = null;
  private testingMode: boolean = false;
  private temperature: number = 298; // Default room temperature
  private demoEasyMode: boolean = false; // Forces high reaction probability for demos
  private hasShownDemoProduct: boolean = false; // Prevent duplicate product spawns in demos
  private reactionOccurred: boolean = false; // Prevent duplicate reaction processing

  constructor() {
    this.reactionDetector = new ReactionDetector();
  }

  /**
   * Set the current reaction type for detection
   */
  setReactionType(reactionType: ReactionType): void {
    this.currentReactionType = reactionType;
    log(`Reaction type set: ${reactionType.name} (${reactionType.id})`);
  }

  /**
   * Set the temperature for reaction calculations
   */
  setTemperature(temperature: number): void {
    this.temperature = temperature;
  }

  setTestingMode(testingMode: boolean): void {
    this.testingMode = testingMode;
    log(
      `Testing mode ${testingMode ? 'enabled' : 'disabled'} - reaction probability ${testingMode ? 'forced to 100%' : 'calculated normally'}`
    );
  }

  /**
   * Reset reaction state for new reaction
   */
  resetReactionState(): void {
    this.reactionOccurred = false;
    this.hasShownDemoProduct = false;
    this.collisionHistory.clear();
  }

  // No default scene; we always resolve via object ancestry

  /**
   * Enable/disable demo easy mode (forces high reaction probability)
   */
  setDemoEasyMode(enabled: boolean): void {
    this.demoEasyMode = enabled;
    log(`Demo Easy Mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  /**
   * Get current reaction type
   */
  getReactionType(): ReactionType | null {
    return this.currentReactionType;
  }

  /**
   * Get current temperature
   */
  getTemperature(): number {
    return this.temperature;
  }

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
   * Clear all collision event handlers
   */
  clearAllHandlers(): void {
    this.eventHandlers = [];
  }

  /**
   * Emit a collision event to all registered handlers
   * @param event - Collision event data
   */
  emitCollision(event: CollisionEvent): void {
    // Check if either molecule is in a reaction to prevent race conditions
    if (event.moleculeA.reactionInProgress || event.moleculeB.reactionInProgress) {
      return;
    }

    // Check if a reaction has already occurred to prevent duplicate processing
    if (this.reactionOccurred) {
      return;
    }

    // Check cooldown to prevent spam
    const key = this.getCollisionKey(event.moleculeA, event.moleculeB);
    const now = performance.now() / 1000;

    if (this.collisionHistory.has(key)) {
      const lastCollision = this.collisionHistory.get(key);
      if (lastCollision && now - lastCollision < this.collisionCooldown) {
        return; // Still in cooldown
      }
    }

    // Update collision history
    this.collisionHistory.set(key, now);

    // Process reaction detection if reaction type is set
    if (this.currentReactionType) {
      this.processReactionDetection(event);
    }

    // If a reaction was confirmed during detection, do not emit further handlers this tick
    if (this.reactionOccurred) {
      return;
    }

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
   * Process reaction detection for collision event
   */
  private processReactionDetection(event: CollisionEvent): void {
    if (!this.currentReactionType) {
      return;
    }

    // Check if either molecule is already in a reaction to prevent race conditions
    if (event.moleculeA.reactionInProgress || event.moleculeB.reactionInProgress) {
      return;
    }


    // Calculate collision data
    const collisionData: CollisionData = {
      relativeVelocity: event.relativeVelocity,
      collisionEnergy: this.calculateCollisionEnergy(event),
      approachAngle: this.calculateApproachAngle(event),
      impactPoint: event.collisionPoint,
      moleculeOrientations: {
        substrate: event.moleculeA.group.quaternion,
        nucleophile: event.moleculeB.group.quaternion,
      },
    };

    // Detect reaction
    const reactionResult = this.reactionDetector.detectReaction(
      collisionData,
      this.currentReactionType,
      this.temperature,
      event.moleculeA,
      event.moleculeB
    );

    // RAPID OVERRIDE: Use UI-calculated probability instead of forcing 100%
    if (this.testingMode) {
      // Get UI state for real probability calculation
      const uiState = (window as any).uiState;
      if (uiState) {
        const { approachAngle, relativeVelocity, temperature, reactionType } = uiState;
        
        // Calculate kinetic energy from UI
        const velocityScale = relativeVelocity / 500;
        const maxKineticEnergy = 40;
        const kineticEnergy = velocityScale * maxKineticEnergy * Math.sqrt(temperature / 298);
        
        // Get angle probability from UI calculation
        const angleResult = calculateAngleProbability(approachAngle, reactionType);
        
        // Calculate energy probability
        const activationEnergy = 30;
        const energyRatio = kineticEnergy / activationEnergy;
        let energyProbability = 0;
        if (energyRatio >= 1.0) energyProbability = 0.95;
        else if (energyRatio >= 0.9) energyProbability = 0.7;
        else if (energyRatio >= 0.8) energyProbability = 0.4;
        else if (energyRatio >= 0.6) energyProbability = 0.1;
        else energyProbability = 0.01;
        
        // Use real calculated probability
        const realProbability = energyProbability * angleResult.probability;
        (reactionResult as any).probability = realProbability;
        (reactionResult as any).occurs = Math.random() < realProbability;
        
        log(`UI Override: Using calculated probability ${(realProbability * 100).toFixed(1)}% instead of forcing 100%`);
      } else {
        // Fallback to original behavior if UI state not available
        log(`Testing mode: forcing reaction probability to 100% for demo`);
        (reactionResult as any).probability = 1.0;
        (reactionResult as any).occurs = true;
      }
    }

    // If reaction occurs, set flag to prevent duplicate processing and mark molecules busy
    if (reactionResult.occurs) {
      this.reactionOccurred = true;
      event.moleculeA.reactionInProgress = true;
      event.moleculeB.reactionInProgress = true;
    }
    // If demo easy mode is enabled, boost probability to showcase reaction
    else if (this.demoEasyMode) {
      const boostedProbability = Math.max(reactionResult.probability, 0.95);
      const occurs = Math.random() < boostedProbability;
      log(
        `Demo Easy Mode active → Boosting probability to ${(boostedProbability * 100).toFixed(
          2
        )}% → ${occurs ? 'FORCING SUCCESS' : 'still failed stochastically'}`
      );
      (reactionResult as any).probability = boostedProbability;
      (reactionResult as any).occurs = occurs;
    }

    log(
      `Reaction detection result: ${reactionResult.occurs ? 'SUCCESS' : 'FAILED'} (probability: ${(reactionResult.probability * 100).toFixed(2)}%)`
    );

    // Emit collision detected event to unified system
    reactionEventBus.emitCollisionDetected(
      collisionData.collisionEnergy,
      collisionData.approachAngle,
      reactionResult.probability
    );

    // Add collision data and reaction result to event
    event.collisionData = collisionData;
    event.reactionResult = reactionResult;

    // Emit reaction event if reaction occurs
    if (reactionResult.occurs) {

      // Set reaction flags to prevent race conditions
      event.moleculeA.reactionInProgress = true;
      event.moleculeB.reactionInProgress = true;

      this.emitReactionEvent(event);

      // Skip if we already spawned products in this demo session
      if (this.hasShownDemoProduct) {
        return;
      }

      // Generate products immediately (no timeout needed since we pause physics)
      try {
        this.generateReactionProducts(event);
        this.hasShownDemoProduct = true;
      } catch (e) {
        console.error('Error during product generation', e);
        // Reset flags on error
        event.moleculeA.reactionInProgress = false;
        event.moleculeB.reactionInProgress = false;
      }
    } else {
      log(`No reaction: probability was ${(reactionResult.probability * 100).toFixed(2)}%`);
    }
  }

  /**
   * Calculate collision energy from event data
   */
  private calculateCollisionEnergy(event: CollisionEvent): number {
    const massA =
      (event.moleculeA as unknown as { molecularProperties?: { totalMass?: number } })
        .molecularProperties?.totalMass || 1.0;
    const massB =
      (event.moleculeB as unknown as { molecularProperties?: { totalMass?: number } })
        .molecularProperties?.totalMass || 1.0;
    const relativeVelocity = event.relativeVelocity.length();

    return this.reactionDetector.calculateCollisionEnergy(massA, massB, relativeVelocity);
  }

  /**
   * Calculate approach angle from event data
   */
  private calculateApproachAngle(event: CollisionEvent): number {
    return this.reactionDetector.calculateApproachAngle(
      event.moleculeA.group.quaternion,
      event.moleculeB.group.quaternion,
      event.collisionPoint
    );
  }

  /**
   * Transform existing molecules to show reaction products
   */
  private generateReactionProducts(event: CollisionEvent): void {
    if (!event.reactionResult) return;

    try {
      // Reaction transformation handled by chemistry reaction system
    } catch (error) {
      console.error('Error transforming molecules for reaction:', error);
    } finally {
      // Clear reaction flags
      event.moleculeA.reactionInProgress = false;
      event.moleculeB.reactionInProgress = false;
    }
  }

  /**
   * Emit reaction event for successful reactions
   */
  private emitReactionEvent(event: CollisionEvent): void {
    // Emit to reaction-specific handlers
    for (const handler of this.eventHandlers) {
      try {
        // Create reaction event with additional data
        const reactionEvent = {
          ...event,
          type: 'reaction' as const,
          reactionType: this.currentReactionType?.id,
        };
        handler(reactionEvent);
      } catch (error) {
        console.error('Error in reaction event handler:', error);
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
      historySize: this.collisionHistory.size,
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

  const relativeVelocity = new THREE.Vector3().subVectors(molB.velocity, molA.velocity);

  return {
    moleculeA: molA,
    moleculeB: molB,
    collisionPoint,
    collisionNormal,
    relativeVelocity,
    timestamp: performance.now() / 1000,
  };
}

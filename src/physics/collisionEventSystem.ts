import * as THREE from 'three';
import { ReactionDetector, type ReactionResult } from '../chemistry/reactionDetector';
import { reactionEventBus } from '../events/ReactionEventBus';
import { workerManager } from '../services/workerManager';
import type { CollisionData, MoleculeGroup, ReactionType } from '../types';
import { calculateAngleProbability } from '../ui/utils/angleProbability';
import { log } from '../utils/debug';
import type { ChemistryWorkerMessage, SerializableReactionType } from '../workers/types';
import {
  deserializeReactionResult,
  serializeCollisionData,
  serializeReactionResult,
} from '../workers/utils';
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
  private readonly baseCollisionCooldown = 0.1; // 100ms base cooldown between same molecule collisions
  private reactionDetector: ReactionDetector;
  private currentReactionType: ReactionType | null = null;
  private testingMode: boolean = false;
  private temperature: number = 298; // Default room temperature
  private pressure: number = 1.0; // Default pressure: 1 atm
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

  /**
   * Set the pressure for collision frequency calculations
   * Pressure affects collision frequency: Rate ∝ P² for bimolecular reactions
   */
  setPressure(pressure: number): void {
    this.pressure = pressure;
  }

  /**
   * Get current pressure
   */
  getPressure(): number {
    return this.pressure;
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
   * Detect reaction using chemistry worker
   */
  private async detectReactionWithWorker(
    collisionData: CollisionData,
    reactionType: ReactionType,
    temperature: number,
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup
  ): Promise<ReactionResult> {
    // Serialize reaction type
    const serializedReactionType: SerializableReactionType = {
      id: reactionType.id,
      name: reactionType.name,
      mechanism: reactionType.mechanism,
      activationEnergy: reactionType.activationEnergy,
      optimalAngle: reactionType.optimalAngle,
      requiredFeatures: {
        substrate: reactionType.requiredFeatures.substrate.map(f => ({
          type: f.type,
          atoms: f.atoms,
          strength: f.strength,
        })),
        nucleophile: reactionType.requiredFeatures.nucleophile.map(f => ({
          type: f.type,
          atoms: f.atoms,
          strength: f.strength,
        })),
      },
    };

    // Send to chemistry worker
    const message: ChemistryWorkerMessage = {
      type: 'detectReaction',
      collisionData: serializeCollisionData(collisionData),
      reactionType: serializedReactionType,
      temperature,
    };

    const response = await workerManager.sendChemistryMessage(message);

    if (response.type === 'reactionResult' && response.reactionResult) {
      // Deserialize and restore molecule references
      return deserializeReactionResult(response.reactionResult, substrate, nucleophile);
    }

    throw new Error('Invalid response from chemistry worker');
  }

  /**
   * Emit a collision event to all registered handlers
   * @param event - Collision event data
   */
  emitCollision(event: CollisionEvent): void {
    console.log(`🔔 emitCollision called: ${event.moleculeA.name} + ${event.moleculeB.name}`);

    // Check if either molecule is in a reaction to prevent race conditions
    if (event.moleculeA.reactionInProgress || event.moleculeB.reactionInProgress) {
      console.log(`⏸️ Skipping: molecules already reacting`);
      return;
    }

    // NOTE: Removed global reactionOccurred check - it was blocking all reactions after the first
    // Individual molecule reactionInProgress flags prevent duplicate processing per molecule pair

    // Check cooldown to prevent spam
    // Pressure effects removed - reactions are in solution where pressure has negligible effect
    const effectiveCooldown = this.baseCollisionCooldown;

    const key = this.getCollisionKey(event.moleculeA, event.moleculeB);
    const now = performance.now() / 1000;

    if (this.collisionHistory.has(key)) {
      const lastCollision = this.collisionHistory.get(key);
      if (lastCollision && now - lastCollision < effectiveCooldown) {
        // Debug: Log cooldown occasionally
        if (Math.random() < 0.05) {
          console.log(
            `⏳ Collision in cooldown: ${key} (${((now - lastCollision) * 1000).toFixed(0)}ms ago, need ${(effectiveCooldown * 1000).toFixed(0)}ms)`
          );
        }
        return; // Still in cooldown
      }
    }

    // Update collision history
    this.collisionHistory.set(key, now);

    // Process reaction detection FIRST (before emitting to handlers)
    // This ensures reactionResult is set on the event before handlers receive it
    if (this.currentReactionType) {
      console.log(`✅ Reaction type is set: ${this.currentReactionType.id}`);
      this.processReactionDetection(event);
    } else {
      console.warn(
        '⚠️ Collision detected but no reaction type set. Set reaction type with collisionEventSystem.setReactionType()'
      );
    }

    // NOTE: Removed reactionOccurred check - allow handlers to process all reactions
    // Individual molecule reactionInProgress flags prevent duplicate processing per pair

    // Emit to all handlers AFTER processing reaction detection
    // This ensures event.reactionResult is available to handlers
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
  private async processReactionDetection(event: CollisionEvent): Promise<void> {
    if (!this.currentReactionType) {
      console.warn('⚠️ processReactionDetection called but no reaction type set');
      return;
    }

    // Check if either molecule is already in a reaction to prevent race conditions
    if (event.moleculeA.reactionInProgress || event.moleculeB.reactionInProgress) {
      console.log(`⏸️ Skipping reaction detection: molecules already reacting`);
      return;
    }

    console.log(
      `🧪 Processing reaction detection: ${event.moleculeA.name} + ${event.moleculeB.name}, type: ${this.currentReactionType.id}, temp: ${this.temperature}K`
    );

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

    let reactionResult: ReactionResult;

    // Use chemistry worker if enabled
    if (workerManager.isChemistryWorkerEnabled()) {
      try {
        reactionResult = await this.detectReactionWithWorker(
          collisionData,
          this.currentReactionType,
          this.temperature,
          event.moleculeA,
          event.moleculeB
        );
      } catch (error) {
        console.error('Chemistry worker failed, falling back to main thread:', error);
        // Fallback to main thread
        reactionResult = this.reactionDetector.detectReaction(
          collisionData,
          this.currentReactionType,
          this.temperature,
          event.moleculeA,
          event.moleculeB
        );
      }
    } else {
      // Use main thread
      const relVelMag = collisionData.relativeVelocity.length();
      console.log(
        `⚗️ Calling detectReaction: relVel=${relVelMag.toFixed(2)} m/s, E_collision=${collisionData.collisionEnergy.toFixed(2)} kJ/mol, E_activation=${this.currentReactionType.activationEnergy} kJ/mol, angle=${collisionData.approachAngle.toFixed(1)}°`
      );
      reactionResult = this.reactionDetector.detectReaction(
        collisionData,
        this.currentReactionType,
        this.temperature,
        event.moleculeA,
        event.moleculeB
      );
    }

    console.log(
      `📊 Reaction result: occurs=${reactionResult.occurs}, prob=${(reactionResult.probability * 100).toFixed(2)}%`
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

        // UI override applied silently
      } else {
        // Fallback to original behavior if UI state not available
        log(`Testing mode: forcing reaction probability to 100% for demo`);
        (reactionResult as any).probability = 1.0;
        (reactionResult as any).occurs = true;
      }
    }

    // If reaction occurs, mark molecules busy
    // NOTE: Don't set reactionOccurred globally for rate simulation - we want multiple reactions
    // The individual molecule reactionInProgress flags prevent duplicate processing per pair
    if (reactionResult.occurs) {
      event.moleculeA.reactionInProgress = true;
      event.moleculeB.reactionInProgress = true;
      // Only set global flag for single collision mode (prevents duplicate reactions in that mode)
      // In rate mode, allow multiple reactions - individual molecule flags handle duplicates
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

    // Log reactions for debugging
    if (reactionResult.occurs) {
      console.log(
        `✅ REACTION: ${event.moleculeA.name} + ${event.moleculeB.name} (${(reactionResult.probability * 100).toFixed(1)}%)`
      );
    } else if (reactionResult.probability > 0.1) {
      // Log high-probability collisions that didn't react (for debugging)
      if (Math.random() < 0.1) {
        // Log 10% of high-probability non-reactions
        console.log(
          `⚠️ High prob collision (${(reactionResult.probability * 100).toFixed(1)}%) but no reaction: ${event.moleculeA.name} + ${event.moleculeB.name}`
        );
      }
    }

    // Emit collision detected event to unified system
    reactionEventBus.emitCollisionDetected(
      collisionData.collisionEnergy,
      collisionData.approachAngle,
      reactionResult.probability,
      compatibilityFactor
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

      // NOTE: Product generation disabled for rate simulation mode
      // In rate mode, we track reactions but don't generate visual products
      // Product generation is only for single collision mode (handled by ReactionOrchestrator)
      // The hasShownDemoProduct flag was blocking all reactions after the first - removed for rate mode
    } else {
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

    // Debug: Log masses and velocity occasionally
    if (Math.random() < 0.01) {
      console.log(
        `Energy calc: massA=${massA.toFixed(1)} AMU, massB=${massB.toFixed(1)} AMU, relVel=${relativeVelocity.toFixed(2)} m/s, temp=${this.temperature}K`
      );
    }

    // Pass current temperature to collision energy calculation for proper scaling
    const energy = this.reactionDetector.calculateCollisionEnergy(
      massA,
      massB,
      relativeVelocity,
      this.temperature
    );

    // Debug: Log calculated energy occasionally
    if (Math.random() < 0.01) {
      console.log(`Calculated collision energy: ${energy.toFixed(4)} kJ/mol`);
    }

    return energy;
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

  // CRITICAL FIX: Read velocities from physics bodies, not stale molecule.velocity
  // Physics bodies have the actual current velocities
  const velA = new THREE.Vector3();
  const velB = new THREE.Vector3();

  if (molA.physicsBody) {
    const bodyA = molA.physicsBody as any;
    velA.set(bodyA.velocity.x, bodyA.velocity.y, bodyA.velocity.z);
  } else {
    // Fallback to molecule velocity if no physics body
    velA.copy(molA.velocity);
  }

  if (molB.physicsBody) {
    const bodyB = molB.physicsBody as any;
    velB.set(bodyB.velocity.x, bodyB.velocity.y, bodyB.velocity.z);
  } else {
    // Fallback to molecule velocity if no physics body
    velB.copy(molB.velocity);
  }

  const relativeVelocity = new THREE.Vector3().subVectors(velB, velA);

  return {
    moleculeA: molA,
    moleculeB: molB,
    collisionPoint,
    collisionNormal,
    relativeVelocity,
    timestamp: performance.now() / 1000,
  };
}

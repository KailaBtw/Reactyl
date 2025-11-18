import * as THREE from 'three';
import { ReactionDetector, type ReactionResult } from '../chemistry/reactionDetector';
import { reactionEventBus } from '../events/ReactionEventBus';
import { workerManager } from '../services/workerManager';
import type { CollisionData, MoleculeGroup, ReactionType } from '../types';
import { calculateAngleProbability } from '../ui/utils/angleProbability';
import { log } from '../utils/debug';
import type { ChemistryWorkerMessage, SerializableReactionType } from '../workers/types';
import { deserializeReactionResult, serializeCollisionData } from '../workers/utils';
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
  private readonly minRelativeSpeed = 1e-3; // Ignore effectively-stationary collisions
  private reactionDetector: ReactionDetector;
  private currentReactionType: ReactionType | null = null;
  private serializedReactionType: SerializableReactionType | null = null;
  private testingMode: boolean = false;
  private temperature: number = 298; // Default room temperature
  private pressure: number = 1.0; // Default pressure: 1 atm
  private demoEasyMode: boolean = false; // Forces high reaction probability for demos
  private simulationMode: 'molecule' | 'single' | 'rate' = 'single'; // Current simulation mode

  // Batching queue for worker messages
  private pendingCollisionBatch: Array<{
    event: CollisionEvent;
    collisionData: CollisionData;
    resolve: (result: ReactionResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private batchProcessingScheduled = false;
  private readonly batchSize = 10; // Process up to 10 collisions per batch
  private readonly batchDelay = 16; // ~1 frame at 60fps

  constructor() {
    this.reactionDetector = new ReactionDetector();
  }

  /**
   * Set the current reaction type for detection
   */
  setReactionType(reactionType: ReactionType): void {
    this.currentReactionType = reactionType;
    this.serializedReactionType = this.serializeReactionType(reactionType);
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
   * Set the simulation mode
   */
  setSimulationMode(mode: 'molecule' | 'single' | 'rate'): void {
    this.simulationMode = mode;
  }

  /**
   * Get the current simulation mode
   */
  getSimulationMode(): 'molecule' | 'single' | 'rate' {
    return this.simulationMode;
  }

  /**
   * Reset reaction state for new reaction
   */
  resetReactionState(): void {
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
   * Detect reaction using chemistry worker (batched)
   */
  private async detectReactionWithWorker(
    collisionData: CollisionData,
    reactionType: ReactionType,
    temperature: number,
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup
  ): Promise<ReactionResult> {
    // If worker is not enabled, use main thread
    if (!workerManager.isChemistryWorkerEnabled()) {
      return this.reactionDetector.detectReaction(
        collisionData,
        reactionType,
        temperature,
        substrate,
        nucleophile
      );
    }

    // Queue for batch processing
    return new Promise((resolve, reject) => {
      // Create a dummy event for batching (we only need collisionData)
      const dummyEvent: CollisionEvent = {
        moleculeA: substrate,
        moleculeB: nucleophile,
        collisionPoint: collisionData.impactPoint,
        collisionNormal: new THREE.Vector3(),
        relativeVelocity: collisionData.relativeVelocity,
        timestamp: performance.now() / 1000,
      };

      this.pendingCollisionBatch.push({
        event: dummyEvent,
        collisionData,
        resolve,
        reject,
      });

      // Schedule batch processing if not already scheduled
      if (!this.batchProcessingScheduled) {
        this.batchProcessingScheduled = true;
        // Process immediately if batch is full, otherwise wait a bit
        if (this.pendingCollisionBatch.length >= this.batchSize) {
          // Use microtask to process immediately but not block current execution
          Promise.resolve().then(() => this.processBatch());
        } else {
          // Use setTimeout for smaller batches to allow more to accumulate
          setTimeout(() => this.processBatch(), this.batchDelay);
        }
      }
    });
  }

  /**
   * Process batched collision detection requests
   */
  private async processBatch(): Promise<void> {
    this.batchProcessingScheduled = false;

    if (this.pendingCollisionBatch.length === 0) {
      return;
    }

    // Take up to batchSize items from the queue
    const batch = this.pendingCollisionBatch.splice(0, this.batchSize);

    if (batch.length === 0) {
      return;
    }

    // If worker is not enabled, process on main thread
    if (!workerManager.isChemistryWorkerEnabled()) {
      for (const item of batch) {
        try {
          const result = this.reactionDetector.detectReaction(
            item.collisionData,
            this.currentReactionType!,
            this.temperature,
            item.event.moleculeA,
            item.event.moleculeB
          );
          item.resolve(result);
        } catch (error) {
          item.reject(error as Error);
        }
      }
      // Schedule next batch if there are more items
      if (this.pendingCollisionBatch.length > 0) {
        this.batchProcessingScheduled = true;
        setTimeout(() => this.processBatch(), this.batchDelay);
      }
      return;
    }

    // Serialize reaction type (cached)
    const serializedReactionType =
      this.serializedReactionType ?? this.serializeReactionType(this.currentReactionType!);

    // Create batch messages
    const messages: ChemistryWorkerMessage[] = batch.map(item => ({
      type: 'detectReaction',
      collisionData: serializeCollisionData(item.collisionData),
      reactionType: serializedReactionType,
      temperature: this.temperature,
    }));

    try {
      // Send batch to worker
      const responses = await workerManager.batchSendChemistryMessages(messages);

      // Process responses
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const response = responses[i];

        if (response && response.type === 'reactionResult' && response.reactionResult) {
          // Deserialize and restore molecule references
          const result = deserializeReactionResult(
            response.reactionResult,
            item.event.moleculeA,
            item.event.moleculeB
          );
          item.resolve(result);
        } else {
          item.reject(new Error('Invalid response from chemistry worker'));
        }
      }
    } catch (error) {
      // Fallback to main thread for all items in batch
      console.warn('Batch worker failed, falling back to main thread:', error);
      for (const item of batch) {
        try {
          const result = this.reactionDetector.detectReaction(
            item.collisionData,
            this.currentReactionType!,
            this.temperature,
            item.event.moleculeA,
            item.event.moleculeB
          );
          item.resolve(result);
        } catch (fallbackError) {
          item.reject(fallbackError as Error);
        }
      }
    }

    // Schedule next batch if there are more items
    if (this.pendingCollisionBatch.length > 0) {
      this.batchProcessingScheduled = true;
      setTimeout(() => this.processBatch(), this.batchDelay);
    }
  }

  /**
   * Emit a collision event to all registered handlers
   * @param event - Collision event data
   */
  async emitCollision(event: CollisionEvent): Promise<void> {
    // Check if either molecule is in a reaction to prevent race conditions
    if (event.moleculeA.reactionInProgress || event.moleculeB.reactionInProgress) {
      return;
    }
    
    // Skip collisions if either molecule has already reacted (is a product)
    // Products can't react again - they've already lost their leaving group
    if (event.moleculeA.isProduct || event.moleculeB.isProduct) {
      return;
    }

    // Check cooldown to prevent spam
    // Pressure effects removed - reactions are in solution where pressure has negligible effect
    const effectiveCooldown = this.baseCollisionCooldown;

    const key = this.getCollisionKey(event.moleculeA, event.moleculeB);
    const now = performance.now() / 1000;

    if (this.collisionHistory.has(key)) {
      const lastCollision = this.collisionHistory.get(key);
      if (lastCollision && now - lastCollision < effectiveCooldown) {
        return; // Still in cooldown
      }
    }

    // Update collision history
    this.collisionHistory.set(key, now);

    // Skip effectively-static encounters to avoid unnecessary work
    if (this.shouldSkipCollision(event)) {
      this.populateIdleCollisionResult(event);
      return;
    }

    // Process reaction detection FIRST (before emitting to handlers)
    // This ensures reactionResult is set on the event before handlers receive it
    // CRITICAL: Must await this async function so reactionResult is set before handlers run
    if (this.currentReactionType) {
      await this.processReactionDetection(event);
    } else {
      console.warn(
        '⚠️ Collision detected but no reaction type set. Set reaction type with collisionEventSystem.setReactionType()'
      );
    }

    // Emit to all handlers AFTER processing reaction detection
    // This ensures event.reactionResult is available to handlers
    this.emitToHandlers(event);
  }

  /**
   * Process reaction detection for collision event
   */
  private async processReactionDetection(event: CollisionEvent): Promise<void> {
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
      reactionResult = this.reactionDetector.detectReaction(
        collisionData,
        this.currentReactionType,
        this.temperature,
        event.moleculeA,
        event.moleculeB
      );
    }

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

    // Reactions are logged in the single-line JSON above

    // Emit collision detected event to unified system
    reactionEventBus.emitCollisionDetected(
      collisionData.collisionEnergy,
      collisionData.approachAngle,
      reactionResult.probability
    );

    // Add collision data and reaction result to event (sanitized)
    const sanitizedResult = this.sanitizeReactionResult({
      ...reactionResult,
      collisionData,
    });
    event.collisionData = sanitizedResult.collisionData;
    event.reactionResult = sanitizedResult;
    reactionResult = sanitizedResult;

    // Emit reaction event if reaction occurs
    if (reactionResult.occurs) {
      // Set reaction flags to prevent race conditions
      event.moleculeA.reactionInProgress = true;
      event.moleculeB.reactionInProgress = true;

      this.emitReactionEvent(event);

      // NOTE: Product generation disabled for rate simulation mode
      // In rate mode, we track reactions but don't generate visual products
      // Product generation is only for single collision mode (handled by ReactionOrchestrator)
    }
  }

  /**
   * Get molecular mass from molecule name (fallback when molecularProperties not available)
   */
  private getMassFromName(moleculeName: string): number {
    // Common molecular masses in AMU (fallback lookup)
    const massLookup: { [key: string]: number } = {
      // Substrates
      methyl_bromide: 94.94,
      methyl_chloride: 50.49,
      methyl_iodide: 141.94,
      ethyl_bromide: 108.97,
      // Nucleophiles
      hydroxide: 17.01,
      hydroxide_ion: 17.01,
      cyanide: 26.02,
      methoxide: 31.03,
      ammonia: 17.03,
      methanol: 32.04,
      water: 18.02,
    };

    const nameLower = moleculeName.toLowerCase();
    
    // Check if name contains any of the lookup keys
    for (const [key, mass] of Object.entries(massLookup)) {
      if (nameLower.includes(key)) {
        return mass;
      }
    }

    // Default fallback based on naming pattern
    if (nameLower.startsWith('substrate_')) {
      return 95.0; // Typical substrate mass (methyl bromide)
    } else if (nameLower.startsWith('nucleophile_')) {
      return 17.0; // Typical nucleophile mass (hydroxide)
    }

    return 50.0; // Reasonable default (between substrate and nucleophile)
  }

  /**
   * Calculate collision energy from event data
   */
  private calculateCollisionEnergy(event: CollisionEvent): number {
    let massA =
      (event.moleculeA as unknown as { molecularProperties?: { totalMass?: number } })
        .molecularProperties?.totalMass;
    let massB =
      (event.moleculeB as unknown as { molecularProperties?: { totalMass?: number } })
        .molecularProperties?.totalMass;

    // Fallback to name-based lookup if molecularProperties not available
    if (!massA || massA <= 0) {
      massA = this.getMassFromName(event.moleculeA.name);
    }
    if (!massB || massB <= 0) {
      massB = this.getMassFromName(event.moleculeB.name);
    }

    const relativeVelocity = event.relativeVelocity.length();

    // Pass current temperature to collision energy calculation for proper scaling
    const energy = this.reactionDetector.calculateCollisionEnergy(
      massA,
      massB,
      relativeVelocity,
      this.temperature
    );

    return energy;
  }

  /**
   * Calculate approach angle from event data
   * Uses the relative velocity vector and collision geometry to determine approach angle
   */
  private calculateApproachAngle(event: CollisionEvent): number {
    // Calculate direction from moleculeA to moleculeB
    const directionAB = new THREE.Vector3().subVectors(
      event.moleculeB.group.position,
      event.moleculeA.group.position
    );
    if (directionAB.lengthSq() === 0) {
      return 0;
    }
    directionAB.normalize();
    
    // Get relative velocity direction (normalized)
    const relativeVelDir = event.relativeVelocity.clone();
    if (relativeVelDir.lengthSq() === 0) {
      return 0;
    }
    relativeVelDir.normalize();
    
    // Calculate angle between direction vector and relative velocity
    // For SN2, we want backside attack (180°), so we measure angle from the collision direction
    const dot = directionAB.dot(relativeVelDir);
    // Clamp to [-1, 1] to avoid numerical errors
    const clampedDot = Math.max(-1, Math.min(1, dot));
    
    // Angle in radians, then convert to degrees
    let angleRad = Math.acos(clampedDot);
    let angleDeg = (angleRad * 180) / Math.PI;
    
    // For SN2 backside attack, optimal is 180°
    // If relative velocity is opposite to direction AB, that's 180° (backside)
    // If relative velocity is same as direction AB, that's 0° (frontside)
    // So we want to measure: angle from direction AB to relative velocity
    // If they're opposite (dot = -1), angle = 180° ✓
    // If they're aligned (dot = 1), angle = 0°
    
    // The angle we calculated is correct: 0° = aligned, 180° = opposite
    // For SN2, 180° is optimal (backside attack)
    
    return angleDeg;
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
   * Determine if the collision can be ignored due to negligible motion
   */
  private shouldSkipCollision(event: CollisionEvent): boolean {
    const speed = event.relativeVelocity.length();
    return !Number.isFinite(speed) || speed < this.minRelativeSpeed;
  }

  /**
   * Populate event with a no-op reaction result for skipped collisions
   */
  private populateIdleCollisionResult(event: CollisionEvent): void {
    if (!this.currentReactionType) {
      this.emitToHandlers(event);
      return;
    }

    const collisionData: CollisionData = {
      relativeVelocity: event.relativeVelocity.clone(),
      collisionEnergy: 0,
      approachAngle: 0,
      impactPoint: event.collisionPoint.clone(),
      moleculeOrientations: {
        substrate: event.moleculeA.group.quaternion.clone(),
        nucleophile: event.moleculeB.group.quaternion.clone(),
      },
    };

    const sanitized = this.sanitizeReactionResult({
      occurs: false,
      probability: 0,
      reactionType: this.currentReactionType,
      collisionData,
      substrate: event.moleculeA,
      nucleophile: event.moleculeB,
    });

    event.collisionData = sanitized.collisionData;
    event.reactionResult = sanitized;
    this.emitToHandlers(event);
  }

  /**
   * Clamp reaction result numbers to safe ranges
   */
  private sanitizeReactionResult(result: ReactionResult): ReactionResult {
    const probability = Number.isFinite(result.probability)
      ? Math.min(Math.max(result.probability, 0), 1)
      : 0;
    const occurs = probability > 0 ? Boolean(result.occurs) : false;
    const collisionEnergy = Number.isFinite(result.collisionData.collisionEnergy)
      ? Math.max(result.collisionData.collisionEnergy, 0)
      : 0;
    const approachAngle = Number.isFinite(result.collisionData.approachAngle)
      ? ((result.collisionData.approachAngle % 360) + 360) % 360
      : 0;

    return {
      ...result,
      occurs,
      probability,
      collisionData: {
        ...result.collisionData,
        collisionEnergy,
        approachAngle,
      },
    };
  }

  /**
   * Emit event to registered handlers
   */
  private emitToHandlers(event: CollisionEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in collision event handler:', error);
      }
    }
  }

  /**
   * Serialize reaction type once for worker usage
   */
  private serializeReactionType(reactionType: ReactionType): SerializableReactionType {
    return {
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

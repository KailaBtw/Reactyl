import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { REACTION_TYPES } from '../chemistry/reactionDatabase';
import { ContainerVisualization } from '../components/ContainerVisualization';
import type { CannonPhysicsEngine } from '../physics/cannonPhysicsEngine';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { type ContainerBounds, MoleculeSpawner } from '../services/MoleculeSpawner';
import type { MoleculeManager } from '../types';

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
  private reactedMolecules: Set<string> = new Set(); // Track which individual molecules have reacted

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

  // Debug tracking
  private debugMode = true; // Enabled by default to catch escape issues
  private escapeCount = 0;
  private lastEscapeLog = 0;
  private readonly escapeLogInterval = 1000; // Log escapes at most once per second

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
    
    // Log debug mode status on initialization
    if (this.debugMode) {
      console.log('🔍 Rate simulation debug mode: ENABLED (escape detection active)');
    }
  }

  /**
   * Initialize simulation with N molecule pairs
   * Uses the same spawning method as adjustConcentration for consistency
   */
  async initializeSimulation(
    substrateData: any,
    nucleophileData: any,
    particleCount: number,
    temperature: number,
    reactionType: string
  ): Promise<void> {
    // Step 1: Clear ALL molecules (not just rate simulation ones)
    // This ensures a clean slate when switching to rate mode
    this.moleculeManager.clearAllMolecules(molecule => {
      if (molecule.hasPhysics && molecule.physicsBody) {
        this.physicsEngine.removeMolecule(molecule);
      }
    });

    // Step 2: Reset state (container should already be visible from showContainer() call)
    this.resetState();

    // Step 3: Configure collision detection system
    this.configureCollisionSystem(reactionType, temperature);

    // Step 4: Store simulation parameters
    this.substrateData = substrateData;
    this.nucleophileData = nucleophileData;
    this.temperature = temperature;
    this.nextPairIndex = 0;

    // Step 5: Use adjustConcentration to spawn molecules (same method as concentration changes)
    // This ensures consistent spawning behavior and proper boundary enforcement
    await this.adjustConcentration(particleCount, temperature);

    // Step 6: Initialize timing
    this.startTime = performance.now();

    console.log(`✅ Rate simulation initialized: ${this.moleculePairs.length} pairs`);
  }

  /**
   * Reset simulation state without removing container visualization
   * Note: Molecules are cleared separately in initializeSimulation to ensure ALL molecules are removed
   */
  private resetState(): void {
    // Reset tracking (molecules are cleared separately)
    this.moleculePairs = [];
    this.reactedMolecules.clear(); // Clear reacted molecules tracking
    this.reactionCount = 0;
    this.collisionCount = 0;
    this.escapeCount = 0; // Reset escape counter
    this.startTime = 0;
    this.nextPairIndex = 0;

    // Unregister previous collision handler if exists
    if ((this as any).collisionHandler) {
      collisionEventSystem.unregisterHandler((this as any).collisionHandler);
      (this as any).collisionHandler = null;
    }
  }

  /**
   * Configure collision detection system
   */
  private configureCollisionSystem(reactionType: string, temperature: number): void {
    // CRITICAL: Set simulation mode to 'rate' so collision system knows to filter same-type collisions
    collisionEventSystem.setSimulationMode('rate');
    
    // Register collision handler
    const collisionHandler = (event: any) => {
      this.handleCollision(event);
    };
    collisionEventSystem.registerHandler(collisionHandler);
    (this as any).collisionHandler = collisionHandler;

    // Set reaction type and temperature
    const reactionTypeObj = REACTION_TYPES[reactionType.toLowerCase()];
    collisionEventSystem.setReactionType(reactionTypeObj || REACTION_TYPES.sn2);
    collisionEventSystem.setTemperature(temperature);
  }

  /**
   * Spawn all molecule pairs with proper boundary enforcement
   * Two-phase approach: spawn with zero velocity in parallel, then apply velocities after all are positioned
   */
  private async spawnAllMolecules(
    substrateData: any,
    nucleophileData: any,
    particleCount: number,
    temperature: number
  ): Promise<void> {
    const bounds = this.getContainerBounds();

    // Phase 1: Spawn all molecules in parallel with zero velocity
    // Molecule data is cached, so parallel spawning is fast after first fetch
    // Since they have zero velocity, they can't escape during spawn
    const spawnPromises = Array.from({ length: particleCount }, (_, i) =>
      this.spawnMoleculePair(substrateData, nucleophileData, i, 0, bounds).catch(error => {
        console.error(`Failed to spawn pair ${i}:`, error);
        return null; // Return null on error to allow Promise.all to complete
      })
    );

    await Promise.all(spawnPromises);

    // Enforce boundaries once after all molecules are spawned
    this.enforceBoundariesForAllMolecules();

    // Phase 2: Apply velocities to all molecules now that they're all positioned within bounds
    this.applyVelocitiesToAllMolecules(temperature);
  }

  /**
   * Apply velocities to all molecules after they're positioned
   */
  private applyVelocitiesToAllMolecules(temperature: number): void {
    this.moleculePairs.forEach(pair => {
      const substrate = this.moleculeManager.getMolecule(pair.substrateId);
      const nucleophile = this.moleculeManager.getMolecule(pair.nucleophileId);

      if (substrate && substrate.hasPhysics && substrate.physicsBody) {
        const velocity = this.calculateTemperatureVelocity(temperature, substrate);
        this.physicsEngine.setVelocity(substrate, velocity);
      }

      if (nucleophile && nucleophile.hasPhysics && nucleophile.physicsBody) {
        const velocity = this.calculateTemperatureVelocity(temperature, nucleophile);
        this.physicsEngine.setVelocity(nucleophile, velocity);
      }
    });
  }

  /**
   * Calculate velocity based on temperature for a molecule
   */
  private calculateTemperatureVelocity(temperature: number, molecule: any): THREE.Vector3 {
    const molecularMassAmu = molecule.molecularProperties?.totalMass || 50; // Default mass
    // Increased baseSpeed for better visibility at high temperatures
    // Higher baseSpeed means less scaling down, making temperature effects more dramatic
    const baseSpeed = 12.0;

    // Use same calculation as MoleculeSpawner
    const BOLTZMANN_CONSTANT = 1.380649e-23;
    const AMU_TO_KG = 1.660539e-27;
    const massKg = molecularMassAmu * AMU_TO_KG;

    const v_rms = Math.sqrt((3 * BOLTZMANN_CONSTANT * temperature) / massKg);
    const referenceTemp = 298;
    const referenceVrms = Math.sqrt((3 * BOLTZMANN_CONSTANT * referenceTemp) / massKg);
    const referenceBaseSpeed = baseSpeed;
    const speedRatio = v_rms / referenceVrms;
    const speed = referenceBaseSpeed * speedRatio;

    // Random direction
    const direction = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();

    return direction.multiplyScalar(speed);
  }

  /**
   * Enforce boundaries for all tracked molecules
   */
  private enforceBoundariesForAllMolecules(): void {
    this.moleculePairs.forEach(pair => {
      const substrate = this.moleculeManager.getMolecule(pair.substrateId);
      const nucleophile = this.moleculeManager.getMolecule(pair.nucleophileId);
      if (substrate) this.clampMoleculeToBounds(substrate);
      if (nucleophile) this.clampMoleculeToBounds(nucleophile);
    });
  }

  /**
   * Spawn a single molecule pair with zero velocity (velocities applied later)
   */
  private async spawnMoleculePair(
    substrateData: any,
    nucleophileData: any,
    index: number,
    temperature: number, // If 0, spawn with zero velocity
    bounds: ContainerBounds
  ): Promise<void> {
    const substrateId = `substrate_${index}`;
    const nucleophileId = `nucleophile_${index}`;

    // Spawn substrate within container bounds
    // If temperature is 0, molecule spawns with zero velocity
    const substrateMolecule = await this.moleculeSpawner.spawnMoleculeInContainer(
      substrateData.cid,
      substrateId,
      bounds,
      {
        applyRandomRotation: true,
        temperature: temperature || 0,
        baseSpeed: temperature ? 12.0 : 0,
      }
    );

    // Spawn nucleophile near substrate, ensuring it stays within bounds
    // Use larger margin to prevent any possibility of escape
    const halfSize = this.boundarySize / 2;
    const safeMargin = 3.0; // Increased margin for safety during spawn
    const safeBoundary = halfSize - safeMargin;
    const offset = 1.5;

    // Get substrate position and ensure it's within safe bounds first
    let substratePos = substrateMolecule.group.position;
    substratePos = {
      x: Math.max(-safeBoundary, Math.min(safeBoundary, substratePos.x)),
      y: Math.max(-safeBoundary, Math.min(safeBoundary, substratePos.y)),
      z: Math.max(-safeBoundary, Math.min(safeBoundary, substratePos.z)),
    };
    
    // Calculate nucleophile position with extra safety margin
    const nucleophilePosition = {
      x: Math.max(-safeBoundary, Math.min(safeBoundary, substratePos.x + offset)),
      y: Math.max(-safeBoundary, Math.min(safeBoundary, substratePos.y)),
      z: Math.max(-safeBoundary, Math.min(safeBoundary, substratePos.z)),
    };

    const nucleophileMolecule = await this.moleculeSpawner.spawnMolecule(
      nucleophileData.cid,
      nucleophileId,
      {
        position: nucleophilePosition,
        applyRandomRotation: true,
        temperature: temperature || 0,
        baseSpeed: temperature ? 12.0 : 0,
      }
    );

    // CRITICAL: Ensure both molecules are within bounds immediately
    // Use handleBoundaryCollision for more aggressive enforcement
    this.handleBoundaryCollision(substrateId);
    this.handleBoundaryCollision(nucleophileId);
    
    // Also clamp as backup
    this.clampMoleculeToBounds(substrateMolecule);
    this.clampMoleculeToBounds(nucleophileMolecule);
    
    // Force physics body positions to match clamped positions
    if (substrateMolecule.hasPhysics && substrateMolecule.physicsBody) {
      const body = substrateMolecule.physicsBody as any;
      const pos = substrateMolecule.group.position;
      body.position.set(pos.x, pos.y, pos.z);
      body.velocity.set(0, 0, 0); // Ensure zero velocity during spawn
    }
    if (nucleophileMolecule.hasPhysics && nucleophileMolecule.physicsBody) {
      const body = nucleophileMolecule.physicsBody as any;
      const pos = nucleophileMolecule.group.position;
      body.position.set(pos.x, pos.y, pos.z);
      body.velocity.set(0, 0, 0); // Ensure zero velocity during spawn
    }

    // Track the pair
    this.moleculePairs.push({
      substrateId,
      nucleophileId,
      reacted: false,
    });
  }

  /**
   * Clamp a molecule's position to ensure it stays within bounds
   */
  private clampMoleculeToBounds(molecule: any): void {
    if (!molecule) return;

    const halfSize = this.boundarySize / 2;
    const margin = 2.0;
    const safeBoundary = halfSize - margin;

    // Get position from physics body (source of truth) or visual
    const body = molecule.hasPhysics && molecule.physicsBody ? (molecule.physicsBody as any) : null;
    const position = body
      ? { x: body.position.x, y: body.position.y, z: body.position.z }
      : molecule.group.position;

    // Clamp to safe bounds
    const clampedPos = {
      x: Math.max(-safeBoundary, Math.min(safeBoundary, position.x)),
      y: Math.max(-safeBoundary, Math.min(safeBoundary, position.y)),
      z: Math.max(-safeBoundary, Math.min(safeBoundary, position.z)),
    };

    // Update both physics and visual positions
    if (body) {
      body.position.set(clampedPos.x, clampedPos.y, clampedPos.z);
    }
    molecule.group.position.set(clampedPos.x, clampedPos.y, clampedPos.z);
  }

  /**
   * Convert MoleculeGroup to MoleculeState format (required by animation manager)
   */
  private createMoleculeState(molecule: any): any {
    return {
      group: molecule.group,
      position: molecule.group.position.clone(),
      rotation: molecule.group.rotation.clone(),
      quaternion: molecule.group.quaternion.clone(),
      velocity: molecule.velocity ? molecule.velocity.clone() : new THREE.Vector3(),
      name: molecule.name,
      cid: molecule.cid || 'unknown',
    };
  }

  /**
   * Handle collision events
   */
  private handleCollision(event: any): void {
    // Check if this collision resulted in a reaction
    // Event structure: { moleculeA, moleculeB, reactionResult: { occurs, ... } }
    const reactionOccurred = event.reactionResult?.occurs === true;
    const reactionResult = event.reactionResult;
    const collisionData = event.collisionData;

    // Get molecule IDs from the event
    const moleculeAId = event.moleculeA?.name || event.moleculeA?.id;
    const moleculeBId = event.moleculeB?.name || event.moleculeB?.id;

    // Only count valid substrate-nucleophile collisions (invalid collisions are filtered earlier)
    const isSubstrateA = moleculeAId?.startsWith('substrate_');
    const isNucleophileA = moleculeAId?.startsWith('nucleophile_');
    const isSubstrateB = moleculeBId?.startsWith('substrate_');
    const isNucleophileB = moleculeBId?.startsWith('nucleophile_');
    const isValidCollision = (isSubstrateA && isNucleophileB) || (isNucleophileA && isSubstrateB);
    
    // Only increment collision count for valid substrate-nucleophile collisions
    if (isValidCollision) {
      this.collisionCount++;
    }

    // Debug logging - log every 100th collision or all reactions
    if (this.collisionCount % 100 === 0 || reactionOccurred || (reactionResult && reactionResult.probability > 0.05)) {
      const prob = reactionResult?.probability ? (reactionResult.probability * 100).toFixed(2) : 'N/A';
      const energy = collisionData?.collisionEnergy ? collisionData.collisionEnergy.toFixed(2) : 'N/A';
      const angle = collisionData?.approachAngle ? collisionData.approachAngle.toFixed(1) : 'N/A';
      console.log(
        `💥 Collision #${this.collisionCount}: ${moleculeAId} + ${moleculeBId} | ` +
        `Reaction: ${reactionOccurred ? 'YES' : 'NO'} | ` +
        `Prob: ${prob}% | ` +
        `Energy: ${energy} kJ/mol | ` +
        `Angle: ${angle}°`
      );
    }

    if (reactionOccurred) {
      if (moleculeAId && moleculeBId) {
        // In rate mode, any substrate can react with any nucleophile (cross-pair reactions)
        // Check if either molecule has already reacted (prevent double-counting)
        const isSubstrateA = moleculeAId.startsWith('substrate_');
        const isNucleophileA = moleculeAId.startsWith('nucleophile_');
        const isSubstrateB = moleculeBId.startsWith('substrate_');
        const isNucleophileB = moleculeBId.startsWith('nucleophile_');
        
        // Only process if it's a valid substrate-nucleophile pair
        const isValidPair = (isSubstrateA && isNucleophileB) || (isNucleophileA && isSubstrateB);
        
        if (isValidPair) {
          // Check if either molecule has already reacted
          if (!this.reactedMolecules.has(moleculeAId) && !this.reactedMolecules.has(moleculeBId)) {
            // Mark both molecules as reacted
            this.reactedMolecules.add(moleculeAId);
            this.reactedMolecules.add(moleculeBId);
            this.reactionCount++;
            
            console.log(`✅ Reaction tracked: ${moleculeAId} + ${moleculeBId} (Total: ${this.reactionCount})`);

            // Execute visual reaction animation
            this.executeVisualReaction(event, moleculeAId, moleculeBId);
            
            // UI state will be updated automatically via polling in App.tsx (every 500ms)
          } else {
            // One or both molecules already reacted
            if (this.reactedMolecules.has(moleculeAId) || this.reactedMolecules.has(moleculeBId)) {
              // Silently skip - molecule already reacted
            }
          }
        } else {
          // Invalid pair (same-type collision) - should have been filtered earlier
          console.warn(`⚠️ Invalid reaction pair: ${moleculeAId} + ${moleculeBId} (not substrate-nucleophile)`);
        }
      } else {
        console.log(`⚠️ Missing molecule IDs: A=${moleculeAId}, B=${moleculeBId}`);
      }
    }
  }

  /**
   * Execute visual reaction animation for a reacted pair
   * Uses requestIdleCallback or setTimeout to defer execution and avoid blocking UI
   */
  private executeVisualReaction(event: any, moleculeAId: string, moleculeBId: string): void {
    // Defer animation to next idle period to avoid blocking UI/physics loop
    // This allows multiple reactions to be queued without lag
    const scheduleAnimation = (callback: () => void) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(callback, { timeout: 100 }); // Max 100ms delay
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(callback, 0);
      }
    };

    scheduleAnimation(() => {
      try {
        // Get molecules from manager
        const moleculeA = this.moleculeManager.getMolecule(moleculeAId);
        const moleculeB = this.moleculeManager.getMolecule(moleculeBId);

        // Check if molecules still exist
        if (!moleculeA || !moleculeB) {
          console.log(`⚠️ Cannot animate reaction: molecules not found (${moleculeAId}, ${moleculeBId})`);
          return;
        }

        // Determine which is substrate and which is nucleophile based on naming convention
        // In rate mode, substrates are named "substrate_X" and nucleophiles "nucleophile_X"
        let substrate: any;
        let nucleophile: any;

        if (moleculeAId.startsWith('substrate_')) {
          substrate = moleculeA;
          nucleophile = moleculeB;
        } else if (moleculeBId.startsWith('substrate_')) {
          substrate = moleculeB;
          nucleophile = moleculeA;
        } else {
          // Fallback: use first molecule as substrate, second as nucleophile
          substrate = moleculeA;
          nucleophile = moleculeB;
        }

        // Get reaction type from UI state or collision event system
        const uiState = (window as any).uiState;
        const reactionType = uiState?.reactionType || collisionEventSystem.getReactionType()?.id || 'sn2';
        const reactionTypeLower = reactionType.toLowerCase();

        // Execute appropriate reaction based on reaction type

        if (reactionTypeLower === 'sn2') {
          // Mark both molecules as products immediately (they were detected as reacting)
          substrate.isProduct = true;
          nucleophile.isProduct = true;
          
          // Apply outlines immediately - even if reaction execution fails, they're still products
          try {
            substrate.addOutline();
          } catch (outlineError) {
            console.error(`❌ Error applying outline to ${moleculeAId}: ${outlineError}`);
          }
          
          try {
            nucleophile.addOutline();
          } catch (outlineError) {
            console.error(`❌ Error applying outline to ${moleculeBId}: ${outlineError}`);
          }
          
          // Use simpler ReactionGraphics for rate mode - modifies molecule in place, more reliable
          import('../graphics/reactions').then(({ reactionGraphics }) => {
            try {
              reactionGraphics.executeSN2Reaction(substrate, nucleophile);
              
              // Clear reaction flags - molecule is now a product and won't react again
              substrate.reactionInProgress = false;
              nucleophile.reactionInProgress = false;
            } catch (error) {
              console.error(`❌ Error executing reaction: ${error}`);
              // Clear flags on error
              substrate.reactionInProgress = false;
              nucleophile.reactionInProgress = false;
            }
          });
        } else {
          // For SN1 and E2, we could add similar handling if reaction methods exist
          console.log(`⚠️ Reaction not yet implemented for reaction type: ${reactionTypeLower}`);
          // Clear flags
          substrate.reactionInProgress = false;
          nucleophile.reactionInProgress = false;
        }
      } catch (error) {
        console.error(`❌ Error executing visual reaction: ${error}`);
        console.error('Visual reaction execution error:', error);
      }
    });
  }

  /**
   * Enable/disable debug mode for boundary tracking
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Handle boundary collisions (physics is updated elsewhere)
   * Checks ALL rate simulation molecules directly from the manager to ensure none escape
   * Runs MULTIPLE times per frame to catch any escapes
   */
  update(_deltaTime: number): void {
    // Get ALL molecules from manager and check boundary for rate simulation molecules
    // This is more reliable than relying on moleculePairs array which may have timing issues
    const allMolecules = this.moleculeManager.getAllMolecules();
    
    // Check boundary for ALL rate simulation molecules (substrate_X or nucleophile_X)
    // This ensures we never miss any molecule, regardless of pair tracking status
    // Run TWICE per frame: once before and once after physics updates
    for (const molecule of allMolecules) {
      const name = molecule.name;
      // Only check rate simulation molecules
      if (name.startsWith('substrate_') || name.startsWith('nucleophile_')) {
        this.handleBoundaryCollision(name);
      }
    }
  }

  /**
   * Force boundary check on all molecules (call after physics step)
   */
  enforceBoundaries(): void {
    const allMolecules = this.moleculeManager.getAllMolecules();
    for (const molecule of allMolecules) {
      const name = molecule.name;
      if (name.startsWith('substrate_') || name.startsWith('nucleophile_')) {
        this.handleBoundaryCollision(name);
      }
    }
  }

  /**
   * Handle wall collisions (elastic bouncing)
   * Always clamps positions to prevent escape, bounces when hitting boundaries
   */
  private handleBoundaryCollision(moleculeId: string): void {
    const molecule = this.moleculeManager.getMolecule(moleculeId);
    if (!molecule || !molecule.group) return;

    const halfSize = this.boundarySize / 2;
    const margin = 2.0; // Increased safety margin to prevent escape
    const safeBoundary = halfSize - margin;
    const absoluteBoundary = halfSize; // Hard boundary - molecules should NEVER exceed this

    // Get physics body position (source of truth) - read directly every time
    let position: { x: number; y: number; z: number };
    if (molecule.hasPhysics && molecule.physicsBody) {
      const body = molecule.physicsBody as any;
      // Read position directly from physics body (most up-to-date)
      position = {
        x: body.position.x || 0,
        y: body.position.y || 0,
        z: body.position.z || 0,
      };
    } else {
      // Fallback to visual position if no physics body
      position = {
        x: molecule.group.position.x || 0,
        y: molecule.group.position.y || 0,
        z: molecule.group.position.z || 0,
      };
    }

    // Validate position values (defensive check)
    if (!isFinite(position.x) || !isFinite(position.y) || !isFinite(position.z)) {
      console.warn(`⚠️ Invalid position for molecule ${moleculeId}, resetting to center`);
      position = { x: 0, y: 0, z: 0 };
    }

    // DEBUG: Check for escape (beyond absolute boundary) - LOG BEFORE CLAMPING
    const escaped = 
      Math.abs(position.x) > absoluteBoundary ||
      Math.abs(position.y) > absoluteBoundary ||
      Math.abs(position.z) > absoluteBoundary;

    if (escaped) {
      this.escapeCount++;
      const now = performance.now();
      if (this.debugMode) {
        const distance = Math.max(
          Math.abs(position.x) - absoluteBoundary,
          Math.abs(position.y) - absoluteBoundary,
          Math.abs(position.z) - absoluteBoundary
        );
        // Always log first escape, then throttle subsequent logs (but log more frequently)
        if (this.escapeCount === 1 || (now - this.lastEscapeLog > this.escapeLogInterval / 2)) {
          const velocity = molecule.velocity ? 
            `Vel: (${molecule.velocity.x.toFixed(2)}, ${molecule.velocity.y.toFixed(2)}, ${molecule.velocity.z.toFixed(2)})` : 
            'Vel: unknown';
          console.warn(
            `🚨 MOLECULE ESCAPE DETECTED: ${moleculeId} | ` +
            `Pos: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) | ` +
            `${velocity} | ` +
            `Boundary: ±${absoluteBoundary.toFixed(2)} | ` +
            `Distance: ${distance.toFixed(2)} | ` +
            `Total escapes: ${this.escapeCount}`
          );
          this.lastEscapeLog = now;
        }
      }
    }

    const currentVelocity = molecule.velocity ? molecule.velocity.clone() : new THREE.Vector3(0, 0, 0);
    let bounced = false;

    // ALWAYS clamp positions to safe bounds (prevents escape)
    // Use tighter clamping - if molecule escaped, clamp more aggressively
    const clampBoundary = escaped ? safeBoundary - 0.5 : safeBoundary; // Extra margin if escaped
    const clampedPos = {
      x: Math.max(-clampBoundary, Math.min(clampBoundary, position.x)),
      y: Math.max(-clampBoundary, Math.min(clampBoundary, position.y)),
      z: Math.max(-clampBoundary, Math.min(clampBoundary, position.z)),
    };

    // Check if molecule hit boundary (for velocity reversal)
    // Only reverse velocity if molecule was actually outside bounds
    if (Math.abs(position.x) > safeBoundary) {
      // Only reverse if velocity is pointing outward
      if ((position.x > 0 && currentVelocity.x > 0) || (position.x < 0 && currentVelocity.x < 0)) {
        currentVelocity.x *= -1.0; // Perfectly elastic bounce - energy conserved
      }
      bounced = true;
    }

    if (Math.abs(position.y) > safeBoundary) {
      if ((position.y > 0 && currentVelocity.y > 0) || (position.y < 0 && currentVelocity.y < 0)) {
        currentVelocity.y *= -1.0; // Perfectly elastic bounce - energy conserved
      }
      bounced = true;
    }

    if (Math.abs(position.z) > safeBoundary) {
      if ((position.z > 0 && currentVelocity.z > 0) || (position.z < 0 && currentVelocity.z < 0)) {
        currentVelocity.z *= -1.0; // Perfectly elastic bounce - energy conserved
      }
      bounced = true;
    }

    // ALWAYS update positions (even if no bounce) to prevent escape
    // Update physics body position and velocity
    if (molecule.hasPhysics && molecule.physicsBody) {
      const body = molecule.physicsBody as any;
      // Always update physics body position to clamped position
      body.position.set(clampedPos.x, clampedPos.y, clampedPos.z);
      
      // If molecule escaped, reduce velocity to prevent immediate re-escape
      if (escaped) {
        const velScale = 0.7; // Reduce velocity by 30% when escaping
        body.velocity.x *= velScale;
        body.velocity.y *= velScale;
        body.velocity.z *= velScale;
        if (molecule.velocity) {
          molecule.velocity.multiplyScalar(velScale);
        }
        // Also reverse velocity component pointing outward
        if (Math.abs(position.x) > absoluteBoundary) {
          body.velocity.x *= -0.5; // Reverse and reduce
        }
        if (Math.abs(position.y) > absoluteBoundary) {
          body.velocity.y *= -0.5; // Reverse and reduce
        }
        if (Math.abs(position.z) > absoluteBoundary) {
          body.velocity.z *= -0.5; // Reverse and reduce
        }
        currentVelocity.set(body.velocity.x, body.velocity.y, body.velocity.z);
        bounced = true; // Treat escape as a bounce
      }
      
      // Only update velocity if there was a bounce
      if (bounced) {
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
      }

      body.wakeUp(); // Ensure body stays active
    }

    // ALWAYS update visual position to match clamped position (critical for preventing escape)
    // This ensures visual and physics positions stay in sync
    molecule.group.position.set(clampedPos.x, clampedPos.y, clampedPos.z);
    
    // Update velocity if there was a bounce
    if (bounced) {
      if (molecule.velocity) {
        molecule.velocity.copy(currentVelocity);
      }
      // Also update through physics engine for consistency (if molecule has physics)
      if (molecule.hasPhysics) {
        this.physicsEngine.setVelocity(molecule, currentVelocity);
      }
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
    escapeCount?: number; // number of escape attempts detected (debug)
  } {
    const elapsedTime = (performance.now() - this.startTime) / 1000; // seconds
    // Average reaction rate: total reactions / elapsed time
    // Note: This is average rate. Instantaneous rate would require tracking concentration changes over time intervals
    const reactionRate = elapsedTime > 0 ? this.reactionCount / elapsedTime : 0;
    
    // Calculate remaining reactants based on individual molecules that have reacted
    // Each reaction consumes 1 substrate and 1 nucleophile
    const totalMolecules = this.moleculePairs.length * 2; // Each pair has 2 molecules
    const reactedMoleculeCount = this.reactedMolecules.size;
    const remainingMolecules = totalMolecules - reactedMoleculeCount;
    const remainingReactants = totalMolecules > 0 ? (remainingMolecules / totalMolecules) * 100 : 100;

    const metrics: any = {
      reactionRate, // reactions per second
      remainingReactants, // percentage of unreacted molecules
      productsFormed: this.reactionCount,
      collisionCount: this.collisionCount,
      elapsedTime,
    };

    // Include escape count in debug mode
    if (this.debugMode) {
      metrics.escapeCount = this.escapeCount;
    }

    return metrics;
  }

  /**
   * Get escape statistics (for debugging)
   */
  getEscapeStats(): { escapeCount: number; debugMode: boolean } {
    return {
      escapeCount: this.escapeCount,
      debugMode: this.debugMode,
    };
  }

  /**
   * Reset escape counter
   */
  resetEscapeCounter(): void {
    this.escapeCount = 0;
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
      // Add molecules - spawn SEQUENTIALLY with immediate boundary enforcement
      // This prevents molecules from escaping during parallel spawning
      const bounds = this.getContainerBounds();
      
      // Spawn sequentially to ensure boundaries are enforced immediately after each spawn
      for (let i = 0; i < difference; i++) {
        const index = this.nextPairIndex++;
        // Spawn one pair at a time
        await this.spawnMoleculePair(this.substrateData, this.nucleophileData, index, 0, bounds);
        
        // CRITICAL: Enforce boundaries immediately after each spawn
        // This prevents any molecule from escaping before the next one spawns
        const substrate = this.moleculeManager.getMolecule(`substrate_${index}`);
        const nucleophile = this.moleculeManager.getMolecule(`nucleophile_${index}`);
        if (substrate) {
          this.handleBoundaryCollision(`substrate_${index}`);
        }
        if (nucleophile) {
          this.handleBoundaryCollision(`nucleophile_${index}`);
        }
      }
      
      // Final boundary enforcement pass, then apply velocities
      this.enforceBoundariesForAllMolecules();
      this.applyVelocitiesToAllMolecules(spawnTemperature);
      
      // One more boundary check after velocities are applied
      this.enforceBoundariesForAllMolecules();
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
   * Get container visualization instance
   */
  getContainerVisualization(): ContainerVisualization {
    return this.containerVisualization;
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
   * Removes container visualization (call showContainer() separately if needed)
   */
  clear(): void {
    // Clear all molecules
    this.moleculeManager.clearAllMolecules(molecule => {
      if (molecule.hasPhysics && molecule.physicsBody) {
        this.physicsEngine.removeMolecule(molecule);
      }
    });

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

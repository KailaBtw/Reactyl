import * as THREE from 'three';
import { ReactionOrchestrator, ReactionState } from './ReactionOrchestrator';
import { reactionEventBus } from '../events/ReactionEventBus';
import { getReactionConfig } from '../config/ReactionConfig';
import { log } from '../utils/debug';

/**
 * Unified Simulation System
 * 
 * Replaces the fragmented update system with a single, coordinated loop that:
 * 1. Updates physics
 * 2. Checks for collisions
 * 3. Processes reactions
 * 4. Updates visuals
 * 5. Syncs all systems
 */
export class UnifiedSimulation {
  private orchestrator: ReactionOrchestrator;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  
  // Animation loop
  private animationId: number | null = null;
  private lastTime: number = 0;
  private deltaTime: number = 0;
  private isRunning: boolean = false;
  
  // Performance monitoring
  private frameCount: number = 0;
  private fps: number = 0;
  private lastFpsUpdate: number = 0;
  
  // Simulation state
  private isPaused: boolean = false;
  private pauseReason: string = '';
  private pauseStartTime: number = 0;
  
  constructor(
    orchestrator: ReactionOrchestrator,
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) {
    this.orchestrator = orchestrator;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    this.setupEventHandlers();
    log('🎬 UnifiedSimulation initialized');
  }
  
  /**
   * Set up event handlers for coordinated behavior
   */
  private setupEventHandlers(): void {
    // Listen for reaction events
    reactionEventBus.on('reaction-started', (event) => {
      this.handleReactionStarted(event);
    });
    
    reactionEventBus.on('reaction-completed', (event) => {
      this.handleReactionCompleted(event);
    });
    
    reactionEventBus.on('collision-detected', (event) => {
      this.handleCollisionDetected(event);
    });
    
    reactionEventBus.on('error-occurred', (event) => {
      this.handleErrorOccurred(event);
    });
    
    log('📡 Event handlers registered');
  }
  
  /**
   * Start the unified simulation loop
   */
  start(): void {
    if (this.isRunning) {
      log('⚠️ Simulation already running');
      return;
    }
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame((time) => this.updateLoop(time));
    
    reactionEventBus.emitSimulationResumed();
    log('🚀 Unified simulation started');
  }
  
  /**
   * Stop the unified simulation loop
   */
  stop(): void {
    if (!this.isRunning) {
      log('⚠️ Simulation not running');
      return;
    }
    
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    reactionEventBus.emitSimulationPaused('Manual stop');
    log('⏹️ Unified simulation stopped');
  }
  
  /**
   * Pause the simulation
   */
  pause(reason: string = 'Manual pause'): void {
    if (this.isPaused) {
      log('⚠️ Simulation already paused');
      return;
    }
    
    this.isPaused = true;
    this.pauseReason = reason;
    this.pauseStartTime = performance.now();
    
    reactionEventBus.emitSimulationPaused(reason);
    log(`⏸️ Simulation paused: ${reason}`);
  }
  
  /**
   * Resume the simulation
   */
  resume(): void {
    if (!this.isPaused) {
      log('⚠️ Simulation not paused');
      return;
    }
    
    this.isPaused = false;
    const pauseDuration = performance.now() - this.pauseStartTime;
    
    reactionEventBus.emitSimulationResumed();
    log(`▶️ Simulation resumed (paused for ${pauseDuration.toFixed(0)}ms)`);
  }
  
  /**
   * Main update loop - coordinates all systems
   */
  private updateLoop(currentTime: number): void {
    if (!this.isRunning) return;
    
    // Calculate delta time
    this.deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Update FPS counter
    this.updateFpsCounter(currentTime);
    
    // Skip update if paused
    if (this.isPaused) {
      this.animationId = requestAnimationFrame((time) => this.updateLoop(time));
      return;
    }
    
    try {
      // 1. Update physics
      this.updatePhysics(this.deltaTime);
      
      // 2. Check for collisions
      this.checkCollisions();
      
      // 3. Process reactions
      this.processReactions();
      
      // 4. Update visuals
      this.updateVisuals();
      
      // 5. Sync all systems
      this.syncAllSystems();
      
      // 6. Render the scene
      this.render();
      
    } catch (error) {
      log(`❌ Error in update loop: ${error}`);
      reactionEventBus.emitErrorOccurred(String(error), 'Update loop');
    }
    
    // Continue the loop
    this.animationId = requestAnimationFrame((time) => this.updateLoop(time));
  }
  
  /**
   * Update physics simulation
   */
  private updatePhysics(deltaTime: number): void {
    const state = this.orchestrator.getState();
    
    if (state.physics.isSimulationActive) {
      // Actually call the physics engine step
      this.orchestrator.getPhysicsEngine().step(deltaTime);
      
      // Debug: log physics step occasionally
      if (this.frameCount % 60 === 0) { // Log every 60 frames (1 second at 60fps)
        log(`⚙️ Physics engine step called (deltaTime: ${deltaTime.toFixed(3)}s)`);
      }
    } else {
      // Debug: log when physics is not active
      if (this.frameCount % 60 === 0) { // Log every 60 frames (1 second at 60fps)
        log('⚠️ Physics simulation not active - no collisions will be detected');
      }
    }
  }
  
  /**
   * Check for collisions - handled by physics engine
   */
  private checkCollisions(): void {
    // Collision detection is handled by the physics engine
    // No manual collision checking needed
  }
  
  /**
   * Process reactions
   */
  private processReactions(): void {
    const state = this.orchestrator.getState();
    
    if (state.reaction.isInProgress) {
      // Reaction processing is handled by the orchestrator
      // This is where we would process any ongoing reactions
      // but the orchestrator manages this internally
    }
  }
  
  /**
   * Update visual elements
   */
  private updateVisuals(): void {
    const state = this.orchestrator.getState();
    
    if (state.visual.needsUpdate) {
      // Update any visual elements that need refreshing
      this.updateMoleculeVisuals();
      this.updateReactionVisuals();
      
      // Mark as updated
      state.visual.needsUpdate = false;
      state.visual.lastUpdateTime = performance.now();
    }
  }
  
  /**
   * Update molecule visual representations
   */
  private updateMoleculeVisuals(): void {
    const state = this.orchestrator.getState();
    
    if (state.molecules.substrate) {
      this.updateMoleculeVisual(state.molecules.substrate);
    }
    
    if (state.molecules.nucleophile) {
      this.updateMoleculeVisual(state.molecules.nucleophile);
    }
  }
  
  /**
   * Update a single molecule's visual representation
   */
  private updateMoleculeVisual(molecule: any): void {
    // Update molecule position, rotation, etc.
    // This would sync the visual representation with the physics state
  }
  
  /**
   * Update reaction-specific visual elements
   */
  private updateReactionVisuals(): void {
    const state = this.orchestrator.getState();
    
    if (state.reaction.isInProgress) {
      // Update reaction progress indicators
      // Update energy profiles
      // Update bond changes
      // etc.
    }
  }
  
  /**
   * Sync all systems to ensure consistency
   */
  private syncAllSystems(): void {
    const state = this.orchestrator.getState();
    
    // Sync physics with visuals
    if (state.molecules.substrate) {
      this.syncMoleculeSystem(state.molecules.substrate);
    }
    
    if (state.molecules.nucleophile) {
      this.syncMoleculeSystem(state.molecules.nucleophile);
    }
  }
  
  /**
   * Sync a molecule's physics and visual systems
   */
  private syncMoleculeSystem(molecule: any): void {
    // Ensure physics and visual representations are in sync
    // This prevents the physics engine from overriding visual changes
  }
  
  /**
   * Render the scene
   */
  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Update FPS counter
   */
  private updateFpsCounter(currentTime: number): void {
    this.frameCount++;
    
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
      
      // Log FPS in debug mode
      if (this.fps < 30) {
        log(`⚠️ Low FPS: ${this.fps}`);
      }
    }
  }
  
  /**
   * Handle reaction started event
   */
  private handleReactionStarted(event: any): void {
    log(`🎯 Reaction started: ${event.data.reactionType}`);
    
    // Update visual indicators
    // Show reaction progress
    // etc.
  }
  
  /**
   * Handle reaction completed event
   */
  private handleReactionCompleted(event: any): void {
    log(`✅ Reaction completed: ${event.data.reactionType}`);
    
    // Update visual indicators
    // Show products
    // Pause simulation if configured
    const config = getReactionConfig(event.data.reactionType);
    if (config.visual.pauseAfterReaction) {
      this.pause('Reaction completed');
      
      // Auto-resume after configured duration
      setTimeout(() => {
        this.resume();
      }, config.visual.pauseDuration);
    }
  }
  
  /**
   * Handle collision detected event
   */
  private handleCollisionDetected(event: any): void {
    log(`💥 Collision detected: angle=${event.data.approachAngle.toFixed(1)}°, energy=${event.data.collisionEnergy.toExponential(2)} kJ/mol`);
    
    // Update UI with calculated reaction probability
    if ((window as any).updateUIState) {
      (window as any).updateUIState({
        reactionProbability: event.data.reactionProbability * 100 // Convert to percentage
      });
      log(`📊 Updated UI reaction probability: ${(event.data.reactionProbability * 100).toFixed(1)}%`);
    }
    
    // Update visual indicators
    // Show collision effects
    // etc.
  }
  
  /**
   * Handle error occurred event
   */
  private handleErrorOccurred(event: any): void {
    log(`❌ Error in ${event.data.context}: ${event.data.error}`);
    
    // Handle error gracefully
    // Maybe pause simulation
    // Show error message
    // etc.
  }
  
  /**
   * Get current simulation state
   */
  getState(): {
    isRunning: boolean;
    isPaused: boolean;
    pauseReason: string;
    fps: number;
    frameCount: number;
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      pauseReason: this.pauseReason,
      fps: this.fps,
      frameCount: this.frameCount
    };
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    fps: number;
    frameCount: number;
    deltaTime: number;
    isRunning: boolean;
    isPaused: boolean;
  } {
    return {
      fps: this.fps,
      frameCount: this.frameCount,
      deltaTime: this.deltaTime,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    };
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    reactionEventBus.dispose();
    log('🧹 UnifiedSimulation disposed');
  }
}



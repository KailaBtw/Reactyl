import { log } from '../utils/debug';

/**
 * Event Types for Reaction System
 */
export type ReactionEventType = 
  | 'molecule-loaded'
  | 'molecule-oriented'
  | 'physics-configured'
  | 'collision-detected'
  | 'reaction-started'
  | 'reaction-progress'
  | 'reaction-completed'
  | 'simulation-paused'
  | 'simulation-resumed'
  | 'error-occurred';

/**
 * Event Data Interfaces
 */
export interface MoleculeLoadedEvent {
  type: 'molecule-loaded';
  data: {
    molecule: {
      name: string;
      cid: string;
      position: { x: number; y: number; z: number };
    };
  };
}

export interface MoleculeOrientedEvent {
  type: 'molecule-oriented';
  data: {
    reactionType: string;
    substrateRotation: { x: number; y: number; z: number };
    nucleophileRotation: { x: number; y: number; z: number };
  };
}

export interface PhysicsConfiguredEvent {
  type: 'physics-configured';
  data: {
    approachAngle: number;
    relativeVelocity: number;
    impactParameter: number;
  };
}

export interface CollisionDetectedEvent {
  type: 'collision-detected';
  data: {
    collisionEnergy: number;
    approachAngle: number;
    reactionProbability: number;
  };
}

export interface ReactionStartedEvent {
  type: 'reaction-started';
  data: {
    reactionType: string;
    substrate: string;
    nucleophile: string;
  };
}

export interface ReactionProgressEvent {
  type: 'reaction-progress';
  data: {
    progress: number;
    currentStep: string;
  };
}

export interface ReactionCompletedEvent {
  type: 'reaction-completed';
  data: {
    reactionType: string;
    success: boolean;
    products: string[];
  };
}

export interface SimulationPausedEvent {
  type: 'simulation-paused';
  data: {
    reason: string;
    timestamp: number;
  };
}

export interface SimulationResumedEvent {
  type: 'simulation-resumed';
  data: {
    timestamp: number;
  };
}

export interface ErrorOccurredEvent {
  type: 'error-occurred';
  data: {
    error: string;
    context: string;
    timestamp: number;
  };
}

/**
 * Union type for all event data
 */
export type ReactionEventData = 
  | MoleculeLoadedEvent
  | MoleculeOrientedEvent
  | PhysicsConfiguredEvent
  | CollisionDetectedEvent
  | ReactionStartedEvent
  | ReactionProgressEvent
  | ReactionCompletedEvent
  | SimulationPausedEvent
  | SimulationResumedEvent
  | ErrorOccurredEvent;

/**
 * Event Handler Function Type
 */
export type ReactionEventHandler = (event: ReactionEventData) => void;

/**
 * Reaction Event Bus
 * 
 * Centralized event system for clean communication between all reaction-related systems.
 * This replaces direct method calls with event-driven architecture for better decoupling.
 */
export class ReactionEventBus {
  private handlers: Map<ReactionEventType, ReactionEventHandler[]> = new Map();
  private eventHistory: ReactionEventData[] = [];
  private maxHistorySize: number = 100;
  private isDebugMode: boolean = false;
  
  constructor(debugMode: boolean = false) {
    this.isDebugMode = debugMode;
    this.initializeEventTypes();
    log('📡 ReactionEventBus initialized');
  }
  
  /**
   * Initialize all event types with empty handler arrays
   */
  private initializeEventTypes(): void {
    const eventTypes: ReactionEventType[] = [
      'molecule-loaded',
      'molecule-oriented',
      'physics-configured',
      'collision-detected',
      'reaction-started',
      'reaction-progress',
      'reaction-completed',
      'simulation-paused',
      'simulation-resumed',
      'error-occurred'
    ];
    
    eventTypes.forEach(eventType => {
      this.handlers.set(eventType, []);
    });
  }
  
  /**
   * Register an event handler for a specific event type
   */
  on(eventType: ReactionEventType, handler: ReactionEventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
    
    if (this.isDebugMode) {
      log(`📡 Registered handler for ${eventType}`);
    }
  }
  
  /**
   * Remove an event handler
   */
  off(eventType: ReactionEventType, handler: ReactionEventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.handlers.set(eventType, handlers);
      
      if (this.isDebugMode) {
        log(`📡 Removed handler for ${eventType}`);
      }
    }
  }
  
  /**
   * Emit an event to all registered handlers
   */
  emit(event: ReactionEventData): void {
    const handlers = this.handlers.get(event.type) || [];
    
    // Add to event history
    this.addToHistory(event);
    
    // Log event in debug mode
    if (this.isDebugMode) {
      log(`📡 Emitting ${event.type}:`, event.data);
    }
    
    // Call all handlers
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        log(`❌ Error in event handler for ${event.type}: ${error}`);
        this.emit({
          type: 'error-occurred',
          data: {
            error: String(error),
            context: `Handler for ${event.type}`,
            timestamp: Date.now()
          }
        });
      }
    });
  }
  
  /**
   * Add event to history with size limit
   */
  private addToHistory(event: ReactionEventData): void {
    this.eventHistory.push(event);
    
    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
  
  /**
   * Get event history
   */
  getHistory(): ReactionEventData[] {
    return [...this.eventHistory];
  }
  
  /**
   * Get events of a specific type from history
   */
  getEventsByType(eventType: ReactionEventType): ReactionEventData[] {
    return this.eventHistory.filter(event => event.type === eventType);
  }
  
  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    log('📡 Event history cleared');
  }
  
  /**
   * Get number of registered handlers for an event type
   */
  getHandlerCount(eventType: ReactionEventType): number {
    return this.handlers.get(eventType)?.length || 0;
  }
  
  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): ReactionEventType[] {
    return Array.from(this.handlers.keys());
  }
  
  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled;
    log(`📡 Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Create a one-time event listener
   */
  once(eventType: ReactionEventType, handler: ReactionEventHandler): void {
    const onceHandler = (event: ReactionEventData) => {
      handler(event);
      this.off(eventType, onceHandler);
    };
    
    this.on(eventType, onceHandler);
  }
  
  /**
   * Wait for a specific event to occur
   */
  waitForEvent(eventType: ReactionEventType, timeout: number = 5000): Promise<ReactionEventData> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${eventType}`));
      }, timeout);
      
      this.once(eventType, (event) => {
        clearTimeout(timeoutId);
        resolve(event);
      });
    });
  }
  
  /**
   * Emit a molecule loaded event
   */
  emitMoleculeLoaded(molecule: { name: string; cid: string; position: { x: number; y: number; z: number } }): void {
    this.emit({
      type: 'molecule-loaded',
      data: { molecule }
    });
  }
  
  /**
   * Emit a molecule oriented event
   */
  emitMoleculeOriented(reactionType: string, substrateRotation: { x: number; y: number; z: number }, nucleophileRotation: { x: number; y: number; z: number }): void {
    this.emit({
      type: 'molecule-oriented',
      data: { reactionType, substrateRotation, nucleophileRotation }
    });
  }
  
  /**
   * Emit a physics configured event
   */
  emitPhysicsConfigured(approachAngle: number, relativeVelocity: number, impactParameter: number): void {
    this.emit({
      type: 'physics-configured',
      data: { approachAngle, relativeVelocity, impactParameter }
    });
  }
  
  /**
   * Emit a collision detected event
   */
  emitCollisionDetected(collisionEnergy: number, approachAngle: number, reactionProbability: number): void {
    this.emit({
      type: 'collision-detected',
      data: { collisionEnergy, approachAngle, reactionProbability }
    });
  }
  
  /**
   * Emit a reaction started event
   */
  emitReactionStarted(reactionType: string, substrate: string, nucleophile: string): void {
    this.emit({
      type: 'reaction-started',
      data: { reactionType, substrate, nucleophile }
    });
  }
  
  /**
   * Emit a reaction progress event
   */
  emitReactionProgress(progress: number, currentStep: string): void {
    this.emit({
      type: 'reaction-progress',
      data: { progress, currentStep }
    });
  }
  
  /**
   * Emit a reaction completed event
   */
  emitReactionCompleted(reactionType: string, success: boolean, products: string[]): void {
    this.emit({
      type: 'reaction-completed',
      data: { reactionType, success, products }
    });
  }
  
  /**
   * Emit a simulation paused event
   */
  emitSimulationPaused(reason: string): void {
    this.emit({
      type: 'simulation-paused',
      data: { reason, timestamp: Date.now() }
    });
  }
  
  /**
   * Emit a simulation resumed event
   */
  emitSimulationResumed(): void {
    this.emit({
      type: 'simulation-resumed',
      data: { timestamp: Date.now() }
    });
  }
  
  /**
   * Emit an error occurred event
   */
  emitErrorOccurred(error: string, context: string): void {
    this.emit({
      type: 'error-occurred',
      data: { error, context, timestamp: Date.now() }
    });
  }
  
  /**
   * Clean up all handlers and history
   */
  dispose(): void {
    this.handlers.clear();
    this.eventHistory = [];
    log('📡 ReactionEventBus disposed');
  }
}

/**
 * Global event bus instance
 */
export const reactionEventBus = new ReactionEventBus(true); // Enable debug mode by default



/**
 * Worker Manager Service
 * Manages lifecycle and communication with physics and chemistry web workers
 */

import type {
  ChemistryWorkerMessage,
  ChemistryWorkerResponse,
  PhysicsWorkerMessage,
  PhysicsWorkerResponse,
  WorkerConfig,
} from '../workers/types';

export class WorkerManager {
  private physicsWorker: Worker | null = null;
  private chemistryWorker: Worker | null = null;
  private config: WorkerConfig;
  private messageIdCounter = 0;
  private pendingPhysicsMessages = new Map<
    number,
    {
      resolve: (value: PhysicsWorkerResponse) => void;
      reject: (error: Error) => void;
      timestamp: number;
    }
  >();
  private pendingChemistryMessages = new Map<
    number,
    {
      resolve: (value: ChemistryWorkerResponse) => void;
      reject: (error: Error) => void;
      timestamp: number;
    }
  >();
  private physicsWorkerEnabled = false;
  private chemistryWorkerEnabled = false;

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = {
      useWorkers: config.useWorkers ?? true,
      physicsWorkerEnabled: config.physicsWorkerEnabled ?? false, // Start disabled, enable via feature flag
      chemistryWorkerEnabled: config.chemistryWorkerEnabled ?? false, // Start disabled, enable via feature flag
      maxWorkerQueueSize: config.maxWorkerQueueSize ?? 100,
    };
  }

  /**
   * Initialize workers if enabled
   */
  async initialize(): Promise<void> {
    if (!this.config.useWorkers) {
      console.log('[WorkerManager] Workers disabled in config');
      return;
    }

    try {
      if (this.config.physicsWorkerEnabled) {
        await this.initPhysicsWorker();
      }
      if (this.config.chemistryWorkerEnabled) {
        await this.initChemistryWorker();
      }
    } catch (error) {
      console.error('[WorkerManager] Failed to initialize workers:', error);
      // Fallback to main thread - don't throw, just log
    }
  }

  /**
   * Initialize physics worker
   */
  private async initPhysicsWorker(): Promise<void> {
    try {
      this.physicsWorker = new Worker(new URL('../workers/physicsWorker.ts', import.meta.url), {
        type: 'module',
      });

      this.physicsWorker.onmessage = (event: MessageEvent<PhysicsWorkerResponse>) => {
        this.handlePhysicsResponse(event.data);
      };

      this.physicsWorker.onerror = error => {
        console.error('[WorkerManager] Physics worker error:', error);
        this.handlePhysicsError(error);
      };

      this.physicsWorkerEnabled = true;
      console.log('[WorkerManager] Physics worker initialized');
    } catch (error) {
      console.error('[WorkerManager] Failed to create physics worker:', error);
      this.physicsWorkerEnabled = false;
      throw error;
    }
  }

  /**
   * Initialize chemistry worker
   */
  private async initChemistryWorker(): Promise<void> {
    try {
      this.chemistryWorker = new Worker(new URL('../workers/chemistryWorker.ts', import.meta.url), {
        type: 'module',
      });

      this.chemistryWorker.onmessage = (event: MessageEvent<ChemistryWorkerResponse>) => {
        this.handleChemistryResponse(event.data);
      };

      this.chemistryWorker.onerror = error => {
        console.error('[WorkerManager] Chemistry worker error:', error);
        this.handleChemistryError(error);
      };

      this.chemistryWorkerEnabled = true;
      console.log('[WorkerManager] Chemistry worker initialized');
    } catch (error) {
      console.error('[WorkerManager] Failed to create chemistry worker:', error);
      this.chemistryWorkerEnabled = false;
      throw error;
    }
  }

  /**
   * Batch send multiple physics messages
   */
  async batchSendPhysicsMessages(
    messages: PhysicsWorkerMessage[]
  ): Promise<PhysicsWorkerResponse[]> {
    if (!this.physicsWorkerEnabled || !this.physicsWorker) {
      throw new Error('Physics worker not initialized');
    }

    // Send all messages and wait for responses
    const promises = messages.map(msg => this.sendPhysicsMessage(msg));
    return Promise.all(promises);
  }

  /**
   * Batch send multiple chemistry messages
   */
  async batchSendChemistryMessages(
    messages: ChemistryWorkerMessage[]
  ): Promise<ChemistryWorkerResponse[]> {
    if (!this.chemistryWorkerEnabled || !this.chemistryWorker) {
      throw new Error('Chemistry worker not initialized');
    }

    if (messages.length === 0) {
      return [];
    }

    // Use worker's batch capability if available (for 2+ messages)
    if (messages.length > 1) {
      try {
        const batchMessage: ChemistryWorkerMessage = {
          type: 'batch',
          requests: messages,
        };
        const response = await this.sendChemistryMessage(batchMessage);
        if (response.type === 'batchResult' && response.results) {
          return response.results;
        }
        // If batch response format is unexpected, fall through to individual messages
      } catch (error) {
        console.warn('Batch send failed, falling back to individual messages:', error);
        // Fall through to individual messages
      }
    }

    // Fallback to individual messages (or single message case)
    const promises = messages.map(msg => this.sendChemistryMessage(msg));
    return Promise.all(promises);
  }

  /**
   * Send message to physics worker
   */
  async sendPhysicsMessage(message: PhysicsWorkerMessage): Promise<PhysicsWorkerResponse> {
    if (!this.physicsWorkerEnabled || !this.physicsWorker) {
      throw new Error('Physics worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const id = this.messageIdCounter++;
      this.pendingPhysicsMessages.set(id, { resolve, reject, timestamp: performance.now() });

      // Check queue size
      if (this.pendingPhysicsMessages.size > this.config.maxWorkerQueueSize) {
        console.warn('[WorkerManager] Physics worker queue full, dropping oldest message');
        const oldestId = Array.from(this.pendingPhysicsMessages.keys())[0];
        const oldest = this.pendingPhysicsMessages.get(oldestId);
        if (oldest) {
          oldest.reject(new Error('Worker queue full'));
          this.pendingPhysicsMessages.delete(oldestId);
        }
      }

      // Add timeout (5 seconds)
      setTimeout(() => {
        if (this.pendingPhysicsMessages.has(id)) {
          this.pendingPhysicsMessages.delete(id);
          reject(new Error('Physics worker message timeout'));
        }
      }, 5000);

      this.physicsWorker!.postMessage({ ...message, id });
    });
  }

  /**
   * Send message to chemistry worker
   */
  async sendChemistryMessage(message: ChemistryWorkerMessage): Promise<ChemistryWorkerResponse> {
    if (!this.chemistryWorkerEnabled || !this.chemistryWorker) {
      throw new Error('Chemistry worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const id = this.messageIdCounter++;
      this.pendingChemistryMessages.set(id, { resolve, reject, timestamp: performance.now() });

      // Check queue size
      if (this.pendingChemistryMessages.size > this.config.maxWorkerQueueSize) {
        console.warn('[WorkerManager] Chemistry worker queue full, dropping oldest message');
        const oldestId = Array.from(this.pendingChemistryMessages.keys())[0];
        const oldest = this.pendingChemistryMessages.get(oldestId);
        if (oldest) {
          oldest.reject(new Error('Worker queue full'));
          this.pendingChemistryMessages.delete(oldestId);
        }
      }

      // Add timeout (10 seconds for chemistry calculations)
      setTimeout(() => {
        if (this.pendingChemistryMessages.has(id)) {
          this.pendingChemistryMessages.delete(id);
          reject(new Error('Chemistry worker message timeout'));
        }
      }, 10000);

      this.chemistryWorker!.postMessage({ ...message, id });
    });
  }

  /**
   * Handle physics worker response
   */
  private handlePhysicsResponse(response: PhysicsWorkerResponse): void {
    // For stepComplete messages, resolve all pending step messages
    if (response.type === 'stepComplete') {
      // Resolve the most recent step message
      const stepIds = Array.from(this.pendingPhysicsMessages.keys()).reverse();
      for (const id of stepIds) {
        const pending = this.pendingPhysicsMessages.get(id);
        if (pending) {
          pending.resolve(response);
          this.pendingPhysicsMessages.delete(id);
          break;
        }
      }
    } else if (response.id !== undefined) {
      const pending = this.pendingPhysicsMessages.get(response.id);
      if (pending) {
        pending.resolve(response);
        this.pendingPhysicsMessages.delete(response.id);
      }
    }

    // Handle errors
    if (response.type === 'error') {
      console.error('[WorkerManager] Physics worker error:', response.error);
    }
  }

  /**
   * Handle chemistry worker response
   */
  private handleChemistryResponse(response: ChemistryWorkerResponse): void {
    if (response.id !== undefined) {
      const pending = this.pendingChemistryMessages.get(response.id);
      if (pending) {
        pending.resolve(response);
        this.pendingChemistryMessages.delete(response.id);
      }
    }

    // Handle errors
    if (response.type === 'error') {
      console.error('[WorkerManager] Chemistry worker error:', response.error);
    }
  }

  /**
   * Handle physics worker error
   */
  private handlePhysicsError(error: ErrorEvent): void {
    // Reject all pending messages
    for (const [id, pending] of this.pendingPhysicsMessages.entries()) {
      pending.reject(new Error(`Physics worker error: ${error.message}`));
    }
    this.pendingPhysicsMessages.clear();
    this.physicsWorkerEnabled = false;
  }

  /**
   * Handle chemistry worker error
   */
  private handleChemistryError(error: ErrorEvent): void {
    // Reject all pending messages
    for (const [id, pending] of this.pendingChemistryMessages.entries()) {
      pending.reject(new Error(`Chemistry worker error: ${error.message}`));
    }
    this.pendingChemistryMessages.clear();
    this.chemistryWorkerEnabled = false;
  }

  /**
   * Check if physics worker is enabled
   */
  isPhysicsWorkerEnabled(): boolean {
    return this.physicsWorkerEnabled && this.physicsWorker !== null;
  }

  /**
   * Check if chemistry worker is enabled
   */
  isChemistryWorkerEnabled(): boolean {
    return this.chemistryWorkerEnabled && this.chemistryWorker !== null;
  }

  /**
   * Enable physics worker (feature flag)
   */
  async enablePhysicsWorker(): Promise<void> {
    if (!this.physicsWorkerEnabled) {
      this.config.physicsWorkerEnabled = true;
      await this.initPhysicsWorker();
    }
  }

  /**
   * Enable chemistry worker (feature flag)
   */
  async enableChemistryWorker(): Promise<void> {
    if (!this.chemistryWorkerEnabled) {
      this.config.chemistryWorkerEnabled = true;
      await this.initChemistryWorker();
    }
  }

  /**
   * Disable physics worker
   */
  disablePhysicsWorker(): void {
    if (this.physicsWorker) {
      this.physicsWorker.terminate();
      this.physicsWorker = null;
    }
    this.physicsWorkerEnabled = false;
    this.config.physicsWorkerEnabled = false;
  }

  /**
   * Disable chemistry worker
   */
  disableChemistryWorker(): void {
    if (this.chemistryWorker) {
      this.chemistryWorker.terminate();
      this.chemistryWorker = null;
    }
    this.chemistryWorkerEnabled = false;
    this.config.chemistryWorkerEnabled = false;
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    this.disablePhysicsWorker();
    this.disableChemistryWorker();
  }

  /**
   * Get worker statistics
   */
  getStats(): {
    physicsWorkerEnabled: boolean;
    chemistryWorkerEnabled: boolean;
    pendingPhysicsMessages: number;
    pendingChemistryMessages: number;
  } {
    return {
      physicsWorkerEnabled: this.physicsWorkerEnabled,
      chemistryWorkerEnabled: this.chemistryWorkerEnabled,
      pendingPhysicsMessages: this.pendingPhysicsMessages.size,
      pendingChemistryMessages: this.pendingChemistryMessages.size,
    };
  }
}

// Export singleton instance
export const workerManager = new WorkerManager();

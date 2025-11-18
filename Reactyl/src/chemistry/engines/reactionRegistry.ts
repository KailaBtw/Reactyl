/**
 * Registry for managing reaction handlers
 * Provides plugin-like architecture for adding new reaction types
 */

import { log } from '../utils/debug';
import type { ReactionHandler } from './reactionHandler';

export class ReactionRegistry {
  private handlers: Map<string, ReactionHandler> = new Map();

  /**
   * Register a reaction handler
   */
  register(type: string, handler: ReactionHandler): void {
    const normalizedType = type.toLowerCase();

    if (this.handlers.has(normalizedType)) {
      log(`⚠️ Overriding existing reaction handler for type: ${type}`);
    }

    this.handlers.set(normalizedType, handler);
    log(`✅ Registered reaction handler: ${type} - ${handler.description}`);
  }

  /**
   * Get a reaction handler by type
   */
  getHandler(type: string): ReactionHandler | undefined {
    return this.handlers.get(type.toLowerCase());
  }

  /**
   * Get all registered reaction types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get all handlers (for iteration)
   */
  getAllHandlers(): Map<string, ReactionHandler> {
    return new Map(this.handlers);
  }

  /**
   * Check if a reaction type is registered
   */
  hasHandler(type: string): boolean {
    return this.handlers.has(type.toLowerCase());
  }

  /**
   * Unregister a reaction handler
   */
  unregister(type: string): boolean {
    const normalizedType = type.toLowerCase();
    const existed = this.handlers.has(normalizedType);

    if (existed) {
      this.handlers.delete(normalizedType);
      log(`🗑️ Unregistered reaction handler: ${type}`);
    }

    return existed;
  }

  /**
   * Clear all registered handlers
   */
  clear(): void {
    const count = this.handlers.size;
    this.handlers.clear();
    log(`🗑️ Cleared ${count} reaction handlers`);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalHandlers: number;
    handlerTypes: string[];
    registrySize: number;
  } {
    return {
      totalHandlers: this.handlers.size,
      handlerTypes: this.getRegisteredTypes(),
      registrySize: JSON.stringify(Array.from(this.handlers.keys())).length,
    };
  }
}

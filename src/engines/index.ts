/**
 * Ironclad Engines Module
 * 
 * Exports only the essential, production-ready engine components.
 * No duplicated functionality - just the core StructureEngine system.
 */

export { StructureEngine } from './structureEngine';
export { ReactionHandler } from './reactionHandler';
export { ReactionRegistry } from './reactionRegistry';
export { SN2ReactionHandler } from './handlers/sn2ReactionHandler';

// Type exports
export type { MolecularStructure, TransitionState } from './reactionHandler';

/**
 * Quick initialization function for easy setup
 */
export function initializeStructureEngine(scene: THREE.Scene): StructureEngine {
  return new StructureEngine(scene);
}

/**
 * Version information
 */
export const VERSION = '2.0.0';
export const BUILD_DATE = new Date().toISOString();
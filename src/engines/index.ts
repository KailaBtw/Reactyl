/**
 * Main export file for the StructureEngine system
 * Provides easy access to all engine components
 */

export { StructureEngine } from './structureEngine';
export { ReactionHandler } from './reactionHandler';
export { ReactionRegistry } from './reactionRegistry';
export { SN2ReactionHandler } from './handlers/sn2ReactionHandler';
export { EnhancedReactionDemo } from '../components/enhancedReactionDemo';

// Type exports
export type { MolecularStructure, TransitionState } from './reactionHandler';

// Re-export enhanced types
export type {
  EnhancedMolecularJSON,
  ReactionConditions,
  ReactionSite,
  ReactionPathway,
  ReactionStep,
  EnhancedAtom,
  EnhancedBond,
  AtomReactivity
} from '../types/enhanced-molecular';

// Re-export enhanced services
export { enhancedCacheService } from '../services/enhancedCacheService';
export { EnhancedMolParser } from '../data/enhancedMolParser';

/**
 * Quick initialization function for easy setup
 */
export function initializeStructureEngine(scene: THREE.Scene): StructureEngine {
  return new StructureEngine(scene);
}

/**
 * Version information
 */
export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();

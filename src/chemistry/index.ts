/**
 * Chemistry Module
 *
 * Exports all chemistry-related functionality.
 */

export { ChemicalDataService } from './chemicalDataService';
export { ReactionDetector } from './reactionDetector';
export { ReactionProductGenerator } from './reactionProductGenerator';
export { SN2ReactionSystem } from './sn2Reaction';

/**
 * Version information
 */
export const VERSION = '2.0.0';
export const BUILD_DATE = new Date().toISOString();

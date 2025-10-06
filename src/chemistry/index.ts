/**
 * Chemistry Module
 * 
 * Exports all chemistry-related functionality including the main
 * ChemistryReactionSystem for running chemical reactions.
 */

export { ChemistryReactionSystem } from './reactionSystem';
export { ChemicalDataService } from './chemicalDataService';
export { SN2ReactionSystem } from './sn2Reaction';
export { ReactionDetector } from './reactionDetector';
export { ReactionProductGenerator } from './reactionProductGenerator';

/**
 * Version information
 */
export const VERSION = '2.0.0';
export const BUILD_DATE = new Date().toISOString();

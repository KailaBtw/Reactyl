/**
 * Animation Components Index
 * Exports all animation-related components and utilities
 */

// Core animation utilities
export {
  type AnimationOptions,
  AnimationRunner,
  EasingFunctions,
  runAnimation,
} from './AnimationUtils';
export {
  animateLeavingGroupDeparture,
  LeavingGroupDepartureAnimation,
  type LeavingGroupDepartureOptions,
} from './LeavingGroupDepartureAnimation';
// Re-export types for convenience
export type { MoleculeState } from './ReactionAnimationManager';
// Animation manager
export {
  ReactionAnimationManager,
  reactionAnimationManager,
  type SN2AnimationSequenceOptions,
} from './ReactionAnimationManager';
export {
  animateSN2Mechanism,
  SN2MechanismAnimation,
  type SN2MechanismOptions,
} from './SN2MechanismAnimation';
// Individual animation components
export {
  animateWaldenInversion,
  WaldenInversionAnimation,
  type WaldenInversionOptions,
} from './WaldenInversionAnimation';

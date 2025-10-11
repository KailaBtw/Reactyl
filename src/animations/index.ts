/**
 * Animation Components Index
 * Exports all animation-related components and utilities
 */

// Core animation utilities
export { 
  AnimationRunner, 
  EasingFunctions, 
  runAnimation,
  type AnimationOptions 
} from './AnimationUtils';

// Individual animation components
export { 
  WaldenInversionAnimation, 
  animateWaldenInversion,
  type WaldenInversionOptions 
} from './WaldenInversionAnimation';

export { 
  LeavingGroupDepartureAnimation, 
  animateLeavingGroupDeparture,
  type LeavingGroupDepartureOptions 
} from './LeavingGroupDepartureAnimation';

// Animation manager
export { 
  ReactionAnimationManager, 
  reactionAnimationManager,
  type SN2AnimationSequenceOptions 
} from './ReactionAnimationManager';

// Re-export types for convenience
export type { MoleculeState } from './ReactionAnimationManager';

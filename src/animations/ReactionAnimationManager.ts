/**
 * Reaction Animation Manager
 * Coordinates multiple animations for chemical reactions
 */

import { WaldenInversionAnimation, type WaldenInversionOptions } from './WaldenInversionAnimation';
import { LeavingGroupDepartureAnimation, type LeavingGroupDepartureOptions } from './LeavingGroupDepartureAnimation';
import { AnimationRunner } from './AnimationUtils';
import { log } from '../utils/debug';

export interface MoleculeState {
  group: THREE.Group;
  rotation: THREE.Euler;
}

export interface SN2AnimationSequenceOptions {
  waldenInversion?: WaldenInversionOptions;
  leavingGroupDeparture?: LeavingGroupDepartureOptions;
  delayBetweenAnimations?: number;
  onComplete?: () => void;
  onStart?: () => void;
}

/**
 * Reaction Animation Manager
 * Manages complex animation sequences for chemical reactions
 */
export class ReactionAnimationManager {
  private waldenAnimation: WaldenInversionAnimation;
  private leavingGroupAnimation: LeavingGroupDepartureAnimation;
  private currentAnimations: AnimationRunner[] = [];

  constructor() {
    this.waldenAnimation = new WaldenInversionAnimation();
    this.leavingGroupAnimation = new LeavingGroupDepartureAnimation();
  }

  /**
   * Run complete SN2 reaction animation sequence
   */
  animateSN2Reaction(
    substrate: MoleculeState,
    nucleophile: MoleculeState,
    options: SN2AnimationSequenceOptions = {}
  ): void {
    const {
      waldenInversion = {},
      leavingGroupDeparture = {},
      delayBetweenAnimations = 1000, // 1 second delay
      onComplete,
      onStart
    } = options;

    log('🎬 Starting SN2 reaction animation sequence...');

    // Call start callback
    if (onStart) {
      onStart();
    }

    // Step 1: Walden inversion
    const waldenRunner = this.waldenAnimation.animate(substrate, {
      ...waldenInversion,
      onComplete: () => {
        log('✅ Walden inversion complete, starting leaving group departure...');
        
        // Step 2: Leaving group departure (after delay)
        setTimeout(() => {
          const leavingGroupRunner = this.leavingGroupAnimation.animate(substrate, {
            ...leavingGroupDeparture,
            onComplete: () => {
              log('✅ SN2 reaction animation sequence complete');
              if (onComplete) {
                onComplete();
              }
            }
          });
          
          this.currentAnimations.push(leavingGroupRunner);
        }, delayBetweenAnimations);
      }
    });

    this.currentAnimations.push(waldenRunner);
  }

  /**
   * Run Walden inversion only
   */
  animateWaldenInversion(
    substrate: MoleculeState,
    options?: WaldenInversionOptions
  ): AnimationRunner {
    return this.waldenAnimation.animate(substrate, options);
  }

  /**
   * Run leaving group departure only
   */
  animateLeavingGroupDeparture(
    substrate: MoleculeState,
    options?: LeavingGroupDepartureOptions
  ): AnimationRunner {
    return this.leavingGroupAnimation.animate(substrate, options);
  }

  /**
   * Stop all current animations
   */
  stopAllAnimations(): void {
    log('🛑 Stopping all reaction animations...');
    
    this.waldenAnimation.stop();
    this.leavingGroupAnimation.stop();
    
    this.currentAnimations.forEach(runner => runner.stop());
    this.currentAnimations = [];
  }

  /**
   * Check if any animations are running
   */
  get isAnimating(): boolean {
    return this.waldenAnimation.isRunning || 
           this.leavingGroupAnimation.isRunning ||
           this.currentAnimations.some(runner => runner.running);
  }

  /**
   * Get animation status
   */
  getStatus(): {
    waldenInversion: boolean;
    leavingGroupDeparture: boolean;
    totalAnimations: number;
  } {
    return {
      waldenInversion: this.waldenAnimation.isRunning,
      leavingGroupDeparture: this.leavingGroupAnimation.isRunning,
      totalAnimations: this.currentAnimations.length
    };
  }
}

/**
 * Global animation manager instance
 */
export const reactionAnimationManager = new ReactionAnimationManager();

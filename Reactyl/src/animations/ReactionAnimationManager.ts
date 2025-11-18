/**
 * Reaction Animation Manager
 * Coordinates multiple animations for chemical reactions
 */

import type { MoleculeState } from '../systems/ReactionOrchestrator';
import { log } from '../utils/debug';
import type { AnimationRunner } from './AnimationUtils';
import {
  LeavingGroupDepartureAnimation,
  type LeavingGroupDepartureOptions,
} from './LeavingGroupDepartureAnimation';
import { SN2MechanismAnimation, type SN2MechanismOptions } from './SN2MechanismAnimation';
import { WaldenInversionAnimation, type WaldenInversionOptions } from './WaldenInversionAnimation';

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
  private sn2MechanismAnimation: SN2MechanismAnimation;
  private currentAnimations: AnimationRunner[] = [];

  constructor() {
    this.waldenAnimation = new WaldenInversionAnimation();
    this.leavingGroupAnimation = new LeavingGroupDepartureAnimation();
    this.sn2MechanismAnimation = new SN2MechanismAnimation();
  }

  /**
   * Run complete SN2 reaction animation sequence
   * Uses the new unified SN2 mechanism animation
   */
  animateSN2Reaction(
    substrate: MoleculeState,
    nucleophile: MoleculeState,
    options: SN2AnimationSequenceOptions = {}
  ): void {
    const { onComplete, onStart } = options;

    log('🎬 Starting complete SN2 mechanism animation...');
    log(`🎬 Substrate: ${substrate.name}, Nucleophile: ${nucleophile.name}`);
    log(`🎬 Options:`, options);

    try {
      // ultra-fast timing defaults
      const totalDuration = 330; // ms

      if (onStart) onStart();

      const sn2Runner = this.sn2MechanismAnimation.animate(substrate, nucleophile, {
        duration: totalDuration,
        easing: (t: number) => t,
        onStart: () => log('🔄 SN2 fast sequence (≤330ms)'),
        onComplete: () => {
          log('✅ SN2 fast sequence finished');
          onComplete?.();
        },
      });

      this.currentAnimations.push(sn2Runner);
    } catch (error) {
      log(`❌ Error in animateSN2Reaction: ${error}`);
      console.error('SN2 animation error:', error);
    }
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
    this.sn2MechanismAnimation.stop();

    this.currentAnimations.forEach(runner => runner.stop());
    this.currentAnimations = [];
  }

  /**
   * Check if any animations are running
   */
  get isAnimating(): boolean {
    return (
      this.waldenAnimation.isRunning ||
      this.leavingGroupAnimation.isRunning ||
      this.sn2MechanismAnimation.isRunning ||
      this.currentAnimations.some(runner => runner.running)
    );
  }

  /**
   * Get animation status
   */
  getStatus(): {
    waldenInversion: boolean;
    leavingGroupDeparture: boolean;
    sn2Mechanism: boolean;
    totalAnimations: number;
  } {
    return {
      waldenInversion: this.waldenAnimation.isRunning,
      leavingGroupDeparture: this.leavingGroupAnimation.isRunning,
      sn2Mechanism: this.sn2MechanismAnimation.isRunning,
      totalAnimations: this.currentAnimations.length,
    };
  }
}

/**
 * Global animation manager instance
 */
export const reactionAnimationManager = new ReactionAnimationManager();

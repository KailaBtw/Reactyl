/**
 * Walden Inversion Animation Component
 * Handles smooth stereochemistry inversion for SN2 reactions
 */

import * as THREE from 'three';
import { AnimationRunner, EasingFunctions, type AnimationOptions } from './AnimationUtils';
import { log } from '../utils/debug';

export interface WaldenInversionOptions {
  duration?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
  onStart?: () => void;
}

export interface MoleculeState {
  group: THREE.Group;
  rotation: THREE.Euler;
}

/**
 * Walden Inversion Animation Component
 */
export class WaldenInversionAnimation {
  private animationRunner: AnimationRunner | null = null;

  /**
   * Animate Walden inversion for SN2 reactions
   */
  animate(
    substrate: MoleculeState,
    options: WaldenInversionOptions = {}
  ): AnimationRunner {
    const {
      duration = 1000, // 1 second default
      easing = EasingFunctions.easeOutCubic,
      onComplete,
      onStart
    } = options;

    log('🔄 Starting Walden inversion animation...');

    // Call start callback
    if (onStart) {
      onStart();
    }

    const startRotation = substrate.group.rotation.y;
    const targetRotation = startRotation + Math.PI; // 180° rotation

    const animationOptions: AnimationOptions = {
      duration,
      easing,
      onUpdate: (progress: number) => {
        const currentRotation = startRotation + (targetRotation - startRotation) * progress;
        substrate.group.rotation.y = currentRotation;
        substrate.rotation.copy(substrate.group.rotation);
      },
      onComplete: () => {
        log('✅ Walden inversion animation complete');
        if (onComplete) {
          onComplete();
        }
      }
    };

    this.animationRunner = new AnimationRunner();
    this.animationRunner.run(animationOptions);

    return this.animationRunner;
  }

  /**
   * Stop the current animation
   */
  stop(): void {
    if (this.animationRunner) {
      this.animationRunner.stop();
      this.animationRunner = null;
    }
  }

  /**
   * Check if animation is running
   */
  get isRunning(): boolean {
    return this.animationRunner?.running || false;
  }
}

/**
 * Utility function to create and run Walden inversion animation
 */
export function animateWaldenInversion(
  substrate: MoleculeState,
  options?: WaldenInversionOptions
): AnimationRunner {
  const animation = new WaldenInversionAnimation();
  return animation.animate(substrate, options);
}

/**
 * Leaving Group Departure Animation Component
 * Handles smooth departure of leaving groups after SN2 reactions
 */

import * as THREE from 'three';
import { AnimationRunner, EasingFunctions, type AnimationOptions } from './AnimationUtils';
import { log } from '../utils/debug';
import type { MoleculeState } from '../systems/ReactionOrchestrator';

export interface LeavingGroupDepartureOptions {
  duration?: number;
  distance?: number;
  direction?: THREE.Vector3;
  easing?: (t: number) => number;
  fadeOut?: boolean;
  onComplete?: () => void;
  onStart?: () => void;
}

/**
 * Leaving Group Departure Animation Component
 */
export class LeavingGroupDepartureAnimation {
  private animationRunner: AnimationRunner | null = null;

  /**
   * Animate leaving group departure
   */
  animate(
    substrate: MoleculeState,
    options: LeavingGroupDepartureOptions = {}
  ): AnimationRunner {
    const {
      duration = 1500, // 1.5 seconds default
      distance = 5.0,
      direction = new THREE.Vector3(0, 0, 1), // Depart in +Z direction
      easing = EasingFunctions.easeOutCubic,
      fadeOut = true,
      onComplete,
      onStart
    } = options;

    log('🔄 Starting leaving group departure animation...');

    // Find the leaving group atom
    const leavingGroupAtom = this.findLeavingGroupAtom(substrate);
    if (!leavingGroupAtom) {
      log('❌ No leaving group atom found');
      return new AnimationRunner(); // Return empty runner
    }

    // Call start callback
    if (onStart) {
      onStart();
    }

    const startPosition = leavingGroupAtom.position.clone();
    const departDirection = direction.clone().normalize();
    const targetPosition = startPosition.clone().add(departDirection.multiplyScalar(distance));

    const animationOptions: AnimationOptions = {
      duration,
      easing,
      onUpdate: (progress: number) => {
        // Interpolate position
        const currentPosition = startPosition.clone().lerp(targetPosition, progress);
        leavingGroupAtom.position.copy(currentPosition);

        // Fade out if enabled
        if (fadeOut && (leavingGroupAtom as any).material) {
          const opacity = 1 - progress;
          (leavingGroupAtom as any).material.opacity = opacity;
          (leavingGroupAtom as any).material.transparent = true;
        }
      },
      onComplete: () => {
        // Remove the leaving group from the scene
        substrate.group.remove(leavingGroupAtom);
        log('✅ Leaving group departed and removed from scene');
        
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
   * Find the leaving group atom in the substrate
   */
  private findLeavingGroupAtom(substrate: MoleculeState): THREE.Object3D | null {
    // Look for chlorine, bromine, or iodine atoms
    const leavingGroupTypes = ['Cl', 'Br', 'I'];

    for (const child of substrate.group.children) {
      if (child.userData && child.userData.element) {
        if (leavingGroupTypes.includes(child.userData.element)) {
          return child;
        }
      }
    }

    return null;
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
 * Utility function to create and run leaving group departure animation
 */
export function animateLeavingGroupDeparture(
  substrate: MoleculeState,
  options?: LeavingGroupDepartureOptions
): AnimationRunner {
  const animation = new LeavingGroupDepartureAnimation();
  return animation.animate(substrate, options);
}

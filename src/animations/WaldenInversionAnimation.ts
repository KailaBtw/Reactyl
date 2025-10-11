/**
 * Walden Inversion Animation Component
 * Handles smooth stereochemistry inversion for SN2 reactions
 */

import * as THREE from 'three';
import { AnimationRunner, EasingFunctions, type AnimationOptions } from './AnimationUtils';
import { log } from '../utils/debug';
import type { MoleculeState } from '../systems/ReactionOrchestrator';

export interface WaldenInversionOptions {
  duration?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
  onStart?: () => void;
}

/**
 * Walden Inversion Animation Component
 */
export class WaldenInversionAnimation {
  private animationRunner: AnimationRunner | null = null;

  /**
   * Animate Walden inversion for SN2 reactions
   * Shows proper umbrella flip mechanism where hydrogens flip to opposite side
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

    log('🔄 Starting Walden inversion animation (umbrella flip mechanism)...');

    // Call start callback
    if (onStart) {
      onStart();
    }

    // Find the carbon atom and hydrogen atoms for proper umbrella flip
    const carbonAtom = this.findCarbonAtom(substrate);
    const hydrogenAtoms = this.findHydrogenAtoms(substrate);
    
    if (!carbonAtom || hydrogenAtoms.length === 0) {
      log('❌ Could not find carbon or hydrogen atoms for Walden inversion');
      return new AnimationRunner();
    }

    // Store initial positions
    const initialHydrogenPositions = hydrogenAtoms.map(h => h.position.clone());
    
    // Calculate umbrella flip: hydrogens move to opposite side of carbon
    const carbonPosition = carbonAtom.position.clone();
    const targetHydrogenPositions = initialHydrogenPositions.map(initialPos => {
      // Vector from carbon to hydrogen
      const carbonToHydrogen = initialPos.clone().sub(carbonPosition);
      // Flip to opposite side
      return carbonPosition.clone().sub(carbonToHydrogen);
    });

    const animationOptions: AnimationOptions = {
      duration,
      easing,
      onUpdate: (progress: number) => {
        // Animate each hydrogen to its flipped position
        hydrogenAtoms.forEach((hydrogen, index) => {
          const startPos = initialHydrogenPositions[index];
          const targetPos = targetHydrogenPositions[index];
          const currentPos = startPos.clone().lerp(targetPos, progress);
          hydrogen.position.copy(currentPos);
        });
        
        // Also rotate the entire molecule slightly for visual effect
        const rotationProgress = Math.sin(progress * Math.PI) * 0.1; // Small oscillation
        substrate.group.rotation.y = rotationProgress;
        substrate.rotation.copy(substrate.group.rotation);
      },
      onComplete: () => {
        log('✅ Walden inversion (umbrella flip) animation complete');
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
   * Find the carbon atom in the substrate
   */
  private findCarbonAtom(substrate: MoleculeState): THREE.Object3D | null {
    for (const child of substrate.group.children) {
      if (child.userData && child.userData.element === 'C') {
        return child;
      }
    }
    return null;
  }

  /**
   * Find all hydrogen atoms in the substrate
   */
  private findHydrogenAtoms(substrate: MoleculeState): THREE.Object3D[] {
    const hydrogens: THREE.Object3D[] = [];
    for (const child of substrate.group.children) {
      if (child.userData && child.userData.element === 'H') {
        hydrogens.push(child);
      }
    }
    return hydrogens;
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

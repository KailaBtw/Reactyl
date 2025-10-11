/**
 * SN2 Mechanism Animation Component
 * Shows the complete SN2 reaction mechanism with proper bond breaking/forming
 */

import * as THREE from 'three';
import { AnimationRunner, EasingFunctions, type AnimationOptions } from './AnimationUtils';
import { BondHandler } from '../reactions/BondHandler';
import { log } from '../utils/debug';
import type { MoleculeState } from '../systems/ReactionOrchestrator';

export interface SN2MechanismOptions {
  duration?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
  onStart?: () => void;
}

/**
 * SN2 Mechanism Animation Component
 * Shows complete SN2 reaction: umbrella flip + leaving group departure + nucleophile placement
 */
export class SN2MechanismAnimation {
  private animationRunner: AnimationRunner | null = null;

  /**
   * Animate complete SN2 mechanism
   */
  animate(
    substrate: MoleculeState,
    nucleophile: MoleculeState,
    options: SN2MechanismOptions = {}
  ): AnimationRunner {
    const {
      duration = 2500, // 2.5 seconds for complete mechanism
      easing = EasingFunctions.easeOutCubic,
      onComplete,
      onStart
    } = options;

    log('🔄 Starting complete SN2 mechanism animation...');
    log(`🔄 Substrate: ${substrate.name}, Nucleophile: ${nucleophile.name}`);
    log(`🔄 Duration: ${duration}ms`);

    try {
      // Call start callback
      if (onStart) {
        log('🔄 Calling onStart callback...');
        onStart();
      }

    // Fast SN2 mechanism using orientation + bond abstraction
    log('🔄 Starting fast SN2 mechanism animation...');

    // Identify leaving group atom (Cl/Br/I) and electrophilic carbon (nearest C)
    const leavingGroupAtom = this.findLeavingGroupAtom(substrate);
    const carbonAtom = this.findNearestCarbonTo(substrate, leavingGroupAtom);
    const nucAtom = this.findNucleophileAtom(nucleophile);

    if (!leavingGroupAtom || !carbonAtom || !nucAtom) {
      log('❌ SN2 fast path: required atoms not found (leaving group / carbon / nucleophile)');
      return new AnimationRunner();
    }

    // Record indices from userData for bond ops
    const lgIdx = (leavingGroupAtom as any).userData?.atomIndex;
    const cIdx = (carbonAtom as any).userData?.atomIndex;

    const initialLeavingPos = leavingGroupAtom.position.clone();
    const initialNucGroupPos = nucleophile.group.position.clone();
    const carbonWorldPos = carbonAtom.getWorldPosition(new THREE.Vector3());
    const substrateWorldPos = substrate.group.getWorldPosition(new THREE.Vector3());
    const toWorld = (local: THREE.Vector3) => substrate.group.localToWorld(local.clone());
    const carbonLocalPos = substrate.group.worldToLocal(carbonWorldPos.clone());

    const animationOptions: AnimationOptions = {
      duration: Math.max(120, Math.min(duration, 350)),
      easing: EasingFunctions.linear ?? ((t: number) => t),
      onUpdate: (progress: number) => {
        // Phase A (0 - 0.35): break C–X and eject leaving group quickly
        if (progress <= 0.35) {
          const t = progress / 0.35;
          // Hide the C–X bond once
          if (t > 0.05 && typeof cIdx === 'number' && typeof lgIdx === 'number') {
            BondHandler.hideBond(substrate as any, cIdx, lgIdx);
          }
          // Eject leaving group along vector from carbon
          const dir = leavingGroupAtom.position.clone().sub(carbonLocalPos).normalize();
          const dist = 3.0 * t; // up to ~3 Å in ~120 ms
          leavingGroupAtom.position.copy(initialLeavingPos.clone().add(dir.multiplyScalar(dist)));
          // Optional fade-out if material exists
          const mat = (leavingGroupAtom as any).material;
          if (mat) {
            mat.transparent = true;
            mat.opacity = Math.max(0, 1 - t);
          }
        }
        // Phase B (0.35 - 1.0): move nucleophile group toward carbon
        else {
          const t = (progress - 0.35) / 0.65;
          const targetWorld = carbonWorldPos;
          const current = initialNucGroupPos.clone().lerp(targetWorld, t);
          nucleophile.group.position.copy(current);
        }
      },
      onComplete: () => {
        log('✅ SN2 fast mechanism complete');
        if (onComplete) {
          onComplete();
        }
      }
    };

    this.animationRunner = new AnimationRunner();
    this.animationRunner.run(animationOptions);

    return this.animationRunner;
    } catch (error) {
      log(`❌ Error in SN2MechanismAnimation.animate: ${error}`);
      console.error('SN2 mechanism animation error:', error);
      return new AnimationRunner(); // Return empty runner on error
    }
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
   * Find the nearest carbon atom to a given atom (by position)
   */
  private findNearestCarbonTo(substrate: MoleculeState, reference: THREE.Object3D | null): THREE.Object3D | null {
    if (!reference) return null;
    let nearest: THREE.Object3D | null = null;
    let best = Infinity;
    for (const child of substrate.group.children) {
      const ud = (child as any).userData;
      if (ud && ud.element === 'C') {
        const d = child.position.distanceTo(reference.position);
        if (d < best) {
          best = d;
          nearest = child;
        }
      }
    }
    return nearest;
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
   * Find the leaving group atom in the substrate
   */
  private findLeavingGroupAtom(substrate: MoleculeState): THREE.Object3D | null {
    const leavingGroupTypes = ['Cl', 'Br', 'I'];
    for (const child of substrate.group.children) {
      if (child.userData && child.userData.element && leavingGroupTypes.includes(child.userData.element)) {
        return child;
      }
    }
    return null;
  }

  /**
   * Find the nucleophile atom in the nucleophile molecule
   */
  private findNucleophileAtom(nucleophile: MoleculeState): THREE.Object3D | null {
    // Look for oxygen (OH-) or nitrogen atoms
    const nucleophileTypes = ['O', 'N'];
    for (const child of nucleophile.group.children) {
      if (child.userData && child.userData.element && nucleophileTypes.includes(child.userData.element)) {
        return child;
      }
    }
    return null;
  }

  /**
   * Find the bond between two specific atoms
   */
  private findBondBetweenAtoms(molecule: MoleculeState, atom1: THREE.Object3D, atom2: THREE.Object3D): THREE.Object3D | null {
    // Look for bonds in the molecule
    for (const child of molecule.group.children) {
      if (child.userData && child.userData.type === 'bond') {
        // Check if this bond connects the two atoms
        // This is a simplified check - in a real implementation, you'd need to track which atoms each bond connects
        return child;
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
 * Utility function to create and run SN2 mechanism animation
 */
export function animateSN2Mechanism(
  substrate: MoleculeState,
  nucleophile: MoleculeState,
  options?: SN2MechanismOptions
): AnimationRunner {
  const animation = new SN2MechanismAnimation();
  return animation.animate(substrate, nucleophile, options);
}

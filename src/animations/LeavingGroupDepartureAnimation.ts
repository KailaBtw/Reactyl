/**
 * Leaving Group Departure Animation Component
 * Handles smooth departure of leaving groups after SN2 reactions
 */

import * as THREE from 'three';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
import type { MoleculeState } from '../systems/ReactionOrchestrator';
import { log } from '../utils/debug';
import { type AnimationOptions, AnimationRunner, EasingFunctions } from './AnimationUtils';

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
    nucleophile: MoleculeState,
    options: LeavingGroupDepartureOptions = {}
  ): AnimationRunner {
    const {
      duration = 1500, // 1.5 seconds default
      distance = 5.0,
      direction = new THREE.Vector3(0, 0, 1), // Depart in +Z direction
      easing = EasingFunctions.easeOutCubic,
      fadeOut = true,
      onComplete,
      onStart,
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

    // Calculate departure direction (opposite to nucleophile approach)
    const nucleophileDirection = new THREE.Vector3()
      .subVectors(substrate.group.position, nucleophile.group.position)
      .normalize();
    const departDirection = nucleophileDirection.clone().negate(); // Opposite direction

    const startPosition = leavingGroupAtom.position.clone();
    const targetPosition = startPosition.clone().add(departDirection.multiplyScalar(distance));

    // Create new leaving group molecule
    const leavingGroupMolecule = this.createLeavingGroupMolecule(
      leavingGroupAtom,
      startPosition,
      substrate
    );

    // Remove the leaving group atom from the substrate
    substrate.group.remove(leavingGroupAtom);

    const animationOptions: AnimationOptions = {
      duration,
      easing,
      onUpdate: (progress: number) => {
        // Interpolate position
        const currentPosition = startPosition.clone().lerp(targetPosition, progress);
        leavingGroupMolecule.group.position.copy(currentPosition);

        // Fade out if enabled
        if (
          fadeOut &&
          leavingGroupMolecule.group.children[0] &&
          (leavingGroupMolecule.group.children[0] as any).material
        ) {
          const opacity = 1 - progress;
          (leavingGroupMolecule.group.children[0] as any).material.opacity = opacity;
          (leavingGroupMolecule.group.children[0] as any).material.transparent = true;
        }
      },
      onComplete: () => {
        // Add physics body to the leaving group molecule and give it velocity
        this.launchLeavingGroup(leavingGroupMolecule, departDirection);
        log('✅ Leaving group departed and launched as new molecule');

        if (onComplete) {
          onComplete();
        }
      },
    };

    this.animationRunner = new AnimationRunner();
    this.animationRunner.run(animationOptions);

    return this.animationRunner;
  }

  /**
   * Create a new molecule from the leaving group atom
   */
  private createLeavingGroupMolecule(
    leavingGroupAtom: THREE.Object3D,
    position: THREE.Vector3,
    substrate: MoleculeState
  ): any {
    // Create a new molecule group
    const leavingGroupMolecule = {
      name: `${leavingGroupAtom.userData.element}⁻`,
      group: new THREE.Group(),
      velocity: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(),
      physicsBody: null,
      molecularProperties: {
        totalMass: this.getElementMass(leavingGroupAtom.userData.element),
        boundingRadius: 0.5,
      },
      hasPhysics: false,
    };

    // Position the molecule
    leavingGroupMolecule.group.position.copy(position);

    // Add the atom to the molecule group
    leavingGroupMolecule.group.add(leavingGroupAtom);

    // Add to the scene (we'll need to get the scene from somewhere)
    // For now, we'll add it to the substrate's parent scene
    if (substrate.group.parent) {
      substrate.group.parent.add(leavingGroupMolecule.group);
    }

    log(`🔄 Created leaving group molecule: ${leavingGroupMolecule.name}`);
    return leavingGroupMolecule;
  }

  /**
   * Launch the leaving group molecule with physics
   */
  private launchLeavingGroup(leavingGroupMolecule: any, direction: THREE.Vector3): void {
    try {
      // Add physics body
      const success = physicsEngine.addMolecule(
        leavingGroupMolecule,
        leavingGroupMolecule.molecularProperties
      );
      if (success) {
        leavingGroupMolecule.hasPhysics = true;
        leavingGroupMolecule.physicsBody = physicsEngine.getPhysicsBody(leavingGroupMolecule);

        // Give it velocity in the departure direction
        const launchVelocity = direction.clone().multiplyScalar(10); // 10 units/second
        physicsEngine.setVelocity(leavingGroupMolecule, launchVelocity);

        log(
          `🚀 Launched leaving group with velocity: (${launchVelocity.x.toFixed(2)}, ${launchVelocity.y.toFixed(2)}, ${launchVelocity.z.toFixed(2)})`
        );
      }
    } catch (error) {
      log(`❌ Error launching leaving group: ${error}`);
    }
  }

  /**
   * Get atomic mass for common leaving groups
   */
  private getElementMass(element: string): number {
    const masses: Record<string, number> = {
      Cl: 35.45,
      Br: 79.9,
      I: 126.9,
      F: 19.0,
    };
    return masses[element] || 35.45; // Default to chlorine mass
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

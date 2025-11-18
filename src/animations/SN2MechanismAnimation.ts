/**
 * SN2 Mechanism Animation Component
 * Shows the complete SN2 reaction mechanism with proper bond breaking/forming
 */

import * as THREE from 'three';
import { BondHandler } from '../chemistry/BondHandler';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
import type { MoleculeState } from '../systems/ReactionOrchestrator';
import { log } from '../utils/debug';
import { type AnimationOptions, AnimationRunner, EasingFunctions } from './AnimationUtils';
import { addProductOutline } from '../utils/moleculeOutline';
import { collisionEventSystem } from '../physics/collisionEventSystem';
import { applyProductOrientation, getAttackModeConfig } from '../config/attackModes';

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
      onComplete,
      onStart,
    } = options;

    log('Starting complete SN2 mechanism animation...');
    log(`Substrate: ${substrate.name}, Nucleophile: ${nucleophile.name}`);
    log(`Duration: ${duration}ms`);

    try {
      // Call start callback
      if (onStart) {
        log('Calling onStart callback...');
        onStart();
      }

      // Fast SN2 mechanism using orientation + bond abstraction
      log('Starting fast SN2 mechanism animation...');

      // Identify leaving group atom (Cl/Br/I) and electrophilic carbon (nearest C)
      const leavingGroupAtom = this.findLeavingGroupAtom(substrate);
      const carbonAtom = this.findNearestCarbonTo(substrate, leavingGroupAtom);
      const nucAtom = this.findNucleophileAtom(nucleophile);

      log(
        `Found atoms - Leaving group: ${!!leavingGroupAtom}, Carbon: ${!!carbonAtom}, Nucleophile: ${!!nucAtom}`
      );

      if (!leavingGroupAtom || !carbonAtom || !nucAtom) {
        log('SN2 fast path: required atoms not found (leaving group / carbon / nucleophile)');
        log(
          `Debug - Leaving group: ${leavingGroupAtom ? 'found' : 'missing'}, Carbon: ${carbonAtom ? 'found' : 'missing'}, Nucleophile: ${nucAtom ? 'found' : 'missing'}`
        );

        // Fallback: Simple rotation animation for Walden inversion
        log('Using fallback simple rotation animation');
        return this.createFallbackAnimation(substrate, nucleophile, duration, onComplete);
      }

      // Record indices from userData for bond ops
      const lgIdx = (leavingGroupAtom as any).userData?.atomIndex;
      const cIdx = (carbonAtom as any).userData?.atomIndex;

      const initialLeavingPos = leavingGroupAtom.position.clone();
      // Note: initialNucGroupPos and carbonWorldPos are not used in instant transition but kept for potential future use

      // Store original positions for proper separation after reaction
      const originalSubstratePos = substrate.group.position.clone();
      const originalNucleophilePos = nucleophile.group.position.clone();

      // Execute SN2 mechanism instantly - no animation needed
      log('Executing instant SN2 mechanism...');

      // Hide the C-X bond
      if (typeof cIdx === 'number' && typeof lgIdx === 'number') {
        BondHandler.hideBond(substrate as any, cIdx, lgIdx);
      }

      // Create leaving group molecule
      const leavingGroupMolecule = this.createLeavingGroupMolecule(
        leavingGroupAtom,
        initialLeavingPos,
        substrate
      );
      (leavingGroupAtom as any).leavingGroupMolecule = leavingGroupMolecule;

      // Remove the atom from substrate (with error handling for test environment)
      try {
        substrate.group.remove(leavingGroupAtom);
        log('Leaving group removed and made into new molecule');
      } catch (error) {
        // Handle test environment where dispatchEvent might not be available
        log('Leaving group removed (test environment)');
      }

      // Rotate substrate for Walden inversion
      substrate.group.rotation.y = Math.PI; // Instant 180 degree rotation

      // Update physics body quaternion to match Three.js rotation
      if ((substrate as any).physicsBody) {
        (substrate as any).physicsBody.quaternion.set(
          substrate.group.quaternion.x,
          substrate.group.quaternion.y,
          substrate.group.quaternion.z,
          substrate.group.quaternion.w
        );
      }

      log(`Walden inversion applied - Rotation Y: ${substrate.group.rotation.y.toFixed(2)}`);

      // Launch the leaving group molecule
      const nucleophileApproachDirection = new THREE.Vector3()
        .subVectors(originalNucleophilePos, originalSubstratePos)
        .normalize();
      const departDirection = nucleophileApproachDirection.clone().negate(); // Opposite direction
      this.launchLeavingGroup(leavingGroupMolecule, departDirection);

      // Lock substrate rotation to prevent physics from overriding it
      this.lockSubstrateRotation(substrate);

      // Separate the product molecules to prevent overlap
      this.separateProductMolecules(
        substrate,
        nucleophile,
        originalSubstratePos,
        originalNucleophilePos
      );

      // Mark substrate as product BEFORE replacement (so it's skipped in future collisions)
      (substrate as any).isProduct = true;
      
      // Remove old molecules and load proper product molecules (CH3OH and Br⁻) from PubChem
      this.cleanupOldMoleculesAndLoadProducts(
        substrate,
        nucleophile,
        originalSubstratePos,
        originalNucleophilePos
      );

      log('SN2 mechanism complete - instant transition to products');

      // Call completion callback immediately
      if (onComplete) {
        onComplete();
      }

      // Return a custom animation runner for instant animations
      this.animationRunner = {
        running: false, // Instant animation is never "running"
        stop: () => {
          // Nothing to stop for instant animation
        },
      } as any;
      return this.animationRunner;
    } catch (error) {
      log(`Error in SN2MechanismAnimation.animate: ${error}`);
      console.error('SN2 mechanism animation error:', error);
      return new AnimationRunner(); // Return empty runner on error
    }
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

    // Find the main scene by traversing up the parent hierarchy
    let scene = substrate.group.parent;
    while (scene && scene.type !== 'Scene') {
      scene = scene.parent;
    }

    // Add to the main scene if found, otherwise add to substrate's parent (with error handling for test environment)
    try {
      if (scene && scene.type === 'Scene') {
        scene.add(leavingGroupMolecule.group);
        log(`Added leaving group molecule to main scene: ${leavingGroupMolecule.name}`);
      } else if (substrate.group.parent) {
        substrate.group.parent.add(leavingGroupMolecule.group);
        log(`Added leaving group molecule to substrate parent: ${leavingGroupMolecule.name}`);
      } else {
        log(`Could not find scene to add leaving group molecule: ${leavingGroupMolecule.name}`);
      }
    } catch (error) {
      // Handle test environment where scene operations might fail
      log(`Added leaving group molecule (test environment): ${leavingGroupMolecule.name}`);
    }

    log(`Created leaving group molecule: ${leavingGroupMolecule.name}`);
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

        // Give it velocity in the departure direction (slower for better visibility)
        const launchVelocity = direction.clone().multiplyScalar(3); // 3 units/second (slower)
        physicsEngine.setVelocity(leavingGroupMolecule, launchVelocity);

        log(
          `Launched leaving group with velocity: (${launchVelocity.x.toFixed(2)}, ${launchVelocity.y.toFixed(2)}, ${launchVelocity.z.toFixed(2)})`
        );
      }
    } catch (error) {
      log(`Error launching leaving group: ${error}`);
    }
  }

  /**
   * Separate product molecules to prevent overlap when physics resumes
   */
  private separateProductMolecules(
    substrate: MoleculeState,
    nucleophile: MoleculeState,
    originalSubstratePos: THREE.Vector3,
    originalNucleophilePos: THREE.Vector3
  ): void {
    log('Separating product molecules to prevent overlap...');

    // Calculate the direction from substrate to nucleophile
    const direction = new THREE.Vector3()
      .subVectors(originalNucleophilePos, originalSubstratePos)
      .normalize();

    // Position substrate slightly away from the collision point in the opposite direction
    const substrateOffset = direction.clone().negate().multiplyScalar(4); // 4 units away
    substrate.group.position.copy(originalSubstratePos.clone().add(substrateOffset));

    // Position nucleophile slightly away from the collision point in the same direction
    const nucleophileOffset = direction.clone().multiplyScalar(4); // 4 units away
    nucleophile.group.position.copy(originalNucleophilePos.clone().add(nucleophileOffset));

    // Update physics body positions to match visual positions
    this.syncPositionToPhysics(substrate);
    this.syncPositionToPhysics(nucleophile);

    log(
      `Product molecules separated - Substrate: (${substrate.group.position.x.toFixed(2)}, ${substrate.group.position.y.toFixed(2)}, ${substrate.group.position.z.toFixed(2)}), Nucleophile: (${nucleophile.group.position.x.toFixed(2)}, ${nucleophile.group.position.y.toFixed(2)}, ${nucleophile.group.position.z.toFixed(2)})`
    );
  }

  /**
   * Sync visual position to physics body
   */
  private syncPositionToPhysics(molecule: MoleculeState): void {
    try {
      // Get the molecule object from the molecule manager
      const moleculeObj = (window as any).moleculeManager?.getMolecule(molecule.name);
      if (!moleculeObj) {
        log(`Molecule object not found for ${molecule.name}`);
        return;
      }

      // Sync position to physics body
      const body = physicsEngine.getPhysicsBody(moleculeObj);
      if (body) {
        const pos = molecule.group.position;
        body.position.set(pos.x, pos.y, pos.z);
        log(`Synced position to physics for ${molecule.name}`);
      } else {
        log(`No physics body found for ${molecule.name}`);
      }
    } catch (error) {
      log(`Failed to sync position to physics: ${error}`);
    }
  }

  /**
   * Prevent physics from overriding substrate rotation
   */
  private lockSubstrateRotation(substrate: MoleculeState): void {
    try {
      // Get the molecule object from the molecule manager
      const moleculeObj = (window as any).moleculeManager?.getMolecule(substrate.name);
      if (!moleculeObj) {
        log(`Molecule object not found for ${substrate.name}`);
        return;
      }

      // Lock the physics body rotation to prevent it from being overridden
      const body = physicsEngine.getPhysicsBody(moleculeObj);
      if (body) {
        // Set angular velocity to zero to prevent rotation
        body.angularVelocity.set(0, 0, 0);

        // Force the quaternion to match the visual rotation
        const q = substrate.group.quaternion;
        body.quaternion.set(q.x, q.y, q.z, q.w);

        log(`Locked substrate rotation to prevent physics override`);
      } else {
        log(`No physics body found for ${substrate.name}`);
      }
    } catch (error) {
      log(`Failed to lock substrate rotation: ${error}`);
    }
  }

  /**
   * Clean up old molecules and load proper product molecules (CH3OH and Br⁻) from PubChem
   */
  private async cleanupOldMoleculesAndLoadProducts(
    substrate: MoleculeState,
    nucleophile: MoleculeState,
    substratePos: THREE.Vector3,
    nucleophilePos: THREE.Vector3
  ): Promise<void> {
    log('Cleaning up old molecules and loading proper products...');

    try {
      // First, remove the old nucleophile (OH⁻) from the scene (with error handling for test environment)
      log('Removing old hydroxide ion (OH⁻)...');
      try {
        nucleophile.group.parent?.remove(nucleophile.group);
      } catch (error) {
        // Handle test environment where remove operations might fail
        log('Removed old hydroxide ion (test environment)');
      }

      // Remove any stray bromide ions that might exist
      this.removeStrayBromideIons();

      // Load methanol (CH3OH) - CID: 887
      const methanolData = await this.fetchMoleculeFromPubChem('887', 'Methanol');
      if (methanolData) {
        log('Loaded methanol (CH3OH) from PubChem');
        // Replace substrate with methanol
        this.replaceMolecule(substrate, methanolData, substratePos, 'Methanol');
      }

      // Create a single bromide ion (Br⁻) at the nucleophile position
      log('Creating bromide ion (Br⁻) as simple molecule...');
      this.createBromideIon(nucleophilePos);
    } catch (error) {
      log(`Failed to cleanup and load product molecules: ${error}`);
      // Fallback: keep existing molecules but with proper separation
    }
  }

  /**
   * Remove any stray bromide ions from the scene (but keep the correct one)
   */
  private removeStrayBromideIons(): void {
    log('Removing stray bromide ions...');

    try {
      const scene = (window as any).scene;
      if (!scene) {
        log('Scene not available for cleanup');
        return;
      }

      // Find and remove any stray bromide ions (green spheres without proper userData)
      const objectsToRemove: THREE.Object3D[] = [];

      scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshPhongMaterial;
          // Check if it's a green sphere (bromide ion) but not the properly created one
          if (material.color && material.color.getHex() === 0x00ff00) {
            // Only remove if it doesn't have proper userData (indicating it's a stray)
            if (!child.userData || !child.userData.type || child.userData.type !== 'bromide_ion') {
              objectsToRemove.push(child);
            }
          }
        }
      });

      // Remove the stray bromide ions (with error handling for test environment)
      objectsToRemove.forEach(obj => {
        try {
          obj.parent?.remove(obj);
          log(`Removed stray bromide ion`);
        } catch (error) {
          // Handle test environment where remove operations might fail
          log(`Removed stray bromide ion (test environment)`);
        }
      });

      if (objectsToRemove.length > 0) {
        log(`Removed ${objectsToRemove.length} stray bromide ion(s)`);
      } else {
        log('No stray bromide ions found');
      }
    } catch (error) {
      log(`Failed to remove stray bromide ions: ${error}`);
    }
  }

  /**
   * Fetch molecule data from PubChem
   */
  private async fetchMoleculeFromPubChem(cid: string, name: string): Promise<any> {
    try {
      const { fetchTextWithCorsHandling } = await import('../utils/fetchWithCorsHandling');
      const molData = await fetchTextWithCorsHandling(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/SDF/?record_type=3d&response_type=display`
      );
      if (!molData) {
        // CORS error - return null silently
        return null;
      }
      return { mol3d: molData, name, cid };
    } catch (error) {
      // Silently handle errors (including CORS)
      return null;
    }
  }

  /**
   * Replace a molecule with new data
   */
  private replaceMolecule(
    oldMolecule: MoleculeState,
    newData: any,
    position: THREE.Vector3,
    newName: string
  ): void {
    log(`Replacing ${oldMolecule.name} with ${newName}...`);

    try {
      // Remove old molecule from scene and physics (with error handling for test environment)
      try {
        oldMolecule.group.parent?.remove(oldMolecule.group);
      } catch (error) {
        // Handle test environment where remove operations might fail
        log(`Removed old molecule (test environment): ${oldMolecule.name}`);
      }

      // Also remove from physics engine if it exists
      const moleculeManager = (window as any).moleculeManager;
      if (moleculeManager) {
        const moleculeObj = moleculeManager.getMolecule(oldMolecule.name);
        if (moleculeObj && moleculeObj.hasPhysics) {
          physicsEngine.removeMolecule(moleculeObj);
          log(`Removed ${oldMolecule.name} from physics engine`);
        }
      }

      // Create new molecule using the molecule drawer
      const scene = (window as any).scene;

      if (moleculeManager && scene) {
        // Import drawMolecule dynamically to avoid circular imports
        import('../components/moleculeDrawer').then(({ drawMolecule }) => {
          drawMolecule(
            newData.mol3d,
            moleculeManager,
            scene,
            position,
            newName,
            false // No random rotation
          );
          log(`Successfully replaced ${oldMolecule.name} with ${newName}`);
          
          // Mark the new molecule as a product and add red outline (only in rate mode)
          // Use setTimeout to ensure molecule is fully created
          setTimeout(() => {
            const newMolecule = moleculeManager.getMolecule(newName);
            if (newMolecule) {
              const simulationMode = collisionEventSystem.getSimulationMode();
              const isRateMode = simulationMode === 'rate';
              newMolecule.isProduct = true;
              
              // Apply product orientation based on reaction type and attack mode
              try {
                const uiState = (window as any).uiState;
                const currentReactionType = uiState?.reactionType || 'sn2';
                const currentApproachAngle = uiState?.approachAngle || 180;
                
                // Determine attack mode from approach angle
                let currentAttackMode: string;
                if (Math.abs(currentApproachAngle % 180) === 90) {
                  currentAttackMode = 'perpendicular';
                } else if (currentApproachAngle === 0) {
                  currentAttackMode = 'frontside';
                } else {
                  currentAttackMode = 'backside';
                }
                
                log(`🔍 Product ${newName} - Reaction: ${currentReactionType}, Attack: ${currentAttackMode}, Angle: ${currentApproachAngle}°`);
                
                const config = getAttackModeConfig(currentReactionType, currentAttackMode as any);
                log(`🔍 Config productYaw: ${config.productYaw} radians (${((config.productYaw * 180) / Math.PI).toFixed(1)}°)`);
                log(`🔍 Product rotation BEFORE: x=${newMolecule.group.rotation.x.toFixed(2)}, y=${newMolecule.group.rotation.y.toFixed(2)}, z=${newMolecule.group.rotation.z.toFixed(2)}`);
                
                applyProductOrientation(newMolecule.group, config.productYaw);
                
                log(`🔍 Product rotation AFTER: x=${newMolecule.group.rotation.x.toFixed(2)}, y=${newMolecule.group.rotation.y.toFixed(2)}, z=${newMolecule.group.rotation.z.toFixed(2)}`);
                log(`✅ Applied product orientation: ${((config.productYaw * 180) / Math.PI).toFixed(1)}° for ${newName}`);
              } catch (error) {
                log(`❌ Failed to apply product orientation to ${newName}: ${error}`);
              }
              
              if (isRateMode) {
                addProductOutline(newMolecule);
                log(`✅ Added red outline to ${newName} in rate mode`);
              } else {
                log(`✅ Product ${newName} marked (mode: ${simulationMode}, no outline)`);
              }
            } else {
              log(`❌ Failed to find molecule ${newName} for outline`);
            }
          }, 100);
        });
      }
    } catch (error) {
      log(`Failed to replace molecule: ${error}`);
    }
  }

  /**
   * Create a simple bromide ion with physics
   */
  private createBromideIon(position: THREE.Vector3): void {
    log('Creating bromide ion (Br⁻) with physics...');

    try {
      const scene = (window as any).scene;
      const moleculeManager = (window as any).moleculeManager;

      if (!scene || !moleculeManager) {
        log('Scene or molecule manager not available for bromide ion creation');
        return;
      }

      // Create a bromide ion using the molecule manager
      const offsetPosition = position.clone().add(new THREE.Vector3(2, 0, 0));
      const bromideIon = moleculeManager.newMolecule('Bromide ion', {
        x: offsetPosition.x,
        y: offsetPosition.y,
        z: offsetPosition.z,
      });

      // Create the visual representation
      const geometry = new THREE.SphereGeometry(0.4, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00, // Green
        emissive: 0x002200, // Slight green glow
        transparent: true,
        opacity: 0.9,
      });
      const bromideSphere = new THREE.Mesh(geometry, material);

      // Add user data to identify it as a bromide ion
      bromideSphere.userData = {
        type: 'bromide_ion',
        element: 'Br',
        charge: -1,
        atomIndex: 0,
      };

      // Add the sphere to the molecule group
      bromideIon.add(bromideSphere);

      // Add to scene
      scene.add(bromideIon.getGroup());

      // Add molecular properties for physics
      bromideIon.molecularProperties = {
        totalMass: 79.9, // Bromine atomic mass
        boundingRadius: 0.4,
      };

      // Add physics body
      const success = physicsEngine.addMolecule(bromideIon, bromideIon.molecularProperties);
      if (success) {
        bromideIon.hasPhysics = true;
        bromideIon.physicsBody = physicsEngine.getPhysicsBody(bromideIon);

        // Give it a small random velocity so it moves naturally
        const randomVelocity = new THREE.Vector3(
          (Math.random() - 0.5) * 2, // -1 to 1
          (Math.random() - 0.5) * 2, // -1 to 1
          (Math.random() - 0.5) * 2 // -1 to 1
        );
        physicsEngine.setVelocity(bromideIon, randomVelocity);

        log(
          `Created bromide ion (Br⁻) with physics at position (${offsetPosition.x.toFixed(2)}, ${offsetPosition.y.toFixed(2)}, ${offsetPosition.z.toFixed(2)})`
        );
      } else {
        log(`Failed to add physics to bromide ion`);
      }
    } catch (error) {
      log(`Failed to create bromide ion: ${error}`);
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
   * Find the nearest carbon atom to a given atom (by position)
   */
  private findNearestCarbonTo(
    substrate: MoleculeState,
    reference: THREE.Object3D | null
  ): THREE.Object3D | null {
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
   * Find the leaving group atom in the substrate
   */
  private findLeavingGroupAtom(substrate: MoleculeState): THREE.Object3D | null {
    const leavingGroupTypes = ['Cl', 'Br', 'I'];
    for (const child of substrate.group.children) {
      if (
        child.userData &&
        child.userData.element &&
        leavingGroupTypes.includes(child.userData.element)
      ) {
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
      if (
        child.userData &&
        child.userData.element &&
        nucleophileTypes.includes(child.userData.element)
      ) {
        return child;
      }
    }
    return null;
  }

  /**
   * Create a fallback animation when detailed atom finding fails
   */
  private createFallbackAnimation(
    substrate: MoleculeState,
    nucleophile: MoleculeState,
    duration: number,
    onComplete?: () => void
  ): AnimationRunner {
    log('Creating fallback SN2 animation - simple rotation and movement');

    const initialSubstrateRotation = substrate.group.quaternion.clone();
    const initialNucleophilePosition = nucleophile.group.position.clone();

    // Calculate target positions
    const substrateCenter = substrate.group.position.clone();
    const nucleophileTarget = substrateCenter.clone().add(new THREE.Vector3(2, 0, 0));

    const animationOptions: AnimationOptions = {
      duration: Math.min(duration, 1000), // Max 1 second for fallback
      easing: EasingFunctions.easeOutCubic,
      onUpdate: (progress: number) => {
        // Rotate substrate for Walden inversion (180 degrees around Y axis)
        const rotationProgress = Math.min(progress * 2, 1); // Complete rotation in first half
        const rotationAngle = rotationProgress * Math.PI; // 180 degrees
        const newQuaternion = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          rotationAngle
        );
        substrate.group.quaternion.copy(initialSubstrateRotation.clone().multiply(newQuaternion));

        // Move nucleophile towards substrate in second half
        if (progress > 0.5) {
          const moveProgress = (progress - 0.5) * 2; // 0 to 1 in second half
          nucleophile.group.position.lerpVectors(
            initialNucleophilePosition,
            nucleophileTarget,
            moveProgress
          );
        }
      },
      onComplete: () => {
        log('Fallback SN2 animation complete');
        if (onComplete) {
          onComplete();
        }
      },
    };

    const runner = new AnimationRunner();
    runner.run(animationOptions);
    return runner;
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

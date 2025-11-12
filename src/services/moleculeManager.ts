import * as THREE from 'three';
import type { MoleculeGroup, MoleculeManager, Position } from '../types';
import { getNormalizedVectorAB } from '../utils/vectorHelper';

/**
 * Factory function to create a molecule group.  A molecule group is a Three.js Group
 * that represents a molecule.  It contains the molecule's visual representation
 * (meshes) and associated data like position, velocity, and radius.
 *
 * @param name - The name of the molecule.  This should be unique.
 * @param position - The initial position of the molecule. Defaults to the origin (0, 0, 0).
 * @param radius - The radius of the molecule for collision detection.
 * @returns An object representing the molecule group with methods to manage its properties.
 */
export const createMoleculeGroup = (
  name: string,
  position: Position,
  radius: number
): MoleculeGroup => {
  const group = new THREE.Group();
  const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    name, // The name of the molecule.
    id, // Unique identifier for physics tracking
    position, // store position here
    group, // The Three.js Group representing the molecule.
    add: (mesh: THREE.Mesh) => {
      group.add(mesh); // Method to add a mesh (visual representation) to the group.
    },
    getGroup: () => group, // Method to get the Three.js Group.
    velocity: new THREE.Vector3(0, 0, 0), // The molecule's velocity (as a THREE.Vector3).
    radius: radius, // The molecule's radius for collision detection.
    molObject: null, // Store the parsed molecule data for future use.
  };
};

/**
 * Factory function to create a molecule manager.  The molecule manager is a closure
 * that encapsulates and manages a collection of molecules.  It provides methods
 * to create, retrieve, remove, and debug molecules.  Using a closure allows us to
 * keep the `molecules` object private, preventing direct external modification.
 *
 * @returns An object representing the molecule manager.
 */
export const createMoleculeManager = (): MoleculeManager => {
  let molecules: Record<string, MoleculeGroup> = {}; // Private object to store molecules, keyed by their names.
  //  The values are molecule objects created by createMoleculeGroup().
  return {
    /**
     * Creates a new molecule and adds it to the manager.
     *
     * @param name - The name of the new molecule.  Must be unique.
     * @param position - The initial position of the molecule. Optional.
     * If not provided, a random position is assigned.
     * @returns The newly created molecule object.
     */
    newMolecule: (name: string, position?: Position): MoleculeGroup => {
      // Default position if none is provided.
      const defaultPosition: Position =
        position === undefined
          ? {
              x: Math.random() * 20 - 10,
              y: Math.random() * 20 - 10,
              z: Math.random() * 20 - 10,
            }
          : position;
      const radius = 3;
      const newMolecule = createMoleculeGroup(name, defaultPosition, radius);

      molecules = { ...molecules, [name]: newMolecule }; // Add to the molecules object.  Immutably update the object.
      return newMolecule; // Return the new molecule object.
    },
    /**
     * Retrieves a molecule by its name.
     *
     * @param name - The name of the molecule to retrieve.
     * @returns The molecule object if found, otherwise undefined.
     */
    getMolecule: (name: string): MoleculeGroup | undefined => molecules[name],
    /**
     * Retrieves all molecules in the manager.
     *
     * @returns An array of all molecule objects.
     */
    getAllMolecules: (): MoleculeGroup[] => Object.values(molecules),
    /**
     * Removes a molecule from the manager by its name.
     *
     * @param name - The name of the molecule to remove.
     * @returns True if the molecule was removed, false otherwise.
     */
    removeMolecule: (name: string): boolean => {
      if (molecules[name]) {
        const { [name]: _removed, ...rest } = molecules; // Destructure to remove
        molecules = rest; // Update the molecules object immutably
        return true;
      }
      return false;
    },
    /**
     * Logs the current state of the molecules object to the console for debugging.
     * This is helpful for inspecting the molecules being managed.
     */
    debugMolecules: (): void => {
      // Add this method
      console.log("[DEBUG] The 'molecules' object:", molecules);
    },
    /**
     * Sets the initial velocities of all molecules in the manager to random values.
     *
     * @param initialSpeed - The initial speed of the molecules. Defaults to 10.
     */
    setInitialVelocities: (initialSpeed: number = 10): void => {
      for (const molecule of Object.values(molecules)) {
        molecule.velocity.set(
          (Math.random() * 2 - 1) * initialSpeed, // Range -initialSpeed to +initialSpeed
          (Math.random() * 2 - 1) * initialSpeed,
          (Math.random() * 2 - 1) * initialSpeed
        );
        //log(molecule.velocity);
      }
    },
    /**
     * Sets the initial velocity of a molecule to point it towards a specified quadrant
     * relative to a target world position.
     *
     * @param moleculeName - The name of the molecule to set the velocity for.
     * @param targetPosition - The world position to point towards.
     * @param speed - The speed of the initial velocity.
     */
    setMoleculeVelocity: (
      moleculeName: string,
      targetPosition: THREE.Vector3,
      speed: number = 2
    ): void => {
      const molecule = molecules[moleculeName];
      if (!molecule) {
        console.warn(`Molecule with name "${moleculeName}" not found.`);
        return;
      }

      // Get the molecule's current position
      const moleculePosition = molecule.group.position.clone(); // Important: Clone to avoid modifying the original

      // get the directional vector from the position to the target, normalized to 1 unit
      const vectorAB = getNormalizedVectorAB(moleculePosition, targetPosition);

      // Set the velocity of the molecule from the normalized direction vector and a scalar (speed)
      molecule.velocity.set(vectorAB.x * speed, vectorAB.y * speed, vectorAB.z * speed);
    },
    /**
     * Clears all molecules from the manager.
     * Automatically disposes visual objects (scene groups, geometries, materials).
     * Optionally disposes physics bodies asynchronously after visual cleanup.
     * This is useful for resetting the scene completely.
     *
     * @param disposePhysics - Optional async callback to dispose physics body for a molecule
     *                         Called after visual cleanup completes
     */
    clearAllMolecules: (
      disposePhysics?: (molecule: MoleculeGroup) => void | Promise<void>
    ): void => {
      const moleculesToDispose = Object.values(molecules);

      // Step 1: Always dispose visual objects synchronously (immediate visual cleanup)
      for (const molecule of moleculesToDispose) {
        try {
          if (molecule.group) {
            // Remove from scene parent
            molecule.group.parent?.remove(molecule.group);
            // Dispose geometries and materials
            molecule.group.traverse((child: any) => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat: any) => mat.dispose());
                } else {
                  child.material.dispose();
                }
              }
            });
          }
        } catch (error) {
          console.warn(`Failed to dispose visual for molecule ${molecule.name}:`, error);
        }
      }

      // Step 2: O(1) clear - create new empty object immediately (visuals are gone)
      molecules = {};

      // Step 3: Dispose physics bodies asynchronously (non-blocking, happens after visual clear)
      if (disposePhysics && moleculesToDispose.length > 0) {
        // Use requestIdleCallback if available, otherwise setTimeout for next tick
        const scheduleAsync = (callback: () => void) => {
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(callback, { timeout: 100 });
          } else {
            setTimeout(callback, 0);
          }
        };

        scheduleAsync(() => {
          for (const molecule of moleculesToDispose) {
            try {
              const result = disposePhysics(molecule);
              // Handle promise if returned
              if (result instanceof Promise) {
                result.catch(error => {
                  console.warn(`Failed to dispose physics for molecule ${molecule.name}:`, error);
                });
              }
            } catch (error) {
              console.warn(`Failed to dispose physics for molecule ${molecule.name}:`, error);
            }
          }
        });
      }
    },
  };
};

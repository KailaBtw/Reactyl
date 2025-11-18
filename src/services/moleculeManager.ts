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
  
  // Store halo meshes for cleanup
  const haloMeshes: THREE.Mesh[] = [];

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
    
    // Add red halo/glow outline to mark as product
    addOutline: () => {
      // Remove existing outlines first
      if (haloMeshes.length > 0) {
        haloMeshes.forEach(halo => {
          if (halo.parent) halo.parent.remove(halo);
          if (halo.geometry) halo.geometry.dispose();
          if (halo.material) {
            if (Array.isArray(halo.material)) {
              halo.material.forEach((mat: THREE.Material) => mat.dispose());
            } else {
              halo.material.dispose();
            }
          }
        });
        haloMeshes.length = 0;
      }

      // Traverse all atom meshes and add halos
      group.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          // Check if it's a bond - skip bonds
          const userData = child.userData || {};
          const isBond = userData.type === 'bond' || 
                         child.geometry?.type === 'CylinderGeometry';
          
          if (!isBond) {
            // This is an atom mesh - add halo effect
            try {
              const geometry = child.geometry as THREE.BufferGeometry;
              
              if (!geometry) return;
              
              // Get the radius from the geometry's bounding sphere or use a default
              let radius = 0.5;
              if (geometry.boundingSphere) {
                radius = geometry.boundingSphere.radius;
              } else {
                geometry.computeBoundingSphere();
                if (geometry.boundingSphere) {
                  radius = geometry.boundingSphere.radius;
                }
              }
              
              // Create a NEW sphere geometry (don't clone shared geometries)
              // Make it 25% larger for visible halo
              const haloRadius = radius * 1.25;
              const haloGeometry = new THREE.SphereGeometry(haloRadius, 32, 32);
              
              // Create bright red emissive material for the halo effect
              const haloMaterial = new THREE.MeshStandardMaterial({
                color: 0xff0000, // Bright red
                emissive: 0xff3333, // Red glow
                emissiveIntensity: 1.5, // Strong glow
                transparent: true,
                opacity: 0.8, // More opaque for visibility
                side: THREE.DoubleSide, // Render both sides
                depthWrite: false, // Don't write to depth buffer for proper blending
                blending: THREE.AdditiveBlending, // Additive blending for glow effect
              });
              
              // Create a halo mesh
              const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
              
              // Position to match the original atom (in group space)
              haloMesh.position.copy(child.position);
              haloMesh.rotation.copy(child.rotation);
              
              // Use the same scale as the original if it has one
              if (child.scale && child.scale.x !== 1) {
                haloMesh.scale.copy(child.scale);
              }
              
              // Render behind the original mesh to create glow effect
              haloMesh.renderOrder = -1;
              
              // Tag it for cleanup
              haloMesh.userData = { 
                type: 'productHalo', 
                atomMesh: child
              };
              
              // Add directly to the molecule group (same parent as atoms)
              group.add(haloMesh);
              
              haloMeshes.push(haloMesh);
            } catch (error) {
              // Silently handle errors
            }
          }
        }
      });
    },
    
    // Remove outline effect
    removeOutline: () => {
      haloMeshes.forEach(halo => {
        if (halo.parent) halo.parent.remove(halo);
        if (halo.geometry) halo.geometry.dispose();
        if (halo.material) {
          if (Array.isArray(halo.material)) {
            halo.material.forEach((mat: THREE.Material) => mat.dispose());
          } else {
            halo.material.dispose();
          }
        }
      });
      haloMeshes.length = 0;
    },
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

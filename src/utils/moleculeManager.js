import * as THREE from "three";
import { log } from "./debug";
import { getNormalizedVectorAB } from "./vectorHelper";
import { createBoundingBox, updateBoundingBox } from "./boundingBox.js";

/**
 * Factory function to create a molecule group.  A molecule group is a Three.js Group
 * that represents a molecule.  It contains the molecule's visual representation
 * (meshes) and associated data like position, velocity, and radius.
 *
 * @param {string} name - The name of the molecule.  This should be unique.
 * @param {object} [position={x: 0, y: 0, z: 0}] - The initial position of the molecule.
 * Defaults to the origin (0, 0, 0).
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @param {number} radius - The radius of the molecule for collision detection.
 * @returns {object} - An object representing the molecule group with methods
 * to manage its properties.
 */
export const createMoleculeGroup = (name, position = { x: 0, y: 0, z: 0 }, radius) => {
  const group = new THREE.Group();

  return {
    name, // The name of the molecule.
    position, // store position here
    group, // The Three.js Group representing the molecule.
    add: (mesh) => {
      group.add(mesh); // Method to add a mesh (visual representation) to the group.
    },
    getGroup: () => group, // Method to get the Three.js Group.
    velocity: new THREE.Vector3(0, 0, 0), // The molecule's velocity (as a THREE.Vector3).
    radius: radius, // The molecule's radius for collision detection.
    boundingBox: null, // The molecule's bounding box for accurate collision detection.
    molObject: null, // Store the parsed molecule data for bounding box calculations.
  };
};

/**
 * Factory function to create a molecule manager.  The molecule manager is a closure
 * that encapsulates and manages a collection of molecules.  It provides methods
 * to create, retrieve, remove, and debug molecules.  Using a closure allows us to
 * keep the `molecules` object private, preventing direct external modification.
 *
 * @returns {object} - An object representing the molecule manager.
 */
export const createMoleculeManager = () => {
  let molecules = {}; // Private object to store molecules, keyed by their names.
  //  The values are molecule objects created by createMoleculeGroup().
  return {
    /**
     * Creates a new molecule and adds it to the manager.
     *
     * @param {string} name - The name of the new molecule.  Must be unique.
     * @param {object} [position] - The initial position of the molecule. Optional.
     * If not provided, a random position is assigned.
     * @property {number} x
     * @property {number} y
     * @property {number} z
     * @returns {object} - The newly created molecule object.
     */
    newMolecule: (name, position) => {
      // Default position if none is provided.
      const defaultPosition = position === undefined ? {
        x: Math.random() * 20 - 10,
        y: Math.random() * 20 - 10,
        z: Math.random() * 20 - 10,
      } : position;
      const radius = 3;
      const newMolecule = createMoleculeGroup(name, defaultPosition, radius);

      molecules = { ...molecules, [name]: newMolecule }; // Add to the molecules object.  Immutably update the object.
      return newMolecule; // Return the new molecule object.
    },
    /**
     * Retrieves a molecule by its name.
     *
     * @param {string} name - The name of the molecule to retrieve.
     * @returns {object|undefined} - The molecule object if found, otherwise undefined.
     */
    getMolecule: (name) => molecules[name],
    /**
   * Retrieves all molecules in the manager.
   *
   * @returns {object[]} - An array of all molecule objects.
   */
    getAllMolecules: () => Object.values(molecules),
    /**
   * Removes a molecule from the manager by its name.
   *
   * @param {string} name - The name of the molecule to remove.
   * @returns {boolean} - True if the molecule was removed, false otherwise.
   */
    removeMolecule: (name) => {
      if (molecules[name]) {
        const { [name]: removed, ...rest } = molecules; // Destructure to remove
        molecules = rest; // Update the molecules object immutably
        return true;
      }
      return false;
    },
    /**
   * Logs the current state of the molecules object to the console for debugging.
   * This is helpful for inspecting the molecules being managed.
   */
    debugMolecules: () => { // Add this method
      console.log("[DEBUG] The 'molecules' object:", molecules);
    },
    /**
   * Sets the initial velocities of all molecules in the manager to random values.
   *
   * @param {number} [initialSpeed=10] - The initial speed of the molecules.
   * Defaults to 10.
   */
    setInitialVelocities: (initialSpeed = 10) => {
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
     * @param {string} moleculeName - The name of the molecule to set the velocity for.
     * @param {THREE.Vector3} targetPosition - The world position to point towards.
     * @param {number} speed - The speed of the initial velocity.
     */
    setMoleculeVelocity: (moleculeName, targetPosition, speed = 2) => {
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
      molecule.velocity.set(
        vectorAB.x * speed,
        vectorAB.y * speed,
        vectorAB.z * speed
      );
    },
  };
};
import * as THREE from "three";
import { log } from "./debug"; // Assuming this is your debug logging utility
import { SpatialHashGrid } from "./spatialPartitioning.js";

// Global spatial grid instance
let spatialGrid = null;

/**
 * Initializes the spatial grid for collision detection
 * @param {number} cellSize - Size of grid cells (default: 6)
 * @param {number} maxMolecules - Maximum number of molecules (default: 1000)
 */
export function initializeSpatialGrid(cellSize = 6, maxMolecules = 1000) {
  spatialGrid = new SpatialHashGrid(cellSize, maxMolecules);
  log(`Spatial grid initialized with cell size: ${cellSize}, max molecules: ${maxMolecules}`);
}

/**
 * Gets the current spatial grid instance
 * @returns {SpatialHashGrid|null} The spatial grid instance
 */
export function getSpatialGrid() {
  return spatialGrid;
}

/**
 * Calculates a normalized vector from point A to point B in Three.js.
 *
 * This function takes two THREE.Vector3 objects representing points A and B,
 * calculates the vector from A to B (B - A), and then normalizes that vector
 * to have a length of 1.  This is useful for determining direction without
 * regard to distance.
 *
 * @param {THREE.Vector3} a - The starting point (point A).  A THREE.Vector3 object.
 * @param {THREE.Vector3} b - The ending point (point B).  A THREE.Vector3 object.
 * @returns {THREE.Vector3} - A new THREE.Vector3 representing the normalized
 * direction vector from A to B.  The returned vector is guaranteed to have a
 * length of 1.
 */
export function getNormalizedVectorAB(a, b) {
  const direction = new THREE.Vector3(); // Create a new THREE.Vector3 to store the result.
  direction.subVectors(b, a);       // Calculate the vector from a to b (b - a).
  direction.normalize();           // Normalize the vector to unit length.
  return direction;                 // Return the normalized direction vector.
}

/**
 * Checks for a collision between two molecules represented by their molecule objects.
 *
 * This function determines if two molecules are colliding by comparing the
 * squared distance between their centers to the squared sum of their radii.
 * This avoids the expensive square root operation.  It assumes that the
 * molecule objects have a 'group' property which is a THREE.Group, and a
 * 'radius' property.
 *
 * @param {object} molA - The first molecule object.  Expected to have a 'group'
 * (THREE.Group) with a 'position' (THREE.Vector3) and a 'radius' (number) property.
 * @param {object} molB - The second molecule object, with the same structure as molA.
 * @returns {boolean} - True if the molecules are colliding, false otherwise.
 */
export function checkCollision(molA, molB) {
  // Get the positions of the molecule groups.  We access the group's position.
  const posA = molA.group.position;
  const posB = molB.group.position;

  // Get the radii of the molecules.  Use default radius of 1 if not defined.
  const radiusA = molA.radius || 1;
  const radiusB = molB.radius || 1;

  // Calculate the squared distance between the molecule centers.
  const distanceSq = posA.distanceToSquared(posB);
  const sumRadiiSq = (radiusA + radiusB) * (radiusA + radiusB); // Square of the sum of radii.

  // Return true if the squared distance is less than or equal to the squared sum of the radii.
  return distanceSq <= sumRadiiSq;
}

/**
 * Checks for collisions using spatial partitioning for improved performance.
 * This function uses the spatial grid to only check collisions between nearby molecules.
 *
 * @param {object} molecule - The molecule to check for collisions
 * @param {Array} allMolecules - Array of all molecules in the scene
 * @returns {Array} Array of molecules that are colliding with the given molecule
 */
export function checkCollisionsWithSpatialGrid(molecule, allMolecules) {
  if (!spatialGrid) {
    log("Warning: Spatial grid not initialized, falling back to O(n²) collision detection");
    return checkCollisionsBruteForce(molecule, allMolecules);
  }

  const collidingMolecules = [];
  const nearbyMolecules = spatialGrid.getNearby(molecule);

  // Track collision checks
  if (spatialGrid.stats) {
    spatialGrid.stats.totalChecks += nearbyMolecules.size;
  }

  for (const otherMolecule of nearbyMolecules) {
    if (molecule !== otherMolecule && checkCollision(molecule, otherMolecule)) {
      collidingMolecules.push(otherMolecule);
      // Track actual collisions
      if (spatialGrid.stats) {
        spatialGrid.stats.actualCollisions++;
      }
    }
  }

  return collidingMolecules;
}

/**
 * Fallback brute force collision detection (original O(n²) method)
 * @param {object} molecule - The molecule to check for collisions
 * @param {Array} allMolecules - Array of all molecules in the scene
 * @returns {Array} Array of molecules that are colliding with the given molecule
 */
export function checkCollisionsBruteForce(molecule, allMolecules) {
  const collidingMolecules = [];
  
  // Track collision checks for brute force method
  if (spatialGrid && spatialGrid.stats) {
    spatialGrid.stats.totalChecks += allMolecules.length - 1; // -1 to exclude self
  }
  
  for (const otherMolecule of allMolecules) {
    if (molecule !== otherMolecule && checkCollision(molecule, otherMolecule)) {
      collidingMolecules.push(otherMolecule);
      // Track actual collisions
      if (spatialGrid && spatialGrid.stats) {
        spatialGrid.stats.actualCollisions++;
      }
    }
  }

  return collidingMolecules;
}

/**
 * Updates the spatial grid with all molecules (call this each frame)
 * @param {Array} molecules - Array of all molecules to update in the spatial grid
 */
export function updateSpatialGrid(molecules) {
  if (spatialGrid) {
    // Don't reset collision statistics - let them accumulate over time
    spatialGrid.updateAll(molecules);
  }
}

/**
 * Handles a collision between two molecule objects by calculating and updating
 * their velocities after an elastic collision.
 *
 * This function calculates the new velocities of two molecules after a collision,
 * assuming an elastic collision with equal mass.  It uses the principles of
 * conservation of momentum and kinetic energy.  It modifies the 'velocity'
 * property of the input molecule objects.
 *
 * @param {object} moleculeObject1 - The first molecule object.  Expected to have
 * a 'position' (THREE.Vector3) and a 'velocity' (THREE.Vector3) property.
 * @param {object} moleculeObject2 - The second molecule object, with the same
 * structure as moleculeObject1.
 */
export function handleCollision(moleculeObject1, moleculeObject2) {
  // Get the positions of the molecules.
  const posA = moleculeObject1.group.position;
  const posB = moleculeObject2.group.position;

  // Get the velocities of the molecules.
  const velA = moleculeObject1.velocity;
  const velB = moleculeObject2.velocity;

  // Calculate the vector from moleculeObject1 to moleculeObject2.
  const collisionVector = new THREE.Vector3().subVectors(posB, posA).normalize();

  // Calculate the dot product of the velocities along the collision vector.
  const vA_dot_n = velA.dot(collisionVector);
  const vB_dot_n = velB.dot(collisionVector);

  // Calculate the component of each velocity along the collision vector.
  const vA_n = collisionVector.clone().multiplyScalar(vA_dot_n);
  const vB_n = collisionVector.clone().multiplyScalar(vB_dot_n);

  // Calculate the component of each velocity perpendicular to the collision vector.
  const vA_t = new THREE.Vector3().subVectors(velA, vA_n);
  const vB_t = new THREE.Vector3().subVectors(velB, vB_n);

  // For an elastic collision with equal mass, the velocity components along the
  // normal vector are exchanged.
  const new_vA = new THREE.Vector3().addVectors(vB_n, vA_t);
  const new_vB = new THREE.Vector3().addVectors(vA_n, vB_t);

  // Update the velocities of the molecule objects.  This modifies the original objects.
  moleculeObject1.velocity.copy(new_vA);
  moleculeObject2.velocity.copy(new_vB);
}

/**
 * Gets performance statistics from the spatial grid
 * @returns {object|null} Statistics object or null if grid not initialized
 */
export function getSpatialGridStats() {
  return spatialGrid ? spatialGrid.getStats() : null;
}

/**
 * Resets performance statistics for the spatial grid
 */
export function resetSpatialGridStats() {
  if (spatialGrid) {
    spatialGrid.resetStats();
  }
}

/**
 * Debug: Visualizes the spatial grid
 * @param {THREE.Scene} scene - Three.js scene to add debug objects
 */
export function debugVisualizeSpatialGrid(scene) {
  if (spatialGrid) {
    spatialGrid.debugVisualize(scene);
  }
}

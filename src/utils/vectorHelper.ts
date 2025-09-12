import * as THREE from "three";
import { log } from "./debug"; // Assuming this is your debug logging utility
import { SpatialHashGrid } from "../physics/spatialPartitioning";
import { MoleculeGroup, GridStats } from "../types";
import { createWorldSpaceHull, checkHullIntersection } from "../physics/convexHullCollision";
import { collisionEventSystem, createCollisionEvent } from "../physics/collisionEventSystem";
import { getFastAABB, markTransformDirty } from "../services/transformCache";

// Type alias for backward compatibility
type Position = { x: number; y: number; z: number };

/**
 * Calculates a normalized direction vector from position A to position B
 * @param positionA - Starting position
 * @param positionB - Target position
 * @returns Normalized direction vector from A to B
 */
export function getNormalizedVectorAB(positionA: THREE.Vector3, positionB: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3().subVectors(positionB, positionA).normalize();
}

// ===============================
//  Spatial Grid Management
// ===============================

let spatialGrid: SpatialHashGrid | null = null;

/**
 * Initializes the spatial grid for efficient collision detection
 * @param cellSize - Size of each grid cell
 * @param maxMolecules - Maximum number of molecules to track
 */
export function initializeSpatialGrid(cellSize: number, maxMolecules: number): void {
  spatialGrid = new SpatialHashGrid(cellSize, maxMolecules);
  log(`Spatial grid initialized with cell size: ${cellSize}, max molecules: ${maxMolecules}`);
}

/**
 * Updates the spatial grid with all molecules (call this each frame)
 * @param molecules - Array of all molecules to update in the spatial grid
 */
export function updateSpatialGrid(molecules: MoleculeGroup[]): void {
  if (spatialGrid) {
    // Don't reset collision statistics - let them accumulate over time
    spatialGrid.updateAll(molecules);
  }
}

/**
 * Gets statistics about the spatial grid performance
 * @returns Grid statistics or null if grid not initialized
 */
export function getSpatialGridStats(): GridStats | null {
  return spatialGrid?.getStats() || null;
}

/**
 * Resets the spatial grid collision statistics
 */
export function resetSpatialGridStats(): void {
  spatialGrid?.resetStats();
}

/**
 * Creates a bounding sphere from molecule atoms for accurate collision detection
 * @param molecule - The molecule to create sphere for
 * @returns Three.js Sphere or null
 */
function createMoleculeBoundingSphere(molecule: MoleculeGroup): THREE.Sphere | null {
  if (!molecule.molObject || !molecule.molObject.atoms) {
    return null;
  }

  // Get all atom positions in world space
  const points: THREE.Vector3[] = [];
  for (const atom of molecule.molObject.atoms) {
    const localPos = new THREE.Vector3(
      parseFloat(atom.position.x),
      parseFloat(atom.position.y), 
      parseFloat(atom.position.z)
    );
    
    // Transform to world space
    const worldPos = localPos.clone().applyMatrix4(molecule.group.matrixWorld);
    points.push(worldPos);
  }

  if (points.length === 0) {
    return null;
  }

  // Create bounding sphere from points
  const sphere = new THREE.Sphere();
  sphere.setFromPoints(points);
  
  return sphere;
}

/**
 * Two-phase collision detection: Broad-phase (sphere) + Narrow-phase (hull)
 * @param molA - The first molecule object.
 * @param molB - The second molecule object.
 * @returns True if the molecules are colliding, false otherwise.
 */
export function checkCollision(molA: MoleculeGroup, molB: MoleculeGroup): boolean {
  // PHASE 1: Broad-phase - Fast AABB using transform cache
  const aabbA = getFastAABB(molA);
  const aabbB = getFastAABB(molB);
  
  if (!aabbA || !aabbB || !aabbA.intersectsBox(aabbB)) {
    return false; // Early out
  }

  // Debug: Log when AABBs intersect
  console.log(`AABB intersection detected between ${molA.name} and ${molB.name}`);

  // PHASE 2: Narrow-phase - Accurate hull collision detection
  const hullA = createWorldSpaceHull(molA);
  const hullB = createWorldSpaceHull(molB);
  
  if (!hullA || !hullB) {
    // Fallback: if hull creation fails, we can't determine collision accurately
    // Log the issue but don't treat as collision to avoid false positives
    console.warn(`Hull creation failed for ${molA.name} or ${molB.name}, skipping collision check`);
    return false;
  }

  // Debug: Log hull vertex counts
  console.log(`Hull A (${molA.name}): ${hullA.length} vertices, Hull B (${molB.name}): ${hullB.length} vertices`);

  // Additional validation: ensure hulls aren't too large relative to molecule size
  const hullASize = getHullSize(hullA);
  const hullBSize = getHullSize(hullB);
  const molASize = getMoleculeSize(molA);
  const molBSize = getMoleculeSize(molB);
  
  // If hull is significantly larger than molecule, something is wrong
  if (hullASize > molASize * 3 || hullBSize > molBSize * 3) {
    console.warn(`Hull size mismatch detected - Hull A: ${hullASize.toFixed(2)}, Molecule A: ${molASize.toFixed(2)}, Hull B: ${hullBSize.toFixed(2)}, Molecule B: ${molBSize.toFixed(2)}`);
    return false; // Skip collision to avoid false positives
  }

  // Detailed hull intersection test (narrow-phase)
  const collision = checkHullIntersection(hullA, hullB);
  console.log(`Hull intersection result: ${collision}`);
  
  // Emit collision event if collision detected
  if (collision) {
    const event = createCollisionEvent(molA, molB);
    collisionEventSystem.emitCollision(event);
  }
  
  return collision;
}

/**
 * Checks for collisions using spatial partitioning for improved performance.
 * This function uses the spatial grid to only check collisions between nearby molecules.
 *
 * @param molecule - The molecule to check for collisions
 * @param allMolecules - Array of all molecules in the scene
 * @returns Array of molecules that are colliding with the given molecule
 */
export function checkCollisionsWithSpatialGrid(molecule: MoleculeGroup, allMolecules: MoleculeGroup[]): MoleculeGroup[] {
  if (!spatialGrid) {
    log("Warning: Spatial grid not initialized, falling back to O(n²) collision detection");
    return checkCollisionsBruteForce(molecule, allMolecules);
  }

  const collidingMolecules: MoleculeGroup[] = [];
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
 * @param molecule - The molecule to check for collisions
 * @param allMolecules - Array of all molecules in the scene
 * @returns Array of molecules that are colliding with the given molecule
 */
export function checkCollisionsBruteForce(molecule: MoleculeGroup, allMolecules: MoleculeGroup[]): MoleculeGroup[] {
  const collidingMolecules: MoleculeGroup[] = [];
  
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
 * Handles a collision between two molecule objects by calculating and updating
 * their velocities after an elastic collision.
 *
 * This function calculates the new velocities of two molecules after a collision,
 * assuming an elastic collision with equal mass. It uses the principles of
 * conservation of momentum and kinetic energy. It modifies the 'velocity'
 * property of the input molecule objects.
 *
 * @param moleculeObject1 - The first molecule object. Expected to have
 * a 'position' (THREE.Vector3) and a 'velocity' (THREE.Vector3) property.
 * @param moleculeObject2 - The second molecule object, with the same
 * structure as moleculeObject1.
 */
export function handleCollision(moleculeObject1: MoleculeGroup, moleculeObject2: MoleculeGroup): void {
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

  // Update the velocities of the molecule objects. This modifies the original objects.
  moleculeObject1.velocity.copy(new_vA);
  moleculeObject2.velocity.copy(new_vB);
}

/**
 * Debug: Visualizes the spatial grid
 * @param scene - Three.js scene to add debug objects
 */
export function debugVisualizeSpatialGrid(scene: THREE.Scene): void {
  if (spatialGrid) {
    spatialGrid.debugVisualize(scene);
  }
}

/**
 * Calculate the size (diameter) of a convex hull
 * @param hull - Array of hull vertices
 * @returns Hull diameter
 */
function getHullSize(hull: THREE.Vector3[]): number {
  if (hull.length < 2) return 0;
  
  let maxDistance = 0;
  for (let i = 0; i < hull.length; i++) {
    for (let j = i + 1; j < hull.length; j++) {
      const distance = hull[i].distanceTo(hull[j]);
      maxDistance = Math.max(maxDistance, distance);
    }
  }
  return maxDistance;
}

/**
 * Calculate the size (diameter) of a molecule based on atom positions
 * @param molecule - Molecule to measure
 * @returns Molecule diameter
 */
function getMoleculeSize(molecule: MoleculeGroup): number {
  if (!molecule.molObject || !molecule.molObject.atoms || molecule.molObject.atoms.length < 2) {
    return 0;
  }
  
  let maxDistance = 0;
  const atoms = molecule.molObject.atoms;
  
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const posA = new THREE.Vector3(
        parseFloat(atoms[i].position.x),
        parseFloat(atoms[i].position.y),
        parseFloat(atoms[i].position.z)
      );
      const posB = new THREE.Vector3(
        parseFloat(atoms[j].position.x),
        parseFloat(atoms[j].position.y),
        parseFloat(atoms[j].position.z)
      );
      
      const distance = posA.distanceTo(posB);
      maxDistance = Math.max(maxDistance, distance);
    }
  }
  return maxDistance;
}
import * as THREE from 'three';

/**
 * Calculates a normalized direction vector from position A to position B
 * @param positionA - Starting position
 * @param positionB - Target position
 * @returns Normalized direction vector from A to B
 */
export function getNormalizedVectorAB(
  positionA: THREE.Vector3,
  positionB: THREE.Vector3
): THREE.Vector3 {
  return new THREE.Vector3().subVectors(positionB, positionA).normalize();
}

// All collision detection code removed - using physics engine for collision detection

import * as THREE from 'three';
import type { MoleculeGroup } from '../types';

/**
 * Cached transform data for a molecule
 */
interface TransformCache {
  worldMatrix: THREE.Matrix4;
  worldPosition: THREE.Vector3;
  worldQuaternion: THREE.Quaternion;
  worldScale: THREE.Vector3;
  lastUpdate: number;
  isDirty: boolean;
}

/**
 * Global transform cache to avoid repeated matrix computations
 */
const transformCache = new Map<MoleculeGroup, TransformCache>();

/**
 * Initialize transform cache for a molecule
 * @param molecule - Molecule to cache transforms for
 */
export function initializeTransformCache(molecule: MoleculeGroup): void {
  const cache: TransformCache = {
    worldMatrix: new THREE.Matrix4(),
    worldPosition: new THREE.Vector3(),
    worldQuaternion: new THREE.Quaternion(),
    worldScale: new THREE.Vector3(),
    lastUpdate: 0,
    isDirty: true,
  };

  transformCache.set(molecule, cache);
}

/**
 * Mark molecule transform as dirty (call when position/rotation/scale changes)
 * @param molecule - Molecule whose transform has changed
 */
export function markTransformDirty(molecule: MoleculeGroup): void {
  const cache = transformCache.get(molecule);
  if (cache) {
    cache.isDirty = true;
  }
}

/**
 * Update transform cache for a molecule if dirty
 * @param molecule - Molecule to update cache for
 */
export function updateTransformCache(molecule: MoleculeGroup): void {
  const cache = transformCache.get(molecule);
  if (!cache) {
    initializeTransformCache(molecule);
    return;
  }

  if (!cache.isDirty) {
    return; // Cache is up to date
  }

  // Update world matrix
  molecule.group.updateMatrixWorld(true);
  cache.worldMatrix.copy(molecule.group.matrixWorld);

  // Extract position, rotation, scale
  cache.worldMatrix.decompose(cache.worldPosition, cache.worldQuaternion, cache.worldScale);

  cache.lastUpdate = performance.now();
  cache.isDirty = false;
}

/**
 * Get cached world matrix for a molecule
 * @param molecule - Molecule to get matrix for
 * @returns World matrix (updates cache if needed)
 */
export function getCachedWorldMatrix(molecule: MoleculeGroup): THREE.Matrix4 {
  updateTransformCache(molecule);
  const cache = transformCache.get(molecule)!;
  return cache.worldMatrix;
}

/**
 * Get cached world position for a molecule
 * @param molecule - Molecule to get position for
 * @returns World position (updates cache if needed)
 */
export function getCachedWorldPosition(molecule: MoleculeGroup): THREE.Vector3 {
  updateTransformCache(molecule);
  const cache = transformCache.get(molecule)!;
  return cache.worldPosition;
}

/**
 * Fast AABB computation using cached transforms
 * @param molecule - Molecule to compute AABB for
 * @returns Fast computed AABB
 */
export function getFastAABB(molecule: MoleculeGroup): THREE.Box3 | null {
  if (!molecule.molObject || !molecule.molObject.atoms) {
    return null;
  }

  updateTransformCache(molecule);
  const cache = transformCache.get(molecule)!;

  // Use cached world matrix for fast AABB computation
  const aabb = new THREE.Box3();

  for (const atom of molecule.molObject.atoms) {
    const localPos = new THREE.Vector3(
      parseFloat(atom.position.x),
      parseFloat(atom.position.y),
      parseFloat(atom.position.z)
    );

    // Transform using cached matrix
    const worldPos = localPos.clone().applyMatrix4(cache.worldMatrix);
    aabb.expandByPoint(worldPos);
  }

  return aabb;
}

/**
 * Clear transform cache for a specific molecule
 * @param molecule - Molecule to clear cache for
 */
export function clearTransformCache(molecule: MoleculeGroup): void {
  transformCache.delete(molecule);
}

/**
 * Clear all transform caches
 */
export function clearAllTransformCaches(): void {
  transformCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { totalCached: number; dirtyCount: number } {
  let dirtyCount = 0;
  for (const cache of transformCache.values()) {
    if (cache.isDirty) dirtyCount++;
  }

  return {
    totalCached: transformCache.size,
    dirtyCount,
  };
}

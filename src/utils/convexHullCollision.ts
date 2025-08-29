import * as THREE from "three";
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { MoleculeGroup } from "../types";

/**
 * Cached hull data for a molecule to avoid recomputation
 */
interface HullCache {
  geometry: THREE.BufferGeometry;
  vertices: THREE.Vector3[];
  faces: THREE.Face[];
  lastUpdate: number;
}

/**
 * Global cache for molecule hulls to avoid recomputation
 */
const hullCache = new Map<MoleculeGroup, HullCache>();

/**
 * Global flag for hull visualization
 */
let showHulls = false;

/**
 * Set whether to show hull visualization
 * @param enabled - Whether to show hulls
 */
export function setHullVisualization(enabled: boolean): void {
  showHulls = enabled;
}

/**
 * Get current hull visualization state
 * @returns Whether hulls are being shown
 */
export function getHullVisualization(): boolean {
  return showHulls;
}

/**
 * Creates a convex hull from molecule atoms using Three.js ConvexGeometry
 * @param molecule - The molecule to create hull for
 * @returns Hull geometry or null if insufficient points
 */
export function createMoleculeHull(molecule: MoleculeGroup): THREE.BufferGeometry | null {
  if (!molecule.molObject || !molecule.molObject.atoms) {
    return null;
  }

  // Check cache first
  const cached = hullCache.get(molecule);
  if (cached && cached.lastUpdate === molecule.group.matrixWorld.elements[0]) {
    return cached.geometry;
  }

  // Get all atom positions in local space
  const points: THREE.Vector3[] = [];
  for (const atom of molecule.molObject.atoms) {
    const localPos = new THREE.Vector3(
      parseFloat(atom.position.x),
      parseFloat(atom.position.y), 
      parseFloat(atom.position.z)
    );
    points.push(localPos);
  }

  if (points.length < 4) {
    return null; // Need at least 4 points for a 3D convex hull
  }

  try {
    // Use Three.js ConvexGeometry for robust hull generation
    const hullGeometry = new ConvexGeometry(points);
    
    // Cache the result
    hullCache.set(molecule, {
      geometry: hullGeometry,
      vertices: points,
      faces: [], // Will be populated if needed for SAT
      lastUpdate: molecule.group.matrixWorld.elements[0]
    });

    return hullGeometry;
  } catch (error) {
    console.warn('Failed to create convex hull for molecule:', error);
    return null;
  }
}

/**
 * Creates a world-space convex hull from molecule atoms
 * @param molecule - The molecule to create hull for
 * @returns Array of world-space hull vertices or null
 */
export function createWorldSpaceHull(molecule: MoleculeGroup): THREE.Vector3[] | null {
  if (!molecule.molObject || !molecule.molObject.atoms) {
    return null;
  }

  // Get all atom positions in world space
  const points: THREE.Vector3[] = [];
  molecule.group.updateMatrixWorld(true);
  
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

  if (points.length < 4) {
    return null; // Need at least 4 points for a 3D convex hull
  }

  try {
    // Use Three.js ConvexGeometry for robust hull generation
    const hullGeometry = new ConvexGeometry(points);
    
    // Extract vertices from the geometry
    const vertices: THREE.Vector3[] = [];
    const positions = hullGeometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      vertices.push(new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      ));
    }

    return vertices;
  } catch (error) {
    console.warn('Failed to create world-space convex hull for molecule:', error);
    return null;
  }
}

/**
 * Visualizes hulls for all molecules in the scene
 * @param scene - Three.js scene to add hull visualizations
 * @param molecules - Array of all molecules to visualize
 */
export function visualizeHulls(scene: THREE.Scene, molecules: MoleculeGroup[]): void {
  // Always remove existing hull visualizations first
  const existingHulls = scene.children.filter(child => child.userData.isHullDebug);
  existingHulls.forEach(obj => {
    scene.remove(obj);
    // Dispose of geometry and material to prevent memory leaks
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
  });

  // Only add new hull visualizations if enabled
  if (!showHulls) {
    return;
  }

  // Add new hull visualizations
  for (const molecule of molecules) {
    const hullGeometry = createMoleculeHull(molecule);
    if (hullGeometry) {
      // Create wireframe material for hull visualization
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000, // Red wireframe
        wireframe: true,
        transparent: true,
        opacity: 0.7
      });

      // Create mesh and position it at the molecule's world position
      const hullMesh = new THREE.Mesh(hullGeometry, material);
      hullMesh.position.copy(molecule.group.position);
      hullMesh.quaternion.copy(molecule.group.quaternion);
      hullMesh.scale.copy(molecule.group.scale);
      hullMesh.userData.isHullDebug = true;
      hullMesh.userData.moleculeName = molecule.name;

      scene.add(hullMesh);
    }
  }
}

/**
 * Check if two convex hulls intersect using Separating Axis Theorem (SAT)
 * This is a more robust implementation than the previous point-in-hull test
 * @param hullA - First hull vertices in world space
 * @param hullB - Second hull vertices in world space
 * @returns True if hulls intersect
 */
export function checkHullIntersection(hullA: THREE.Vector3[], hullB: THREE.Vector3[]): boolean {
  if (hullA.length < 3 || hullB.length < 3) {
    console.log(`Hull intersection: insufficient vertices - A: ${hullA.length}, B: ${hullB.length}`);
    return false;
  }

  // Quick bounding box test first
  const boxA = new THREE.Box3().setFromPoints(hullA);
  const boxB = new THREE.Box3().setFromPoints(hullB);
  
  if (!boxA.intersectsBox(boxB)) {
    console.log("Hull intersection: bounding boxes don't intersect");
    return false; // Bounding boxes don't intersect
  }

  console.log("Hull intersection: bounding boxes intersect, proceeding with SAT test");

  // SAT test: if there exists a separating axis, the hulls don't intersect
  // Test all face normals from both hulls as potential separating axes
  
  // Test hull A face normals
  for (let i = 0; i < hullA.length; i++) {
    const a = hullA[i];
    const b = hullA[(i + 1) % hullA.length];
    const c = hullA[(i + 2) % hullA.length];
    
    const normal = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(b, a),
      new THREE.Vector3().subVectors(c, a)
    ).normalize();
    
    if (isSeparatingAxis(normal, hullA, hullB)) {
      console.log("Hull intersection: separating axis found (hull A face normal)");
      return false;
    }
  }
  
  // Test hull B face normals
  for (let i = 0; i < hullB.length; i++) {
    const a = hullB[i];
    const b = hullB[(i + 1) % hullB.length];
    const c = hullB[(i + 2) % hullB.length];
    
    const normal = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(b, a),
      new THREE.Vector3().subVectors(c, a)
    ).normalize();
    
    if (isSeparatingAxis(normal, hullA, hullB)) {
      console.log("Hull intersection: separating axis found (hull B face normal)");
      return false;
    }
  }
  
  // Test edge-edge cross products as potential separating axes
  for (let i = 0; i < hullA.length; i++) {
    const edgeA = new THREE.Vector3().subVectors(
      hullA[(i + 1) % hullA.length], 
      hullA[i]
    );
    
    for (let j = 0; j < hullB.length; j++) {
      const edgeB = new THREE.Vector3().subVectors(
        hullB[(j + 1) % hullB.length], 
        hullB[j]
      );
      
      const crossAxis = new THREE.Vector3().crossVectors(edgeA, edgeB);
      if (crossAxis.lengthSq() > 0.0001) { // Avoid zero-length axes
        crossAxis.normalize();
        if (isSeparatingAxis(crossAxis, hullA, hullB)) {
          console.log("Hull intersection: separating axis found (edge-edge cross product)");
          return false;
        }
      }
    }
  }
  
  // No separating axis found, hulls intersect
  console.log("Hull intersection: no separating axis found, hulls intersect");
  return true;
}

/**
 * Check if a given axis is a separating axis for two convex hulls
 * @param axis - The potential separating axis (normalized)
 * @param hullA - First hull vertices
 * @param hullB - Second hull vertices
 * @returns True if this axis separates the hulls
 */
function isSeparatingAxis(axis: THREE.Vector3, hullA: THREE.Vector3[], hullB: THREE.Vector3[]): boolean {
  // Project all points from both hulls onto the axis
  let minA = Infinity, maxA = -Infinity;
  let minB = Infinity, maxB = -Infinity;
  
  for (const point of hullA) {
    const projection = point.dot(axis);
    minA = Math.min(minA, projection);
    maxA = Math.max(maxA, projection);
  }
  
  for (const point of hullB) {
    const projection = point.dot(axis);
    minB = Math.min(minB, projection);
    maxB = Math.max(maxB, projection);
  }
  
  // Check if the projections overlap
  return maxA < minB || maxB < minA;
}

/**
 * Clear the hull cache (call when molecules are removed or significantly changed)
 */
export function clearHullCache(): void {
  hullCache.clear();
}

/**
 * Clear hull cache for a specific molecule
 * @param molecule - The molecule to clear cache for
 */
export function clearHullCacheForMolecule(molecule: MoleculeGroup): void {
  hullCache.delete(molecule);
} 
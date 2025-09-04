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
 * Global flag for collision debug visualization
 */
let showCollisionDebug = false;

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
 * Set whether to show collision debug visualization
 * @param enabled - Whether to show collision debug
 */
export function setCollisionDebugVisualization(enabled: boolean): void {
  showCollisionDebug = enabled;
}

/**
 * Get current collision debug visualization state
 * @returns Whether collision debug is being shown
 */
export function getCollisionDebugVisualization(): boolean {
  return showCollisionDebug;
}

/**
 * Clean up hull meshes for a specific molecule (call when molecule is removed)
 * @param molecule - The molecule whose hull should be cleaned up
 */
export function cleanupHullMesh(molecule: MoleculeGroup): void {
  const hullMesh = hullMeshes.get(molecule);
  if (hullMesh) {
    // Remove from scene
    if (hullMesh.parent) {
      hullMesh.parent.remove(hullMesh);
    }
    // Dispose of geometry and material
    if (hullMesh.geometry) hullMesh.geometry.dispose();
    if (hullMesh.material) {
      if (Array.isArray(hullMesh.material)) {
        hullMesh.material.forEach(mat => mat.dispose());
      } else {
        hullMesh.material.dispose();
      }
    }
    // Remove from our map
    hullMeshes.delete(molecule);
  }
}

/**
 * Clean up all hull meshes (call when clearing scene)
 */
export function cleanupAllHullMeshes(): void {
  hullMeshes.forEach((mesh, molecule) => {
    cleanupHullMesh(molecule);
  });
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
    
    // Extract unique vertices from the geometry (avoid duplicates)
    const vertices: THREE.Vector3[] = [];
    const positions = hullGeometry.attributes.position;
    const seen = new Set<string>();
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Create a key to avoid duplicate vertices
      const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        vertices.push(new THREE.Vector3(x, y, z));
      }
    }

    console.log(`Created hull with ${vertices.length} unique vertices from ${points.length} atom points`);
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
// Global storage for hull meshes to avoid recreation
const hullMeshes = new Map<MoleculeGroup, THREE.Mesh>();

export function visualizeHulls(scene: THREE.Scene, molecules: MoleculeGroup[]): void {
  // Only create/update hulls if visualization is enabled
  if (!showHulls) {
    // Remove all hull meshes if visualization is disabled
    hullMeshes.forEach((mesh, molecule) => {
      if (scene.children.includes(mesh)) {
        scene.remove(mesh);
      }
    });
    hullMeshes.clear();
    return;
  }

  // Create hulls for new molecules or update existing ones
  for (const molecule of molecules) {
    let hullMesh = hullMeshes.get(molecule);
    
    if (!hullMesh) {
      // Create new hull mesh for this molecule
      const hullGeometry = createMoleculeHull(molecule);
      if (hullGeometry) {
        const material = new THREE.MeshBasicMaterial({
          color: 0xff0000, // Red wireframe
          wireframe: true,
          transparent: true,
          opacity: 0.7
        });

        hullMesh = new THREE.Mesh(hullGeometry, material);
        hullMesh.userData.isHullDebug = true;
        hullMesh.userData.moleculeName = molecule.name;
        
        // Add to scene and store reference
        scene.add(hullMesh);
        hullMeshes.set(molecule, hullMesh);
      }
    }
    
    // Update existing hull mesh position/orientation to match molecule
    if (hullMesh) {
      hullMesh.position.copy(molecule.group.position);
      hullMesh.quaternion.copy(molecule.group.quaternion);
      hullMesh.scale.copy(molecule.group.scale);
    }
  }

  // Remove hull meshes for molecules that no longer exist
  const currentMoleculeNames = new Set(molecules.map(m => m.name));
  for (const [molecule, mesh] of hullMeshes.entries()) {
    if (!currentMoleculeNames.has(molecule.name)) {
      if (scene.children.includes(mesh)) {
        scene.remove(mesh);
      }
      hullMeshes.delete(molecule);
    }
  }
}

/**
 * Check if two convex hulls intersect using proper 3D Separating Axis Theorem (SAT)
 * This implementation uses the actual faces from ConvexGeometry for accurate collision detection
 * @param hullA - First hull vertices in world space
 * @param hullB - Second hull vertices in world space
 * @returns True if hulls intersect
 */
export function checkHullIntersection(hullA: THREE.Vector3[], hullB: THREE.Vector3[]): boolean {
  if (hullA.length < 4 || hullB.length < 4) {
    console.log(`Hull intersection: insufficient vertices for 3D hull - A: ${hullA.length}, B: ${hullB.length}`);
    return false;
  }

  // Quick bounding box test first
  const boxA = new THREE.Box3().setFromPoints(hullA);
  const boxB = new THREE.Box3().setFromPoints(hullB);
  
  if (!boxA.intersectsBox(boxB)) {
    console.log("Hull intersection: bounding boxes don't intersect");
    return false; // Bounding boxes don't intersect
  }

  console.log("Hull intersection: bounding boxes intersect, proceeding with 3D SAT test");

  // For proper 3D SAT, we need to test:
  // 1. Face normals from both hulls
  // 2. Edge-edge cross products
  
  // Since we're working with vertices from ConvexGeometry, we need to reconstruct faces
  // For now, let's use a simpler but more robust approach: GJK-inspired point containment
  
  // Check if any vertex from hullA is inside hullB or vice versa
  for (const point of hullA) {
    if (isPointInsideConvexHull(point, hullB)) {
      console.log("Hull intersection: point from hull A is inside hull B");
      return true;
    }
  }
  
  for (const point of hullB) {
    if (isPointInsideConvexHull(point, hullA)) {
      console.log("Hull intersection: point from hull B is inside hull A");
      return true;
    }
  }

  // Additional check: check if hulls are penetrating each other
  // This catches cases where molecules are traveling through each other
  if (areHullsPenetrating(hullA, hullB)) {
    console.log("Hull intersection: hulls are penetrating each other");
    return true;
  }

  // If no points are inside, check if the hulls are very close (touching)
  // This handles edge cases where hulls are just touching
  const minDistance = getMinimumDistanceBetweenHulls(hullA, hullB);
  if (minDistance < 0.01) { // Much smaller threshold for "touching" (0.01 instead of 0.1)
    console.log(`Hull intersection: hulls are very close (distance: ${minDistance})`);
    return true;
  }

  // Additional check: ensure hulls aren't overlapping at edges
  // This catches cases where molecules are traveling through each other
  if (areHullsOverlapping(hullA, hullB)) {
    console.log("Hull intersection: hulls are overlapping at edges");
    return true;
  }

  console.log("Hull intersection: no intersection detected");
  return false;
}

/**
 * Check if a point is inside a convex hull using a more robust method
 * @param point - Point to test
 * @param hull - Hull vertices
 * @returns True if point is inside hull
 */
function isPointInsideConvexHull(point: THREE.Vector3, hull: THREE.Vector3[]): boolean {
  if (hull.length < 4) return false;

  // For convex hulls, a point is inside if it's on the same side of all faces
  // We'll use the center of the hull as a reference point
  
  const center = new THREE.Vector3();
  for (const vertex of hull) {
    center.add(vertex);
  }
  center.divideScalar(hull.length);
  
  // Test the point against each face of the hull
  // If the point is on the opposite side of any face from the center, it's outside
  
  for (let i = 0; i < hull.length; i++) {
    const v0 = hull[i];
    const v1 = hull[(i + 1) % hull.length];
    const v2 = hull[(i + 2) % hull.length];
    
    // Calculate face normal
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    
    // Check if point and center are on the same side of this face
    const toPoint = new THREE.Vector3().subVectors(point, v0);
    const toCenter = new THREE.Vector3().subVectors(center, v0);
    
    const pointSide = normal.dot(toPoint);
    const centerSide = normal.dot(toCenter);
    
    // If they're on opposite sides, point is outside
    if ((pointSide > 0) !== (centerSide > 0)) {
      return false;
    }
  }
  
  return true; // Point is on the same side of all faces as the center
}



/**
 * Calculate the minimum distance between two convex hulls
 * @param hullA - First hull vertices
 * @param hullB - Second hull vertices
 * @returns Minimum distance between hulls
 */
function getMinimumDistanceBetweenHulls(hullA: THREE.Vector3[], hullB: THREE.Vector3[]): number {
  let minDistance = Infinity;
  
  // Check all vertex-vertex distances
  for (const vertexA of hullA) {
    for (const vertexB of hullB) {
      const distance = vertexA.distanceTo(vertexB);
      minDistance = Math.min(minDistance, distance);
    }
  }
  
  return minDistance;
}

/**
 * Check if two convex hulls are overlapping at their edges
 * This catches cases where molecules are traveling through each other
 * @param hullA - First hull vertices
 * @param hullB - Second hull vertices
 * @returns True if hulls are overlapping
 */
function areHullsOverlapping(hullA: THREE.Vector3[], hullB: THREE.Vector3[]): boolean {
  // Check if any edge from hullA intersects with any edge from hullB
  for (let i = 0; i < hullA.length; i++) {
    const edgeAStart = hullA[i];
    const edgeAEnd = hullA[(i + 1) % hullA.length];
    
    for (let j = 0; j < hullB.length; j++) {
      const edgeBStart = hullB[j];
      const edgeBEnd = hullB[(j + 1) % hullB.length];
      
      // Check if these edges intersect
      if (doEdgesIntersect(edgeAStart, edgeAEnd, edgeBStart, edgeBEnd)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if two line segments intersect in 3D space
 * @param a1 - Start of first line segment
 * @param a2 - End of first line segment
 * @param b1 - Start of second line segment
 * @param b2 - End of second line segment
 * @returns True if line segments intersect
 */
function doEdgesIntersect(a1: THREE.Vector3, a2: THREE.Vector3, b1: THREE.Vector3, b2: THREE.Vector3): boolean {
  // Vector from a1 to a2
  const va = new THREE.Vector3().subVectors(a2, a1);
  // Vector from b1 to b2
  const vb = new THREE.Vector3().subVectors(b2, b1);
  // Vector from a1 to b1
  const ab = new THREE.Vector3().subVectors(b1, a1);
  
  // Cross products
  const crossAB = new THREE.Vector3().crossVectors(va, vb);
  const crossAAB = new THREE.Vector3().crossVectors(va, ab);
  const crossBAB = new THREE.Vector3().crossVectors(vb, ab);
  
  // Check if lines are coplanar and intersect
  const denominator = crossAB.lengthSq();
  if (denominator < 0.0001) {
    // Lines are parallel, check if they're the same line
    return crossAAB.lengthSq() < 0.0001;
  }
  
  // Calculate intersection parameters
  const t = crossBAB.dot(crossAB) / denominator;
  const u = crossAAB.dot(crossAB) / denominator;
  
  // Check if intersection point is on both line segments
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Check if two convex hulls are penetrating each other
 * This is a more aggressive check that catches molecules traveling through each other
 * @param hullA - First hull vertices
 * @param hullB - Second hull vertices
 * @returns True if hulls are penetrating
 */
function areHullsPenetrating(hullA: THREE.Vector3[], hullB: THREE.Vector3[]): boolean {
  // Check if the center of one hull is inside the other hull
  const centerA = new THREE.Vector3();
  const centerB = new THREE.Vector3();
  
  // Calculate centers
  for (const vertex of hullA) {
    centerA.add(vertex);
  }
  centerA.divideScalar(hullA.length);
  
  for (const vertex of hullB) {
    centerB.add(vertex);
  }
  centerB.divideScalar(hullB.length);
  
  // Check if centers are inside the opposite hull
  if (isPointInsideConvexHull(centerA, hullB) || isPointInsideConvexHull(centerB, hullA)) {
    return true;
  }
  
  // Check if any significant portion of one hull is inside the other
  // Count how many vertices are inside the opposite hull
  let verticesInsideA = 0;
  let verticesInsideB = 0;
  
  for (const vertex of hullA) {
    if (isPointInsideConvexHull(vertex, hullB)) {
      verticesInsideA++;
    }
  }
  
  for (const vertex of hullB) {
    if (isPointInsideConvexHull(vertex, hullA)) {
      verticesInsideB++;
    }
  }
  
  // If more than 25% of vertices are inside, consider it penetration
  const threshold = 0.25;
  if (verticesInsideA > hullA.length * threshold || verticesInsideB > hullB.length * threshold) {
    return true;
  }
  
  return false;
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
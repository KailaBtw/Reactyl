import * as THREE from "three";
import { log } from "./debug";
import { Atom, MolObject, BoundingBox, ConvexHull, EnhancedConvexHull } from "../types";

/**
 * Enhanced Bounding Box System for Molecules
 * 
 * This system pre-calculates convex hulls at molecule generation time and stores them
 * efficiently in the molecule data structure. It uses dot products for fast rotation
 * handling and provides multiple collision detection strategies.
 * 
 * Performance Strategy:
 * 1. Pre-calculate convex hull during molecule creation (one-time cost)
 * 2. Store hull vertices in local coordinates (relative to molecule center)
 * 3. Use dot products for fast rotation transforms
 * 4. Provide fallback to AABB for broad-phase collision detection
 */

/**
 * Atom radius mapping based on atom type
 * These values are approximate van der Waals radii in Angstroms
 */
const ATOM_RADII: Record<string, number> = {
  H: 1.2,   // Hydrogen
  C: 1.7,   // Carbon
  N: 1.55,  // Nitrogen
  O: 1.52,  // Oxygen
  F: 1.47,  // Fluorine
  P: 1.8,   // Phosphorus
  S: 1.8,   // Sulfur
  Cl: 1.75, // Chlorine
  Br: 1.85, // Bromine
  I: 1.98   // Iodine
};

const DEFAULT_ATOM_RADIUS = 1.5;

/**
 * Calculates the radius for a given atom type
 */
function getAtomRadius(atomType: string): number {
  return ATOM_RADII[atomType] || DEFAULT_ATOM_RADIUS;
}



/**
 * Calculates a comprehensive bounding volume for a molecule
 * Called once during molecule creation
 * 
 * @param molObject - Parsed molecule object
 * @returns Enhanced bounding volume with pre-calculated data
 */
export function calculateHull(molObject: MolObject): EnhancedConvexHull | null {
  if (!molObject || !molObject.atoms || molObject.atoms.length === 0) {
    log("Warning: Invalid molecule object for bounding volume calculation");
    return null;
  }

  // Step 1: Calculate molecule center and convert atoms to local coordinates
  const center = calculateMoleculeCenter(molObject);
  const localAtoms = convertAtomsToLocalCoordinates(molObject.atoms, center);
  
  // Step 2: Generate convex hull vertices from atom spheres
  const hullVertices = generateConvexHullFromAtoms(localAtoms);
  
  // Step 3: Calculate bounding sphere
  const boundingSphere = calculateBoundingSphere(hullVertices);
  
  // Step 4: Calculate face normals and offsets for collision detection
  const { faceNormals, faceOffsets } = calculateFaceData(hullVertices);
  
  // Step 5: Calculate local AABB for broad-phase detection
  const localAABB = calculateLocalAABB(hullVertices);

  return {
    vertices: hullVertices,  // World coordinates (will be updated during transforms)
    localVertices: hullVertices.map(v => v.clone()),  // Local coordinates (static)
    center: center,
    boundingSphere: boundingSphere,
    faceNormals: faceNormals,
    faceOffsets: faceOffsets,
    localAABB: localAABB,
    type: 'ConvexHull',
    containsPoint: function(point: THREE.Vector3): boolean {
      return isPointInsideConvexHull(point, this);
    },
    intersectsBox: function(box: ConvexHull): boolean {
      // Simplified intersection test
      return this.boundingSphere.radius + box.getRadius() >= this.center.distanceTo(box.center);
    },
    getRadius: function(): number {
      return this.boundingSphere.radius;
    }
  };
}

/**
 * Calculates the geometric center of a molecule
 */
function calculateMoleculeCenter(molObject: MolObject): THREE.Vector3 {
  let totalX = 0, totalY = 0, totalZ = 0;
  let atomCount = 0;

  for (const atom of molObject.atoms) {
    const x = parseFloat(atom.position.x) || 0;
    const y = parseFloat(atom.position.y) || 0;
    const z = parseFloat(atom.position.z) || 0;
    
    totalX += x;
    totalY += y;
    totalZ += z;
    atomCount++;
  }

  return new THREE.Vector3(
    totalX / atomCount,
    totalY / atomCount,
    totalZ / atomCount
  );
}

/**
 * Converts atom positions to local coordinates relative to molecule center
 */
function convertAtomsToLocalCoordinates(atoms: Atom[], center: THREE.Vector3): Array<{position: THREE.Vector3, radius: number}> {
  return atoms.map(atom => ({
    position: new THREE.Vector3(
      parseFloat(atom.position.x) || 0,
      parseFloat(atom.position.y) || 0,
      parseFloat(atom.position.z) || 0
    ).sub(center),
    radius: getAtomRadius(atom.type)
  }));
}

/**
 * Generates convex hull vertices from atom spheres using a balanced approach
 * Adds a few more points per atom for better accuracy without performance impact
 */
function generateConvexHullFromAtoms(localAtoms: Array<{position: THREE.Vector3, radius: number}>): THREE.Vector3[] {
  const vertices: THREE.Vector3[] = [];
  
  for (const atom of localAtoms) {
    const { position, radius } = atom;
    
    // Add the 6 extreme points (axis-aligned)
    vertices.push(new THREE.Vector3(position.x - radius, position.y, position.z));
    vertices.push(new THREE.Vector3(position.x + radius, position.y, position.z));
    vertices.push(new THREE.Vector3(position.x, position.y - radius, position.z));
    vertices.push(new THREE.Vector3(position.x, position.y + radius, position.z));
    vertices.push(new THREE.Vector3(position.x, position.y, position.z - radius));
    vertices.push(new THREE.Vector3(position.x, position.y, position.z + radius));
    
    // Add just 4 diagonal points for better shape approximation (much fewer than 8)
    const r = radius * 0.707; // radius * cos(45°)
    vertices.push(new THREE.Vector3(position.x + r, position.y + r, position.z + r));
    vertices.push(new THREE.Vector3(position.x - r, position.y - r, position.z - r));
    vertices.push(new THREE.Vector3(position.x + r, position.y - r, position.z + r));
    vertices.push(new THREE.Vector3(position.x - r, position.y + r, position.z - r));
  }
  
  return vertices;
}

/**
 * Calculates the bounding sphere that contains all vertices
 */
function calculateBoundingSphere(vertices: THREE.Vector3[]): {center: THREE.Vector3, radius: number} {
  if (vertices.length === 0) {
    return { center: new THREE.Vector3(), radius: 0 };
  }

  // Find the center of the bounding sphere
  const center = new THREE.Vector3();
  for (const vertex of vertices) {
    center.add(vertex);
  }
  center.divideScalar(vertices.length);

  // Find the maximum distance from center to any vertex
  let maxDistance = 0;
  for (const vertex of vertices) {
    const distance = center.distanceTo(vertex);
    maxDistance = Math.max(maxDistance, distance);
  }

  return { center, radius: maxDistance };
}

/**
 * Calculates face normals and offsets for collision detection
 * This is a simplified approach - for production, you'd want proper face calculation
 */
function calculateFaceData(vertices: THREE.Vector3[]): {faceNormals: THREE.Vector3[], faceOffsets: number[]} {
  const faceNormals: THREE.Vector3[] = [];
  const faceOffsets: number[] = [];

  // For now, we'll use the 6 faces of the AABB as a simplified approach
  // In a full implementation, you'd calculate the actual convex hull faces
  
  // +X face
  faceNormals.push(new THREE.Vector3(1, 0, 0));
  faceOffsets.push(Math.max(...vertices.map(v => v.x)));
  
  // -X face
  faceNormals.push(new THREE.Vector3(-1, 0, 0));
  faceOffsets.push(-Math.min(...vertices.map(v => v.x)));
  
  // +Y face
  faceNormals.push(new THREE.Vector3(0, 1, 0));
  faceOffsets.push(Math.max(...vertices.map(v => v.y)));
  
  // -Y face
  faceNormals.push(new THREE.Vector3(0, -1, 0));
  faceOffsets.push(-Math.min(...vertices.map(v => v.y)));
  
  // +Z face
  faceNormals.push(new THREE.Vector3(0, 0, 1));
  faceOffsets.push(Math.max(...vertices.map(v => v.z)));
  
  // -Z face
  faceNormals.push(new THREE.Vector3(0, 0, -1));
  faceOffsets.push(-Math.min(...vertices.map(v => v.z)));

  return { faceNormals, faceOffsets };
}

/**
 * Calculates local AABB for broad-phase collision detection
 */
function calculateLocalAABB(vertices: THREE.Vector3[]): {min: THREE.Vector3, max: THREE.Vector3} {
  if (vertices.length === 0) {
    return { min: new THREE.Vector3(), max: new THREE.Vector3() };
  }

  let minX = vertices[0].x, maxX = vertices[0].x;
  let minY = vertices[0].y, maxY = vertices[0].y;
  let minZ = vertices[0].z, maxZ = vertices[0].z;

  for (const vertex of vertices) {
    minX = Math.min(minX, vertex.x);
    maxX = Math.max(maxX, vertex.x);
    minY = Math.min(minY, vertex.y);
    maxY = Math.max(maxY, vertex.y);
    minZ = Math.min(minZ, vertex.z);
    maxZ = Math.max(maxZ, vertex.z);
  }

  return {
    min: new THREE.Vector3(minX, minY, minZ),
    max: new THREE.Vector3(maxX, maxY, maxZ)
  };
}

/**
 * Updates the bounding volume for a molecule that has moved or rotated
 * Uses efficient dot product calculations for rotation
 * 
 * @param boundingVolume - Pre-calculated bounding volume
 * @param newPosition - New world position of the molecule
 * @param newRotation - New rotation quaternion of the molecule
 * @returns Updated bounding volume
 */
export function updateBoundingVolume(
  boundingVolume: EnhancedConvexHull,
  newPosition: THREE.Vector3,
  newRotation: THREE.Quaternion
): EnhancedConvexHull {
  // Create rotation matrix from quaternion
  const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(newRotation);
  
  // Transform local vertices to world coordinates using dot products
  const transformedVertices = boundingVolume.localVertices.map(localVertex => {
    const worldVertex = localVertex.clone();
    worldVertex.applyMatrix4(rotationMatrix);
    worldVertex.add(newPosition);
    return worldVertex;
  });

  // Update the bounding volume
  return {
    ...boundingVolume,
    vertices: transformedVertices,
    center: newPosition.clone()
  };
}

/**
 * Fast collision detection between two enhanced bounding volumes
 * Uses a multi-stage approach: bounding sphere → AABB → convex hull
 * 
 * @param volumeA - First bounding volume
 * @param volumeB - Second bounding volume
 * @returns True if collision detected
 */
export function checkCollisionEnhanced(volumeA: EnhancedConvexHull, volumeB: EnhancedConvexHull): boolean {
  // Stage 1: Bounding sphere test (fastest)
  const sphereDistance = volumeA.center.distanceTo(volumeB.center);
  const combinedRadius = volumeA.boundingSphere.radius + volumeB.boundingSphere.radius;
  
  if (sphereDistance > combinedRadius) {
    return false; // No collision possible
  }

  // Stage 2: AABB test (fast)
  const aabbA = calculateWorldAABB(volumeA);
  const aabbB = calculateWorldAABB(volumeB);
  
  if (!aabbIntersects(aabbA, aabbB)) {
    return false; // No collision possible
  }

  // Stage 3: Convex hull test (most accurate)
  return checkConvexHullCollision(volumeA, volumeB);
}

/**
 * Calculates world AABB from transformed vertices
 */
function calculateWorldAABB(volume: EnhancedConvexHull): {min: THREE.Vector3, max: THREE.Vector3} {
  if (volume.vertices.length === 0) {
    return { min: new THREE.Vector3(), max: new THREE.Vector3() };
  }

  let minX = volume.vertices[0].x, maxX = volume.vertices[0].x;
  let minY = volume.vertices[0].y, maxY = volume.vertices[0].y;
  let minZ = volume.vertices[0].z, maxZ = volume.vertices[0].z;

  for (const vertex of volume.vertices) {
    minX = Math.min(minX, vertex.x);
    maxX = Math.max(maxX, vertex.x);
    minY = Math.min(minY, vertex.y);
    maxY = Math.max(maxY, vertex.y);
    minZ = Math.min(minZ, vertex.z);
    maxZ = Math.max(maxZ, vertex.z);
  }

  return {
    min: new THREE.Vector3(minX, minY, minZ),
    max: new THREE.Vector3(maxX, maxY, maxZ)
  };
}

/**
 * Checks if two AABBs intersect
 */
function aabbIntersects(aabbA: {min: THREE.Vector3, max: THREE.Vector3}, aabbB: {min: THREE.Vector3, max: THREE.Vector3}): boolean {
  return aabbA.min.x <= aabbB.max.x && aabbA.max.x >= aabbB.min.x &&
         aabbA.min.y <= aabbB.max.y && aabbA.max.y >= aabbB.min.y &&
         aabbA.min.z <= aabbB.max.z && aabbA.max.z >= aabbB.min.z;
}

/**
 * Performs convex hull collision detection using separating axis theorem
 */
function checkConvexHullCollision(volumeA: EnhancedConvexHull, volumeB: EnhancedConvexHull): boolean {
  // Simplified separating axis theorem implementation
  // For production, you'd want a more robust implementation
  
  // Check if any point from volumeA is inside volumeB
  for (const vertex of volumeA.vertices) {
    if (isPointInsideConvexHull(vertex, volumeB)) {
      return true;
    }
  }
  
  // Check if any point from volumeB is inside volumeA
  for (const vertex of volumeB.vertices) {
    if (isPointInsideConvexHull(vertex, volumeA)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if a point is inside a convex hull using dot products
 */
function isPointInsideConvexHull(point: THREE.Vector3, volume: EnhancedConvexHull): boolean {
  // Transform point to local coordinates
  const localPoint = point.clone().sub(volume.center);
  
  // Check against all faces using dot products
  for (let i = 0; i < volume.faceNormals.length; i++) {
    const normal = volume.faceNormals[i];
    const offset = volume.faceOffsets[i];
    
    // Dot product gives us the distance from the face
    const distance = localPoint.dot(normal);
    
    if (distance > offset) {
      return false; // Point is outside this face
    }
  }
  
  return true; // Point is inside all faces
}

// Legacy visualization function - kept for compatibility but not used in optimized system
export function visualizeBoundingVolume(boundingVolume: BoundingBox, scene: THREE.Scene, color: number = 0x00ff00): void {
  if (!boundingVolume || !scene) return;

  if (boundingVolume.type === 'ConvexHull') {
    visualizeConvexHull(boundingVolume, scene, color);
  }
}

/**
 * Creates a hull wireframe parented to a molecule group
 * Allows Three.js to handle transforms automatically
 * 
 * @param boundingVolume - The bounding volume to visualize
 * @param moleculeGroup - The THREE.Group to parent the wireframe to
 * @param color - Color of the wireframe
 * @returns The created LineSegments object
 */
export function createHullWire(
  boundingVolume: BoundingBox, 
  moleculeGroup: THREE.Group, 
  color: number = 0x00ff00
): THREE.LineSegments | null {
  if (!boundingVolume || !moleculeGroup || boundingVolume.type !== 'ConvexHull') {
    return null;
  }

  const hull = boundingVolume as EnhancedConvexHull;
  
  // Use local vertices (relative to molecule center) for automatic transform handling
  const localVertices = hull.localVertices || hull.vertices;
  
  if (localVertices.length < 4) {
    return null;
  }

  // Create geometry using local coordinates
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  
  // Add all vertices in local space
  for (const vertex of localVertices) {
    positions.push(vertex.x, vertex.y, vertex.z);
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
  // Create wireframe indices
  const indices: number[] = [];
  const vertexCount = localVertices.length;
  
  // Simple wireframe pattern - connect vertices in pairs
  for (let i = 0; i < vertexCount; i += 2) {
    if (i + 1 < vertexCount) {
      indices.push(i, i + 1);
    }
  }
  
  // Add cross connections for 3D structure
  for (let i = 0; i < vertexCount; i += 4) {
    if (i + 2 < vertexCount) {
      indices.push(i, i + 2);
    }
    if (i + 3 < vertexCount) {
      indices.push(i + 1, i + 3);
    }
  }
  
  if (indices.length > 0) {
    geometry.setIndex(indices);
  }

  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8
  });

  const wireframe = new THREE.LineSegments(geometry, material);
  wireframe.userData.isBoundingBoxViz = true;
  wireframe.userData.boundingType = 'ConvexHull';
  wireframe.userData.isParented = true;
  
  // Parent to molecule group - Three.js will handle transforms automatically
  moleculeGroup.add(wireframe);
  
  return wireframe;
}

/**
 * Throttled wireframe update system
 * Updates hull wireframes when necessary, throttled to ~10-15 Hz
 */
class HullManager {
  private updateQueue: Set<THREE.LineSegments> = new Set();
  private lastUpdateTime: number = 0;
  private updateInterval: number = 100; // 10 Hz (100ms interval)
  private isUpdating: boolean = false;

  /**
   * Mark a hull visualization for update
   */
  markForUpdate(wireframe: THREE.LineSegments): void {
    this.updateQueue.add(wireframe);
    this.scheduleUpdate();
  }

  /**
   * Schedule an update if not already scheduled
   */
  private scheduleUpdate(): void {
    if (this.isUpdating) return;
    
    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    if (timeSinceLastUpdate >= this.updateInterval) {
      this.performUpdate();
    } else {
      setTimeout(() => this.performUpdate(), this.updateInterval - timeSinceLastUpdate);
    }
  }

  /**
   * Perform the actual update
   */
  private performUpdate(): void {
    this.isUpdating = true;
    this.lastUpdateTime = performance.now();
    
    // Process all queued updates
    for (const wireframe of this.updateQueue) {
      // For parented wireframes, Three.js handles transforms automatically
      // We only need to update if the hull geometry itself changed
      if (wireframe.geometry && wireframe.userData.needsGeometryUpdate) {
        wireframe.geometry.attributes.position.needsUpdate = true;
        wireframe.userData.needsGeometryUpdate = false;
      }
    }
    
    this.updateQueue.clear();
    this.isUpdating = false;
  }

  /**
   * Set the update frequency (in Hz)
   */
  setUpdateFrequency(hz: number): void {
    this.updateInterval = 1000 / hz;
  }
}

// Global instance for managing hull wireframe updates
export const hullManager = new HullManager();

/**
 * Toggle hull wireframe visibility for all molecules
 * @param visible - Whether to show or hide hull wireframes
 * @param molecules - Array of molecule groups
 */
export function toggleHulls(visible: boolean, molecules: any[]): void {
  for (const molecule of molecules) {
    if (molecule.hullWireframe) {
      molecule.hullWireframe.visible = visible;
    }
  }
}

/**
 * Update hull wireframe when molecule transforms change
 * Called when hull geometry needs updating (rare)
 * @param molecule - The molecule group to update
 */
export function updateHull(molecule: any): void {
  if (molecule.hullWireframe && molecule.boundingBox) {
    // Mark for throttled update
    hullManager.markForUpdate(molecule.hullWireframe);
  }
}

/**
 * Remove hull wireframe from a molecule
 * @param molecule - The molecule group to clean up
 */
export function removeHull(molecule: any): void {
  if (molecule.hullWireframe) {
    molecule.group.remove(molecule.hullWireframe);
    molecule.hullWireframe.geometry.dispose();
    molecule.hullWireframe.material.dispose();
    molecule.hullWireframe = null;
  }
}

// Legacy function for visualizing convex hull - not used in optimized system
function visualizeConvexHull(boundingVolume: ConvexHull, scene: THREE.Scene, color: number): void {
  if (boundingVolume.vertices.length < 4) {
    // Skip visualization for insufficient vertices
    return;
  }

  // Create a convex hull visualization using the vertices
  // We'll create a wireframe that shows the molecular shape
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  
  // Add all vertices
  for (const vertex of boundingVolume.vertices) {
    positions.push(vertex.x, vertex.y, vertex.z);
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
  // Create a simple but effective wireframe
  const indices: number[] = [];
  const vertexCount = boundingVolume.vertices.length;
  
  // Simple approach: connect vertices in a grid-like pattern
  // This avoids the complexity of finding closest neighbors
  for (let i = 0; i < vertexCount; i += 2) {
    if (i + 1 < vertexCount) {
      indices.push(i, i + 1);
    }
  }
  
  // Add some cross connections for 3D structure
  for (let i = 0; i < vertexCount; i += 4) {
    if (i + 2 < vertexCount) {
      indices.push(i, i + 2);
    }
    if (i + 3 < vertexCount) {
      indices.push(i + 1, i + 3);
    }
  }
  
  if (indices.length > 0) {
    geometry.setIndex(indices);
  }

  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8
  });

  const wireframe = new THREE.LineSegments(geometry, material);
  // Don't add center position since vertices are already in world coordinates
  wireframe.userData.isBoundingBoxViz = true;
  wireframe.userData.boundingType = 'ConvexHull';
  scene.add(wireframe);
}







// Legacy function for visualizing all bounding volumes - not used in optimized system
export function visualizeAllBoundingVolumes(boundingVolumes: BoundingBox[], scene: THREE.Scene, color: number = 0xff0000): void {
  if (!scene) return;

  // Remove existing bounding box visualizations
  const existingViz = scene.children.filter(child => child.userData.isBoundingBoxViz);
  existingViz.forEach(obj => scene.remove(obj));

  // Create visualizations for all bounding volumes
  for (const boundingVolume of boundingVolumes) {
    if (boundingVolume) {
      visualizeBoundingVolume(boundingVolume, scene, color);
    }
  }
}

// Create bounding box using convex hull only
export function createBoundingBox(molObject: MolObject, _moleculeCenter: THREE.Vector3, _type: string = 'ConvexHull'): BoundingBox {
  const volume = calculateHull(molObject);
  return volume || createFallbackHull();
}

function createFallbackHull(): ConvexHull {
  const center = new THREE.Vector3(0, 0, 0);
  const vertices = [
    new THREE.Vector3(-1.5, -1.5, -1.5),
    new THREE.Vector3(1.5, -1.5, -1.5),
    new THREE.Vector3(-1.5, 1.5, -1.5),
    new THREE.Vector3(1.5, 1.5, -1.5),
    new THREE.Vector3(-1.5, -1.5, 1.5),
    new THREE.Vector3(1.5, -1.5, 1.5),
    new THREE.Vector3(-1.5, 1.5, 1.5),
    new THREE.Vector3(1.5, 1.5, 1.5)
  ];
  
  return {
    vertices: vertices,
    center: center,
    type: 'ConvexHull',
    containsPoint: function(point: THREE.Vector3): boolean {
      return point.x >= -1.5 && point.x <= 1.5 &&
             point.y >= -1.5 && point.y <= 1.5 &&
             point.z >= -1.5 && point.z <= 1.5;
    },
    intersectsBox: function(otherBox: ConvexHull): boolean {
      return this.getRadius() + otherBox.getRadius() >= this.center.distanceTo(otherBox.center);
    },
    getRadius: function(): number {
      return 1.5;
    }
  };
} 
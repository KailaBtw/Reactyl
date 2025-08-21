import * as THREE from "three";
import { log } from "./debug";

// Type definitions
interface Atom {
  position: {
    x: string;
    y: string;
    z: string;
  };
  type: string;
}

interface MolObject {
  atoms: Atom[];
}

interface AABB {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  type: 'AABB';
  containsPoint: (point: THREE.Vector3) => boolean;
  intersectsBox: (otherBox: AABB) => boolean;
  getRadius: () => number;
}

interface OBB {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  rotation: THREE.Vector3;
  type: 'OBB';
  containsPoint: (point: THREE.Vector3) => boolean;
  intersectsBox: (otherBox: AABB) => boolean;
  getRadius: () => number;
}

interface ConvexHull {
  vertices: THREE.Vector3[];
  center: THREE.Vector3;
  type: 'ConvexHull';
  simplified: boolean;
}

type BoundingBox = AABB | OBB | ConvexHull;

/**
 * Bounding Box System for Molecules
 * 
 * This module provides different types of bounding volumes for molecules:
 * 1. Axis-Aligned Bounding Box (AABB) - Fast collision detection
 * 2. Oriented Bounding Box (OBB) - More accurate for rotated molecules
 * 3. Convex Hull - Most accurate but more expensive
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

/**
 * Default radius for unknown atom types
 */
const DEFAULT_ATOM_RADIUS = 1.5;

/**
 * Calculates the radius for a given atom type
 * @param atomType - The atom type (e.g., "C", "O", "N")
 * @returns The atom radius in Angstroms
 */
function getAtomRadius(atomType: string): number {
  return ATOM_RADII[atomType] || DEFAULT_ATOM_RADIUS;
}

/**
 * Creates a fallback bounding box when calculation fails
 * @returns Simple fallback bounding box
 */
function createFallbackBoundingBox(): AABB {
  const center = new THREE.Vector3(0, 0, 0);
  const size = new THREE.Vector3(3, 3, 3); // Default size
  
  return {
    min: new THREE.Vector3(-1.5, -1.5, -1.5),
    max: new THREE.Vector3(1.5, 1.5, 1.5),
    center: center,
    size: size,
    type: 'AABB',
    containsPoint: function(point: THREE.Vector3): boolean {
      return this.min.x <= point.x && point.x <= this.max.x &&
             this.min.y <= point.y && point.y <= this.max.y &&
             this.min.z <= point.z && point.z <= this.max.z;
    },
    intersectsBox: function(otherBox: AABB): boolean {
      return this.min.x <= otherBox.max.x && this.max.x >= otherBox.min.x &&
             this.min.y <= otherBox.max.y && this.max.y >= otherBox.min.y &&
             this.min.z <= otherBox.max.z && this.max.z >= otherBox.min.z;
    },
    getRadius: function(): number {
      return 1.5;
    }
  };
}

/**
 * Calculates an Axis-Aligned Bounding Box (AABB) for a molecule
 * This is the fastest collision detection method
 * 
 * @param molObject - Parsed molecule object from molFileToJSON
 * @param _moleculeCenter - Center of the molecule (unused parameter, kept for API compatibility)
 * @returns AABB with min, max, center, and size properties
 */
export function calculateAABB(molObject: MolObject, _moleculeCenter: THREE.Vector3): AABB | null {
  if (!molObject || !molObject.atoms || molObject.atoms.length === 0) {
    log("Warning: Invalid molecule object for AABB calculation");
    return null;
  }

  // Initialize with first atom
  const firstAtom = molObject.atoms[0];
  const firstRadius = getAtomRadius(firstAtom.type);
  
  // Parse first atom position with error checking
  const firstX = parseFloat(firstAtom.position.x) || 0;
  const firstY = parseFloat(firstAtom.position.y) || 0;
  const firstZ = parseFloat(firstAtom.position.z) || 0;
  
  let minX = firstX - firstRadius;
  let maxX = firstX + firstRadius;
  let minY = firstY - firstRadius;
  let maxY = firstY + firstRadius;
  let minZ = firstZ - firstRadius;
  let maxZ = firstZ + firstRadius;

  // Calculate bounds including atom radii
  for (const atom of molObject.atoms) {
    const radius = getAtomRadius(atom.type);
    const x = parseFloat(atom.position.x) || 0;
    const y = parseFloat(atom.position.y) || 0;
    const z = parseFloat(atom.position.z) || 0;

    // Debug: log atom data if parsing fails
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      log(`Warning: Invalid atom position for ${atom.type}: x=${atom.position.x}, y=${atom.position.y}, z=${atom.position.z}`);
      continue;
    }

    minX = Math.min(minX, x - radius);
    maxX = Math.max(maxX, x + radius);
    minY = Math.min(minY, y - radius);
    maxY = Math.max(maxY, y + radius);
    minZ = Math.min(minZ, z - radius);
    maxZ = Math.max(maxZ, z + radius);
  }

  // Validate bounds to ensure no NaN values
  if (isNaN(minX) || isNaN(maxX) || isNaN(minY) || isNaN(maxY) || isNaN(minZ) || isNaN(maxZ)) {
    log("Error: Invalid bounds detected, using fallback bounding box");
    return createFallbackBoundingBox();
  }

  // Calculate center and size
  const center = new THREE.Vector3(
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2
  );

  const size = new THREE.Vector3(
    maxX - minX,
    maxY - minY,
    maxZ - minZ
  );

  const boundingBox: AABB = {
    min: new THREE.Vector3(minX, minY, minZ),
    max: new THREE.Vector3(maxX, maxY, maxZ),
    center: center,
    size: size,
    type: 'AABB',
    containsPoint: function(point: THREE.Vector3): boolean {
      return this.min.x <= point.x && point.x <= this.max.x &&
             this.min.y <= point.y && point.y <= this.max.y &&
             this.min.z <= point.z && point.z <= this.max.z;
    },
    intersectsBox: function(otherBox: AABB): boolean {
      return this.min.x <= otherBox.max.x && this.max.x >= otherBox.min.x &&
             this.min.y <= otherBox.max.y && this.max.y >= otherBox.min.y &&
             this.min.z <= otherBox.max.z && this.max.z >= otherBox.min.z;
    },
    getRadius: function(): number {
      // Return the radius of a sphere that would contain this bounding box
      return this.size.length() / 2;
    }
  };

  // Debug logging
  log(`AABB created: min=(${minX.toFixed(2)}, ${minY.toFixed(2)}, ${minZ.toFixed(2)}), max=(${maxX.toFixed(2)}, ${maxY.toFixed(2)}, ${maxZ.toFixed(2)}), size=(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`);

  return boundingBox;
}

/**
 * Calculates a more accurate bounding box that accounts for molecule rotation
 * This creates an Oriented Bounding Box (OBB) approximation
 * 
 * @param molObject - Parsed molecule object
 * @param moleculeCenter - Center of the molecule
 * @param rotation - Current rotation of the molecule
 * @returns OBB with min, max, center, size, and rotation properties
 */
export function calculateOBB(molObject: MolObject, moleculeCenter: THREE.Vector3, rotation: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): OBB | null {
  const aabb = calculateAABB(molObject, moleculeCenter);
  if (!aabb) return null;

  // For now, return AABB with rotation info
  // TODO: Implement proper OBB calculation with principal component analysis
  return {
    ...aabb,
    rotation: rotation.clone(),
    type: 'OBB'
  };
}

/**
 * Calculates a convex hull bounding volume for the most accurate collision detection
 * This is more expensive but provides the best approximation of molecule shape
 * 
 * @param molObject - Parsed molecule object
 * @param moleculeCenter - Center of the molecule
 * @returns Convex hull with vertices and faces
 */
export function calculateConvexHull(molObject: MolObject, moleculeCenter: THREE.Vector3): ConvexHull | null {
  if (!molObject || !molObject.atoms || molObject.atoms.length === 0) {
    return null;
  }

  // Create points for convex hull calculation
  const points: THREE.Vector3[] = [];
  
  for (const atom of molObject.atoms) {
    const radius = getAtomRadius(atom.type);
    const x = parseFloat(atom.position.x);
    const y = parseFloat(atom.position.y);
    const z = parseFloat(atom.position.z);

    // Add points on the surface of the atom sphere (simplified)
    // For efficiency, we'll add points at the extremes of each axis
    points.push(new THREE.Vector3(x - radius, y, z));
    points.push(new THREE.Vector3(x + radius, y, z));
    points.push(new THREE.Vector3(x, y - radius, z));
    points.push(new THREE.Vector3(x, y + radius, z));
    points.push(new THREE.Vector3(x, y, z - radius));
    points.push(new THREE.Vector3(x, y, z + radius));
  }

  // For now, return a simplified convex hull (AABB-based)
  // TODO: Implement proper convex hull algorithm
  const aabb = calculateAABB(molObject, moleculeCenter);
  
  return {
    vertices: points,
    center: aabb!.center,
    type: 'ConvexHull',
    simplified: true
  };
}

/**
 * Creates a bounding box object that can be used for collision detection
 * @param molObject - Parsed molecule object
 * @param moleculeCenter - Center of the molecule
 * @param type - Type of bounding box ('AABB', 'OBB', 'ConvexHull')
 * @returns Bounding box object with collision detection methods
 */
export function createBoundingBox(molObject: MolObject, moleculeCenter: THREE.Vector3, type: string = 'AABB'): BoundingBox {
  let boundingBox: BoundingBox | null = null;

  switch (type) {
    case 'AABB':
      boundingBox = calculateAABB(molObject, moleculeCenter);
      break;
    case 'OBB':
      boundingBox = calculateOBB(molObject, moleculeCenter);
      break;
    case 'ConvexHull':
      boundingBox = calculateConvexHull(molObject, moleculeCenter);
      break;
    default:
      boundingBox = calculateAABB(molObject, moleculeCenter);
  }

  if (!boundingBox) {
    log("Warning: Failed to create bounding box, using fallback");
    return createFallbackBoundingBox();
  }

  return boundingBox;
}

/**
 * Updates a bounding box for a molecule that has moved or rotated
 * @param boundingBox - Existing bounding box
 * @param newPosition - New position of the molecule
 * @param _newRotation - New rotation of the molecule (unused parameter, kept for API compatibility)
 * @returns Updated bounding box
 */
export function updateBoundingBox(boundingBox: AABB | null, newPosition: THREE.Vector3, _newRotation: THREE.Vector3): AABB | null {
  if (!boundingBox) return null;

  // For AABB, we need to recalculate based on the new position
  // For now, we'll just translate the existing box
  const translation = new THREE.Vector3().subVectors(newPosition, boundingBox.center);
  
  boundingBox.min.add(translation);
  boundingBox.max.add(translation);
  boundingBox.center.copy(newPosition);

  return boundingBox;
}

/**
 * Creates a visual representation of a bounding box for debugging
 * @param boundingBox - The bounding box to visualize
 * @param scene - Three.js scene to add the visualization
 * @param color - Color for the wireframe (default: 0x00ff00)
 */
export function visualizeBoundingBox(boundingBox: AABB, scene: THREE.Scene, color: number = 0x00ff00): void {
  if (!boundingBox || !scene) return;

  // Create wireframe box
  const geometry = new THREE.BoxGeometry(
    boundingBox.size.x,
    boundingBox.size.y,
    boundingBox.size.z
  );
  
  const material = new THREE.MeshBasicMaterial({
    color: color,
    wireframe: true,
    transparent: true,
    opacity: 0.7
  });

  const box = new THREE.Mesh(geometry, material);
  box.position.copy(boundingBox.center);
  box.userData.isBoundingBoxViz = true;
  scene.add(box);
}

/**
 * Creates visual representations of multiple bounding boxes for debugging
 * @param boundingBoxes - Array of bounding box objects
 * @param scene - Three.js scene to add the visualizations
 * @param color - Color for the wireframes (default: 0xff0000)
 */
export function visualizeAllBoundingBoxes(boundingBoxes: AABB[], scene: THREE.Scene, color: number = 0xff0000): void {
  if (!scene) return;

  // Remove existing bounding box visualizations
  const existingViz = scene.children.filter(child => child.userData.isBoundingBoxViz);
  existingViz.forEach(obj => scene.remove(obj));

  // Create visualizations for all bounding boxes
  for (const boundingBox of boundingBoxes) {
    if (boundingBox) {
      visualizeBoundingBox(boundingBox, scene, color);
    }
  }
} 
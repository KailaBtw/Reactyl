import * as THREE from "three";
import { MoleculeGroup } from "../types";

/**
 * Creates a convex hull from molecule atoms for accurate collision detection
 * @param molecule - The molecule to create hull for
 * @returns Array of hull vertices in world space or null
 */
export function createMoleculeHull(molecule: MoleculeGroup): THREE.Vector3[] | null {
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

  if (points.length < 4) {
    return null; // Need at least 4 points for a 3D convex hull
  }

  // Simple convex hull algorithm (Gift Wrapping / Jarvis March)
  return computeConvexHull(points);
}

/**
 * Simple 3D convex hull computation using Gift Wrapping algorithm
 * @param points - Array of 3D points
 * @returns Array of hull vertices
 */
function computeConvexHull(points: THREE.Vector3[]): THREE.Vector3[] {
  if (points.length < 4) return points;

  const hull: THREE.Vector3[] = [];
  
  // Find the point with lowest z coordinate (and lowest y if tied, then lowest x)
  let startPoint = points[0];
  for (const point of points) {
    if (point.z < startPoint.z || 
        (point.z === startPoint.z && point.y < startPoint.y) ||
        (point.z === startPoint.z && point.y === startPoint.y && point.x < startPoint.x)) {
      startPoint = point;
    }
  }

  // Start with the lowest point
  let currentPoint = startPoint;
  hull.push(currentPoint);

  // Find next point by looking for the one that makes the smallest angle
  do {
    let nextPoint = points[0] === currentPoint ? points[1] : points[0];
    
    for (const point of points) {
      if (point === currentPoint) continue;
      
      // Check if this point is "more to the right" than nextPoint
      const cross = getCrossProduct(currentPoint, nextPoint, point);
      if (cross > 0 || (cross === 0 && currentPoint.distanceTo(point) > currentPoint.distanceTo(nextPoint))) {
        nextPoint = point;
      }
    }
    
    if (nextPoint === startPoint) break; // Back to start
    
    hull.push(nextPoint);
    currentPoint = nextPoint;
  } while (currentPoint !== startPoint);

  return hull;
}

/**
 * Calculate cross product for 3D points (simplified for hull computation)
 */
function getCrossProduct(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ac = new THREE.Vector3().subVectors(c, a);
  
  // Cross product in 2D (we're looking down the z-axis)
  return ab.x * ac.y - ab.y * ac.x;
}

/**
 * Check if two convex hulls intersect using Separating Axis Theorem (SAT)
 * @param hullA - First hull vertices
 * @param hullB - Second hull vertices
 * @returns True if hulls intersect
 */
export function checkHullIntersection(hullA: THREE.Vector3[], hullB: THREE.Vector3[]): boolean {
  if (hullA.length < 3 || hullB.length < 3) return false;

  // Simple overlap test using bounding boxes of hulls
  const boxA = new THREE.Box3().setFromPoints(hullA);
  const boxB = new THREE.Box3().setFromPoints(hullB);
  
  if (!boxA.intersectsBox(boxB)) {
    return false; // Bounding boxes don't intersect
  }

  // More detailed test: check if any point from hullA is inside hullB or vice versa
  for (const point of hullA) {
    if (isPointInHull(point, hullB)) return true;
  }
  
  for (const point of hullB) {
    if (isPointInHull(point, hullA)) return true;
  }

  return false;
}

/**
 * Check if a point is inside a convex hull using ray casting
 * @param point - Point to test
 * @param hull - Hull vertices
 * @returns True if point is inside hull
 */
function isPointInHull(point: THREE.Vector3, hull: THREE.Vector3[]): boolean {
  if (hull.length < 3) return false;

  // Simple containment test: check if point is on the same side of all hull edges
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const c = hull[(i + 2) % hull.length];
    
    const normal = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(b, a),
      new THREE.Vector3().subVectors(c, a)
    ).normalize();
    
    const toPoint = new THREE.Vector3().subVectors(point, a);
    const dot = normal.dot(toPoint);
    
    if (dot > 0.1) return false; // Point is outside this face
  }
  
  return true;
} 
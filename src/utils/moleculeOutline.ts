import * as THREE from 'three';
import type { MoleculeGroup } from '../types';

/**
 * Add red outline effect to a molecule by creating edge geometries for each atom
 */
export function addProductOutline(molecule: MoleculeGroup): void {
  if (!molecule.group) {
    console.warn('Cannot add outline: molecule.group is null');
    return;
  }

  // Remove existing outline if present
  removeProductOutline(molecule);

  // Create bright red outline material with increased visibility
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000, // Bright red
    linewidth: 3, // Increased from 2
    transparent: false,
    depthTest: true,
    depthWrite: true,
  });

  let outlineCount = 0;

  // Traverse all atom meshes in the molecule group
  molecule.group.traverse((child: any) => {
    // Only process atom meshes (not bonds)
    if (child instanceof THREE.Mesh && child.userData?.type !== 'bond') {
      const geometry = child.geometry as THREE.BufferGeometry;
      
      // Create edges geometry from the atom sphere
      const edgesGeometry = new THREE.EdgesGeometry(geometry, 15); // Lower threshold for more edges
      
      // Create line segments for the outline
      const outline = new THREE.LineSegments(edgesGeometry, outlineMaterial.clone());
      
      // Scale up slightly for better visibility
      outline.position.copy(child.position);
      outline.rotation.copy(child.rotation);
      outline.scale.copy(child.scale).multiplyScalar(1.05);
      
      // Tag it so we can remove it later
      outline.userData = { type: 'productOutline', atomMesh: child };
      
      // Add to the molecule group
      molecule.group.add(outline);
      outlineCount++;
    }
  });

  console.log(`✅ Added ${outlineCount} red outlines to molecule ${molecule.name}`);
}

/**
 * Remove red outline effect from a molecule
 */
export function removeProductOutline(molecule: MoleculeGroup): void {
  if (!molecule.group) return;

  // Find and remove all outline objects
  const outlinesToRemove: THREE.Object3D[] = [];
  
  molecule.group.traverse((child: any) => {
    if (child.userData?.type === 'productOutline') {
      outlinesToRemove.push(child);
    }
  });

  outlinesToRemove.forEach(outline => {
    molecule.group.remove(outline);
    // Dispose of geometry and material
    if (outline instanceof THREE.LineSegments) {
      const geometry = outline.geometry as THREE.BufferGeometry;
      const material = outline.material as THREE.Material;
      geometry.dispose();
      material.dispose();
    }
  });
}

/**
 * Update outline for a molecule based on its isProduct flag
 */
export function updateMoleculeOutline(molecule: MoleculeGroup): void {
  if (molecule.isProduct) {
    addProductOutline(molecule);
  } else {
    removeProductOutline(molecule);
  }
}

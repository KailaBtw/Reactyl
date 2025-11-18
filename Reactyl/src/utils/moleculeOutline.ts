import * as THREE from 'three';
import type { MoleculeGroup } from '../types';

/**
 * Add red halo/glow effect to a molecule by creating glowing duplicate meshes
 * This creates a visible red glow around each atom for product molecules
 */
export function addProductOutline(molecule: MoleculeGroup): void {
  if (!molecule.group) {
    console.warn(`⚠️ Cannot add halo: molecule.group is null for ${molecule.name}`);
    return;
  }

  // Remove existing halo if present
  removeProductOutline(molecule);

  // Create bright red emissive material for the halo effect
  // This material glows and creates a visible halo around atoms
  const haloMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000, // Bright red
    emissive: 0xff3333, // Red glow (slightly lighter for better visibility)
    emissiveIntensity: 1.0, // Strong glow
    transparent: true,
    opacity: 0.7, // Semi-transparent so it glows but doesn't obscure
    side: THREE.DoubleSide, // Render both sides for full visibility
    depthWrite: false, // Don't write to depth buffer for proper blending
    blending: THREE.AdditiveBlending, // Additive blending for glow effect
  });

  let haloCount = 0;
  let meshCount = 0;
  let bondCount = 0;

  // Traverse all atom meshes in the molecule group
  molecule.group.traverse((child: any) => {
    if (child instanceof THREE.Mesh) {
      meshCount++;
      // Check if it's a bond - bonds have userData.type === 'bond' or are cylinders
      const userData = child.userData || {};
      const isBond = userData.type === 'bond' || 
                     child.geometry?.type === 'CylinderGeometry';
      
      if (isBond) {
        bondCount++;
      } else {
        // This is an atom mesh - add halo effect
        try {
          const geometry = child.geometry as THREE.BufferGeometry;
          
          if (!geometry) {
            console.warn(`⚠️ Atom mesh has no geometry: ${molecule.name}`);
            return;
          }
          
          // Clone the geometry for the halo
          // We'll scale it up to create the glow effect
          const haloGeometry = geometry.clone();
          
          // Create a halo mesh that's slightly larger than the original
          const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial.clone());
          
          // Position and rotate to match the original atom
          haloMesh.position.copy(child.position);
          haloMesh.rotation.copy(child.rotation);
          
          // Scale up by 20-25% to create visible halo around the atom
          const scaleFactor = 1.22;
          if (child.scale) {
            haloMesh.scale.copy(child.scale).multiplyScalar(scaleFactor);
          } else {
            haloMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
          }
          
          // Render behind the original mesh to create glow effect
          //haloMesh.renderOrder = -1; // Render before the original
          
          // Tag it so we can remove it later
          haloMesh.userData = { 
            type: 'productHalo', 
            atomMesh: child,
            originalMesh: child 
          };
          
          // Add to the same parent as the atom mesh (usually the molecule group)
          if (child.parent) {
            child.parent.add(haloMesh);
            // Ensure halo renders before the original atom
            const parent = child.parent as THREE.Group;
            parent.children.sort((a, b) => {
              if (a.userData?.type === 'productHalo') return -1;
              if (b.userData?.type === 'productHalo') return 1;
              return 0;
            });
          } else {
            molecule.group.add(haloMesh);
          }
          
          haloCount++;
        } catch (error) {
          console.warn(`⚠️ Error creating halo for atom in ${molecule.name}:`, error);
        }
      }
    }
  });

  // Debug logging disabled for performance in rate mode
  // if (haloCount === 0) {
  //   console.warn(
  //     `⚠️ No halos added to ${molecule.name}: ` +
  //     `found ${meshCount} meshes (${bondCount} bonds, ${meshCount - bondCount} atoms)`
  //   );
  // } else {
  //   console.log(`✅ Added ${haloCount} red halos to molecule ${molecule.name} (${meshCount - bondCount} atoms)`);
  // }
}

/**
 * Remove red halo effect from a molecule
 */
export function removeProductOutline(molecule: MoleculeGroup): void {
  if (!molecule.group) return;

  // Find and remove all halo meshes
  const halosToRemove: THREE.Object3D[] = [];
  
  molecule.group.traverse((child: any) => {
    if (child.userData?.type === 'productHalo' || child.userData?.type === 'productOutline') {
      halosToRemove.push(child);
    }
  });

  halosToRemove.forEach(halo => {
    if (halo.parent) {
      halo.parent.remove(halo);
    } else {
      molecule.group.remove(halo);
    }
    
    // Dispose of geometry and material
    if (halo instanceof THREE.Mesh) {
      const geometry = halo.geometry as THREE.BufferGeometry;
      const material = halo.material as THREE.Material;
      if (geometry) geometry.dispose();
      if (material) {
        if (Array.isArray(material)) {
          material.forEach((mat: THREE.Material) => mat.dispose());
        } else {
          material.dispose();
        }
      }
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

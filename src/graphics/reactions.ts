import * as THREE from 'three';
import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';
import { getAtomConfig, createAtomMesh, createBondMesh } from '../config/atomConfig';

/**
 * Graphics/Visualization system for chemical reactions
 * This handles the visual representation of reaction transformations
 * Part of the chemistry engine architecture
 */

export class ReactionGraphics {
  constructor() {
    log('ReactionGraphics initialized');
  }

  /**
   * Replace a halide leaving group (Cl/Br) on a methyl-like substrate with an OH group.
   * - Finds the first halogen atom (Cl or Br)
   * - Finds the carbon bonded to it
   * - Removes the halogen
   * - Adds O at the same position and an H slightly past the O along the C→O direction
   * - Adds C–O and O–H single bonds
   */
  substituteLeavingWithOH(molecule: MoleculeGroup): boolean {
    if (!molecule.molObject || !Array.isArray(molecule.molObject.atoms)) return false;

    const atoms = molecule.molObject.atoms;
    const bonds = molecule.molObject.bonds || [];

    // 1. Find leaving group index (Cl or Br)
    const leavingIdx = atoms.findIndex(a => a.type === 'Cl' || a.type === 'Br');
    if (leavingIdx === -1) return false;

    // 2. Find the carbon bonded to the leaving group
    // Bonds are stored 1-indexed in molObject
    let carbonIdx = -1; // 0-indexed
    for (const bond of bonds) {
      const a = Number(bond[0]) - 1;
      const b = Number(bond[1]) - 1;
      if (a === leavingIdx && atoms[b]?.type === 'C') {
        carbonIdx = b;
        break;
      }
      if (b === leavingIdx && atoms[a]?.type === 'C') {
        carbonIdx = a;
        break;
      }
    }
    if (carbonIdx === -1) return false;

    // Capture positions before mutation
    const leavingPos = new THREE.Vector3(
      parseFloat(atoms[leavingIdx].position.x),
      parseFloat(atoms[leavingIdx].position.y),
      parseFloat(atoms[leavingIdx].position.z)
    );
    const carbonPos = new THREE.Vector3(
      parseFloat(atoms[carbonIdx].position.x),
      parseFloat(atoms[carbonIdx].position.y),
      parseFloat(atoms[carbonIdx].position.z)
    );

    // 3. Remove the halogen atom (this also removes any bonds to it)
    this.removeAtom(molecule, leavingIdx);

    // After removal, indices > leavingIdx shift down by 1
    if (carbonIdx > leavingIdx) carbonIdx -= 1;

    // 4. Add Oxygen at the former halogen position
    const oxygenIdx = this.addAtom(molecule, 'O', leavingPos);

    // 5. Add Hydrogen slightly past the oxygen along the C->O direction
    const dir = leavingPos.clone().sub(carbonPos).normalize();
    const ohDistance = 0.96; // ~ O–H bond length (arbitrary scale units)
    const hydrogenPos = leavingPos.clone().add(dir.clone().multiplyScalar(ohDistance));
    const hydrogenIdx = this.addAtom(molecule, 'H', hydrogenPos);

    // 6. Add bonds: C–O and O–H
    this.addBond(molecule, carbonIdx, oxygenIdx, '1');
    this.addBond(molecule, oxygenIdx, hydrogenIdx, '1');

    // 7. Final visual update (local updates already happened in helpers)
    this.updateMoleculeVisualization(molecule);
    this.addTransformationEffect(molecule);

    log(`🔄 Substituted leaving group with OH on molecule ${molecule.name}`);
    return true;
  }

  /**
   * Simple method to just invert a molecule (for testing)
   */
  invertMolecule(molecule: MoleculeGroup): void {
    if (!molecule.molObject || !molecule.molObject.atoms) {
      console.log(`❌ No molObject or atoms found in ${molecule.name}`);
      return;
    }

    console.log(`🔄 Inverting molecule: ${molecule.name}`);

    const atoms = molecule.molObject.atoms;
    const centralCarbonIndex = atoms.findIndex(atom => atom.type === 'C');

    if (centralCarbonIndex === -1) {
      console.log(`❌ No central carbon found in ${molecule.name}`);
      return;
    }

    const centralCarbon = atoms[centralCarbonIndex];
    const centralPos = new THREE.Vector3(
      parseFloat(centralCarbon.position.x),
      parseFloat(centralCarbon.position.y),
      parseFloat(centralCarbon.position.z)
    );

    console.log(`🔄 Inverting around central carbon at (${centralPos.x.toFixed(2)}, ${centralPos.y.toFixed(2)}, ${centralPos.z.toFixed(2)})`);

    // Apply inversion to all atoms except central carbon
    atoms.forEach((atom, index) => {
      if (index !== centralCarbonIndex) {
        const currentPos = new THREE.Vector3(
          parseFloat(atom.position.x),
          parseFloat(atom.position.y),
          parseFloat(atom.position.z)
        );

        // Calculate vector from central carbon to this atom
        const relativePos = currentPos.clone().sub(centralPos);
        
        // Apply inversion: flip the relative position
        const invertedRelativePos = relativePos.clone().multiplyScalar(-1);
        
        // Calculate new absolute position
        const newPos = centralPos.clone().add(invertedRelativePos);

        console.log(`🔄 Inversion - Atom ${index} (${atom.type}): (${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}) → (${newPos.x.toFixed(2)}, ${newPos.y.toFixed(2)}, ${newPos.z.toFixed(2)})`);

        // Update the atom position
        atom.position.x = newPos.x.toString();
        atom.position.y = newPos.y.toString();
        atom.position.z = newPos.z.toString();
      }
    });

    // Update the visual representation
    this.updateMoleculeVisualization(molecule);
    
    // Add visual effect
    this.addTransformationEffect(molecule);
    
    console.log(`🔄 Molecule inversion completed for ${molecule.name}`);
  }

  /**
   * Replace an atom with a different element type
   */
  replaceAtom(molecule: MoleculeGroup, atomIndex: number, newElementType: string): void {
    if (!molecule.molObject || !molecule.molObject.atoms) {
      console.log(`❌ No molObject or atoms found in ${molecule.name}`);
      return;
    }

    const atoms = molecule.molObject.atoms;
    if (atomIndex < 0 || atomIndex >= atoms.length) {
      console.log(`❌ Invalid atom index ${atomIndex} for molecule with ${atoms.length} atoms`);
      return;
    }

    const atom = atoms[atomIndex];
    const oldType = atom.type;
    const position = new THREE.Vector3(
      parseFloat(atom.position.x),
      parseFloat(atom.position.y),
      parseFloat(atom.position.z)
    );

    console.log(`🔄 Replacing atom ${atomIndex} (${oldType}) with ${newElementType} at position (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);

    // Update the atom type
    atom.type = newElementType;

    // Update the visual representation
    this.updateMoleculeVisualization(molecule);
    
    // Add visual effect
    this.addTransformationEffect(molecule);
    
    console.log(`🔄 Atom replacement completed: ${oldType} → ${newElementType}`);
  }

  /**
   * Add a new atom to the molecule
   */
  addAtom(molecule: MoleculeGroup, elementType: string, position: THREE.Vector3): number {
    if (!molecule.molObject || !molecule.molObject.atoms) {
      console.log(`❌ No molObject or atoms found in ${molecule.name}`);
      return -1;
    }

    const atoms = molecule.molObject.atoms;
    const newAtom = {
      type: elementType,
      position: {
        x: position.x.toString(),
        y: position.y.toString(),
        z: position.z.toString()
      }
    };

    atoms.push(newAtom);
    const newAtomIndex = atoms.length - 1;

    console.log(`🔄 Added new atom ${elementType} at index ${newAtomIndex} at position (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);

    // Create and add the visual atom mesh using centralized config
    const atomMesh = createAtomMesh(elementType, position);
    molecule.group.add(atomMesh);
    console.log(`🎨 Created atom mesh for ${elementType} using centralized config`);

    // Update the visual representation
    this.updateMoleculeVisualization(molecule);
    
    // Add visual effect
    this.addTransformationEffect(molecule);
    
    console.log(`🔄 Atom addition completed: ${elementType} added at index ${newAtomIndex}`);
    return newAtomIndex;
  }

  /**
   * Remove an atom from the molecule
   */
  removeAtom(molecule: MoleculeGroup, atomIndex: number): void {
    if (!molecule.molObject || !molecule.molObject.atoms) {
      console.log(`❌ No molObject or atoms found in ${molecule.name}`);
      return;
    }

    const atoms = molecule.molObject.atoms;
    if (atomIndex < 0 || atomIndex >= atoms.length) {
      console.log(`❌ Invalid atom index ${atomIndex} for molecule with ${atoms.length} atoms`);
      return;
    }

    const removedAtom = atoms[atomIndex];
    console.log(`🔄 Removing atom ${atomIndex} (${removedAtom.type})`);

    // Remove the atom
    atoms.splice(atomIndex, 1);

    // Update bond indices (decrement indices > atomIndex)
    if (molecule.molObject.bonds) {
      molecule.molObject.bonds.forEach(bond => {
        const index1 = Number(bond[0]) - 1;
        const index2 = Number(bond[1]) - 1;
        
        if (index1 > atomIndex) {
          bond[0] = String(index1);
        }
        if (index2 > atomIndex) {
          bond[1] = String(index2);
        }
      });

      // Remove bonds involving the removed atom
      molecule.molObject.bonds = molecule.molObject.bonds.filter(bond => {
        const index1 = Number(bond[0]) - 1;
        const index2 = Number(bond[1]) - 1;
        return index1 !== atomIndex && index2 !== atomIndex;
      });
    }

    // Update the visual representation
    this.updateMoleculeVisualization(molecule);
    
    // Add visual effect
    this.addTransformationEffect(molecule);
    
    console.log(`🔄 Atom removal completed: ${removedAtom.type} removed from index ${atomIndex}`);
  }

  /**
   * Add a bond between two atoms
   */
  addBond(molecule: MoleculeGroup, atomIndex1: number, atomIndex2: number, bondOrder: string = '1'): void {
    if (!molecule.molObject || !molecule.molObject.bonds) {
      console.log(`❌ No molObject or bonds found in ${molecule.name}`);
      return;
    }

    const atoms = molecule.molObject.atoms;
    if (atomIndex1 < 0 || atomIndex1 >= atoms.length || atomIndex2 < 0 || atomIndex2 >= atoms.length) {
      console.log(`❌ Invalid atom indices ${atomIndex1}, ${atomIndex2} for molecule with ${atoms.length} atoms`);
      return;
    }

    const newBond: [string, string, string] = [String(atomIndex1 + 1), String(atomIndex2 + 1), bondOrder];
    molecule.molObject.bonds.push(newBond);

    console.log(`🔄 Added bond between atoms ${atomIndex1} (${atoms[atomIndex1].type}) and ${atomIndex2} (${atoms[atomIndex2].type}) with order ${bondOrder}`);

    // Create and add the visual bond mesh using centralized config
    const atom1 = atoms[atomIndex1];
    const atom2 = atoms[atomIndex2];
    const pos1 = new THREE.Vector3(
      parseFloat(atom1.position.x),
      parseFloat(atom1.position.y),
      parseFloat(atom1.position.z)
    );
    const pos2 = new THREE.Vector3(
      parseFloat(atom2.position.x),
      parseFloat(atom2.position.y),
      parseFloat(atom2.position.z)
    );
    
    const bondMesh = createBondMesh(pos1, pos2, parseInt(bondOrder));
    molecule.group.add(bondMesh);
    console.log(`🎨 Created bond mesh using centralized config`);

    // Update the visual representation
    this.updateMoleculeVisualization(molecule);
    
    // Add visual effect
    this.addTransformationEffect(molecule);
    
    console.log(`🔄 Bond addition completed: [${newBond[0]}, ${newBond[1]}, ${newBond[2]}]`);
  }

  /**
   * Remove a bond between two atoms
   */
  removeBond(molecule: MoleculeGroup, atomIndex1: number, atomIndex2: number): void {
    if (!molecule.molObject || !molecule.molObject.bonds) {
      console.log(`❌ No molObject or bonds found in ${molecule.name}`);
      return;
    }

    const bonds = molecule.molObject.bonds;
    const bondIndex = bonds.findIndex(bond => {
      const index1 = Number(bond[0]) - 1;
      const index2 = Number(bond[1]) - 1;
      return (index1 === atomIndex1 && index2 === atomIndex2) || (index1 === atomIndex2 && index2 === atomIndex1);
    });

    if (bondIndex === -1) {
      console.log(`❌ No bond found between atoms ${atomIndex1} and ${atomIndex2}`);
      return;
    }

    const removedBond = bonds[bondIndex];
    bonds.splice(bondIndex, 1);

    console.log(`🔄 Removed bond between atoms ${atomIndex1} and ${atomIndex2}: [${removedBond[0]}, ${removedBond[1]}, ${removedBond[2]}]`);

    // Update the visual representation
    this.updateMoleculeVisualization(molecule);
    
    // Add visual effect
    this.addTransformationEffect(molecule);
    
    console.log(`🔄 Bond removal completed`);
  }

  /**
   * Update molecule visualization after transformation - preserve existing structure
   */
  private updateMoleculeVisualization(molecule: MoleculeGroup): void {
    if (!molecule.molObject || !molecule.molObject.atoms) return;

    console.log(`🎨 Updating visualization for ${molecule.name} with ${molecule.molObject.atoms.length} atoms`);

    // Instead of recreating everything, just update the positions of existing atoms
    // This preserves the bond structure and only moves atoms to new positions
    const atoms = molecule.molObject.atoms;
    
    // Find all atom meshes and update their positions
    const atomMeshes: THREE.Mesh[] = [];
    molecule.group.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
        atomMeshes.push(child);
      }
    });

    console.log(`🎨 Found ${atomMeshes.length} atom meshes to update`);

    // Update existing atom positions to match the transformed molecular data
    atoms.forEach((atom, index) => {
      if (index < atomMeshes.length) {
        const mesh = atomMeshes[index];
        const x = parseFloat(atom.position.x) || 0;
        const y = parseFloat(atom.position.y) || 0;
        const z = parseFloat(atom.position.z) || 0;
        
        console.log(`🎨 Updating atom ${index} (${atom.type}): (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
        mesh.position.set(x, y, z);

        // Update atom color and size based on new type using centralized config
        const element = atom.type || 'C';
        const config = getAtomConfig(element);
        
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.color.setHex(config.color);
          console.log(`🎨 Updated atom ${index} color to ${element} (${config.color.toString(16)})`);
        }
        
        // Update geometry if needed (for size changes)
        if (mesh.geometry instanceof THREE.SphereGeometry) {
          const currentRadius = mesh.geometry.parameters.radius;
          if (Math.abs(currentRadius - config.radius) > 0.01) {
            console.log(`🎨 Updating atom ${index} size from ${currentRadius} to ${config.radius}`);
            mesh.geometry.dispose();
            mesh.geometry = config.geometry.clone();
          }
        }
      } else {
        console.log(`🎨 Warning: No mesh found for atom ${index} (${atom.type})`);
      }
    });

    // Add new atoms if the molecule has grown
    if (atoms.length > atomMeshes.length) {
      const colorByElement: Record<string, number> = {
        H: 0xffffff,
        C: 0x333333,
        O: 0xff0000,
        N: 0x0000ff,
        F: 0x00ff00,
        Cl: 0x00ff00,
        Br: 0x8a2be2,
        I: 0x800080,
      };

      const defaultGeom = new THREE.SphereGeometry(0.5, 16, 16);
      
      for (let i = atomMeshes.length; i < atoms.length; i++) {
        const atom = atoms[i];
        const element = atom.type || 'C';
        const color = colorByElement[element] ?? 0x999999;
        const mat = new THREE.MeshPhongMaterial({ color });
        const sphere = new THREE.Mesh(defaultGeom, mat);
        
        const x = parseFloat(atom.position.x) || 0;
        const y = parseFloat(atom.position.y) || 0;
        const z = parseFloat(atom.position.z) || 0;
        sphere.position.set(x, y, z);
        molecule.group.add(sphere);
        
        log(`🔄 Added new atom mesh for ${element} at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
      }
    }

    // Update bond positions to connect the moved atoms
    const bondMeshes: THREE.Mesh[] = [];
    molecule.group.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry) {
        bondMeshes.push(child);
      }
    });

    console.log(`🔄 Found ${bondMeshes.length} bond meshes to update`);

    // Update bond positions to connect the transformed atoms
    const bonds = molecule.molObject.bonds;
    console.log(`🔄 Updating ${bonds.length} bonds`);
    
    bonds.forEach((bond, bondIndex) => {
      if (bondIndex < bondMeshes.length) {
        const index1 = Number(bond[0]) - 1;
        const index2 = Number(bond[1]) - 1;

        if (index1 >= 0 && index1 < atoms.length && index2 >= 0 && index2 < atoms.length) {
          const atom1 = atoms[index1];
          const atom2 = atoms[index2];

          const point1 = new THREE.Vector3(
            parseFloat(atom1.position.x),
            parseFloat(atom1.position.y),
            parseFloat(atom1.position.z)
          );
          const point2 = new THREE.Vector3(
            parseFloat(atom2.position.x),
            parseFloat(atom2.position.y),
            parseFloat(atom2.position.z)
          );

          console.log(`🔄 Updating bond ${bondIndex}: ${atom1.type}(${index1}) - ${atom2.type}(${index2})`);
          console.log(`  Point1: (${point1.x.toFixed(2)}, ${point1.y.toFixed(2)}, ${point1.z.toFixed(2)})`);
          console.log(`  Point2: (${point2.x.toFixed(2)}, ${point2.y.toFixed(2)}, ${point2.z.toFixed(2)})`);

          // Calculate bond length - use actual distance between atom centers
          const bondLength = point1.distanceTo(point2);
          const bondMesh = bondMeshes[bondIndex];

          // Update bond geometry for new distance using centralized config
          const bondOrder = parseInt(bond[2] || '1');
          const radius = bondOrder === 1 ? 0.05 : 0.15;
          const newGeometry = new THREE.CylinderGeometry(
            radius,
            radius,
            Math.max(bondLength, 0.1), // Ensure minimum bond length
            8
          );

          newGeometry.computeBoundingBox();
          newGeometry.computeBoundingSphere();
          newGeometry.translate(0, bondLength / 2, 0);
          newGeometry.rotateX(Math.PI / 2);

          // Dispose old geometry and assign new one
          if (bondMesh.geometry) {
            bondMesh.geometry.dispose();
          }
          bondMesh.geometry = newGeometry;

          // Calculate bond center position (midpoint between atom centers)
          const bondCenter = point1.clone().add(point2).multiplyScalar(0.5);

          // Update bond position and orientation
          bondMesh.position.copy(bondCenter);
          bondMesh.lookAt(point2);
          bondMesh.rotateX(Math.PI / 2);
          
          console.log(`  Bond center: (${bondCenter.x.toFixed(2)}, ${bondCenter.y.toFixed(2)}, ${bondCenter.z.toFixed(2)})`);
          console.log(`  Bond length: ${bondLength.toFixed(2)}`);
        }
      }
    });

    // Add new bonds if needed
    if (bonds.length > bondMeshes.length) {
      for (let i = bondMeshes.length; i < bonds.length; i++) {
        const bond = bonds[i];
        const index1 = Number(bond[0]) - 1;
        const index2 = Number(bond[1]) - 1;
        
        if (index1 >= 0 && index1 < atoms.length && index2 >= 0 && index2 < atoms.length) {
          const atom1 = atoms[index1];
          const atom2 = atoms[index2];
          
          const point1 = new THREE.Vector3(
            parseFloat(atom1.position.x),
            parseFloat(atom1.position.y),
            parseFloat(atom1.position.z)
          );
          const point2 = new THREE.Vector3(
            parseFloat(atom2.position.x),
            parseFloat(atom2.position.y),
            parseFloat(atom2.position.z)
          );
          
          // Use centralized bond creation
          const bondMesh = createBondMesh(point1, point2, parseInt(bond[2] || '1'));
          molecule.group.add(bondMesh);
          log(`🔄 Added new bond mesh between atoms ${index1} and ${index2} using centralized config`);
        }
      }
    }

    log(`🎨 Updated visualization for ${molecule.name} - preserved existing structure`);
  }

  /**
   * Add visual effect to highlight the transformation
   */
  private addTransformationEffect(molecule: MoleculeGroup): void {
    // Add a brief flash effect to highlight the transformation
    const originalMaterials: THREE.Material[] = [];
    
    // Store original materials
    molecule.group.traverse(child => {
      if (child instanceof THREE.Mesh && child.material) {
        originalMaterials.push(child.material);
      }
    });
    
    // Flash effect - change to bright yellow briefly
    const flashMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x444400 });
    
    molecule.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = flashMaterial;
      }
    });
    
    // Restore original materials after 300ms (shorter duration)
    setTimeout(() => {
      // Force a complete refresh of all atom colors and materials
      this.refreshMoleculeColors(molecule);
      
      // Dispose flash material
      flashMaterial.dispose();
      
      console.log(`✨ Transformation effect completed for ${molecule.name}`);
    }, 300);
  }

  /**
   * Force refresh all atom colors and materials using centralized config
   */
  private refreshMoleculeColors(molecule: MoleculeGroup): void {
    if (!molecule.molObject || !molecule.molObject.atoms) return;

    console.log(`🎨 Refreshing colors for ${molecule.name}`);

    const atoms = molecule.molObject.atoms;
    let atomIndex = 0;

    molecule.group.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
        if (atomIndex < atoms.length) {
          const atom = atoms[atomIndex];
          const element = atom.type || 'C';
          const config = getAtomConfig(element);

          // Update material
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.color.setHex(config.color);
            console.log(`🎨 Refreshed atom ${atomIndex} (${element}) color to ${config.color.toString(16)}`);
          }

          atomIndex++;
        }
      }
    });
  }
}

// Export singleton instance
export const reactionGraphics = new ReactionGraphics();

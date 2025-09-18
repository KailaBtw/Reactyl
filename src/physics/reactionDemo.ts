import * as THREE from 'three';
import type { CollisionEvent, MoleculeGroup } from '../types';
import { log } from '../utils/debug';

/**
 * Reaction Demo System
 * Handles visual demonstration of chemical reactions
 * This is a proof of concept for testing visual systems before implementing full chemistry engine
 */
export class ReactionDemo {
  constructor() {
    log('ReactionDemo initialized');

    // Add test function to window for debugging
    (window as any).testReactionTransformation = () => {
      this.testTransformation();
    };
  }

  /**
   * Test function to manually trigger transformation for debugging
   */
  testTransformation(): void {
    console.log('🧪 Testing reaction transformation...');

    // Find molecules in the scene
    const scene = (window as any).scene || (window as any).threeJSBridge?.scene;
    if (!scene) {
      console.log('❌ No scene found for testing');
      return;
    }

    const molecules: any[] = [];
    scene.traverse((child: any) => {
      if (child.userData && child.userData.molecule) {
        molecules.push(child.userData.molecule);
      }
    });

    console.log(
      `🧪 Found ${molecules.length} molecules:`,
      molecules.map(m => m.name)
    );

    if (molecules.length >= 2) {
      const substrate = molecules[0];
      const nucleophile = molecules[1];

      console.log(`🧪 Testing transformation with ${substrate.name} + ${nucleophile.name}`);

      // Create a mock collision event
      const mockEvent = {
        moleculeA: substrate,
        moleculeB: nucleophile,
        reactionResult: {
          occurs: true,
          reactionType: { name: 'SN2' },
        },
      } as any;

      this.generateReactionProducts(mockEvent);
    } else {
      console.log('❌ Need at least 2 molecules for testing');
    }
  }

  /**
   * Transform existing molecules to show reaction products
   */
  generateReactionProducts(event: CollisionEvent): void {
    if (!event.reactionResult) return;

    console.log(
      `🧪 ReactionDemo.generateReactionProducts called for ${event.moleculeA.name} + ${event.moleculeB.name}`
    );
    console.log(`🧪 Reaction result:`, event.reactionResult);

    try {
      // Transform the existing molecules to show SN2 reaction (Walden inversion + OH substitution)
      this.transformMoleculesForSN2Reaction(event.moleculeA, event.moleculeB);

      const productInfo = {
        mainProductName: `${event.moleculeA.name}_product`,
        leavingGroupName: `${event.moleculeB.name}_leaving_group`,
        reactionEquation: `${event.moleculeA.name} + ${event.moleculeB.name} → Products`,
      };

      console.log(`🎉 Reaction successful! Products: ${productInfo.reactionEquation}`);

      // Update GUI display
      if ((window as unknown as { updateProductsDisplay?: Function }).updateProductsDisplay) {
        (window as unknown as { updateProductsDisplay: Function }).updateProductsDisplay({
          ...productInfo,
          reactionType: event.reactionResult.reactionType.name,
        });
      }
    } catch (error) {
      console.error('Error transforming molecules for reaction:', error);
    }
  }

  /**
   * Transform molecules to show SN2 reaction (Walden inversion + OH substitution)
   * CH3Cl + OH⁻ → CH3OH + Cl⁻
   */
  private transformMoleculesForSN2Reaction(
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup
  ): void {
    // For SN2 reaction: CH3Cl + OH⁻ → CH3OH + Cl⁻
    // 1. Apply Walden inversion to substrate
    // 2. Replace Cl with OH from nucleophile
    // 3. Show leaving group (Cl⁻) departure

    console.log(
      `🧪 transformMoleculesForSN2Reaction called for ${substrate.name} + ${nucleophile.name}`
    );
    console.log(`🧪 Substrate molObject:`, substrate.molObject);
    console.log(`🧪 Nucleophile molObject:`, nucleophile.molObject);

    if (!substrate.molObject || !substrate.molObject.atoms) {
      console.log(`❌ No molObject or atoms found in substrate ${substrate.name}`);
      return;
    }

    log(`🔄 Starting SN2 transformation: ${substrate.name} + ${nucleophile.name}`);

    // Find the central carbon and identify the leaving group (Cl, Br, I, etc.)
    const atoms = substrate.molObject.atoms;
    console.log(`🧪 Substrate atoms:`, atoms);

    const centralCarbonIndex = atoms.findIndex(atom => atom.type === 'C');
    // Look for common leaving groups: Cl, Br, I, F
    const leavingGroupIndex = atoms.findIndex(atom => ['Cl', 'Br', 'I', 'F'].includes(atom.type));

    console.log(
      `🧪 Central carbon index: ${centralCarbonIndex}, Leaving group index: ${leavingGroupIndex}`
    );

    if (centralCarbonIndex === -1) {
      log(`❌ No central carbon found in ${substrate.name}`);
      return;
    }

    if (leavingGroupIndex === -1) {
      log(`❌ No leaving group (Cl, Br, I, F) found in ${substrate.name}`);
      return;
    }

    const centralCarbon = atoms[centralCarbonIndex];
    const leavingGroup = atoms[leavingGroupIndex];
    const originalLeavingGroupType = leavingGroup.type; // Store original type for logging
    const centralPos = new THREE.Vector3(
      parseFloat(centralCarbon.position.x),
      parseFloat(centralCarbon.position.y),
      parseFloat(centralCarbon.position.z)
    );

    log(
      `🔄 Applying Walden inversion to ${substrate.name} around central carbon at (${centralPos.x.toFixed(2)}, ${centralPos.y.toFixed(2)}, ${centralPos.z.toFixed(2)})`
    );

    // Step 1: Apply Walden inversion to all substituents except central carbon
    atoms.forEach((atom, index) => {
      if (index !== centralCarbonIndex) {
        const currentPos = new THREE.Vector3(
          parseFloat(atom.position.x),
          parseFloat(atom.position.y),
          parseFloat(atom.position.z)
        );

        // Calculate vector from central carbon to this atom
        const relativePos = currentPos.clone().sub(centralPos);

        // Apply Walden inversion: flip the relative position
        const invertedRelativePos = relativePos.clone().multiplyScalar(-1);

        // Calculate new absolute position
        const newPos = centralPos.clone().add(invertedRelativePos);

        console.log(
          `🔄 Walden Inversion - Atom ${index} (${atom.type}): (${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}) → (${newPos.x.toFixed(2)}, ${newPos.y.toFixed(2)}, ${newPos.z.toFixed(2)})`
        );

        // Update the atom position
        atom.position.x = newPos.x.toString();
        atom.position.y = newPos.y.toString();
        atom.position.z = newPos.z.toString();
      }
    });

    // Step 2: Replace leaving group (Cl) with incoming nucleophile (OH)
    // Find the OH group from the nucleophile molecule
    if (nucleophile.molObject && nucleophile.molObject.atoms) {
      const nucleophileAtoms = nucleophile.molObject.atoms;
      const oxygenIndex = nucleophileAtoms.findIndex(atom => atom.type === 'O');
      const hydrogenIndex = nucleophileAtoms.findIndex(atom => atom.type === 'H');

      if (oxygenIndex !== -1) {
        // Replace Cl with O (from OH⁻)
        const oxygenAtom = nucleophileAtoms[oxygenIndex];
        const leavingGroupPos = new THREE.Vector3(
          parseFloat(leavingGroup.position.x),
          parseFloat(leavingGroup.position.y),
          parseFloat(leavingGroup.position.z)
        );

        // Update the leaving group atom to become oxygen
        const oldType = leavingGroup.type;
        leavingGroup.type = 'O';
        leavingGroup.position.x = leavingGroupPos.x.toString();
        leavingGroup.position.y = leavingGroupPos.y.toString();
        leavingGroup.position.z = leavingGroupPos.z.toString();

        log(
          `🔄 Replaced ${oldType} with O at position (${leavingGroupPos.x.toFixed(2)}, ${leavingGroupPos.y.toFixed(2)}, ${leavingGroupPos.z.toFixed(2)})`
        );

        // Add hydrogen from OH⁻ if available
        if (hydrogenIndex !== -1) {
          const hydrogenAtom = nucleophileAtoms[hydrogenIndex];
          const hydrogenPos = new THREE.Vector3(
            parseFloat(hydrogenAtom.position.x),
            parseFloat(hydrogenAtom.position.y),
            parseFloat(hydrogenAtom.position.z)
          );

          // Add new hydrogen atom to substrate
          const newHydrogen = {
            type: 'H',
            position: {
              x: hydrogenPos.x.toString(),
              y: hydrogenPos.y.toString(),
              z: hydrogenPos.z.toString(),
            },
          };

          atoms.push(newHydrogen);
          log(
            `🔄 Added H from OH⁻ at position (${hydrogenPos.x.toFixed(2)}, ${hydrogenPos.y.toFixed(2)}, ${hydrogenPos.z.toFixed(2)})`
          );
        }
      }
    }

    // Step 3: Update bonds to reflect new structure
    this.updateBondsForSN2Reaction(substrate, centralCarbonIndex, leavingGroupIndex);

    // Update the visual representation
    this.updateMoleculeVisualization(substrate);

    // Add visual effect to highlight the transformation
    this.addTransformationEffect(substrate);

    log(
      `🔄 Applied complete SN2 transformation to ${substrate.name}: ${originalLeavingGroupType} → OH`
    );
  }

  /**
   * Update bonds for SN2 reaction (remove Cl bond, add OH bonds)
   */
  private updateBondsForSN2Reaction(
    molecule: MoleculeGroup,
    centralCarbonIndex: number,
    leavingGroupIndex: number
  ): void {
    if (!molecule.molObject || !molecule.molObject.bonds) return;

    const bonds = molecule.molObject.bonds;

    // Remove bonds involving the leaving group (Cl)
    const bondsToRemove: number[] = [];
    bonds.forEach((bond, index) => {
      const atom1Index = Number(bond[0]) - 1;
      const atom2Index = Number(bond[1]) - 1;

      if (atom1Index === leavingGroupIndex || atom2Index === leavingGroupIndex) {
        bondsToRemove.push(index);
      }
    });

    // Remove bonds in reverse order to maintain indices
    bondsToRemove.reverse().forEach(index => {
      bonds.splice(index, 1);
      log(`🔄 Removed bond involving leaving group at index ${index}`);
    });

    // Add new bond between central carbon and oxygen (now at leaving group position)
    const newBond = [centralCarbonIndex + 1, leavingGroupIndex + 1, '1']; // Single bond
    bonds.push(newBond);
    log(`🔄 Added C-O bond: [${newBond[0]}, ${newBond[1]}, ${newBond[2]}]`);

    // Add bond between oxygen and hydrogen (if hydrogen was added)
    const atoms = molecule.molObject.atoms;
    const hydrogenIndex = atoms.length - 1; // Last added atom should be hydrogen
    if (atoms[hydrogenIndex] && atoms[hydrogenIndex].type === 'H') {
      const ohBond = [leavingGroupIndex + 1, hydrogenIndex + 1, '1']; // Single bond
      bonds.push(ohBond);
      log(`🔄 Added O-H bond: [${ohBond[0]}, ${ohBond[1]}, ${ohBond[2]}]`);
    }
  }

  /**
   * Update molecule visualization after transformation - preserve existing structure
   */
  private updateMoleculeVisualization(molecule: MoleculeGroup): void {
    if (!molecule.molObject || !molecule.molObject.atoms) return;

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

    // Update existing atom positions to match the transformed molecular data
    atoms.forEach((atom, index) => {
      if (index < atomMeshes.length) {
        const mesh = atomMeshes[index];
        const x = parseFloat(atom.position.x) || 0;
        const y = parseFloat(atom.position.y) || 0;
        const z = parseFloat(atom.position.z) || 0;
        mesh.position.set(x, y, z);

        // Update atom color based on new type
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

        const element = atom.type || 'C';
        const color = colorByElement[element] ?? 0x999999;
        if (mesh.material instanceof THREE.MeshPhongMaterial) {
          mesh.material.color.setHex(color);
        }
      }
    });

    // Add new atoms if the molecule has grown (e.g., added H from OH⁻)
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

        log(
          `🔄 Added new atom mesh for ${element} at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
        );
      }
    }

    // Update bond positions to connect the moved atoms
    const bondMeshes: THREE.Mesh[] = [];
    molecule.group.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry) {
        bondMeshes.push(child);
      }
    });

    // Update bond positions to connect the transformed atoms
    const bonds = molecule.molObject.bonds;
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

          // Calculate bond length accounting for atom radii (0.5 each)
          const atomRadius = 0.5;
          const bondLength = point1.distanceTo(point2) - 2 * atomRadius;
          const bondMesh = bondMeshes[bondIndex];

          // Update bond geometry for new distance
          const cylinderRadius = bond[2] === '1' ? 0.05 : 0.15;
          const newGeometry = new THREE.CylinderGeometry(
            cylinderRadius,
            cylinderRadius,
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

          // Calculate bond center position (midpoint between atom surfaces)
          const direction = point2.clone().sub(point1).normalize();
          const bondCenter = point1
            .clone()
            .add(direction.clone().multiplyScalar(atomRadius + bondLength / 2));

          // Update bond position and orientation
          bondMesh.position.copy(bondCenter);
          bondMesh.lookAt(point2);
          bondMesh.rotateX(Math.PI / 2);
        }
      }
    });

    // Add new bonds if needed
    if (bonds.length > bondMeshes.length) {
      const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

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

          const atomRadius = 0.5;
          const bondLength = point1.distanceTo(point2) - 2 * atomRadius;
          const cylinderRadius = bond[2] === '1' ? 0.05 : 0.15;

          const cylinderGeometry = new THREE.CylinderGeometry(
            cylinderRadius,
            cylinderRadius,
            Math.max(bondLength, 0.1),
            8
          );

          cylinderGeometry.computeBoundingBox();
          cylinderGeometry.computeBoundingSphere();
          cylinderGeometry.translate(0, bondLength / 2, 0);
          cylinderGeometry.rotateX(Math.PI / 2);

          const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
          const direction = point2.clone().sub(point1).normalize();
          const bondCenter = point1
            .clone()
            .add(direction.clone().multiplyScalar(atomRadius + bondLength / 2));

          cylinder.position.copy(bondCenter);
          cylinder.lookAt(point2);
          cylinder.rotateX(Math.PI / 2);

          molecule.group.add(cylinder);
          log(`🔄 Added new bond mesh between atoms ${index1} and ${index2}`);
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
    const flashMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0x444400 });

    molecule.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = flashMaterial;
      }
    });

    // Restore original materials after 500ms
    setTimeout(() => {
      let materialIndex = 0;
      molecule.group.traverse(child => {
        if (child instanceof THREE.Mesh && materialIndex < originalMaterials.length) {
          child.material = originalMaterials[materialIndex];
          materialIndex++;
        }
      });

      // Dispose flash material
      flashMaterial.dispose();

      console.log(`✨ Transformation effect completed for ${molecule.name}`);
    }, 500);
  }
}

// Export singleton instance
export const reactionDemo = new ReactionDemo();

import * as THREE from 'three';
import { createAtomMesh, getAtomConfig } from '../config/atomConfig';
import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';
import { addProductOutline } from '../utils/moleculeOutline';

/**
 * Minimal Reaction Graphics System
 * Just does the absolute minimum for SN2 reactions
 */
export class ReactionGraphics {
  constructor() {
    log('Minimal ReactionGraphics initialized');
  }

  /**
   * Execute SN2 reaction: CH3X + OH⁻ → CH3OH + X⁻
   * Minimal approach: just modify the substrate molecule
   */
  executeSN2Reaction(substrate: MoleculeGroup, _nucleophile: MoleculeGroup): boolean {
    log('🧪 Minimal SN2 reaction...');

    try {
      // Step 1: Find leaving group and its bonded carbon BEFORE edits
      const leavingGroupIndex = this.findLeavingGroupIndex(substrate);
      if (leavingGroupIndex === -1) {
        log('❌ No leaving group found');
        return false;
      }

      const carbonIndex = this.findBondedCarbonIndex(substrate, leavingGroupIndex);
      if (carbonIndex === -1) {
        log('❌ No bonded carbon found for leaving group');
        return false;
      }

      // Use current mesh positions (group space) to determine correct SN2 product geometry
      const carbonMesh = this.findAtomMesh(substrate, carbonIndex);
      const leavingMesh = this.findAtomMesh(substrate, leavingGroupIndex);
      if (!carbonMesh || !leavingMesh) {
        log('❌ Atom meshes not found to compute geometry');
        return false;
      }

      // Direction from carbon to leaving group (backside attack direction)
      const dir = new THREE.Vector3()
        .subVectors(leavingMesh.position, carbonMesh.position)
        .normalize();

      // Typical bond lengths (same units as group space — loader uses Å-like units)
      const coLength = 1.43; // C–O single bond
      const ohLength = 0.96; // O–H bond

      // Compute O position on the former C→X axis (backside attack)
      const oPos = new THREE.Vector3().copy(carbonMesh.position).addScaledVector(dir, coLength);

      // Place H at ~109.5° from the O→C vector (tetrahedral around O)
      // Build an orthonormal basis around dir
      const up = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const perp1 = new THREE.Vector3().crossVectors(dir, up).normalize();
      const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();
      const theta = THREE.MathUtils.degToRad(109.5); // angle(H–O–C)
      // O->C direction is -dir
      const hDir = new THREE.Vector3()
        .copy(dir)
        .multiplyScalar(-Math.cos(theta))
        .addScaledVector(perp2, Math.sin(theta))
        .normalize();
      const hPos = new THREE.Vector3().copy(oPos).addScaledVector(hDir, ohLength);

      // Step 2: Remove leaving group (affects indices, so done AFTER computing positions)
      this.removeLeavingGroup(substrate, leavingGroupIndex);

      // Step 3: Add OH group at the computed positions, bonded to the original carbon index
      this.addOHGroup(substrate, carbonIndex, oPos, hPos);

      // Step 4: Mark both molecules as products and add red outline (only in rate mode)
      const { collisionEventSystem } = require('../physics/collisionEventSystem');
      const isRateMode = collisionEventSystem.getSimulationMode() === 'rate';
      
      // Mark substrate as product (it's been transformed)
      substrate.isProduct = true;
      
      // Mark nucleophile as product too (it's been consumed in the reaction)
      // In SN2, the nucleophile becomes part of the product, so it's also "consumed"
      if (_nucleophile) {
        _nucleophile.isProduct = true;
      }
      
      // Add outline immediately in rate mode for both molecules
      if (isRateMode) {
        substrate.addOutline();
        log(`✅ Added red outline to product ${substrate.name} in rate mode`);
        
        if (_nucleophile) {
          _nucleophile.addOutline();
          log(`✅ Added red outline to product ${_nucleophile.name} in rate mode`);
        }
      } else {
        log(`✅ Product ${substrate.name} marked (no outline in single mode)`);
        if (_nucleophile) {
          log(`✅ Product ${_nucleophile.name} marked (no outline in single mode)`);
        }
      }

      log('✅ Minimal SN2 reaction completed');
      return true;
    } catch (error) {
      log(`❌ SN2 reaction failed: ${error}`);
      return false;
    }
  }

  /**
   * Find leaving group index in substrate
   */
  private findLeavingGroupIndex(molecule: MoleculeGroup): number {
    if (!molecule.molObject?.atoms) return -1;

    const atoms = molecule.molObject.atoms;
    return atoms.findIndex(atom => ['Br', 'Cl', 'I', 'F'].includes(atom.type));
  }

  // Find the carbon bonded to the leaving group (from molObject bonds)
  private findBondedCarbonIndex(molecule: MoleculeGroup, leavingGroupIndex: number): number {
    const bonds = molecule.molObject?.bonds || [];
    const atoms = molecule.molObject?.atoms || [];
    for (const bond of bonds) {
      const a = Number(bond[0]) - 1;
      const b = Number(bond[1]) - 1;
      if (a === leavingGroupIndex && atoms[b]?.type === 'C') return b;
      if (b === leavingGroupIndex && atoms[a]?.type === 'C') return a;
    }
    return -1;
  }

  // Find atom mesh tagged with userData.atomIndex (set by moleculeDrawer)
  private findAtomMesh(molecule: MoleculeGroup, atomIndex: number): THREE.Mesh | undefined {
    let mesh: THREE.Mesh | undefined;
    for (const child of molecule.group.children) {
      const ud = (child as any).userData;
      if (ud && ud.atomIndex === atomIndex && ud.type !== 'bond') {
        mesh = child as THREE.Mesh;
        break;
      }
    }
    return mesh;
  }

  /**
   * Remove leaving group from substrate
   */
  private removeLeavingGroup(molecule: MoleculeGroup, leavingGroupIndex: number): void {
    log(`🗑️ Removing leaving group at index ${leavingGroupIndex}`);

    // Remove from molecular data
    if (molecule.molObject?.atoms) {
      molecule.molObject.atoms.splice(leavingGroupIndex, 1);
    }

    // Remove bonds involving the leaving group
    if (molecule.molObject?.bonds) {
      molecule.molObject.bonds = molecule.molObject.bonds.filter(bond => {
        const atom1 = Number(bond[0]) - 1;
        const atom2 = Number(bond[1]) - 1;
        return atom1 !== leavingGroupIndex && atom2 !== leavingGroupIndex;
      });
    }

    // Remove from visual representation using stable atomIndex tagging
    this.removeAtomVisual(molecule, leavingGroupIndex);
  }

  /**
   * Add OH group to substrate
   */
  private addOHGroup(
    molecule: MoleculeGroup,
    carbonIndex: number,
    oPos: THREE.Vector3,
    hPos: THREE.Vector3
  ): void {
    log('➕ Adding OH group');

    // Add O atom
    molecule.molObject?.atoms?.push({
      type: 'O',
      position: { x: oPos.x.toFixed(3), y: oPos.y.toFixed(3), z: oPos.z.toFixed(3) },
    } as any);
    const oIndex = (molecule.molObject?.atoms?.length || 1) - 1;

    // Add H atom
    molecule.molObject?.atoms?.push({
      type: 'H',
      position: { x: hPos.x.toFixed(3), y: hPos.y.toFixed(3), z: hPos.z.toFixed(3) },
    } as any);
    const hIndex = (molecule.molObject?.atoms?.length || 1) - 1;

    // Add to visual representation
    this.addAtomVisual(molecule, oPos, 'O');
    this.addAtomVisual(molecule, hPos, 'H');

    // Add bonds in data (use the original carbon index)
    if (molecule.molObject?.bonds) {
      molecule.molObject.bonds.push([(carbonIndex + 1).toString(), (oIndex + 1).toString(), '1']);
      molecule.molObject.bonds.push([(oIndex + 1).toString(), (hIndex + 1).toString(), '1']);
    }

    // Create visual bonds for the new C-O and O-H bonds
    this.createVisualBond(molecule, carbonIndex, oIndex);
    this.createVisualBond(molecule, oIndex, hIndex);
  }

  /**
   * Remove atom from visual representation
   */
  private removeAtomVisual(molecule: MoleculeGroup, atomIndex: number): void {
    if (!molecule.group) return;

    // Find and remove the atom mesh
    const atomMeshes = molecule.group.children.filter(
      child => child.userData?.atomIndex === atomIndex
    );

    atomMeshes.forEach(mesh => {
      molecule.group.remove(mesh);
      const meshObj = mesh as THREE.Mesh;
      if (meshObj.geometry) meshObj.geometry.dispose();
      if (meshObj.material) {
        if (Array.isArray(meshObj.material)) {
          meshObj.material.forEach((mat: any) => mat.dispose());
        } else {
          meshObj.material.dispose();
        }
      }
    });

    // Reassign contiguous atomIndex tags to remaining atom meshes
    let nextIndex = 0;
    molecule.group.children.forEach(child => {
      if (
        (child as any).userData &&
        (child as any).userData.atomIndex !== undefined &&
        (child as any).userData.type !== 'bond'
      ) {
        (child as any).userData.atomIndex = nextIndex++;
      }
    });
  }

  /**
   * Add atom to visual representation
   */
  private addAtomVisual(
    molecule: MoleculeGroup,
    position: THREE.Vector3,
    elementType: string
  ): void {
    if (!molecule.group) return;

    const atomMesh = createAtomMesh(elementType, position);
    atomMesh.userData = { atomIndex: molecule.group.children.length };

    molecule.group.add(atomMesh);
  }

  /**
   * Create visual bond between two atoms
   */
  private createVisualBond(molecule: MoleculeGroup, atomIndex1: number, atomIndex2: number): void {
    if (!molecule.group) return;

    const atom1Mesh = this.findAtomMesh(molecule, atomIndex1);
    const atom2Mesh = this.findAtomMesh(molecule, atomIndex2);

    if (!atom1Mesh || !atom2Mesh) return;

    // Get atom types from molecular data to determine radii
    const atom1Type = molecule.molObject?.atoms?.[atomIndex1]?.type || 'C';
    const atom2Type = molecule.molObject?.atoms?.[atomIndex2]?.type || 'C';
    const atom1Radius = getAtomConfig(atom1Type).radius;
    const atom2Radius = getAtomConfig(atom2Type).radius;

    const centerDistance = atom1Mesh.position.distanceTo(atom2Mesh.position);

    // Calculate bond length (distance between atom surfaces, not centers)
    const bondLength = Math.max(0.1, centerDistance - atom1Radius - atom2Radius);

    // Create cylinder geometry for the bond
    const cylinderGeometry = new THREE.CylinderGeometry(
      0.05, // radius
      0.05, // radius
      bondLength, // height (surface to surface)
      8 // segments
    );

    // Center the cylinder and orient it
    cylinderGeometry.computeBoundingBox();
    cylinderGeometry.computeBoundingSphere();
    cylinderGeometry.translate(0, bondLength / 2, 0);
    cylinderGeometry.rotateX(Math.PI / 2);

    // Create material and mesh
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bondMesh = new THREE.Mesh(cylinderGeometry, material);

    // Position the bond between the atom surfaces (not centers)
    const direction = atom2Mesh.position.clone().sub(atom1Mesh.position).normalize();
    const bondStart = atom1Mesh.position.clone().add(direction.clone().multiplyScalar(atom1Radius));
    const bondEnd = atom2Mesh.position.clone().sub(direction.clone().multiplyScalar(atom2Radius));

    bondMesh.position.copy(bondStart);
    bondMesh.lookAt(bondEnd);

    // Tag as bond
    bondMesh.userData = { type: 'bond' };

    molecule.group.add(bondMesh);
  }

  /**
   * Simple transformation effect - just a basic flash
   */
  addTransformationEffect(molecule: MoleculeGroup): void {
    log('✨ Adding simple flash effect...');

    // Simple flash effect
    const originalMaterials: THREE.Material[] = [];
    molecule.group.traverse((child: any) => {
      if (child.material) {
        originalMaterials.push(child.material);
        child.material = new THREE.MeshStandardMaterial({
          color: 0xffff00, // Yellow flash
          emissive: 0x444400,
        });
      }
    });

    // Restore original materials after 300ms
    setTimeout(() => {
      let materialIndex = 0;
      molecule.group.traverse((child: any) => {
        if (child.material && originalMaterials[materialIndex]) {
          child.material = originalMaterials[materialIndex];
          materialIndex++;
        }
      });
      log('✨ Flash effect completed');
    }, 300);
  }
}

// Export singleton instance
export const reactionGraphics = new ReactionGraphics();

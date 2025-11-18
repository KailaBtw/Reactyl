import * as THREE from 'three';
import { createAtomMesh, getAtomConfig } from '../config/atomConfig';
import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';
import { addProductOutline } from '../utils/moleculeOutline';
import { collisionEventSystem } from '../physics/collisionEventSystem';

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
   * Creates leaving group molecule with proper physics and momentum conservation
   */
  executeSN2Reaction(substrate: MoleculeGroup, _nucleophile: MoleculeGroup): boolean {
    log('🧪 SN2 reaction with leaving group separation...');

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

      // Store leaving group info before removal
      const leavingGroupElement = substrate.molObject?.atoms?.[leavingGroupIndex]?.type || 'Br';
      const leavingGroupWorldPos = new THREE.Vector3();
      leavingMesh.getWorldPosition(leavingGroupWorldPos);

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

      // Step 2: Create leaving group molecule BEFORE removing from substrate
      const leavingGroupMolecule = this.createLeavingGroupMolecule(
        leavingGroupElement,
        leavingGroupWorldPos,
        substrate
      );

      // Step 3: Remove leaving group from substrate (affects indices, so done AFTER creating separate molecule)
      this.removeLeavingGroup(substrate, leavingGroupIndex);

      // Step 4: Add OH group at the computed positions, bonded to the original carbon index
      this.addOHGroup(substrate, carbonIndex, oPos, hPos);

      // Step 5: Apply physics and momentum conservation
      this.applyReactionMomentum(substrate, _nucleophile, leavingGroupMolecule, dir);

      // Step 6: Mark molecules as products and add red outline (only in rate mode)
      const isRateMode = collisionEventSystem.getSimulationMode() === 'rate';
      
      // Mark substrate as product (it's been transformed)
      substrate.isProduct = true;
      
      // Mark nucleophile as product too (it's been consumed in the reaction)
      // In SN2, the nucleophile becomes part of the product, so it's also "consumed"
      if (_nucleophile) {
        _nucleophile.isProduct = true;
      }
      
      // Add outline immediately in rate mode for all products
      if (isRateMode) {
        substrate.addOutline();
        log(`✅ Added red outline to product ${substrate.name} in rate mode`);
        
        if (_nucleophile) {
          _nucleophile.addOutline();
          log(`✅ Added red outline to product ${_nucleophile.name} in rate mode`);
        }
        
        if (leavingGroupMolecule.addOutline) {
          leavingGroupMolecule.addOutline();
          log(`✅ Added red outline to leaving group ${leavingGroupMolecule.name} in rate mode`);
        }
      } else {
        log(`✅ Product ${substrate.name} marked (no outline in single mode)`);
        if (_nucleophile) {
          log(`✅ Product ${_nucleophile.name} marked (no outline in single mode)`);
        }
      }

      log('✅ SN2 reaction completed with leaving group separation');
      return true;
    } catch (error) {
      log(`❌ SN2 reaction failed: ${error}`);
      return false;
    }
  }

  /**
   * Create a leaving group molecule with physics
   */
  private createLeavingGroupMolecule(
    element: string,
    worldPosition: THREE.Vector3,
    substrate: MoleculeGroup
  ): any {
    // Create a new molecule group for the leaving group
    const leavingGroupMolecule = {
      name: `${element}⁻_leaving`,
      group: new THREE.Group(),
      velocity: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(),
      physicsBody: null,
      molecularProperties: {
        totalMass: this.getElementMass(element),
        boundingRadius: 0.5,
      },
      hasPhysics: false,
      isProduct: true, // Mark as product so it doesn't react again
      addOutline: () => {
        // Add outline functionality
        try {
          addProductOutline(leavingGroupMolecule as any);
        } catch (error) {
          log(`Error adding outline to leaving group: ${error}`);
        }
      },
    };

    // Position the molecule at the leaving group's world position
    leavingGroupMolecule.group.position.copy(worldPosition);

    // Create atom mesh for the leaving group
    const atomMesh = createAtomMesh(element, new THREE.Vector3(0, 0, 0));
    atomMesh.userData = { element, atomIndex: 0, type: 'atom' };
    leavingGroupMolecule.group.add(atomMesh);

    // Find the main scene by traversing up the parent hierarchy
    let scene = substrate.group.parent;
    while (scene && scene.type !== 'Scene') {
      scene = scene.parent;
    }

    // Add to the main scene if found
    try {
      if (scene && scene.type === 'Scene') {
        scene.add(leavingGroupMolecule.group);
        log(`✅ Added leaving group molecule to scene: ${leavingGroupMolecule.name}`);
      } else if (substrate.group.parent) {
        substrate.group.parent.add(leavingGroupMolecule.group);
        log(`✅ Added leaving group molecule to substrate parent: ${leavingGroupMolecule.name}`);
      }
    } catch (error) {
      log(`Error adding leaving group to scene: ${error}`);
    }

    return leavingGroupMolecule;
  }

  /**
   * Apply reaction momentum - leaving group flies backward, product recoils
   * Uses Newton's laws of motion for realistic physics
   */
  private applyReactionMomentum(
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup,
    leavingGroupMolecule: any,
    leavingGroupDirection: THREE.Vector3
  ): void {
    try {
      // Get physics engine
      const { physicsEngine } = require('../physics/cannonPhysicsEngine');

      // Step 1: Add physics body to leaving group
      const success = physicsEngine.addMolecule(
        leavingGroupMolecule,
        leavingGroupMolecule.molecularProperties
      );

      if (!success) {
        log('⚠️ Failed to add physics to leaving group');
        return;
      }

      leavingGroupMolecule.hasPhysics = true;
      leavingGroupMolecule.physicsBody = physicsEngine.getPhysicsBody(leavingGroupMolecule);

      // Step 2: Calculate masses for momentum conservation
      const substrateMass = substrate.molecularProperties?.totalMass || 50;
      const leavingGroupMass = leavingGroupMolecule.molecularProperties.totalMass;
      
      // Step 3: Calculate velocities using conservation of momentum
      // Leaving group flies backward (opposite to nucleophile approach direction)
      // Product recoils forward to conserve momentum
      
      // Get current velocities (before reaction)
      const substrateVel = substrate.velocity ? substrate.velocity.clone() : new THREE.Vector3(0, 0, 0);
      const nucleophileVel = nucleophile.velocity ? nucleophile.velocity.clone() : new THREE.Vector3(0, 0, 0);
      
      // Total momentum before reaction (substrate + nucleophile)
      const totalMomentum = new THREE.Vector3()
        .addScaledVector(substrateVel, substrateMass)
        .addScaledVector(nucleophileVel, leavingGroupMass);
      
      // Leaving group velocity: flies backward with significant speed (5-8 m/s in leaving group direction)
      const leavingGroupSpeed = 6.0; // m/s - moderate speed for visibility
      const leavingGroupVelocity = leavingGroupDirection.clone().multiplyScalar(leavingGroupSpeed);
      
      // Product velocity: calculated from momentum conservation
      // p_total = p_product + p_leaving
      // v_product = (p_total - p_leaving) / m_product
      const productMomentum = totalMomentum.clone().sub(
        leavingGroupVelocity.clone().multiplyScalar(leavingGroupMass)
      );
      const productVelocity = productMomentum.divideScalar(substrateMass);
      
      // Step 4: Apply velocities
      physicsEngine.setVelocity(leavingGroupMolecule, leavingGroupVelocity);
      log(
        `🚀 Leaving group velocity: (${leavingGroupVelocity.x.toFixed(2)}, ${leavingGroupVelocity.y.toFixed(2)}, ${leavingGroupVelocity.z.toFixed(2)}) m/s`
      );
      
      // Apply product velocity (substrate now contains the nucleophile, so it's the main product)
      if (substrate.hasPhysics) {
        physicsEngine.setVelocity(substrate, productVelocity);
        log(
          `🚀 Product recoil velocity: (${productVelocity.x.toFixed(2)}, ${productVelocity.y.toFixed(2)}, ${productVelocity.z.toFixed(2)}) m/s`
        );
      }
      
      // Remove nucleophile physics body since it's been consumed (becomes part of product)
      if (nucleophile.hasPhysics && nucleophile.physicsBody) {
        try {
          physicsEngine.removeMolecule(nucleophile);
          nucleophile.hasPhysics = false;
          nucleophile.physicsBody = null;
          log('✅ Nucleophile physics removed (consumed in reaction)');
        } catch (error) {
          log(`⚠️ Error removing nucleophile physics: ${error}`);
        }
      }

      log('✅ Reaction momentum applied successfully');
    } catch (error) {
      log(`❌ Error applying reaction momentum: ${error}`);
    }
  }

  /**
   * Get atomic mass for common elements (in AMU)
   */
  private getElementMass(element: string): number {
    const masses: { [key: string]: number } = {
      H: 1.008,
      C: 12.011,
      N: 14.007,
      O: 15.999,
      F: 18.998,
      P: 30.974,
      S: 32.065,
      Cl: 35.453,
      Br: 79.904,
      I: 126.904,
    };
    return masses[element] || 12.011; // Default to carbon mass
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

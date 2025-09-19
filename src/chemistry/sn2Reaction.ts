import * as THREE from 'three';
import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';
import { reactionGraphics } from '../graphics/reactions';

/**
 * Simple SN2 Reaction System
 * Bare-bones implementation for testing and demonstration
 * Can be extended later for full chemistry engine
 */

export interface SN2ReactionResult {
  success: boolean;
  substrate: MoleculeGroup;
  nucleophile: MoleculeGroup;
  product: MoleculeGroup | null;
  leavingGroup: MoleculeGroup | null;
}

export class SN2ReactionSystem {
  constructor() {
    log('SN2ReactionSystem initialized');
    
    // Add debug function to window for testing
    (window as any).debugSN2System = () => {
      this.debugSystem();
    };
    
    // Add graphics debug function
    (window as any).debugGraphics = () => {
      this.debugGraphics();
    };
    
    // Add function to get molecules from scene
    (window as any).getMoleculesFromScene = () => {
      return this.getMoleculesFromScene();
    };
  }

  /**
   * Execute SN2 reaction: R-X + Nu⁻ → R-Nu + X⁻
   * Where R-X is substrate, Nu⁻ is nucleophile, R-Nu is product, X⁻ is leaving group
   */
  executeReaction(substrate: MoleculeGroup, nucleophile: MoleculeGroup): SN2ReactionResult {
    log(`🔄 Executing SN2 reaction: ${substrate.name} + ${nucleophile.name}`);

    try {
      // Step 1: Validate reactants
      if (!this.validateReactants(substrate, nucleophile)) {
        return {
          success: false,
          substrate,
          nucleophile,
          product: null,
          leavingGroup: null
        };
      }

      // Step 2: Apply Walden inversion to substrate
      this.applyWaldenInversion(substrate);

      // Step 3: Replace leaving group with nucleophile
      const leavingGroupIndex = this.findLeavingGroup(substrate);
      if (leavingGroupIndex === -1) {
        log('❌ No leaving group found in substrate');
        return {
          success: false,
          substrate,
          nucleophile,
          product: null,
          leavingGroup: null
        };
      }

      // Step 4: Transform substrate into product
      this.transformSubstrateToProduct(substrate, nucleophile, leavingGroupIndex);

      // Step 5: Create leaving group
      const leavingGroup = this.createLeavingGroup(substrate, leavingGroupIndex);

      log(`✅ SN2 reaction completed: ${substrate.name} → Product + Leaving Group`);

      return {
        success: true,
        substrate,
        nucleophile,
        product: substrate, // Substrate is now the product
        leavingGroup
      };

    } catch (error) {
      log(`❌ SN2 reaction failed: ${error}`);
      return {
        success: false,
        substrate,
        nucleophile,
        product: null,
        leavingGroup: null
      };
    }
  }

  /**
   * Validate that reactants are suitable for SN2 reaction
   */
  private validateReactants(substrate: MoleculeGroup, nucleophile: MoleculeGroup): boolean {
    if (!substrate.molObject || !substrate.molObject.atoms) {
      log('❌ Substrate has no molecular data');
      return false;
    }

    if (!nucleophile.molObject || !nucleophile.molObject.atoms) {
      log('❌ Nucleophile has no molecular data');
      return false;
    }

    // Check for leaving group in substrate
    const leavingGroupIndex = this.findLeavingGroup(substrate);
    if (leavingGroupIndex === -1) {
      log('❌ No leaving group found in substrate');
      return false;
    }

    // Check for nucleophilic center in nucleophile
    const nucleophilicCenter = this.findNucleophilicCenter(nucleophile);
    if (nucleophilicCenter === -1) {
      log('❌ No nucleophilic center found in nucleophile');
      return false;
    }

    log('✅ Reactants validated for SN2 reaction');
    return true;
  }

  /**
   * Find leaving group in substrate (Cl, Br, I, F, etc.)
   */
  private findLeavingGroup(molecule: MoleculeGroup): number {
    if (!molecule.molObject || !molecule.molObject.atoms) return -1;

    const atoms = molecule.molObject.atoms;
    return atoms.findIndex(atom => ['Cl', 'Br', 'I', 'F', 'OTs', 'OMs'].includes(atom.type));
  }

  /**
   * Find nucleophilic center in nucleophile (O, N, S, etc.)
   */
  private findNucleophilicCenter(molecule: MoleculeGroup): number {
    if (!molecule.molObject || !molecule.molObject.atoms) return -1;

    const atoms = molecule.molObject.atoms;
    return atoms.findIndex(atom => ['O', 'N', 'S'].includes(atom.type));
  }

  /**
   * Apply Walden inversion to substrate
   */
  private applyWaldenInversion(substrate: MoleculeGroup): void {
    log('🔄 Applying Walden inversion to substrate');
    reactionGraphics.invertMolecule(substrate);
  }

  /**
   * Transform substrate into product by replacing leaving group with nucleophile
   */
  private transformSubstrateToProduct(
    substrate: MoleculeGroup, 
    nucleophile: MoleculeGroup, 
    leavingGroupIndex: number
  ): void {
    log('🔄 Transforming substrate to product');

    // Replace leaving group with nucleophilic center
    const nucleophilicCenter = this.findNucleophilicCenter(nucleophile);
    if (nucleophilicCenter !== -1) {
      const nucleophileAtom = nucleophile.molObject!.atoms[nucleophilicCenter];
      reactionGraphics.replaceAtom(substrate, leavingGroupIndex, nucleophileAtom.type);
    }

    // Add any additional atoms from nucleophile if needed
    this.addNucleophileAtoms(substrate, nucleophile, leavingGroupIndex);
  }

  /**
   * Add additional atoms from nucleophile to substrate
   * For simple SN2 reactions, we only add the H atom from OH- nucleophile
   */
  private addNucleophileAtoms(
    substrate: MoleculeGroup, 
    nucleophile: MoleculeGroup, 
    leavingGroupIndex: number
  ): void {
    if (!nucleophile.molObject || !nucleophile.molObject.atoms) return;

    const nucleophileAtoms = nucleophile.molObject.atoms;
    const nucleophilicCenter = this.findNucleophilicCenter(nucleophile);

    if (nucleophilicCenter === -1) return;

    // For simple SN2 reactions (like CH3Br + OH- → CH3OH + Br-)
    // We only need to add the H atom from the OH- nucleophile
    
    // Find H atoms bonded to the nucleophilic center (O in OH-)
    nucleophileAtoms.forEach((atom, index) => {
      if (index !== nucleophilicCenter && atom.type === 'H') {
        // Position the H atom at a reasonable distance from the O atom
        const leavingGroupPos = new THREE.Vector3(
          parseFloat(substrate.molObject!.atoms[leavingGroupIndex].position.x),
          parseFloat(substrate.molObject!.atoms[leavingGroupIndex].position.y),
          parseFloat(substrate.molObject!.atoms[leavingGroupIndex].position.z)
        );
        
        // Place H atom at a typical O-H bond distance (0.96 Å)
        const hPosition = leavingGroupPos.clone().add(new THREE.Vector3(0.96, 0, 0));
        
        const newAtomIndex = reactionGraphics.addAtom(substrate, 'H', hPosition);
        
        // Add bond between O (now at leavingGroupIndex) and H
        reactionGraphics.addBond(substrate, leavingGroupIndex, newAtomIndex, '1');
        
        log(`✅ Added H atom from nucleophile to substrate at position (${hPosition.x.toFixed(2)}, ${hPosition.y.toFixed(2)}, ${hPosition.z.toFixed(2)})`);
      }
    });
  }

  /**
   * Create leaving group from the removed atom
   */
  private createLeavingGroup(substrate: MoleculeGroup, leavingGroupIndex: number): MoleculeGroup | null {
    if (!substrate.molObject || !substrate.molObject.atoms) return null;

    const leavingGroupAtom = substrate.molObject.atoms[leavingGroupIndex];
    if (!leavingGroupAtom) return null;

    // Create a simple leaving group molecule
    const leavingGroup = {
      name: `LeavingGroup_${leavingGroupAtom.type}_${Date.now()}`,
      group: new THREE.Group(),
      molObject: {
        atoms: [{
          type: leavingGroupAtom.type,
          position: {
            x: '0',
            y: '0', 
            z: '0'
          }
        }],
        bonds: []
      },
      velocity: new THREE.Vector3(0, 0, 0),
      reactionInProgress: false,
      position: { x: 0, y: 0, z: 0 },
      add: () => {},
      getGroup: () => new THREE.Group(),
      radius: 1
    } as MoleculeGroup;

    log(`✅ Created leaving group: ${leavingGroup.name}`);
    return leavingGroup;
  }

  /**
   * Get reaction equation string
   */
  getReactionEquation(substrate: MoleculeGroup, nucleophile: MoleculeGroup): string {
    // Try to find leaving group in original substrate (before transformation)
    let leavingGroupIndex = this.findLeavingGroup(substrate);
    let nucleophilicCenterIndex = this.findNucleophilicCenter(nucleophile);
    
    // If we can't find them in current state, try to infer from names
    if (leavingGroupIndex === -1 || nucleophilicCenterIndex === -1) {
      // Check if this is a methyl bromide + hydroxide reaction
      if (substrate.name.includes('Methyl') && substrate.name.includes('bromide')) {
        return 'CH₃Br + OH⁻ → CH₃OH + Br⁻';
      } else if (substrate.name.includes('Methyl') && substrate.name.includes('chloride')) {
        return 'CH₃Cl + OH⁻ → CH₃OH + Cl⁻';
      } else if (nucleophile.name.includes('Hydroxide') || nucleophile.name.includes('OH')) {
        const leavingGroupType = substrate.name.includes('bromide') ? 'Br' : 
                                substrate.name.includes('chloride') ? 'Cl' : 'X';
        return `${substrate.name} + OH⁻ → Product + ${leavingGroupType}⁻`;
      } else {
        return 'SN2 Reaction: Substrate + Nucleophile → Product + Leaving Group';
      }
    }

    const leavingGroupType = substrate.molObject?.atoms[leavingGroupIndex]?.type || 'X';
    const nucleophileType = nucleophile.molObject?.atoms[nucleophilicCenterIndex]?.type || 'Nu';

    // For simple SN2 reactions, provide a more accurate equation
    if (substrate.name.includes('Methyl') && leavingGroupType === 'Br' && nucleophileType === 'O') {
      return 'CH₃Br + OH⁻ → CH₃OH + Br⁻';
    } else if (substrate.name.includes('Methyl') && leavingGroupType === 'Cl' && nucleophileType === 'O') {
      return 'CH₃Cl + OH⁻ → CH₃OH + Cl⁻';
    } else {
      // Generic equation
      return `${substrate.name} + ${nucleophile.name} → Product + ${leavingGroupType}⁻`;
    }
  }

  /**
   * Debug function to print system parameters and current state
   */
  debugSystem(): void {
    console.log('🔍 ===== SN2 REACTION SYSTEM DEBUG =====');
    
    // Get molecules from scene
    const scene = (window as any).scene || (window as any).threeJSBridge?.scene;
    if (!scene) {
      console.log('❌ No scene found for debugging');
      return;
    }
    
    const molecules: any[] = [];
    scene.traverse((child: any) => {
      if (child.userData && child.userData.molecule) {
        molecules.push(child.userData.molecule);
      }
    });
    
    console.log(`📊 Found ${molecules.length} molecules in scene:`);
    
    molecules.forEach((molecule, index) => {
      console.log(`\n🧪 Molecule ${index + 1}: ${molecule.name}`);
      console.log(`   Position: (${molecule.group.position.x.toFixed(2)}, ${molecule.group.position.y.toFixed(2)}, ${molecule.group.position.z.toFixed(2)})`);
      console.log(`   Velocity: (${molecule.velocity.x.toFixed(2)}, ${molecule.velocity.y.toFixed(2)}, ${molecule.velocity.z.toFixed(2)})`);
      console.log(`   Has Physics: ${molecule.hasPhysics || false}`);
      console.log(`   Reaction in Progress: ${molecule.reactionInProgress || false}`);
      
      if (molecule.molObject && molecule.molObject.atoms) {
        console.log(`   Atoms (${molecule.molObject.atoms.length}):`);
        molecule.molObject.atoms.forEach((atom: any, atomIndex: number) => {
          console.log(`     ${atomIndex}: ${atom.type} at (${atom.position.x}, ${atom.position.y}, ${atom.position.z})`);
        });
        
        if (molecule.molObject.bonds) {
          console.log(`   Bonds (${molecule.molObject.bonds.length}):`);
          molecule.molObject.bonds.forEach((bond: any, bondIndex: number) => {
            console.log(`     ${bondIndex}: ${bond[0]}-${bond[1]} (order: ${bond[2]})`);
          });
        }
        
        // Check for leaving groups
        const leavingGroupIndex = this.findLeavingGroup(molecule);
        if (leavingGroupIndex !== -1) {
          const leavingGroup = molecule.molObject.atoms[leavingGroupIndex];
          console.log(`   ✅ Leaving Group Found: ${leavingGroup.type} at index ${leavingGroupIndex}`);
        } else {
          console.log(`   ❌ No leaving group found`);
        }
        
        // Check for nucleophilic centers
        const nucleophilicCenter = this.findNucleophilicCenter(molecule);
        if (nucleophilicCenter !== -1) {
          const nucleophile = molecule.molObject.atoms[nucleophilicCenter];
          console.log(`   ✅ Nucleophilic Center Found: ${nucleophile.type} at index ${nucleophilicCenter}`);
        } else {
          console.log(`   ❌ No nucleophilic center found`);
        }
      } else {
        console.log(`   ❌ No molecular data (molObject)`);
      }
    });
    
    // Test reaction validation if we have 2 molecules
    if (molecules.length >= 2) {
      console.log(`\n🧪 Testing SN2 Reaction Validation:`);
      const substrate = molecules[0];
      const nucleophile = molecules[1];
      
      const isValid = this.validateReactants(substrate, nucleophile);
      console.log(`   Substrate: ${substrate.name}`);
      console.log(`   Nucleophile: ${nucleophile.name}`);
      console.log(`   Valid for SN2: ${isValid ? '✅ YES' : '❌ NO'}`);
      
      if (isValid) {
        const equation = this.getReactionEquation(substrate, nucleophile);
        console.log(`   Reaction Equation: ${equation}`);
      }
    } else {
      console.log(`\n❌ Need at least 2 molecules for SN2 reaction testing`);
    }
    
    console.log('🔍 ===== END SN2 DEBUG =====\n');
  }

  /**
   * Debug function to check graphics rendering issues
   */
  debugGraphics(): void {
    console.log('🎨 ===== GRAPHICS DEBUG =====');
    
    // Get molecules from scene
    const scene = (window as any).scene || (window as any).threeJSBridge?.scene;
    if (!scene) {
      console.log('❌ No scene found for graphics debugging');
      return;
    }
    
    const molecules: any[] = [];
    scene.traverse((child: any) => {
      if (child.userData && child.userData.molecule) {
        molecules.push(child.userData.molecule);
      }
    });
    
    console.log(`🎨 Found ${molecules.length} molecules for graphics debugging:`);
    
    molecules.forEach((molecule, index) => {
      console.log(`\n🎨 Molecule ${index + 1}: ${molecule.name}`);
      console.log(`   Group position: (${molecule.group.position.x.toFixed(2)}, ${molecule.group.position.y.toFixed(2)}, ${molecule.group.position.z.toFixed(2)})`);
      console.log(`   Group visible: ${molecule.group.visible}`);
      console.log(`   Group children count: ${molecule.group.children.length}`);
      
      // Check atom meshes
      const atomMeshes: THREE.Mesh[] = [];
      const bondMeshes: THREE.Mesh[] = [];
      
      molecule.group.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry instanceof THREE.SphereGeometry) {
            atomMeshes.push(child);
          } else if (child.geometry instanceof THREE.CylinderGeometry) {
            bondMeshes.push(child);
          }
        }
      });
      
      console.log(`   Atom meshes: ${atomMeshes.length}`);
      console.log(`   Bond meshes: ${bondMeshes.length}`);
      
      // Check each atom mesh
      atomMeshes.forEach((mesh, meshIndex) => {
        const position = mesh.position;
        const material = mesh.material as THREE.MeshPhongMaterial;
        const color = material ? material.color.getHexString() : 'unknown';
        
        console.log(`     Atom ${meshIndex}: pos(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) color:#${color} visible:${mesh.visible}`);
      });
      
      // Check each bond mesh
      bondMeshes.forEach((mesh, meshIndex) => {
        const position = mesh.position;
        const scale = mesh.scale;
        
        console.log(`     Bond ${meshIndex}: pos(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) scale(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)}) visible:${mesh.visible}`);
      });
      
      // Check if molecule has molecular data
      if (molecule.molObject && molecule.molObject.atoms) {
        console.log(`   Molecular data: ${molecule.molObject.atoms.length} atoms, ${molecule.molObject.bonds?.length || 0} bonds`);
        
        // Check for mismatches between molecular data and meshes
        if (molecule.molObject.atoms.length !== atomMeshes.length) {
          console.log(`   ⚠️ MISMATCH: ${molecule.molObject.atoms.length} atoms in data but ${atomMeshes.length} atom meshes!`);
        }
        
        if ((molecule.molObject.bonds?.length || 0) !== bondMeshes.length) {
          console.log(`   ⚠️ MISMATCH: ${molecule.molObject.bonds?.length || 0} bonds in data but ${bondMeshes.length} bond meshes!`);
        }
      } else {
        console.log(`   ❌ No molecular data found`);
      }
    });
    
    console.log('🎨 ===== END GRAPHICS DEBUG =====\n');
  }

  /**
   * Get all molecules from the scene
   */
  getMoleculesFromScene(): any[] {
    const scene = (window as any).scene || (window as any).threeJSBridge?.scene;
    if (!scene) {
      console.log('❌ No scene found');
      return [];
    }
    
    const molecules: any[] = [];
    scene.traverse((child: any) => {
      if (child.userData && child.userData.molecule) {
        molecules.push(child.userData.molecule);
      }
    });
    
    console.log(`🔍 Found ${molecules.length} molecules in scene:`, molecules.map(m => m.name));
    return molecules;
  }
}

// Export singleton instance
export const sn2ReactionSystem = new SN2ReactionSystem();

import * as THREE from 'three';
import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';
import { reactionGraphics } from '../graphics/reactions';

/**
 * Ultra-Simple SN2 Reaction System
 * Just does the basic reaction: CH3X + OH⁻ → CH3OH + X⁻
 */
export interface SN2ReactionResult {
  success: boolean;
  product: MoleculeGroup | null;
  leavingGroup: MoleculeGroup | null;
}

export class SN2ReactionSystem {
  constructor() {
    log('Simple SN2ReactionSystem initialized');
  }

  /**
   * Execute SN2 reaction: CH3X + OH⁻ → CH3OH + X⁻
   */
  executeReaction(substrate: MoleculeGroup, nucleophile: MoleculeGroup): SN2ReactionResult {
    log(`🧪 Simple SN2: ${substrate.name} + ${nucleophile.name}`);

    try {
      // Step 1: Validate reactants
      if (!this.validateReactants(substrate, nucleophile)) {
        return { success: false, product: null, leavingGroup: null };
      }

      // Step 2: Apply Walden inversion (simple rotation)
      this.applyWaldenInversion(substrate);

      // Step 3: Execute the reaction using simple graphics
      const success = reactionGraphics.executeSN2Reaction(substrate, nucleophile);

      if (success) {
        // Step 4: Create leaving group
        const leavingGroup = this.createSimpleLeavingGroup(substrate);
        
        log('✅ Simple SN2 reaction completed');
        return { 
          success: true, 
          product: substrate, // Substrate becomes the product
          leavingGroup 
        };
      } else {
        log('❌ Simple SN2 reaction failed');
        return { success: false, product: null, leavingGroup: null };
      }
    } catch (error) {
      log(`❌ SN2 reaction error: ${error}`);
      return { success: false, product: null, leavingGroup: null };
    }
  }

  /**
   * Simple validation - just check if molecules exist
   */
  private validateReactants(substrate: MoleculeGroup, nucleophile: MoleculeGroup): boolean {
    if (!substrate || !nucleophile) {
      log('❌ Missing reactants');
      return false;
    }
    if (!substrate.molObject || !nucleophile.molObject) {
      log('❌ Missing molecular data');
      return false;
    }
    log('✅ Reactants validated');
    return true;
  }

  /**
   * Simple Walden inversion - just rotate 180°
   */
  private applyWaldenInversion(substrate: MoleculeGroup): void {
    log('🔄 Applying Walden inversion (180° rotation)');
    // Rotate the visual group
    substrate.group.rotateY(Math.PI);

    // If a physics body exists, sync its orientation so the engine
    // does not "snap back" the group on the next step.
    try {
      const body = (substrate as any).physicsBody;
      if (body && body.quaternion) {
        const q = new THREE.Quaternion();
        substrate.group.getWorldQuaternion(q);
        body.quaternion.set(q.x, q.y, q.z, q.w);
        // Reset angular velocity to prevent immediate un-rotation
        if (body.angularVelocity) {
          body.angularVelocity.set(0, 0, 0);
        }
      }
    } catch {}

    log('✅ Walden inversion applied');
  }

  /**
   * Create simple leaving group
   */
  private createSimpleLeavingGroup(substrate: MoleculeGroup): MoleculeGroup | null {
    log('🧪 Creating simple leaving group');
    
    // Find the leaving group type from the original substrate
    const atoms = substrate.molObject?.atoms || [];
    const leavingGroupType = atoms.find(atom => ['Br', 'Cl', 'I', 'F'].includes(atom.type))?.type;
    
    if (!leavingGroupType) {
      log('❌ No leaving group found');
      return null;
    }

    // Create a simple leaving group molecule
    const leavingGroup: MoleculeGroup = {
      name: `LeavingGroup_${leavingGroupType}_${Date.now()}`,
      position: { x: 0, y: 0, z: 0 },
      group: new THREE.Group(),
      add: () => {},
      getGroup: () => new THREE.Group(),
      velocity: new THREE.Vector3(0, 0, 0),
      radius: 1.0,
      molObject: {
        atoms: [{ type: leavingGroupType, position: { x: '0', y: '0', z: '0' } }],
        bonds: []
      }
    };

    log(`✅ Created ${leavingGroupType}⁻ leaving group`);
    return leavingGroup;
  }

  /**
   * Get reaction equation
   */
  getReactionEquation(substrate: MoleculeGroup, nucleophile: MoleculeGroup): string {
    const substrateName = substrate.name.includes('bromide') ? 'CH₃Br' : 
                         substrate.name.includes('chloride') ? 'CH₃Cl' : 'CH₃X';
    const nucleophileName = nucleophile.name.includes('Hydroxide') ? 'OH⁻' : 'Nu⁻';
    
    return `${substrateName} + ${nucleophileName} → CH₃OH + ${substrateName.includes('bromide') ? 'Br⁻' : 'Cl⁻'}`;
  }
}

// Export singleton instance
export const sn2ReactionSystem = new SN2ReactionSystem();
import * as THREE from 'three';
import { reactionGraphics } from '../graphics/reactions';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';

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
  private runningIntervals: NodeJS.Timeout[] = [];

  constructor() {
    log('Simple SN2ReactionSystem initialized');
  }

  /**
   * Clear all running intervals (useful for reset)
   */
  clearAllIntervals(): void {
    log('🧹 Clearing all running SN2 reaction intervals');
    for (const interval of this.runningIntervals) {
      clearInterval(interval);
    }
    this.runningIntervals = [];
    log('✅ All SN2 reaction intervals cleared');
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

        // Step 5: Pause simulation after reaction to allow user observation
        this.pauseSimulationAfterReaction(substrate, nucleophile);

        log('✅ Simple SN2 reaction completed');
        return {
          success: true,
          product: substrate, // Substrate becomes the product
          leavingGroup,
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
        bonds: [],
      },
    };

    log(`✅ Created ${leavingGroupType}⁻ leaving group`);
    return leavingGroup;
  }

  /**
   * Pause simulation after reaction to allow user observation of products
   */
  private pauseSimulationAfterReaction(substrate: MoleculeGroup, nucleophile: MoleculeGroup): void {
    log('⏸️ Starting post-reaction simulation pause monitoring');

    const SEPARATION_THRESHOLD = 6.0; // Pause when molecules are 6 units apart
    const CHECK_INTERVAL = 100; // Check every 100ms
    const MAX_CHECKS = 30; // Stop checking after 3 seconds (30 * 100ms)

    let checkCount = 0;

    const pauseMonitorInterval = setInterval(() => {
      checkCount++;

      // Stop checking after max time to prevent infinite loops
      if (checkCount >= MAX_CHECKS) {
        log('⏰ Post-reaction pause monitoring timeout - pausing simulation anyway');
        this.pauseSimulationWithMessage();
        this.removeInterval(pauseMonitorInterval);
        return;
      }

      // Check if molecules still exist (they might have been cleared during reset)
      if (!substrate.group || !nucleophile.group) {
        log('⚠️ Molecules no longer exist - stopping pause monitoring');
        this.removeInterval(pauseMonitorInterval);
        return;
      }

      try {
        // Calculate distance between molecules
        const distance = substrate.group.position.distanceTo(nucleophile.group.position);

        // If molecules are far enough apart, pause the simulation
        if (distance >= SEPARATION_THRESHOLD) {
          log(`⏸️ Molecules separated by ${distance.toFixed(2)} units - pausing simulation`);
          this.pauseSimulationWithMessage();
          this.removeInterval(pauseMonitorInterval);
          log('✅ Post-reaction simulation pause completed');
        }
      } catch (error) {
        log(`❌ Error monitoring molecule positions: ${error} - stopping monitoring`);
        this.removeInterval(pauseMonitorInterval);
      }
    }, CHECK_INTERVAL);

    // Track this interval so we can clear it during reset
    this.runningIntervals.push(pauseMonitorInterval);
  }

  /**
   * Remove an interval from tracking and clear it
   */
  private removeInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    const index = this.runningIntervals.indexOf(interval);
    if (index > -1) {
      this.runningIntervals.splice(index, 1);
    }
  }

  /**
   * Pause the physics simulation with a user message
   */
  private pauseSimulationWithMessage(): void {
    try {
      if (physicsEngine) {
        physicsEngine.pause();
        log('⏸️ Physics simulation paused - user can observe reaction products');
        log('💡 Tip: Use the play button to resume simulation');

        // Update UI state to reflect paused state
        this.updateGlobalUIState({ isPlaying: false });
      }
    } catch (error) {
      log(`❌ Failed to pause simulation: ${error}`);
    }
  }

  /**
   * Update global UI state (similar to how reactionDemo updates products display)
   */
  private updateGlobalUIState(updates: any): void {
    try {
      if ((window as any).updateUIState) {
        (window as any).updateUIState(updates);
        log('🔄 Updated global UI state:', updates);
      }
    } catch (error) {
      log(`❌ Failed to update global UI state: ${error}`);
    }
  }

  /**
   * Get reaction equation
   */
  getReactionEquation(substrate: MoleculeGroup, nucleophile: MoleculeGroup): string {
    const substrateName = substrate.name.includes('bromide')
      ? 'CH₃Br'
      : substrate.name.includes('chloride')
        ? 'CH₃Cl'
        : 'CH₃X';
    const nucleophileName = nucleophile.name.includes('Hydroxide') ? 'OH⁻' : 'Nu⁻';

    return `${substrateName} + ${nucleophileName} → CH₃OH + ${substrateName.includes('bromide') ? 'Br⁻' : 'Cl⁻'}`;
  }
}

// Export singleton instance
export const sn2ReactionSystem = new SN2ReactionSystem();

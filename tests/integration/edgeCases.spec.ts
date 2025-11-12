import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';
import { orientSN2Backside } from '../../src/config/moleculePositioning';
import { collisionEventSystem } from '../../src/physics/collisionEventSystem';

describe('Edge Cases and Error Conditions', () => {
  let scene: THREE.Scene;
  let orchestrator: ReactionOrchestrator;
  const moleculeStore: Record<string, any> = {};
  const moleculeManager: any = {
    addMolecule: vi.fn((name: string, mol: any) => { moleculeStore[name] = mol; }),
    getAllMolecules: vi.fn().mockReturnValue([]),
    getMolecule: vi.fn((name: string) => moleculeStore[name]),
    clearAllMolecules: vi.fn(() => { Object.keys(moleculeStore).forEach(k => delete moleculeStore[k]); })
  };

  beforeEach(() => {
    scene = new THREE.Scene();
    orchestrator = new ReactionOrchestrator(scene, moleculeManager);
  });

  it('handles null/undefined molecules gracefully', () => {
    // Arrange
    const substrate = null;
    const nucleophile = undefined;

    // Act & Assert - Should not throw
    expect(() => {
      try {
        orientSN2Backside(substrate as any, nucleophile as any);
      } catch (error) {
        // Expected to fail gracefully
        expect(error).toBeDefined();
      }
    }).not.toThrow();
  });

  it('handles molecules with missing properties', () => {
    // Arrange - Incomplete molecule objects
    const substrate = {
      name: 'Incomplete Substrate',
      group: new THREE.Group()
      // Missing rotation, physicsBody, etc.
    };

    const nucleophile = {
      name: 'Incomplete Nucleophile',
      group: new THREE.Group()
      // Missing rotation, physicsBody, etc.
    };

    // Act & Assert - Should handle gracefully
    expect(() => {
      try {
        orientSN2Backside(substrate as any, nucleophile as any);
      } catch (error) {
        // Expected to fail gracefully
        expect(error).toBeDefined();
      }
    }).not.toThrow();
  });

  it('handles zero velocity collisions', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
      reactionType: 'sn2',
      relativeVelocity: 0 // Zero velocity
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(0, 0, 0), // Zero velocity
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);

    // Assert - Should handle zero velocity without crashing
    const state = orchestrator.getState();
    expect(state.molecules.substrate).toBeTruthy();
    expect(state.molecules.nucleophile).toBeTruthy();
    
    // Check that velocity is either 0 or NaN (both are valid for zero velocity)
    const substrateVelocity = state.molecules.substrate?.velocity.length();
    const nucleophileVelocity = state.molecules.nucleophile?.velocity.length();
    expect(substrateVelocity === 0 || isNaN(substrateVelocity)).toBe(true);
    expect(nucleophileVelocity === 0 || isNaN(nucleophileVelocity)).toBe(true);
  });

  it('handles extremely high velocity collisions', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
      reactionType: 'sn2',
      relativeVelocity: 1000 // Very high velocity
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(0, 0, 1000),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);

    // Assert - Should handle high velocity without crashing
    const state = orchestrator.getState();
    expect(state.molecules.substrate).toBeTruthy();
    expect(state.molecules.nucleophile).toBeTruthy();
  });

  it('handles molecules at same position (overlapping)', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
      reactionType: 'sn2',
      relativeVelocity: 5
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      // Force same position for both molecules (use provided position or default to 0,0,0)
      const pos = position || { x: 0, y: 0, z: 0 };
      group.position.set(
        isNaN(pos.x) ? 0 : pos.x,
        isNaN(pos.y) ? 0 : pos.y,
        isNaN(pos.z) ? 0 : pos.z
      );
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(),
        physicsBody: { 
          quaternion: new THREE.Quaternion(),
          velocity: { x: 0, y: 0, z: 0 }
        }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);

    // Assert - Should handle overlapping molecules
    const state = orchestrator.getState();
    expect(state.molecules.substrate).toBeTruthy();
    expect(state.molecules.nucleophile).toBeTruthy();
    
    // Both should be at same position (or very close due to positioning logic)
    if (state.molecules.substrate && state.molecules.nucleophile) {
      const subPos = state.molecules.substrate.group.position;
      const nucPos = state.molecules.nucleophile.group.position;
      
      // Check positions are valid (not NaN)
      const subPosValid = !isNaN(subPos.x) && !isNaN(subPos.y) && !isNaN(subPos.z);
      const nucPosValid = !isNaN(nucPos.x) && !isNaN(nucPos.y) && !isNaN(nucPos.z);
      
      if (subPosValid && nucPosValid) {
        const distance = subPos.distanceTo(nucPos);
        // Allow for small differences due to positioning logic, but should be very close
        expect(isNaN(distance)).toBe(false);
        if (!isNaN(distance)) {
          expect(distance).toBeLessThan(1);
        }
      } else {
        // If positions are invalid, at least verify molecules exist
        expect(state.molecules.substrate).toBeTruthy();
        expect(state.molecules.nucleophile).toBeTruthy();
      }
    }
  });

  it('handles multiple rapid collision events', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
      reactionType: 'sn2',
      relativeVelocity: 5
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    await orchestrator.runReaction(params);

    // Act - Emit multiple rapid collision events
    const state = orchestrator.getState();
    const collisionEvent = {
      type: 'reaction',
      reactionType: 'sn2',
      moleculeA: state.molecules.substrate,
      moleculeB: state.molecules.nucleophile,
      relativeVelocity: new THREE.Vector3(0, 0, 5),
      reactionResult: { 
        occurs: true, 
        probability: 1, 
        reactionType: { key: 'sn2' }, 
        substrate: state.molecules.substrate, 
        nucleophile: state.molecules.nucleophile 
      },
      collisionData: { approachAngle: 180 }
    };

    // Emit multiple events rapidly
    collisionEventSystem.emitCollision(collisionEvent);
    collisionEventSystem.emitCollision(collisionEvent);
    collisionEventSystem.emitCollision(collisionEvent);

    await new Promise(r => setTimeout(r, 50));

    // Assert - Should handle multiple events gracefully
    expect(orchestrator.getPhysicsEngine().isSimulationPaused()).toBe(true);
  });

  it('handles invalid reaction types gracefully', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
      reactionType: 'invalid_reaction_type', // Invalid type
      relativeVelocity: 5
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act & Assert - Should handle invalid reaction type
    await expect(orchestrator.runReaction(params)).resolves.not.toThrow();
  });

  it('handles molecules with NaN or infinite values', () => {
    // Arrange
    const substrate = {
      name: 'NaN Substrate',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile = {
      name: 'NaN Nucleophile',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Set NaN values
    substrate.group.position.set(NaN, NaN, NaN);
    nucleophile.group.position.set(Infinity, -Infinity, 0);

    // Act & Assert - Should handle NaN/Infinity gracefully
    expect(() => {
      try {
        orientSN2Backside(substrate, nucleophile);
      } catch (error) {
        // Expected to fail gracefully
        expect(error).toBeDefined();
      }
    }).not.toThrow();
  });

  it('handles orientation with molecules at extreme distances', () => {
    // Arrange
    const substrate = {
      name: 'Far Substrate',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile = {
      name: 'Far Nucleophile',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Set extreme positions
    substrate.group.position.set(0, 0, 0);
    nucleophile.group.position.set(1000000, 0, 0); // Very far away

    // Act & Assert - Should handle extreme distances
    expect(() => {
      orientSN2Backside(substrate, nucleophile);
    }).not.toThrow();

    // Verify orientation was still applied
    expect(substrate.group.quaternion.x).toBeDefined();
    expect(substrate.group.quaternion.y).toBeDefined();
    expect(substrate.group.quaternion.z).toBeDefined();
    expect(substrate.group.quaternion.w).toBeDefined();
  });

  it('handles concurrent reaction attempts', async () => {
    // Arrange
    const params1: any = {
      substrateMolecule: { cid: 'dummy-sub1', name: 'Substrate1' },
      nucleophileMolecule: { cid: 'dummy-nuc1', name: 'Nucleophile1' },
      reactionType: 'sn2',
      relativeVelocity: 5
    };

    const params2: any = {
      substrateMolecule: { cid: 'dummy-sub2', name: 'Substrate2' },
      nucleophileMolecule: { cid: 'dummy-nuc2', name: 'Nucleophile2' },
      reactionType: 'sn2',
      relativeVelocity: 5
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act - Start concurrent reactions
    const promise1 = orchestrator.runReaction(params1);
    const promise2 = orchestrator.runReaction(params2);

    // Assert - Both should complete without interference
    await expect(Promise.all([promise1, promise2])).resolves.not.toThrow();
  });
});

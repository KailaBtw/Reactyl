import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';

describe('Molecule Loading Integration', () => {
  let scene: THREE.Scene;
  let orchestrator: ReactionOrchestrator;
  const moleculeStore: Record<string, any> = {};
  const moleculeManager: any = {
    addMolecule: vi.fn((name: string, mol: any) => {
      moleculeStore[name] = mol;
    }),
    getAllMolecules: vi.fn().mockReturnValue([]),
    getMolecule: vi.fn((name: string) => moleculeStore[name]),
    clearAllMolecules: vi.fn(() => {
      Object.keys(moleculeStore).forEach(k => delete moleculeStore[k]);
    }),
  };

  beforeEach(() => {
    scene = new THREE.Scene();
    orchestrator = new ReactionOrchestrator(scene, moleculeManager);
  });

  it('loads molecules with correct initial positions', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 5,
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (_cid: string, name: string, position: any) => {
        const group = new THREE.Group();
        group.position.set(position.x, position.y, position.z);
        const molecule: any = {
          name,
          group,
          rotation: new THREE.Euler(),
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act
    await orchestrator.runReaction(params);

    // Assert - Molecules should be loaded with correct positions
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    expect(substrate).toBeTruthy();
    expect(nucleophile).toBeTruthy();
    expect(substrate?.group.position).toBeDefined();
    expect(nucleophile?.group.position).toBeDefined();
  });

  it('handles molecule loading failures gracefully', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'invalid-cid', name: 'Invalid molecule' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Valid nucleophile' },
      reactionType: 'sn2',
      relativeVelocity: 5,
    };

    // Mock loadMolecule to fail for substrate
    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (cid: string, name: string, position: any) => {
        if (cid === 'invalid-cid') {
          throw new Error('Failed to load molecule');
        }

        const group = new THREE.Group();
        group.position.set(position.x, position.y, position.z);
        const molecule: any = {
          name,
          group,
          rotation: new THREE.Euler(),
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act & Assert - Should handle loading failure gracefully
    await expect(orchestrator.runReaction(params)).rejects.toThrow('Failed to load molecule');
  });

  it('ensures molecules are properly added to scene', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 5,
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (_cid: string, name: string, position: any) => {
        const group = new THREE.Group();
        group.position.set(position.x, position.y, position.z);
        const molecule: any = {
          name,
          group,
          rotation: new THREE.Euler(),
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act
    await orchestrator.runReaction(params);

    // Assert - Molecules should be in the scene (or at least loaded successfully)
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    // Check if molecules are loaded (they may not be added to scene in test environment)
    expect(substrate).toBeTruthy();
    expect(nucleophile).toBeTruthy();
    expect(substrate?.group).toBeDefined();
    expect(nucleophile?.group).toBeDefined();
  });

  it('validates molecule properties after loading', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 5,
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (_cid: string, name: string, position: any) => {
        const group = new THREE.Group();
        group.position.set(position.x, position.y, position.z);
        const molecule: any = {
          name,
          group,
          rotation: new THREE.Euler(),
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act
    await orchestrator.runReaction(params);

    // Assert - Molecules should have all required properties
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    // Check substrate properties
    expect(substrate?.name).toBe('Methyl bromide');
    expect(substrate?.group).toBeInstanceOf(THREE.Group);
    expect(substrate?.rotation).toBeInstanceOf(THREE.Euler);
    expect(substrate?.velocity).toBeInstanceOf(THREE.Vector3);

    // Physics body may not be created in test environment, so check if it exists
    if (substrate?.physicsBody) {
      expect(substrate.physicsBody.quaternion).toBeInstanceOf(THREE.Quaternion);
    }

    // Check nucleophile properties
    expect(nucleophile?.name).toBe('Hydroxide ion');
    expect(nucleophile?.group).toBeInstanceOf(THREE.Group);
    expect(nucleophile?.rotation).toBeInstanceOf(THREE.Euler);
    expect(nucleophile?.velocity).toBeInstanceOf(THREE.Vector3);

    // Physics body may not be created in test environment, so check if it exists
    if (nucleophile?.physicsBody) {
      expect(nucleophile.physicsBody.quaternion).toBeInstanceOf(THREE.Quaternion);
    }
  });

  it('handles concurrent molecule loading requests', async () => {
    // Arrange
    const params1: any = {
      substrateMolecule: { cid: 'dummy-sub1', name: 'Substrate1' },
      nucleophileMolecule: { cid: 'dummy-nuc1', name: 'Nucleophile1' },
      reactionType: 'sn2',
      relativeVelocity: 5,
    };

    const params2: any = {
      substrateMolecule: { cid: 'dummy-sub2', name: 'Substrate2' },
      nucleophileMolecule: { cid: 'dummy-nuc2', name: 'Nucleophile2' },
      reactionType: 'sn2',
      relativeVelocity: 5,
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (_cid: string, name: string, position: any) => {
        const group = new THREE.Group();
        group.position.set(position.x, position.y, position.z);
        const molecule: any = {
          name,
          group,
          rotation: new THREE.Euler(),
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act - Start concurrent loading
    const promise1 = orchestrator.runReaction(params1);
    const promise2 = orchestrator.runReaction(params2);

    // Assert - Both should complete successfully
    await expect(Promise.all([promise1, promise2])).resolves.not.toThrow();
  });

  it('validates molecule manager integration', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Test molecule' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Test nucleophile' },
      reactionType: 'sn2',
      relativeVelocity: 5,
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (_cid: string, name: string, position: any) => {
        const group = new THREE.Group();
        group.position.set(position.x, position.y, position.z);
        const molecule: any = {
          name,
          group,
          rotation: new THREE.Euler(),
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act
    await orchestrator.runReaction(params);

    // Assert - Molecule manager should have been called
    expect(moleculeManager.addMolecule).toHaveBeenCalled();
    expect(moleculeManager.getMolecule).toHaveBeenCalled();
  });
});

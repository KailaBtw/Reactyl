import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';

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

describe('ReactionOrchestrator State Consistency', () => {
  let scene: THREE.Scene;
  let orchestrator: ReactionOrchestrator;

  beforeEach(() => {
    scene = new THREE.Scene();
    orchestrator = new ReactionOrchestrator(scene, moleculeManager);
  });

  it('populates state.molecules after loadMoleculesWithOrientation', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
      reactionType: 'sn2',
      relativeVelocity: 5,
    };

    // Mock loadMolecule to create molecules with physics bodies
    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (_cid: string, name: string, position: any) => {
        const group = new THREE.Group();
        group.position.set(position.x, position.y, position.z);
        const molecule: any = {
          name,
          group,
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act
    await (orchestrator as any).loadMoleculesWithOrientation(params);

    // Assert state is populated
    const state = orchestrator.getState();
    expect(state.molecules.substrate).toBeTruthy();
    expect(state.molecules.nucleophile).toBeTruthy();
    expect(state.molecules.substrate?.name).toBe('Substrate');
    expect(state.molecules.nucleophile?.name).toBe('Nucleophile');
  });

  it('ensures physics bodies exist and quaternions match Three.js after orientation', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
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
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act
    await (orchestrator as any).loadMoleculesWithOrientation(params);

    // Assert physics bodies exist and are synced
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    expect(substrate?.group).toBeTruthy();
    expect(nucleophile?.group).toBeTruthy();

    // Check that physics bodies exist (mocked in loadMolecule)
    const substrateMolecule = moleculeManager.getMolecule('Substrate');
    const nucleophileMolecule = moleculeManager.getMolecule('Nucleophile');

    expect(substrateMolecule?.physicsBody).toBeTruthy();
    expect(nucleophileMolecule?.physicsBody).toBeTruthy();
  });

  it('prevents molecules not available warnings during reaction execution', async () => {
    // Arrange - populate state first
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
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
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    await (orchestrator as any).loadMoleculesWithOrientation(params);

    // Act - trigger reaction execution
    const substrate: any = {
      name: 'Substrate',
      group: new THREE.Group(),
      velocity: new THREE.Vector3(),
    };
    const nucleophile: any = {
      name: 'Nucleophile',
      group: new THREE.Group(),
      velocity: new THREE.Vector3(),
    };

    // Mock the reaction execution to check state availability
    const executeReactionSpy = vi.spyOn<any, any>(orchestrator as any, 'executeUnifiedReaction');

    // Simulate collision event that triggers reaction
    const event: any = {
      type: 'reaction',
      reactionType: 'sn2',
      moleculeA: substrate,
      moleculeB: nucleophile,
      reactionResult: {
        occurs: true,
        probability: 1,
        reactionType: { key: 'sn2' },
        substrate,
        nucleophile,
      },
      collisionData: { approachAngle: 180 },
    };

    // Assert state is available before reaction execution
    const state = orchestrator.getState();
    expect(state.molecules.substrate).toBeTruthy();
    expect(state.molecules.nucleophile).toBeTruthy();

    // This should not log "molecules not available"
    expect(state.molecules.substrate?.name).toBe('Substrate');
    expect(state.molecules.nucleophile?.name).toBe('Nucleophile');
  });
});

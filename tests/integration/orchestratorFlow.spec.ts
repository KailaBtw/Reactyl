import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';
import * as strategies from '../../src/config/molecule/positioning';
import { reactionAnimationManager } from '../../src/animations/ReactionAnimationManager';
import { collisionEventSystem } from '../../src/physics/collisionEventSystem';

// Spy-safe patching for animation manager
vi.mock('../../src/animations/ReactionAnimationManager', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    reactionAnimationManager: {
      ...actual.reactionAnimationManager,
      animateSN2Reaction: vi.fn().mockReturnValue({ run: vi.fn() })
    }
  };
});

const moleculeStore: Record<string, any> = {};
const moleculeManager: any = {
  addMolecule: vi.fn((name: string, mol: any) => { moleculeStore[name] = mol; }),
  getAllMolecules: vi.fn().mockReturnValue([]),
  getMolecule: vi.fn((name: string) => moleculeStore[name]),
  clearAllMolecules: vi.fn(() => { Object.keys(moleculeStore).forEach(k => delete moleculeStore[k]); })
};

describe('ReactionOrchestrator flow', () => {
  let scene: THREE.Scene;
  let orchestrator: ReactionOrchestrator;

  beforeEach(() => {
    scene = new THREE.Scene();
    orchestrator = new ReactionOrchestrator(scene, moleculeManager);
    vi.spyOn(strategies, 'getOrientationStrategy');
  });

  it('orients on start and triggers animation on reaction collision', async () => {
    // Arrange params
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
      reactionType: 'sn2',
      relativeVelocity: 5
    };

    // Mock loadMolecule to avoid network
    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      const molecule: any = { name, group, velocity: new THREE.Vector3(), physicsBody: { quaternion: new THREE.Quaternion() } };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Spy orientation selection
    const getStratSpy = vi.spyOn(strategies, 'getOrientationStrategy');

    // Act
    await orchestrator.runReaction(params);

    // Assert orientation strategy selected
    expect(getStratSpy).toHaveBeenCalledWith('sn2');

    // Emit a synthetic collision reaction to trigger animation
    const sub: any = { name: 'Substrate', group: new THREE.Group(), velocity: new THREE.Vector3(), molecularProperties: { totalMass: 50 } };
    const nuc: any = { name: 'Nucleophile', group: new THREE.Group(), velocity: new THREE.Vector3(), molecularProperties: { totalMass: 17 } };
    collisionEventSystem.emitCollision({
      type: 'reaction',
      reactionType: 'sn2',
      moleculeA: sub,
      moleculeB: nuc,
      relativeVelocity: new THREE.Vector3(0, 0, 5),
      reactionResult: { occurs: true, probability: 1, reactionType: { key: 'sn2' }, substrate: sub, nucleophile: nuc },
      collisionData: { approachAngle: 180 }
    } as any);

    await new Promise(r => setTimeout(r, 10));

    // Assert animation manager called after collision
    const calls = (reactionAnimationManager as any).animateSN2Reaction.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [substrateArg, nucleophileArg] = calls[calls.length - 1];
    expect(substrateArg?.group?.isObject3D).toBe(true);
    expect(nucleophileArg?.group?.isObject3D).toBe(true);
  });
});



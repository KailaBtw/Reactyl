import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';

describe('ReactionOrchestrator - Molecule Loading Retry', () => {
  let orchestrator: any;

  beforeEach(() => {
    (window as any).scene = new THREE.Scene();
    // Minimal mocks for orchestrator dependencies
    orchestrator = new ReactionOrchestrator({
      physicsEngine: (global as any).physicsEngine || {},
      moleculeManager: {
        newMolecule: vi.fn(),
        getMolecule: vi.fn(),
        addMolecule: vi.fn(),
        clearAllMolecules: vi.fn(),
      },
      reactionAnimationManager: {
        animateSN2Reaction: vi.fn(() => ({ run: vi.fn() })),
      },
      collisionEventSystem: { on: vi.fn(), clearAllHandlers: vi.fn() },
    } as any);
  });

  it('retries molecule loading up to maxRetries and throws on failure', async () => {
    const loadSpy = vi
      .spyOn(orchestrator as any, 'loadMolecule')
      .mockRejectedValue(new Error('Network'));

    await expect(
      (orchestrator as any).loadMoleculesWithOrientation({
        reactionType: 'sn2',
        substrateMolecule: { cid: '6323', name: 'Methyl bromide' },
        nucleophileMolecule: { cid: '961', name: 'Hydroxide ion' },
      })
    ).rejects.toThrow();

    // Should attempt multiple times (configured as 3 in code)
    // Implementation may call per-attempt or per-molecule; assert minimum attempts
    expect(loadSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});

import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REACTION_TYPES } from '../../src/chemistry/reactionDatabase';
import { collisionEventSystem } from '../../src/physics/collisionEventSystem';

describe('collisionEventSystem handler management', () => {
  beforeEach(() => {
    collisionEventSystem.clearAllHandlers();
    collisionEventSystem.clearHistory();
  });

  it('registers and clears handlers', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    collisionEventSystem.registerHandler(h1);
    collisionEventSystem.registerHandler(h2);
    expect(collisionEventSystem.getStats().totalHandlers).toBe(2);
    collisionEventSystem.clearAllHandlers();
    expect(collisionEventSystem.getStats().totalHandlers).toBe(0);
  });

  it('still emits handler callbacks for near-static collisions', async () => {
    collisionEventSystem.setReactionType(REACTION_TYPES.sn2);

    const handler = vi.fn();
    collisionEventSystem.registerHandler(handler);

    const moleculeFactory = (name: string) =>
      ({
        name,
        isProduct: false,
        reactionInProgress: false,
        group: {
          position: new THREE.Vector3(),
          quaternion: new THREE.Quaternion(),
        },
        velocity: new THREE.Vector3(),
      }) as any;

    const event = {
      moleculeA: moleculeFactory('molA'),
      moleculeB: moleculeFactory('molB'),
      collisionPoint: new THREE.Vector3(),
      collisionNormal: new THREE.Vector3(1, 0, 0),
      relativeVelocity: new THREE.Vector3(5e-4, 0, 0), // below minRelativeSpeed
      timestamp: performance.now(),
    };

    await collisionEventSystem.emitCollision(event);

    expect(handler).toHaveBeenCalledTimes(1);
    const emittedEvent = handler.mock.calls[0][0];
    expect(emittedEvent.reactionResult?.probability).toBe(0);
    expect(emittedEvent.reactionResult?.occurs).toBe(false);
  });
});

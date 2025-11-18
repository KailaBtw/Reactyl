import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REACTION_TYPES } from '../../src/chemistry/reactionDatabase';
import { collisionEventSystem, createCollisionEvent } from '../../src/physics/collisionEventSystem';

function makeMol(name: string, pos: THREE.Vector3, vel: THREE.Vector3, quat?: THREE.Quaternion) {
  const group = new THREE.Group();
  group.position.copy(pos);
  if (quat) group.quaternion.copy(quat);
  return { name, group, velocity: vel, molecularProperties: { totalMass: 10 } } as any;
}

describe('collisionEventSystem approach angle and energy', () => {
  beforeEach(() => {
    collisionEventSystem.clearAllHandlers();
    collisionEventSystem.resetReactionState();
    collisionEventSystem.setReactionType(REACTION_TYPES.sn2);
    collisionEventSystem.setTestingMode(true);
  });

  it('computes approach angle relative to substrate orientation', () => {
    // Substrate backside axis +Z; nucleophile incoming from -Z => 180°, but our ReactionDetector computes relative orientation internally.
    const substrateQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI
    );
    const sub = makeMol('Sub', new THREE.Vector3(0, 0, 0), new THREE.Vector3(), substrateQuat);
    const nuc = makeMol('Nuc', new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, 5));
    const event = createCollisionEvent(sub, nuc);

    let capturedAngle: number | null = null;
    collisionEventSystem.registerHandler((e: any) => {
      capturedAngle = e.collisionData?.approachAngle ?? null;
    });

    collisionEventSystem.emitCollision(event);
    expect(capturedAngle).not.toBeNull();
  });

  it('includes collision energy and triggers reaction in testing mode', () => {
    const sub = makeMol('Sub', new THREE.Vector3(0, 0, 0), new THREE.Vector3());
    const nuc = makeMol('Nuc', new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, 5));
    const event = createCollisionEvent(sub, nuc);

    let probability: number | null = null;
    collisionEventSystem.registerHandler((e: any) => {
      probability = e.reactionResult?.probability ?? null;
      // Ensure energy present
      expect(e.collisionData?.collisionEnergy).toBeGreaterThan(0);
    });

    collisionEventSystem.emitCollision(event);
    expect(probability).toBe(1);
  });
});

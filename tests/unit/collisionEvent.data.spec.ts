import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createCollisionEvent } from '../../src/physics/collisionEventSystem';

function mol(name: string, pos: THREE.Vector3, vel: THREE.Vector3) {
  return {
    name,
    group: { position: pos },
    velocity: vel,
  } as any;
}

describe('createCollisionEvent data correctness (unit)', () => {
  it('computes midpoint, normal, and relative velocity correctly', () => {
    const a = mol('A', new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
    const b = mol('B', new THREE.Vector3(2, 0, 0), new THREE.Vector3(-1, 0, 0));

    const evt = createCollisionEvent(a, b);

    // midpoint
    expect(evt.collisionPoint.x).toBeCloseTo(1, 6);
    expect(evt.collisionPoint.y).toBeCloseTo(0, 6);
    expect(evt.collisionPoint.z).toBeCloseTo(0, 6);

    // normal points from A -> B
    expect(evt.collisionNormal.x).toBeCloseTo(1, 6);
    expect(evt.collisionNormal.y).toBeCloseTo(0, 6);
    expect(evt.collisionNormal.z).toBeCloseTo(0, 6);

    // relative velocity b - a
    expect(evt.relativeVelocity.x).toBeCloseTo(-2, 6);
    expect(evt.relativeVelocity.y).toBeCloseTo(0, 6);
    expect(evt.relativeVelocity.z).toBeCloseTo(0, 6);
  });
});








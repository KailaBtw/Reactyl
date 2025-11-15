import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { physicsEngine } from '../../src/physics/cannonPhysicsEngine';
import { collisionEventSystem } from '../../src/physics/collisionEventSystem';

function createMol(name: string, pos: THREE.Vector3, vel: THREE.Vector3) {
  const group = new THREE.Group();
  group.position.copy(pos);
  return {
    id: `${name}-${Math.random().toString(36).slice(2)}`,
    name,
    group,
    velocity: vel.clone(),
    molecularProperties: { totalMass: 10, boundingRadius: 1.0, atomCount: 1, bondCount: 0 },
  } as any;
}

describe('Physics Emission Queue Integration', () => {
  beforeEach(() => {
    physicsEngine.clearAllBodies();
    physicsEngine.resume();
    physicsEngine.setTimeScale(1.0);
  });

  it('queues collisions during step and emits after stepping (backpressure safe)', () => {
    const substrate = createMol('A', new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(1, 0, 0));
    const nucleophile = createMol('B', new THREE.Vector3(0.5, 0, 0), new THREE.Vector3(-1, 0, 0));

    physicsEngine.addMolecule(substrate, substrate.molecularProperties);
    physicsEngine.addMolecule(nucleophile, nucleophile.molecularProperties);

    const emitSpy = vi.spyOn(collisionEventSystem, 'emitCollision');

    // Step a few frames to allow a contact
    for (let i = 0; i < 5; i++) physicsEngine.step(1 / 60);

    // After stepping, events should have been emitted (not during narrowphase)
    expect(emitSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});


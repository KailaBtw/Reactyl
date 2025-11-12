import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { physicsEngine } from '../../src/physics/cannonPhysicsEngine';
import { collisionEventSystem } from '../../src/physics/collisionEventSystem';

function mol(name: string, pos: THREE.Vector3, vel: THREE.Vector3) {
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

describe('Collision Physics across varied velocities (integration)', () => {
  beforeEach(() => {
    physicsEngine.clearAllBodies();
    physicsEngine.resume();
    physicsEngine.setTimeScale(1.0);
  });

  it('emits at least one collision event for low relative speed', () => {
    const spy = vi.spyOn(collisionEventSystem, 'emitCollision');
    const a = mol('A', new THREE.Vector3(-0.6, 0, 0), new THREE.Vector3(0.3, 0, 0));
    const b = mol('B', new THREE.Vector3(0.6, 0, 0), new THREE.Vector3(-0.3, 0, 0));
    physicsEngine.addMolecule(a, a.molecularProperties);
    physicsEngine.addMolecule(b, b.molecularProperties);
    for (let i = 0; i < 20; i++) physicsEngine.step(1 / 60);
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('emits collision events for higher relative speed as well', () => {
    const spy = vi.spyOn(collisionEventSystem, 'emitCollision');
    const a = mol('A', new THREE.Vector3(-1.5, 0, 0), new THREE.Vector3(2.0, 0, 0));
    const b = mol('B', new THREE.Vector3(1.5, 0, 0), new THREE.Vector3(-2.0, 0, 0));
    physicsEngine.addMolecule(a, a.molecularProperties);
    physicsEngine.addMolecule(b, b.molecularProperties);
    for (let i = 0; i < 20; i++) physicsEngine.step(1 / 60);
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});













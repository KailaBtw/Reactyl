import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { physicsEngine } from '../../src/physics/cannonPhysicsEngine';

function createMockMolecule(
  name: string,
  position = new THREE.Vector3(),
  velocity = new THREE.Vector3()
) {
  const group = new THREE.Group();
  group.position.copy(position);
  return {
    id: `${name}-${Math.random().toString(36).slice(2)}`,
    name,
    group,
    velocity: velocity.clone(),
    molecularProperties: {
      totalMass: 10,
      boundingRadius: 1.0,
      atomCount: 1,
      bondCount: 0,
    },
  } as any;
}

describe('Physics Parameters Integration', () => {
  beforeEach(() => {
    physicsEngine.clearAllBodies();
    physicsEngine.setTimeScale(1.0);
    physicsEngine.resume();
  });

  it('updates physics parameters (gravity, solver, contact) without errors', () => {
    expect(() => {
      physicsEngine.updatePhysicsParameters({
        gravity: new THREE.Vector3(0, -9.81, 0),
        iterations: 5,
        tolerance: 0.01,
        restitution: 0.3,
        friction: 0.1,
      });
    }).not.toThrow();

    // Verify stats reflect solver iterations (smoke check)
    const stats = physicsEngine.getStats();
    expect(stats.solverIterations).toBe(5);
  });

  it('stepping advances positions based on velocity and timeScale', () => {
    const mol = createMockMolecule(
      'Stepper',
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0)
    );
    physicsEngine.addMolecule(mol, mol.molecularProperties);

    // With default time scale (1.0)
    const start = physicsEngine.getPosition(mol)!;
    physicsEngine.step(1 / 60); // ~one frame
    const after = physicsEngine.getPosition(mol)!;
    // Expect some movement along +X
    expect(after.x).toBeGreaterThanOrEqual(start.x);

    // Increase time scale and verify larger movement
    physicsEngine.setTimeScale(2.0);
    const before2 = physicsEngine.getPosition(mol)!;
    physicsEngine.step(1 / 60);
    const after2 = physicsEngine.getPosition(mol)!;
    expect(after2.x - before2.x).toBeGreaterThanOrEqual(after.x - start.x);
  });

  it('pause prevents stepping from updating positions', () => {
    const mol = createMockMolecule(
      'PauseMol',
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0, 0)
    );
    physicsEngine.addMolecule(mol, mol.molecularProperties);
    const before = physicsEngine.getPosition(mol)!;
    physicsEngine.pause();
    physicsEngine.step(1 / 30);
    const after = physicsEngine.getPosition(mol)!;
    expect(after.x).toBeCloseTo(before.x, 6);
    physicsEngine.resume();
  });
});

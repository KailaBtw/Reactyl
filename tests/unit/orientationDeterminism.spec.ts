import { describe, it, expect } from 'vitest';
import * as THREE from 'three';

function quatAlmostEqual(a: THREE.Quaternion, b: THREE.Quaternion, eps = 1e-7): boolean {
  return (
    Math.abs(a.x - b.x) < eps &&
    Math.abs(a.y - b.y) < eps &&
    Math.abs(a.z - b.z) < eps &&
    Math.abs(a.w - b.w) < eps
  );
}

describe('Object3D.lookAt determinism', () => {
  it('produces identical quaternions for identical inputs', () => {
    const N = 25;
    const parent = new THREE.Group();
    // Fix parent transform to identity to avoid world-space discrepancies
    parent.quaternion.set(0, 0, 0, 1);
    parent.position.set(0, 0, 0);

    const substrate = new THREE.Group();
    substrate.position.set(1.234, -0.5, 3.21);
    parent.add(substrate);

    const quats: THREE.Quaternion[] = [];
    for (let i = 0; i < N; i++) {
      const nuc = new THREE.Group();
      nuc.up.set(0, 1, 0);
      nuc.quaternion.set(0, 0, 0, 1);
      nuc.position.set(-2.5, 0.75, -4.0); // identical start
      parent.add(nuc);

      // Deterministic orientation
      nuc.lookAt(substrate.position);
      quats.push(nuc.quaternion.clone());

      parent.remove(nuc);
    }

    // Compare all quaternions against the first one
    for (let i = 1; i < quats.length; i++) {
      expect(quatAlmostEqual(quats[0], quats[i])).toBe(true);
    }
  });

  it('is stable if up vector and parent transform are identical', () => {
    const parentA = new THREE.Group();
    const parentB = new THREE.Group();
    // Identical parents
    parentA.position.set(0, 0, 0);
    parentA.quaternion.set(0, 0, 0, 1);
    parentB.position.set(0, 0, 0);
    parentB.quaternion.set(0, 0, 0, 1);

    const targetA = new THREE.Group();
    const targetB = new THREE.Group();
    targetA.position.set(0.25, 2.0, -1.0);
    targetB.position.copy(targetA.position);
    parentA.add(targetA);
    parentB.add(targetB);

    const a = new THREE.Group();
    const b = new THREE.Group();
    a.up.set(0, 1, 0);
    b.up.set(0, 1, 0);
    a.position.set(-1, 0, 0);
    b.position.copy(a.position);
    parentA.add(a);
    parentB.add(b);

    a.lookAt(targetA.position);
    b.lookAt(targetB.position);

    expect(quatAlmostEqual(a.quaternion, b.quaternion)).toBe(true);
  });
});



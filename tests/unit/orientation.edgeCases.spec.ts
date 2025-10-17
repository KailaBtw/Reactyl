import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { orientSN2Backside } from '../../src/config/moleculePositioning';

function molecule(name: string) {
  return {
    name,
    group: new THREE.Group(),
    rotation: new THREE.Euler(),
    physicsBody: { quaternion: new THREE.Quaternion() }
  } as any;
}

describe('Orientation Strategies - Edge Cases', () => {
  it('idempotence: applying orientSN2Backside twice should not drift quaternion', () => {
    const s = molecule('Substrate');
    const n = molecule('Nucleophile');
    n.group.position.set(0, 0, -5);

    orientSN2Backside(s, n);
    const q1 = s.group.quaternion.clone();
    const nq1 = n.group.quaternion.clone();
    orientSN2Backside(s, n);
    const q2 = s.group.quaternion.clone();
    const nq2 = n.group.quaternion.clone();

    expect(q2.equals(q1)).toBe(true);
    expect(nq2.equals(nq1)).toBe(true);
  });

  it('quaternion sync: physicsBody quaternion matches Three.js group quaternion', () => {
    const s = molecule('Substrate');
    const n = molecule('Nucleophile');
    n.group.position.set(0, 0, -5);

    orientSN2Backside(s, n);

    expect(s.physicsBody.quaternion.equals(s.group.quaternion)).toBe(true);
    expect(n.physicsBody.quaternion.equals(n.group.quaternion)).toBe(true);
  });

  it('alignment: nucleophile orientation changes and is perpendicular to substrate vector (backside setup)', () => {
    const s = molecule('Substrate');
    const n = molecule('Nucleophile');
    n.group.position.set(0, 0, -5);

    const forwardBefore = new THREE.Vector3(0, 0, -1).applyQuaternion(n.group.quaternion);
    orientSN2Backside(s, n);
    const forwardAfter = new THREE.Vector3(0, 0, -1).applyQuaternion(n.group.quaternion);

    // After orientation, strategy applies a +90° yaw; expect perpendicular relation
    const toSubstrate = new THREE.Vector3().subVectors(s.group.position, n.group.position).normalize();
    const dot = forwardAfter.dot(toSubstrate);
    expect(Math.abs(dot)).toBeLessThan(0.2); // roughly perpendicular
    expect(forwardAfter.equals(forwardBefore)).toBe(false);
  });
});



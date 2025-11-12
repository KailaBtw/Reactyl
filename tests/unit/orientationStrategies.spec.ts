import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { getOrientationStrategy, orientSN2Backside } from '../../src/config/moleculePositioning';

function createMockMolecule(name: string) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(0, 0, 0);
  group.rotation.set(0, 0, 0);
  group.updateMatrixWorld();

  const molecule: any = {
    name,
    group,
    rotation: group.rotation.clone(),
    quaternion: group.quaternion.clone(),
    physicsBody: {
      quaternion: new THREE.Quaternion(),
    },
  };

  return molecule;
}

describe('orientSN2Backside', () => {
  let substrate: any;
  let nucleophile: any;

  beforeEach(() => {
    substrate = createMockMolecule('Substrate');
    nucleophile = createMockMolecule('Nucleophile');
    nucleophile.group.position.set(0, 0, -5);
  });

  it('rotates substrate +90° around Y and aligns nucleophile', () => {
    const initialSubstrateQuat = substrate.group.quaternion.clone();
    orientSN2Backside(substrate, nucleophile);

    // Substrate: +90° around Y => quaternion should differ from initial
    expect(substrate.group.quaternion.equals(initialSubstrateQuat)).toBe(false);

    // Physics quaternions should match Three.js quaternions
    expect(substrate.physicsBody.quaternion.equals(substrate.group.quaternion)).toBe(true);
    expect(nucleophile.physicsBody.quaternion.equals(nucleophile.group.quaternion)).toBe(true);
  });

  it('ensures getOrientationStrategy("sn2") returns backside strategy', () => {
    const strat = getOrientationStrategy('sn2');
    // Apply and ensure it changes the substrate quaternion from identity
    const initial = substrate.group.quaternion.clone();
    strat(substrate, nucleophile);
    expect(substrate.group.quaternion.equals(initial)).toBe(false);
  });

  it('keeps Euler and quaternion in sync after copy()', () => {
    orientSN2Backside(substrate, nucleophile);
    // After orientation, the euler rotation copied from group should match group rotation
    expect(substrate.rotation.x).toBeCloseTo(substrate.group.rotation.x, 6);
    expect(nucleophile.rotation.y).toBeCloseTo(nucleophile.group.rotation.y, 6);
  });
});

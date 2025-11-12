import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { physicsEngine } from '../../src/physics/cannonPhysicsEngine';

function createMol(name: string) {
  const group = new THREE.Group();
  return {
    id: `${name}-${Math.random().toString(36).slice(2)}`,
    name,
    group,
    velocity: new THREE.Vector3(),
    molecularProperties: { totalMass: 10, boundingRadius: 1.0, atomCount: 1, bondCount: 0 },
  } as any;
}

describe('physicsEngine orientation accessors (unit)', () => {
  beforeEach(() => {
    physicsEngine.clearAllBodies();
  });

  it('setOrientation/getOrientation roundtrip works when body exists', () => {
    const mol = createMol('Ori');
    physicsEngine.addMolecule(mol, mol.molecularProperties);

    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 3);
    physicsEngine.setOrientation(mol, q);

    const out = physicsEngine.getOrientation(mol);
    expect(out).not.toBeNull();
    expect(out?.x).toBeCloseTo(q.x, 6);
    expect(out?.y).toBeCloseTo(q.y, 6);
    expect(out?.z).toBeCloseTo(q.z, 6);
    expect(out?.w).toBeCloseTo(q.w, 6);
  });

  it('getOrientation returns null when body missing', () => {
    const mol = createMol('NoBody');
    expect(physicsEngine.getOrientation(mol)).toBeNull();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { physicsEngine } from '../../src/physics/cannonPhysicsEngine';

// Minimal MoleculeGroup mock compatible with physicsEngine
function createMockMolecule(name: string, position = new THREE.Vector3(), velocity = new THREE.Vector3()) {
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

describe('Physics Engine Controls (unit)', () => {
  beforeEach(() => {
    physicsEngine.clearAllBodies();
    physicsEngine.setTimeScale(1.0);
    physicsEngine.resume();
  });

  it('pauses and resumes simulation', () => {
    expect(physicsEngine.isSimulationPaused()).toBe(false);
    physicsEngine.pause();
    expect(physicsEngine.isSimulationPaused()).toBe(true);
    physicsEngine.resume();
    expect(physicsEngine.isSimulationPaused()).toBe(false);
  });

  it('sets and gets time scale (clamped to non-negative)', () => {
    physicsEngine.setTimeScale(0.5);
    expect(physicsEngine.getTimeScale()).toBeCloseTo(0.5, 6);
    physicsEngine.setTimeScale(-2);
    expect(physicsEngine.getTimeScale()).toBeGreaterThanOrEqual(0);
  });

  it('set/get position works only when body exists', () => {
    const mol = createMockMolecule('TestMol', new THREE.Vector3(1, 2, 3));
    // Before adding body
    expect(physicsEngine.getPosition(mol)).toBeNull();
    // Add body and verify
    const added = physicsEngine.addMolecule(mol, mol.molecularProperties);
    expect(added).toBe(true);
    const p = physicsEngine.getPosition(mol);
    expect(p).not.toBeNull();
    if (p) {
      expect(p.x).toBeCloseTo(1, 6);
      expect(p.y).toBeCloseTo(2, 6);
      expect(p.z).toBeCloseTo(3, 6);
    }
    // Set new position
    physicsEngine.setPosition(mol, new THREE.Vector3(4, 5, 6));
    const p2 = physicsEngine.getPosition(mol);
    expect(p2?.x).toBeCloseTo(4, 6);
    expect(p2?.y).toBeCloseTo(5, 6);
    expect(p2?.z).toBeCloseTo(6, 6);
  });

  it('set/get velocity works only when body exists', () => {
    const mol = createMockMolecule('VelMol');
    expect(physicsEngine.getVelocity(mol)).toBeNull();
    physicsEngine.addMolecule(mol, mol.molecularProperties);
    physicsEngine.setVelocity(mol, new THREE.Vector3(2, 0, -1));
    const v = physicsEngine.getVelocity(mol);
    expect(v?.x).toBeCloseTo(2, 6);
    expect(v?.y).toBeCloseTo(0, 6);
    expect(v?.z).toBeCloseTo(-1, 6);
  });

  it('set/get orientation works only when body exists', () => {
    const mol = createMockMolecule('OriMol');
    expect(physicsEngine.getOrientation(mol)).toBeNull();
    physicsEngine.addMolecule(mol, mol.molecularProperties);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    physicsEngine.setOrientation(mol, q);
    const q2 = physicsEngine.getOrientation(mol);
    expect(q2?.x).toBeCloseTo(q.x, 6);
    expect(q2?.y).toBeCloseTo(q.y, 6);
    expect(q2?.z).toBeCloseTo(q.z, 6);
    expect(q2?.w).toBeCloseTo(q.w, 6);
  });
});









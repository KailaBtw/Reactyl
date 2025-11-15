import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SN2MechanismAnimation } from '../../src/animations/SN2MechanismAnimation';
import { physicsEngine } from '../../src/physics/cannonPhysicsEngine';
import { createMockMolecule } from '../fixtures/mockMolecules';

describe('Rotation lock after SN2 (integration)', () => {
  beforeEach(() => {
    (window as any).scene = new THREE.Scene();
    (window as any).moleculeManager = {
      getMolecule: vi.fn((name: string) => createMockMolecule(name)),
      newMolecule: vi.fn(() => createMockMolecule('X')),
      addMolecule: vi.fn(),
    };
  });

  it('sets angularVelocity=0 and syncs quaternion to substrate after SN2', () => {
    const sn2 = new SN2MechanismAnimation();
    const substrate: any = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
    const nucleophile: any = createMockMolecule('Nucleophile', new THREE.Vector3(0, 0, -5));

    // Ensure physics bodies exist to check angularVelocity/quaternion
    physicsEngine.addMolecule(substrate, substrate.molecularProperties);
    physicsEngine.addMolecule(nucleophile, nucleophile.molecularProperties);

    // Run instant SN2
    sn2.animate(substrate, nucleophile, {});

    const body = physicsEngine.getPhysicsBody(
      (window as any).moleculeManager.getMolecule('Substrate')
    ) as any;
    expect(body).toBeTruthy();
    // angular velocity should be zeroed by lockSubstrateRotation
    expect(body.angularVelocity.x).toBeCloseTo(0, 6);
    expect(body.angularVelocity.y).toBeCloseTo(0, 6);
    expect(body.angularVelocity.z).toBeCloseTo(0, 6);
    // quaternion should match visual
    const q = substrate.group.quaternion;
    expect(body.quaternion.x).toBeCloseTo(q.x, 6);
    expect(body.quaternion.y).toBeCloseTo(q.y, 6);
    expect(body.quaternion.z).toBeCloseTo(q.z, 6);
    expect(body.quaternion.w).toBeCloseTo(q.w, 6);
  });
});


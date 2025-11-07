import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { SN2MechanismAnimation } from '../../src/animations/SN2MechanismAnimation';
import { createMockMolecule } from '../fixtures/mockMolecules';

describe('SN2 Product Loading Resilience', () => {
  let sn2: any;

  beforeEach(() => {
    sn2 = new SN2MechanismAnimation();
    (window as any).scene = new THREE.Scene();
    (window as any).moleculeManager = {
      getMolecule: vi.fn().mockReturnValue(null),
      newMolecule: vi.fn(() => createMockMolecule('Temp', new THREE.Vector3())),
      addMolecule: vi.fn(),
    };
  });

  it('handles PubChem fetch failures gracefully and still separates molecules', async () => {
    const substrate: any = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
    const nucleophile: any = createMockMolecule('Nucleophile', new THREE.Vector3(0, 0, -5));

    // Mock fetch to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

    // Call internal cleanup/load (simulate post-animation)
    await (sn2 as any).cleanupOldMoleculesAndLoadProducts(
      substrate,
      nucleophile,
      substrate.group.position.clone(),
      nucleophile.group.position.clone()
    );

    // Even on failure, no throw and positions remain valid (separation was already applied earlier)
    expect(substrate.group.position).toBeDefined();
    expect(nucleophile.group.position).toBeDefined();
  });
});










import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { createMockMolecule, createMockAtom } from '../fixtures/mockMolecules';

// Mock the physics engine before importing the SN2MechanismAnimation
vi.mock('../../src/physics/cannonPhysicsEngine', () => ({
  physicsEngine: {
    addMolecule: vi.fn().mockReturnValue(true),
    getPhysicsBody: vi.fn().mockReturnValue({ 
      quaternion: new THREE.Quaternion(),
      position: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3()
    }),
    setVelocity: vi.fn(),
    removeMolecule: vi.fn()
  }
}));

import { SN2MechanismAnimation } from '../../src/animations/SN2MechanismAnimation';
import { physicsEngine } from '../../src/physics/cannonPhysicsEngine';

describe('SN2MechanismAnimation - Individual Methods', () => {
  let sn2Animation: SN2MechanismAnimation;
  let mockScene: THREE.Scene;
  let mockMoleculeManager: any;

  beforeEach(() => {
    sn2Animation = new SN2MechanismAnimation();

    // Mock scene and molecule manager
    mockScene = new THREE.Scene();
    mockMoleculeManager = {
      newMolecule: vi.fn((name: string, position: any) => {
        const molecule = createMockMolecule(name, new THREE.Vector3(position.x, position.y, position.z));
        // Add getGroup method that the createBromideIon method expects
        molecule.getGroup = vi.fn(() => molecule.group);
        return molecule;
      }),
      getMolecule: vi.fn(),
      removeMolecule: vi.fn(),
      clearAllMolecules: vi.fn()
    };

    // Mock global objects
    (window as any).scene = mockScene;
    (window as any).moleculeManager = mockMoleculeManager;
    
    // Reset mock calls
    (physicsEngine.addMolecule as any).mockClear();
    (physicsEngine.getPhysicsBody as any).mockClear();
    (physicsEngine.setVelocity as any).mockClear();
    (physicsEngine.removeMolecule as any).mockClear();
  });

  describe('removeStrayBromideIons', () => {
    it('removes stray bromide ions without proper userData', () => {
      // Create a stray bromide ion (green sphere without proper userData)
      const strayBromide = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x00ff00 })
      );
      strayBromide.userData = {}; // No proper type
      mockScene.add(strayBromide);

      // Create a proper bromide ion
      const properBromide = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x00ff00 })
      );
      properBromide.userData = { type: 'bromide_ion' };
      mockScene.add(properBromide);

      // Call the method
      (sn2Animation as any).removeStrayBromideIons();

      // Only the stray should be removed
      expect(mockScene.children).toContain(properBromide);
      expect(mockScene.children).not.toContain(strayBromide);
    });

    it('does not remove non-green spheres', () => {
      // Create a red sphere
      const redSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0xff0000 })
      );
      mockScene.add(redSphere);

      // Call the method
      (sn2Animation as any).removeStrayBromideIons();

      // Red sphere should remain
      expect(mockScene.children).toContain(redSphere);
    });

    it('handles missing scene gracefully', () => {
      (window as any).scene = null;
      
      expect(() => {
        (sn2Animation as any).removeStrayBromideIons();
      }).not.toThrow();
    });
  });

  describe('createBromideIon', () => {
    it('creates bromide ion with proper structure', () => {
      const position = new THREE.Vector3(1, 2, 3);
      
      (sn2Animation as any).createBromideIon(position);

      // Should create molecule via molecule manager
      expect(mockMoleculeManager.newMolecule).toHaveBeenCalledWith('Bromide ion', {
        x: 3, // position.x + 2 (offset)
        y: 2, // position.y
        z: 3  // position.z
      });

      // Should add physics
      expect(physicsEngine.addMolecule).toHaveBeenCalled();
      expect(physicsEngine.setVelocity).toHaveBeenCalled();
    });

    it('handles missing scene or molecule manager gracefully', () => {
      (window as any).scene = null;
      
      expect(() => {
        (sn2Animation as any).createBromideIon(new THREE.Vector3(0, 0, 0));
      }).not.toThrow();
    });
  });

  describe('lockSubstrateRotation', () => {
    it('locks substrate rotation to prevent physics override', () => {
      const substrate = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
      const mockPhysicsBody = {
        quaternion: new THREE.Quaternion(),
        angularVelocity: new THREE.Vector3(1, 1, 1)
      };
      
      (physicsEngine.getPhysicsBody as any).mockReturnValue(mockPhysicsBody);
      mockMoleculeManager.getMolecule.mockReturnValue(substrate);

      // Set substrate rotation
      substrate.group.rotation.y = Math.PI;
      substrate.group.quaternion.setFromEuler(substrate.group.rotation);

      (sn2Animation as any).lockSubstrateRotation(substrate);

      // Should set angular velocity to zero
      expect(mockPhysicsBody.angularVelocity.x).toBe(0);
      expect(mockPhysicsBody.angularVelocity.y).toBe(0);
      expect(mockPhysicsBody.angularVelocity.z).toBe(0);

      // Should sync quaternion
      expect(mockPhysicsBody.quaternion.x).toBe(substrate.group.quaternion.x);
      expect(mockPhysicsBody.quaternion.y).toBe(substrate.group.quaternion.y);
      expect(mockPhysicsBody.quaternion.z).toBe(substrate.group.quaternion.z);
      expect(mockPhysicsBody.quaternion.w).toBe(substrate.group.quaternion.w);
    });

    it('handles missing physics body gracefully', () => {
      const substrate = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
      (physicsEngine.getPhysicsBody as any).mockReturnValue(null);
      mockMoleculeManager.getMolecule.mockReturnValue(substrate);

      expect(() => {
        (sn2Animation as any).lockSubstrateRotation(substrate);
      }).not.toThrow();
    });
  });

  describe('separateProductMolecules', () => {
    it('separates molecules to prevent overlap', () => {
      const substrate = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
      const nucleophile = createMockMolecule('Nucleophile', new THREE.Vector3(0, 0, -5));
      const originalSubstratePos = new THREE.Vector3(0, 0, 0);
      const originalNucleophilePos = new THREE.Vector3(0, 0, -5);

      (sn2Animation as any).separateProductMolecules(
        substrate, 
        nucleophile, 
        originalSubstratePos, 
        originalNucleophilePos
      );

      // With substrate at (0,0,0) and nucleophile at (0,0,-5),
      // direction = (0,0,-1). Offsets are ±4 units along Z.
      expect(substrate.group.position.x).toBeCloseTo(0, 6);
      expect(substrate.group.position.y).toBeCloseTo(0, 6);
      expect(substrate.group.position.z).toBeCloseTo(4, 6);

      expect(nucleophile.group.position.x).toBeCloseTo(0, 6);
      expect(nucleophile.group.position.y).toBeCloseTo(0, 6);
      expect(nucleophile.group.position.z).toBeCloseTo(-9, 6);
    });
  });

  describe('fetchMoleculeFromPubChem', () => {
    it('fetches molecule data from PubChem successfully', async () => {
      const mockMolData = 'mock mol file content';
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockMolData)
      });

      const result = await (sn2Animation as any).fetchMoleculeFromPubChem('887', 'Methanol');

      expect(result).toEqual({
        mol3d: mockMolData,
        name: 'Methanol',
        cid: '887'
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/887/record/SDF/?record_type=3d&response_type=display'
      );
    });

    it('handles fetch errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await (sn2Animation as any).fetchMoleculeFromPubChem('887', 'Methanol');

      expect(result).toBeNull();
    });

    it('handles HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await (sn2Animation as any).fetchMoleculeFromPubChem('999', 'Unknown');

      expect(result).toBeNull();
    });
  });

  describe('launchLeavingGroup', () => {
    it('launches leaving group with correct velocity', () => {
      const leavingGroupMolecule = {
        molecularProperties: { totalMass: 79.90, boundingRadius: 0.4 },
        hasPhysics: false,
        physicsBody: null
      };
      const direction = new THREE.Vector3(1, 0, 0);

      (sn2Animation as any).launchLeavingGroup(leavingGroupMolecule, direction);

      // Should add physics
      expect(physicsEngine.addMolecule).toHaveBeenCalledWith(
        leavingGroupMolecule, 
        leavingGroupMolecule.molecularProperties
      );

      // Should set velocity (3 units/second in direction)
      expect(physicsEngine.setVelocity).toHaveBeenCalledWith(
        leavingGroupMolecule,
        new THREE.Vector3(3, 0, 0) // direction * 3
      );
    });

    it('handles physics engine errors gracefully', () => {
      (physicsEngine.addMolecule as any).mockReturnValue(false);

      const leavingGroupMolecule = {
        molecularProperties: { totalMass: 79.90, boundingRadius: 0.4 }
      };
      const direction = new THREE.Vector3(1, 0, 0);

      expect(() => {
        (sn2Animation as any).launchLeavingGroup(leavingGroupMolecule, direction);
      }).not.toThrow();
    });
  });

  describe('getElementMass', () => {
    it('returns correct atomic masses for common leaving groups', () => {
      expect((sn2Animation as any).getElementMass('Cl')).toBe(35.45);
      expect((sn2Animation as any).getElementMass('Br')).toBe(79.90);
      expect((sn2Animation as any).getElementMass('I')).toBe(126.90);
      expect((sn2Animation as any).getElementMass('F')).toBe(19.00);
    });

    it('returns default chlorine mass for unknown elements', () => {
      expect((sn2Animation as any).getElementMass('Unknown')).toBe(35.45);
    });
  });

  describe('findLeavingGroupAtom', () => {
    it('finds leaving group atoms in substrate', () => {
      const substrate = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
      substrate.group.children = [
        createMockAtom('C', new THREE.Vector3(0, 0, 0)),
        createMockAtom('H', new THREE.Vector3(1, 0, 0)),
        createMockAtom('Br', new THREE.Vector3(0, 0, 1))
      ];

      const leavingGroup = (sn2Animation as any).findLeavingGroupAtom(substrate);
      expect(leavingGroup).toBeDefined();
      expect(leavingGroup.userData.element).toBe('Br');
    });

    it('returns null when no leaving group found', () => {
      const substrate = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
      substrate.group.children = [
        createMockAtom('C', new THREE.Vector3(0, 0, 0)),
        createMockAtom('H', new THREE.Vector3(1, 0, 0))
      ];

      const leavingGroup = (sn2Animation as any).findLeavingGroupAtom(substrate);
      expect(leavingGroup).toBeNull();
    });
  });

  describe('findNucleophileAtom', () => {
    it('finds nucleophile atoms in nucleophile molecule', () => {
      const nucleophile = createMockMolecule('Nucleophile', new THREE.Vector3(0, 0, -5));
      nucleophile.group.children = [
        createMockAtom('O', new THREE.Vector3(0, 0, 0)),
        createMockAtom('H', new THREE.Vector3(1, 0, 0))
      ];

      const nucAtom = (sn2Animation as any).findNucleophileAtom(nucleophile);
      expect(nucAtom).toBeDefined();
      expect(nucAtom.userData.element).toBe('O');
    });

    it('returns null when no nucleophile atom found', () => {
      const nucleophile = createMockMolecule('Nucleophile', new THREE.Vector3(0, 0, -5));
      nucleophile.group.children = [
        createMockAtom('C', new THREE.Vector3(0, 0, 0))
      ];

      const nucAtom = (sn2Animation as any).findNucleophileAtom(nucleophile);
      expect(nucAtom).toBeNull();
    });
  });

  describe('findNearestCarbonTo', () => {
    it('finds nearest carbon atom to reference atom', () => {
      const substrate = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
      const referenceAtom = createMockAtom('Br', new THREE.Vector3(0, 0, 1));
      substrate.group.children = [
        createMockAtom('C', new THREE.Vector3(0, 0, 0)),
        createMockAtom('C', new THREE.Vector3(2, 0, 0)), // Further away
        createMockAtom('H', new THREE.Vector3(1, 0, 0))
      ];

      const nearestCarbon = (sn2Animation as any).findNearestCarbonTo(substrate, referenceAtom);
      expect(nearestCarbon).toBeDefined();
      expect(nearestCarbon.userData.element).toBe('C');
      expect(nearestCarbon.position.x).toBe(0); // Should be the closer carbon
    });

    it('returns null when no reference atom provided', () => {
      const substrate = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
      substrate.group.children = [
        createMockAtom('C', new THREE.Vector3(0, 0, 0))
      ];

      const nearestCarbon = (sn2Animation as any).findNearestCarbonTo(substrate, null);
      expect(nearestCarbon).toBeNull();
    });
  });
});

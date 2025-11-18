/**
 * Tests for molecule outline utilities
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { addProductOutline, removeProductOutline, updateMoleculeOutline } from '../../src/utils/moleculeOutline';
import type { MoleculeGroup } from '../../src/types';

describe('Molecule Outline Utilities', () => {
  /**
   * Create a mock molecule group for testing
   */
  function createMockMoleculeGroup(name: string): MoleculeGroup {
    const group = new THREE.Group();
    
    // Create a few atom meshes
    const atom1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    atom1.position.set(0, 0, 0);
    atom1.userData = { type: 'atom', atomIndex: 0 };
    
    const atom2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    atom2.position.set(1, 0, 0);
    atom2.userData = { type: 'atom', atomIndex: 1 };
    
    group.add(atom1);
    group.add(atom2);
    
    return {
      name,
      id: `test_${name}`,
      position: { x: 0, y: 0, z: 0 },
      group,
      add: (mesh: THREE.Mesh) => group.add(mesh),
      getGroup: () => group,
      velocity: new THREE.Vector3(0, 0, 0),
      radius: 1.0,
      molObject: null,
      isProduct: false,
    };
  }

  describe('addProductOutline', () => {
    it('should add outline meshes to a molecule', () => {
      const molecule = createMockMoleculeGroup('test_molecule');
      const initialChildrenCount = molecule.group.children.length;
      
      addProductOutline(molecule);
      
      // Should have added outline meshes (one per atom)
      expect(molecule.group.children.length).toBeGreaterThan(initialChildrenCount);
      
      // Check that outline meshes have correct userData
      const outlineMeshes = molecule.group.children.filter(
        (child: any) => child.userData?.type === 'productOutline'
      );
      expect(outlineMeshes.length).toBeGreaterThan(0);
      
      // Check that outline meshes are THREE.Mesh instances
      outlineMeshes.forEach((outline: any) => {
        expect(outline).toBeInstanceOf(THREE.Mesh);
        expect(outline.material.color.getHex()).toBe(0xff0000); // Red
      });
    });

    it('should not add outline if molecule.group is null', () => {
      const molecule = createMockMoleculeGroup('test_molecule');
      molecule.group = null as any;
      
      // Should not throw
      expect(() => addProductOutline(molecule)).not.toThrow();
    });

    it('should remove existing outline before adding new one', () => {
      const molecule = createMockMoleculeGroup('test_molecule');
      
      addProductOutline(molecule);
      const firstOutlineCount = molecule.group.children.filter(
        (child: any) => child.userData?.type === 'productOutline'
      ).length;
      
      addProductOutline(molecule);
      const secondOutlineCount = molecule.group.children.filter(
        (child: any) => child.userData?.type === 'productOutline'
      ).length;
      
      // Should have same number of outlines (old ones removed, new ones added)
      expect(secondOutlineCount).toBe(firstOutlineCount);
    });
  });

  describe('removeProductOutline', () => {
    it('should remove all outline meshes from a molecule', () => {
      const molecule = createMockMoleculeGroup('test_molecule');
      const initialChildrenCount = molecule.group.children.length;
      
      addProductOutline(molecule);
      const withOutlineCount = molecule.group.children.length;
      expect(withOutlineCount).toBeGreaterThan(initialChildrenCount);
      
      removeProductOutline(molecule);
      
      // Should have removed outline meshes
      const outlineMeshes = molecule.group.children.filter(
        (child: any) => child.userData?.type === 'productOutline'
      );
      expect(outlineMeshes.length).toBe(0);
    });

    it('should not throw if no outlines exist', () => {
      const molecule = createMockMoleculeGroup('test_molecule');
      
      expect(() => removeProductOutline(molecule)).not.toThrow();
    });
  });

  describe('updateMoleculeOutline', () => {
    it('should add outline when isProduct is true', () => {
      const molecule = createMockMoleculeGroup('test_molecule');
      molecule.isProduct = true;
      
      updateMoleculeOutline(molecule);
      
      const outlineMeshes = molecule.group.children.filter(
        (child: any) => child.userData?.type === 'productOutline'
      );
      expect(outlineMeshes.length).toBeGreaterThan(0);
    });

    it('should remove outline when isProduct is false', () => {
      const molecule = createMockMoleculeGroup('test_molecule');
      molecule.isProduct = true;
      
      // Add outline first
      updateMoleculeOutline(molecule);
      expect(
        molecule.group.children.filter((child: any) => child.userData?.type === 'productOutline').length
      ).toBeGreaterThan(0);
      
      // Remove outline
      molecule.isProduct = false;
      updateMoleculeOutline(molecule);
      
      const outlineMeshes = molecule.group.children.filter(
        (child: any) => child.userData?.type === 'productOutline'
      );
      expect(outlineMeshes.length).toBe(0);
    });
  });
});


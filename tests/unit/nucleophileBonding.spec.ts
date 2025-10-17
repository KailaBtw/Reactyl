/**
 * Unit tests for nucleophile bonding behavior in SN2 reactions
 * Tests that hydroxyl molecule properly connects to substrate
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { SN2MechanismAnimation } from '../../src/animations/SN2MechanismAnimation';
import { createMockMolecule, createMockAtom } from '../fixtures/mockMolecules';

describe('Nucleophile Bonding Behavior', () => {
  let sn2Animation: SN2MechanismAnimation;
  let substrate: any;
  let nucleophile: any;

  beforeEach(() => {
    sn2Animation = new SN2MechanismAnimation();
    
    substrate = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
    substrate.group.children = [
      createMockAtom('C', new THREE.Vector3(0, 0, 0)),
      createMockAtom('H', new THREE.Vector3(1, 0, 0)),
      createMockAtom('H', new THREE.Vector3(-1, 0, 0)),
      createMockAtom('H', new THREE.Vector3(0, 1, 0)),
      createMockAtom('Br', new THREE.Vector3(0, 0, 1))
    ];

    nucleophile = createMockMolecule('Nucleophile', new THREE.Vector3(0, 0, -5));
    nucleophile.group.children = [
      createMockAtom('O', new THREE.Vector3(0, 0, 0)),
      createMockAtom('H', new THREE.Vector3(1, 0, 0))
    ];
  });

  describe('Nucleophile Movement', () => {
    it('moves nucleophile toward substrate during phase C', () => {
      const initialPosition = nucleophile.group.position.clone();
      const substratePosition = substrate.group.position.clone();
      const initialDistance = initialPosition.distanceTo(substratePosition);
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Phase C (60-100%): Nucleophile should be moving toward substrate
        const currentDistance = nucleophile.group.position.distanceTo(substratePosition);
        expect(currentDistance).toBeLessThan(initialDistance);
      }, 800);
    });

    it('nucleophile reaches substrate carbon position', () => {
      const carbonPosition = new THREE.Vector3(0, 0, 0); // Carbon is at substrate center
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // At animation completion, nucleophile should be at carbon position
        const finalDistance = nucleophile.group.position.distanceTo(carbonPosition);
        expect(finalDistance).toBeLessThan(0.1); // Within 0.1 units
      }, 1200);
    });

    it('nucleophile moves in correct direction (toward carbon)', () => {
      const carbonPosition = new THREE.Vector3(0, 0, 0);
      const initialPosition = nucleophile.group.position.clone();
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Check that nucleophile is moving toward carbon (not away)
        const direction = nucleophile.group.position.clone().sub(initialPosition).normalize();
        const toCarbon = carbonPosition.clone().sub(initialPosition).normalize();
        
        // Dot product should be positive (same general direction)
        const dotProduct = direction.dot(toCarbon);
        expect(dotProduct).toBeGreaterThan(0.5);
      }, 800);
    });
  });

  describe('Bond Formation', () => {
    it('nucleophile is positioned for bond formation', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Nucleophile should be close enough to substrate to form a bond
        const distance = nucleophile.group.position.distanceTo(substrate.group.position);
        expect(distance).toBeLessThan(1.5); // Bond length is typically ~1.4 Å
      }, 1200);
    });

    it('nucleophile oxygen is positioned correctly for bonding', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Find the oxygen atom in nucleophile
        const oxygenAtom = nucleophile.group.children.find((child: any) => child.userData.element === 'O');
        expect(oxygenAtom).toBeDefined();
        
        // Oxygen should be positioned for bonding with carbon
        const oxygenWorldPos = nucleophile.group.localToWorld(oxygenAtom.position.clone());
        const carbonWorldPos = substrate.group.localToWorld(new THREE.Vector3(0, 0, 0));
        const bondDistance = oxygenWorldPos.distanceTo(carbonWorldPos);
        
        expect(bondDistance).toBeLessThan(1.5); // Typical C-O bond length
      }, 1200);
    });

    it('maintains nucleophile structure during bonding', () => {
      const initialChildrenCount = nucleophile.group.children.length;
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Nucleophile should maintain its structure (O and H atoms)
        expect(nucleophile.group.children.length).toBe(initialChildrenCount);
        expect(nucleophile.group.children.some((child: any) => child.userData.element === 'O')).toBe(true);
        expect(nucleophile.group.children.some((child: any) => child.userData.element === 'H')).toBe(true);
      }, 1200);
    });
  });

  describe('Phase Timing', () => {
    it('nucleophile does not move during phase A', () => {
      const initialPosition = nucleophile.group.position.clone();
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Phase A (0-30%): Nucleophile should not move
        expect(nucleophile.group.position.equals(initialPosition)).toBe(true);
      }, 200);
    });

    it('nucleophile does not move during phase B', () => {
      const initialPosition = nucleophile.group.position.clone();
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Phase B (30-60%): Nucleophile should not move yet
        expect(nucleophile.group.position.equals(initialPosition)).toBe(true);
      }, 500);
    });

    it('nucleophile only moves during phase C', () => {
      const initialPosition = nucleophile.group.position.clone();
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Phase C (60-100%): Nucleophile should start moving
        expect(nucleophile.group.position.equals(initialPosition)).toBe(false);
      }, 700);
    });
  });

  describe('Bonding Accuracy', () => {
    it('nucleophile approaches from correct angle for SN2', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Calculate approach vector
        const nucleophilePos = nucleophile.group.position;
        const substratePos = substrate.group.position;
        const approachVector = substratePos.clone().sub(nucleophilePos).normalize();
        
        // For SN2, nucleophile should approach from opposite side of leaving group
        // Since leaving group was at (0,0,1), nucleophile should approach from (0,0,-1)
        const expectedDirection = new THREE.Vector3(0, 0, 1);
        const dotProduct = approachVector.dot(expectedDirection);
        
        expect(dotProduct).toBeGreaterThan(0.7); // Should be mostly aligned
      }, 1000);
    });

    it('nucleophile maintains proper orientation during approach', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Nucleophile should maintain its internal structure during approach
        const oxygenAtom = nucleophile.group.children.find((child: any) => child.userData.element === 'O');
        const hydrogenAtom = nucleophile.group.children.find((child: any) => child.userData.element === 'H');
        
        expect(oxygenAtom).toBeDefined();
        expect(hydrogenAtom).toBeDefined();
        
        // O-H bond should maintain reasonable length
        const ohDistance = oxygenAtom.position.distanceTo(hydrogenAtom.position);
        expect(ohDistance).toBeGreaterThan(0.8); // O-H bond length
        expect(ohDistance).toBeLessThan(1.2);
      }, 1000);
    });
  });

  describe('Error Handling', () => {
    it('handles nucleophile with no oxygen atom', () => {
      // Remove oxygen atom
      nucleophile.group.children = nucleophile.group.children.filter((child: any) => child.userData.element !== 'O');
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      // Should not crash
      setTimeout(() => {
        expect(animation).toBeDefined();
      }, 1200);
    });

    it('handles nucleophile with no hydrogen atom', () => {
      // Remove hydrogen atom
      nucleophile.group.children = nucleophile.group.children.filter((child: any) => child.userData.element !== 'H');
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      // Should not crash
      setTimeout(() => {
        expect(animation).toBeDefined();
      }, 1200);
    });
  });
});

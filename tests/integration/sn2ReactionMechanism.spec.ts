/**
 * Integration tests for SN2 reaction mechanism
 * Tests the complete reaction sequence: leaving group removal → substrate inversion → nucleophile bonding
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { SN2MechanismAnimation } from '../../src/animations/SN2MechanismAnimation';
import { createMockMolecule, createMockAtom } from '../fixtures/mockMolecules';

describe('SN2 Reaction Mechanism', () => {
  let sn2Animation: SN2MechanismAnimation;
  let substrate: any;
  let nucleophile: any;

  beforeEach(() => {
    sn2Animation = new SN2MechanismAnimation();
    
    // Create substrate with leaving group (Br)
    substrate = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
    substrate.group.children = [
      createMockAtom('C', new THREE.Vector3(0, 0, 0)),
      createMockAtom('H', new THREE.Vector3(1, 0, 0)),
      createMockAtom('H', new THREE.Vector3(-1, 0, 0)),
      createMockAtom('H', new THREE.Vector3(0, 1, 0)),
      createMockAtom('Br', new THREE.Vector3(0, 0, 1))
    ];

    // Create nucleophile (OH⁻)
    nucleophile = createMockMolecule('Nucleophile', new THREE.Vector3(0, 0, -5));
    nucleophile.group.children = [
      createMockAtom('O', new THREE.Vector3(0, 0, 0)),
      createMockAtom('H', new THREE.Vector3(1, 0, 0))
    ];
  });

  describe('Leaving Group Removal', () => {
    it('removes leaving group atom from substrate', () => {
      const initialChildrenCount = substrate.group.children.length;
      const leavingGroupAtom = substrate.group.children.find((child: any) => child.userData.element === 'Br');
      
      expect(leavingGroupAtom).toBeDefined();
      expect(initialChildrenCount).toBe(5);

      // Simulate the animation phase where leaving group is removed
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      // Fast forward to phase A completion (30% of animation)
      setTimeout(() => {
        expect(substrate.group.children.length).toBeLessThan(initialChildrenCount);
        expect(substrate.group.children.find((child: any) => child.userData.element === 'Br')).toBeUndefined();
      }, 300); // 30% of 1000ms
    });

    it('creates new molecule from leaving group', () => {
      const leavingGroupAtom = substrate.group.children.find((child: any) => child.userData.element === 'Br');
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      // Check that leaving group molecule is created
      setTimeout(() => {
        expect((leavingGroupAtom as any).leavingGroupMolecule).toBeDefined();
        expect((leavingGroupAtom as any).leavingGroupMolecule.name).toBe('Br⁻');
      }, 300);
    });
  });

  describe('Substrate Rotation (Walden Inversion)', () => {
    it('rotates substrate instantaneously, not gradually', () => {
      const initialRotation = substrate.group.rotation.y;
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      // Check rotation at different phases
      setTimeout(() => {
        // Phase A (0-30%): Should not rotate yet
        expect(substrate.group.rotation.y).toBe(initialRotation);
      }, 200);
      
      setTimeout(() => {
        // Phase B (30-60%): Should rotate instantly to 180°, not gradually
        expect(substrate.group.rotation.y).toBe(Math.PI); // 180 degrees
      }, 400);
      
      setTimeout(() => {
        // Phase C (60-100%): Should maintain 180° rotation
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 800);
    });

    it('does not reset rotation after animation completes', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      // Wait for animation to complete
      setTimeout(() => {
        expect(substrate.group.rotation.y).toBe(Math.PI); // Should stay at 180°
        expect(substrate.group.rotation.y).not.toBe(0); // Should not reset to 0
      }, 1200);
    });

    it('updates physics body quaternion to match rotation', () => {
      // Mock physics body
      substrate.physicsBody = { quaternion: new THREE.Quaternion() };
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Physics quaternion should match Three.js quaternion
        expect(substrate.physicsBody.quaternion.x).toBeCloseTo(substrate.group.quaternion.x, 6);
        expect(substrate.physicsBody.quaternion.y).toBeCloseTo(substrate.group.quaternion.y, 6);
        expect(substrate.physicsBody.quaternion.z).toBeCloseTo(substrate.group.quaternion.z, 6);
        expect(substrate.physicsBody.quaternion.w).toBeCloseTo(substrate.group.quaternion.w, 6);
      }, 400);
    });
  });

  describe('Nucleophile Bonding', () => {
    it('moves nucleophile to connect with substrate carbon', () => {
      const initialPosition = nucleophile.group.position.clone();
      const carbonPosition = new THREE.Vector3(0, 0, 0); // Carbon is at substrate center
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Phase C (60-100%): Nucleophile should move toward carbon
        const distanceToCarbon = nucleophile.group.position.distanceTo(carbonPosition);
        expect(distanceToCarbon).toBeLessThan(initialPosition.distanceTo(carbonPosition));
      }, 800);
    });

    it('nucleophile reaches substrate carbon position', () => {
      const carbonPosition = new THREE.Vector3(0, 0, 0);
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // At completion, nucleophile should be very close to carbon
        const finalDistance = nucleophile.group.position.distanceTo(carbonPosition);
        expect(finalDistance).toBeLessThan(0.1); // Within 0.1 units
      }, 1200);
    });

    it('creates bond between nucleophile and substrate', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Check that nucleophile is positioned to bond with substrate
        const nucleophilePosition = nucleophile.group.position;
        const substratePosition = substrate.group.position;
        const distance = nucleophilePosition.distanceTo(substratePosition);
        
        expect(distance).toBeLessThan(1.0); // Close enough to bond
      }, 1200);
    });
  });

  describe('Complete Reaction Sequence', () => {
    it('follows correct phase sequence', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      let phaseAComplete = false;
      let phaseBComplete = false;
      let phaseCComplete = false;
      
      setTimeout(() => {
        // Phase A: Leaving group removed
        const leavingGroupAtom = substrate.group.children.find((child: any) => child.userData.element === 'Br');
        expect(leavingGroupAtom).toBeUndefined();
        phaseAComplete = true;
      }, 300);
      
      setTimeout(() => {
        // Phase B: Substrate rotated
        expect(substrate.group.rotation.y).toBe(Math.PI);
        expect(phaseAComplete).toBe(true);
        phaseBComplete = true;
      }, 600);
      
      setTimeout(() => {
        // Phase C: Nucleophile connected
        const distance = nucleophile.group.position.distanceTo(new THREE.Vector3(0, 0, 0));
        expect(distance).toBeLessThan(0.1);
        expect(phaseAComplete).toBe(true);
        expect(phaseBComplete).toBe(true);
        phaseCComplete = true;
      }, 1000);
    });

    it('maintains reaction state throughout sequence', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Substrate should maintain its structure (minus leaving group)
        expect(substrate.group.children.length).toBe(4); // 5 - 1 leaving group
        expect(substrate.group.children.some((child: any) => child.userData.element === 'C')).toBe(true);
        expect(substrate.group.children.some((child: any) => child.userData.element === 'H')).toBe(true);
      }, 1200);
    });
  });

  describe('Error Handling', () => {
    it('handles missing leaving group atom gracefully', () => {
      // Remove leaving group atom
      substrate.group.children = substrate.group.children.filter((child: any) => child.userData.element !== 'Br');
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      // Should not crash and should complete animation
      setTimeout(() => {
        expect(animation).toBeDefined();
      }, 1200);
    });

    it('handles missing carbon atom gracefully', () => {
      // Remove carbon atom
      substrate.group.children = substrate.group.children.filter((child: any) => child.userData.element !== 'C');
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      // Should not crash and should complete animation
      setTimeout(() => {
        expect(animation).toBeDefined();
      }, 1200);
    });
  });
});

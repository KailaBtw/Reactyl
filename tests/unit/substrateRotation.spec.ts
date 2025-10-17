/**
 * Unit tests for substrate rotation behavior in SN2 reactions
 * Tests instantaneous rotation and prevents rotation reset bugs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { SN2MechanismAnimation } from '../../src/animations/SN2MechanismAnimation';
import { createMockMolecule, createMockAtom } from '../fixtures/mockMolecules';

describe('Substrate Rotation Behavior', () => {
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

  describe('Instantaneous Rotation', () => {
    it('rotates substrate instantly at phase B start, not gradually', () => {
      const initialRotation = substrate.group.rotation.y;
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      // Check rotation at phase B start (30% of animation)
      setTimeout(() => {
        // Should be instant 180° rotation, not gradual
        expect(substrate.group.rotation.y).toBe(Math.PI);
        expect(substrate.group.rotation.y).not.toBe(initialRotation);
      }, 300);
    });

    it('does not show gradual rotation during phase B', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      let rotationValues: number[] = [];
      
      // Sample rotation values during phase B
      setTimeout(() => {
        rotationValues.push(substrate.group.rotation.y);
      }, 350);
      
      setTimeout(() => {
        rotationValues.push(substrate.group.rotation.y);
      }, 400);
      
      setTimeout(() => {
        rotationValues.push(substrate.group.rotation.y);
      }, 500);
      
      setTimeout(() => {
        // All rotation values should be the same (instantaneous)
        expect(rotationValues.every(val => val === Math.PI)).toBe(true);
        expect(rotationValues.length).toBe(3);
      }, 600);
    });

    it('maintains 180° rotation throughout phase C', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 700);
      
      setTimeout(() => {
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 800);
      
      setTimeout(() => {
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 1000);
    });
  });

  describe('Rotation Persistence', () => {
    it('does not reset rotation after animation completes', () => {
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 1200);
      
      setTimeout(() => {
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 1500);
      
      setTimeout(() => {
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 2000);
    });

    it('prevents rotation from spinning back to original position', () => {
      const initialRotation = substrate.group.rotation.y;
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      // Check multiple times after animation completion
      setTimeout(() => {
        expect(substrate.group.rotation.y).not.toBe(initialRotation);
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 1200);
      
      setTimeout(() => {
        expect(substrate.group.rotation.y).not.toBe(initialRotation);
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 2000);
    });

    it('maintains rotation even if physics is resumed', () => {
      // Mock physics body
      substrate.physicsBody = { quaternion: new THREE.Quaternion() };
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Simulate physics resume
        substrate.physicsBody.quaternion.set(
          substrate.group.quaternion.x,
          substrate.group.quaternion.y,
          substrate.group.quaternion.z,
          substrate.group.quaternion.w
        );
        
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 1200);
    });
  });

  describe('Physics Synchronization', () => {
    it('updates physics body quaternion when substrate rotates', () => {
      substrate.physicsBody = { quaternion: new THREE.Quaternion() };
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Physics quaternion should match Three.js rotation
        expect(substrate.physicsBody.quaternion.y).toBeCloseTo(substrate.group.quaternion.y, 6);
        expect(substrate.physicsBody.quaternion.w).toBeCloseTo(substrate.group.quaternion.w, 6);
      }, 400);
    });

    it('maintains physics-quaternion sync after rotation', () => {
      substrate.physicsBody = { quaternion: new THREE.Quaternion() };
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        const threeQuat = substrate.group.quaternion;
        const physicsQuat = substrate.physicsBody.quaternion;
        
        expect(physicsQuat.x).toBeCloseTo(threeQuat.x, 6);
        expect(physicsQuat.y).toBeCloseTo(threeQuat.y, 6);
        expect(physicsQuat.z).toBeCloseTo(threeQuat.z, 6);
        expect(physicsQuat.w).toBeCloseTo(threeQuat.w, 6);
      }, 1200);
    });
  });

  describe('Edge Cases', () => {
    it('handles substrate with no physics body', () => {
      substrate.physicsBody = null;
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Should still rotate the Three.js object
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 400);
    });

    it('handles substrate with undefined physics body', () => {
      substrate.physicsBody = undefined;
      
      const animation = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        // Should still rotate the Three.js object
        expect(substrate.group.rotation.y).toBe(Math.PI);
      }, 400);
    });

    it('handles multiple rapid animation calls', () => {
      const animation1 = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
      
      setTimeout(() => {
        const animation2 = sn2Animation.animate(substrate, nucleophile, { duration: 1000 });
        
        setTimeout(() => {
          // Should maintain rotation from first animation
          expect(substrate.group.rotation.y).toBe(Math.PI);
        }, 400);
      }, 200);
    });
  });
});

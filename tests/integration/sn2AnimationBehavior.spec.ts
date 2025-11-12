import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { SN2MechanismAnimation } from '../../src/animations/SN2MechanismAnimation';
import { createMockMolecule, createMockAtom } from '../fixtures/mockMolecules';

describe('SN2 Animation Behavior Integration', () => {
  let sn2Animation: SN2MechanismAnimation;
  let substrate: any;
  let nucleophile: any;

  beforeEach(() => {
    sn2Animation = new SN2MechanismAnimation();

    // Create substrate with leaving group (Br)
    substrate = createMockMolecule('Methyl bromide', new THREE.Vector3(0, 0, 0));
    substrate.group.children = [
      createMockAtom('C', new THREE.Vector3(0, 0, 0)),
      createMockAtom('H', new THREE.Vector3(1, 0, 0)),
      createMockAtom('H', new THREE.Vector3(-1, 0, 0)),
      createMockAtom('H', new THREE.Vector3(0, 1, 0)),
      createMockAtom('Br', new THREE.Vector3(0, 0, 1))
    ];

    // Create nucleophile (OH⁻)
    nucleophile = createMockMolecule('Hydroxide ion', new THREE.Vector3(0, 0, -5));
    nucleophile.group.children = [
      createMockAtom('O', new THREE.Vector3(0, 0, 0)),
      createMockAtom('H', new THREE.Vector3(1, 0, 0))
    ];

    // Mock global objects
    (window as any).scene = new THREE.Scene();
    (window as any).moleculeManager = {
      newMolecule: vi.fn((name: string, position: any) => createMockMolecule(name, new THREE.Vector3(position.x, position.y, position.z))),
      getMolecule: vi.fn(),
      removeMolecule: vi.fn(),
      clearAllMolecules: vi.fn()
    };

    vi.doMock('../../src/physics/cannonPhysicsEngine', () => ({
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

    // Mock fetch for PubChem
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('mock methanol mol data')
    });
  });

  describe('Animation Creation', () => {
    it('creates animation runner successfully', () => {
      const animationRunner = sn2Animation.animate(substrate, nucleophile);
      
      expect(animationRunner).toBeDefined();
      expect(sn2Animation.animationRunner).toBe(animationRunner);
      expect(sn2Animation.isRunning).toBe(false); // Instant animation is never "running"
    });

    it('handles onStart callback', () => {
      const onStartSpy = vi.fn();
      
      sn2Animation.animate(substrate, nucleophile, { onStart: onStartSpy });
      
      expect(onStartSpy).toHaveBeenCalled();
    });

    it('handles onComplete callback', async () => {
      const onCompleteSpy = vi.fn();
      
      // Animation is instant, so callback is called synchronously
      sn2Animation.animate(substrate, nucleophile, { onComplete: onCompleteSpy });
      
      // Callback should be called immediately for instant animations
      // Use a small delay to allow any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(onCompleteSpy).toHaveBeenCalled();
    });

    it('uses correct duration for instant transition', () => {
      const animationRunner = sn2Animation.animate(substrate, nucleophile, { duration: 2000 });
      
      // Should be instant (no duration needed)
      expect(animationRunner).toBeDefined();
      expect(sn2Animation.isRunning).toBe(false); // Instant animation is never "running"
    });
  });

  describe('Animation State Management', () => {
    it('stops animation when stop() is called', () => {
      const animationRunner = sn2Animation.animate(substrate, nucleophile);
      
      expect(sn2Animation.isRunning).toBe(false); // Instant animation is never "running"
      
      sn2Animation.stop();
      
      expect(sn2Animation.isRunning).toBe(false);
      expect(sn2Animation.animationRunner).toBeNull();
    });

    it('handles multiple rapid animation calls', () => {
      expect(() => {
        sn2Animation.animate(substrate, nucleophile);
        sn2Animation.animate(substrate, nucleophile);
        sn2Animation.animate(substrate, nucleophile);
      }).not.toThrow();
    });

    it('maintains correct state throughout animation lifecycle', () => {
      const animationRunner = sn2Animation.animate(substrate, nucleophile);
      
      expect(sn2Animation.isRunning).toBe(false); // Instant animation is never "running"
      expect(sn2Animation.animationRunner).toBe(animationRunner);
      
      // Animation is instant, so state should be consistent immediately
      expect(sn2Animation.animationRunner).toBe(animationRunner);
    });
  });

  describe('Error Handling', () => {
    it('handles missing atoms gracefully with fallback animation', () => {
      // Create substrate without leaving group
      const substrateWithoutLG = createMockMolecule('Substrate', new THREE.Vector3(0, 0, 0));
      substrateWithoutLG.group.children = [
        createMockAtom('C', new THREE.Vector3(0, 0, 0)),
        createMockAtom('H', new THREE.Vector3(1, 0, 0))
        // No Br atom
      ];

      expect(() => {
        sn2Animation.animate(substrateWithoutLG, nucleophile);
      }).not.toThrow();
    });

    it('handles missing nucleophile atoms gracefully', () => {
      // Create nucleophile without oxygen
      const nucleophileWithoutO = createMockMolecule('Nucleophile', new THREE.Vector3(0, 0, -5));
      nucleophileWithoutO.group.children = [
        createMockAtom('H', new THREE.Vector3(1, 0, 0))
        // No O atom
      ];

      expect(() => {
        sn2Animation.animate(substrate, nucleophileWithoutO);
      }).not.toThrow();
    });

    it('handles network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const animationRunner = sn2Animation.animate(substrate, nucleophile);
      
      // Should not throw even with network error
      expect(animationRunner).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('completes animation quickly for instant transition', (done) => {
      const startTime = performance.now();
      
      sn2Animation.animate(substrate, nucleophile, {
        onComplete: () => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // Should complete very quickly (less than 200ms for instant transition)
          expect(duration).toBeLessThan(200);
          done();
        }
      });
    });

    it('uses minimal resources during animation', () => {
      const initialMemory = process.memoryUsage();
      
      sn2Animation.animate(substrate, nucleophile);
      
      // Animation should not cause significant memory increase
      const currentMemory = process.memoryUsage();
      const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
      
      // Should be reasonable (less than 10MB increase)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Atom Finding Logic', () => {
    it('correctly identifies leaving group atoms', () => {
      const leavingGroup = (sn2Animation as any).findLeavingGroupAtom(substrate);
      expect(leavingGroup).toBeDefined();
      expect(leavingGroup.userData.element).toBe('Br');
    });

    it('correctly identifies nucleophile atoms', () => {
      const nucAtom = (sn2Animation as any).findNucleophileAtom(nucleophile);
      expect(nucAtom).toBeDefined();
      expect(nucAtom.userData.element).toBe('O');
    });

    it('correctly identifies carbon atoms', () => {
      const carbonAtom = (sn2Animation as any).findNearestCarbonTo(substrate, substrate.group.children[4]); // Br atom
      expect(carbonAtom).toBeDefined();
      expect(carbonAtom.userData.element).toBe('C');
    });
  });

  describe('Molecular Properties', () => {
    it('calculates correct atomic masses', () => {
      expect((sn2Animation as any).getElementMass('Br')).toBe(79.90);
      expect((sn2Animation as any).getElementMass('Cl')).toBe(35.45);
      expect((sn2Animation as any).getElementMass('I')).toBe(126.90);
    });

    it('handles unknown elements with default mass', () => {
      expect((sn2Animation as any).getElementMass('Unknown')).toBe(35.45);
    });
  });
});

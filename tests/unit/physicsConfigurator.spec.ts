import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { computeKinematics, applyKinematics } from '../../src/physics/encounterPlanner';
import { physicsEngine } from '../../src/physics/cannonPhysicsEngine';

describe('Physics Configurator', () => {
  describe('computeKinematics', () => {
  it('generates nucleophile velocity consistent with approachAngle (world Y-rotation)', () => {
    const { nucleophile } = computeKinematics({ approachAngle: 180, relativeVelocity: 10 });
    // approachAngle 180 => direction (0,0,-1) negated => (0,0,1) * 5 (half of relative velocity)
    expect(nucleophile.velocity.x).toBeCloseTo(0, 6);
    expect(nucleophile.velocity.y).toBeCloseTo(0, 6);
    expect(nucleophile.velocity.z).toBeCloseTo(5, 6); // Half of relative velocity
  });

    it('splits relative velocity between both molecules for proper collision', () => {
      const { substrate, nucleophile } = computeKinematics({ approachAngle: 180, relativeVelocity: 10 });
      
      // Both molecules should move toward each other
      expect(substrate.velocity.z).toBeLessThan(0); // Substrate moves in -Z (toward center)
      expect(nucleophile.velocity.z).toBeGreaterThan(0); // Nucleophile moves in +Z (toward center)
      
      // Each should have half the relative velocity
      expect(substrate.velocity.length()).toBeCloseTo(5, 1);
      expect(nucleophile.velocity.length()).toBeCloseTo(5, 1);
      
      // Total relative velocity should be correct
      const relativeVelocity = nucleophile.velocity.clone().sub(substrate.velocity);
      expect(relativeVelocity.length()).toBeCloseTo(10, 1);
    });

    it('handles different approach angles correctly', () => {
      const { substrate, nucleophile } = computeKinematics({ approachAngle: 90, relativeVelocity: 8 });
      
      // For 90° approach, molecules should move in X direction
      expect(Math.abs(substrate.velocity.x)).toBeGreaterThan(0);
      expect(Math.abs(nucleophile.velocity.x)).toBeGreaterThan(0);
      
      // Velocities should be opposite directions
      expect(substrate.velocity.x * nucleophile.velocity.x).toBeLessThan(0);
    });

    it('conserves momentum with equal mass molecules', () => {
      const { substrate, nucleophile } = computeKinematics({ approachAngle: 180, relativeVelocity: 12 });
      
      // Both molecules should have equal magnitude velocities
      expect(substrate.velocity.length()).toBeCloseTo(nucleophile.velocity.length(), 1);
      
      // Velocities should be in opposite directions
      expect(substrate.velocity.dot(nucleophile.velocity)).toBeLessThan(0);
    });

    it('handles zero relative velocity', () => {
      const { substrate, nucleophile } = computeKinematics({ approachAngle: 180, relativeVelocity: 0 });
      
      // Both molecules should be stationary
      expect(substrate.velocity.length()).toBeCloseTo(0, 6);
      expect(nucleophile.velocity.length()).toBeCloseTo(0, 6);
    });

    it('handles high relative velocities', () => {
      const { substrate, nucleophile } = computeKinematics({ approachAngle: 180, relativeVelocity: 100 });
      
      // Both molecules should have high velocities
      expect(substrate.velocity.length()).toBeCloseTo(50, 1);
      expect(nucleophile.velocity.length()).toBeCloseTo(50, 1);
      
      // Total relative velocity should be correct
      const relativeVelocity = nucleophile.velocity.clone().sub(substrate.velocity);
      expect(relativeVelocity.length()).toBeCloseTo(100, 1);
    });
  });

  describe('applyKinematics', () => {
    it('applies velocities to physics bodies correctly', () => {
      // Create mock molecules with physics bodies
      const substrate = {
        name: 'Substrate',
        group: new THREE.Group(),
        velocity: new THREE.Vector3(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      
      const nucleophile = {
        name: 'Nucleophile', 
        group: new THREE.Group(),
        velocity: new THREE.Vector3(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };

      // Mock molecule manager
      const moleculeManager = {
        getMolecule: vi.fn((name: string) => {
          if (name === 'Substrate') return substrate;
          if (name === 'Nucleophile') return nucleophile;
          return null;
        })
      };

      // Mock physics engine setVelocity
      const setVelocitySpy = vi.spyOn(physicsEngine, 'setVelocity').mockImplementation(() => {});

      // Create kinematics
      const kinematics = {
        substrate: { velocity: new THREE.Vector3(1, 0, 2) },
        nucleophile: { velocity: new THREE.Vector3(-1, 0, -2) }
      };

      // Act
      applyKinematics(physicsEngine, moleculeManager as any, 'Substrate', 'Nucleophile', kinematics);

      // Assert
      expect(setVelocitySpy).toHaveBeenCalledWith(substrate, kinematics.substrate.velocity);
      expect(setVelocitySpy).toHaveBeenCalledWith(nucleophile, kinematics.nucleophile.velocity);
      
      setVelocitySpy.mockRestore();
    });

    it('handles missing molecules gracefully', () => {
      // Mock molecule manager that returns null
      const moleculeManager = {
        getMolecule: vi.fn().mockReturnValue(null)
      };

      // Mock physics engine setVelocity
      const setVelocitySpy = vi.spyOn(physicsEngine, 'setVelocity').mockImplementation(() => {});

      const kinematics = {
        substrate: { velocity: new THREE.Vector3(1, 0, 2) },
        nucleophile: { velocity: new THREE.Vector3(-1, 0, -2) }
      };

      // Act - should not throw
      expect(() => {
        applyKinematics(physicsEngine, moleculeManager as any, 'Missing', 'AlsoMissing', kinematics);
      }).not.toThrow();

      // Assert - setVelocity should not be called for missing molecules
      expect(setVelocitySpy).not.toHaveBeenCalled();
      
      setVelocitySpy.mockRestore();
    });
  });
});
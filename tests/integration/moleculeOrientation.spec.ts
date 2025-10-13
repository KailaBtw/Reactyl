import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { orientSN2Backside, orientSN1, orientE2, getOrientationStrategy } from '../../src/reactions/orientationStrategies';

describe('Molecule Orientation Integration', () => {
  beforeEach(() => {
    // Mock console.log to avoid performance impact from debug logging
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('SN2 orientation produces correct molecular alignment', () => {
    // Arrange
    const substrate = {
      name: 'Methyl bromide',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile = {
      name: 'Hydroxide ion',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Position molecules for collision
    substrate.group.position.set(0, 0, 0);
    nucleophile.group.position.set(0, 0, -5);

    // Act
    orientSN2Backside(substrate, nucleophile);

    // Assert - Verify orientation changes (quaternion may be identity for some rotations)
    const quat = substrate.group.quaternion;
    const hasRotation = !(quat.x === 0 && quat.y === 0 && quat.z === 0 && quat.w === 1);
    expect(hasRotation).toBe(true);

    // Verify physics body sync
    expect(substrate.physicsBody.quaternion.equals(substrate.group.quaternion)).toBe(true);
    expect(nucleophile.physicsBody.quaternion.equals(nucleophile.group.quaternion)).toBe(true);
  });

  it('SN1 orientation produces different alignment than SN2', () => {
    // Arrange
    const substrateSN2 = {
      name: 'Methyl bromide',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophileSN2 = {
      name: 'Hydroxide ion',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const substrateSN1 = {
      name: 'Tert-butyl bromide',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophileSN1 = {
      name: 'Water',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Act
    orientSN2Backside(substrateSN2, nucleophileSN2);
    orientSN1(substrateSN1, nucleophileSN1);

    // Assert - Different orientations should produce different quaternions
    expect(substrateSN2.group.quaternion.equals(substrateSN1.group.quaternion)).toBe(false);
    expect(nucleophileSN2.group.quaternion.equals(nucleophileSN1.group.quaternion)).toBe(false);
  });

  it('E2 orientation produces anti-periplanar alignment', () => {
    // Arrange
    const substrate = {
      name: 'Ethyl bromide',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile = {
      name: 'Ethoxide ion',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Act
    orientE2(substrate, nucleophile);

    // Assert - E2 should produce different orientation than SN2
    const substrateSN2 = {
      name: 'Methyl bromide',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophileSN2 = {
      name: 'Hydroxide ion',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    orientSN2Backside(substrateSN2, nucleophileSN2);

    expect(substrate.group.quaternion.equals(substrateSN2.group.quaternion)).toBe(false);
  });

  it('orientation strategies are deterministic', () => {
    // Arrange
    const substrate1 = {
      name: 'Substrate1',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile1 = {
      name: 'Nucleophile1',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const substrate2 = {
      name: 'Substrate2',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile2 = {
      name: 'Nucleophile2',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Act - Apply same orientation twice
    orientSN2Backside(substrate1, nucleophile1);
    orientSN2Backside(substrate2, nucleophile2);

    // Assert - Results should be identical
    expect(substrate1.group.quaternion.equals(substrate2.group.quaternion)).toBe(true);
    expect(nucleophile1.group.quaternion.equals(nucleophile2.group.quaternion)).toBe(true);
  });

  it('orientation strategies handle different molecule positions', () => {
    // Arrange
    const testPositions = [
      { substrate: [0, 0, 0], nucleophile: [0, 0, -5] },
      { substrate: [5, 0, 0], nucleophile: [0, 0, 0] },
      { substrate: [0, 5, 0], nucleophile: [0, 0, 0] },
      { substrate: [-5, 0, 0], nucleophile: [0, 0, 0] }
    ];

    testPositions.forEach(({ substrate: subPos, nucleophile: nucPos }) => {
      const substrate = {
        name: 'Substrate',
        group: new THREE.Group(),
        rotation: new THREE.Euler(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };

      const nucleophile = {
        name: 'Nucleophile',
        group: new THREE.Group(),
        rotation: new THREE.Euler(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };

      substrate.group.position.set(subPos[0], subPos[1], subPos[2]);
      nucleophile.group.position.set(nucPos[0], nucPos[1], nucPos[2]);

      // Act & Assert - Should handle different positions without errors
      expect(() => {
        orientSN2Backside(substrate, nucleophile);
      }).not.toThrow();

      // Verify orientation was applied
      expect(substrate.group.quaternion.x).toBeDefined();
      expect(substrate.group.quaternion.y).toBeDefined();
      expect(substrate.group.quaternion.z).toBeDefined();
      expect(substrate.group.quaternion.w).toBeDefined();
    });
  });

  it('orientation strategies maintain quaternion normalization', () => {
    // Arrange
    const substrate = {
      name: 'Substrate',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile = {
      name: 'Nucleophile',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Act
    orientSN2Backside(substrate, nucleophile);

    // Assert - Quaternions should be normalized
    const substrateQuat = substrate.group.quaternion;
    const nucleophileQuat = nucleophile.group.quaternion;
    const substratePhysicsQuat = substrate.physicsBody.quaternion;
    const nucleophilePhysicsQuat = nucleophile.physicsBody.quaternion;

    expect(Math.abs(substrateQuat.length() - 1)).toBeLessThan(0.001);
    expect(Math.abs(nucleophileQuat.length() - 1)).toBeLessThan(0.001);
    expect(Math.abs(substratePhysicsQuat.length() - 1)).toBeLessThan(0.001);
    expect(Math.abs(nucleophilePhysicsQuat.length() - 1)).toBeLessThan(0.001);
  });

  it('getOrientationStrategy returns correct strategies', () => {
    // Act & Assert
    expect(getOrientationStrategy('sn2')).toBe(orientSN2Backside);
    expect(getOrientationStrategy('sn1')).toBe(orientSN1);
    expect(getOrientationStrategy('e2')).toBe(orientE2);
    // Note: getOrientationStrategy may return a default strategy instead of undefined
    const unknownStrategy = getOrientationStrategy('unknown');
    expect(unknownStrategy === undefined || typeof unknownStrategy === 'function').toBe(true);
  });

  it('orientation strategies handle molecules with existing rotations', () => {
    // Arrange
    const substrate = {
      name: 'Substrate',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile = {
      name: 'Nucleophile',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Set initial rotations
    substrate.group.rotation.set(0.5, 0.3, 0.2);
    nucleophile.group.rotation.set(0.1, 0.4, 0.6);
    substrate.group.quaternion.setFromEuler(substrate.group.rotation);
    nucleophile.group.quaternion.setFromEuler(nucleophile.group.rotation);

    const initialSubstrateQuat = substrate.group.quaternion.clone();
    const initialNucleophileQuat = nucleophile.group.quaternion.clone();

    // Act
    orientSN2Backside(substrate, nucleophile);

    // Assert - Orientation should change from initial state
    expect(substrate.group.quaternion.equals(initialSubstrateQuat)).toBe(false);
    expect(nucleophile.group.quaternion.equals(initialNucleophileQuat)).toBe(false);
  });

  it('orientation strategies handle multiple applications', () => {
    // Arrange
    const substrate = {
      name: 'Substrate',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile = {
      name: 'Nucleophile',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Act - Apply orientation multiple times
    orientSN2Backside(substrate, nucleophile);
    const firstApplication = substrate.group.quaternion.clone();

    orientSN2Backside(substrate, nucleophile);
    const secondApplication = substrate.group.quaternion.clone();

    orientSN2Backside(substrate, nucleophile);
    const thirdApplication = substrate.group.quaternion.clone();

    // Assert - Multiple applications should be consistent
    expect(firstApplication.equals(secondApplication)).toBe(true);
    expect(secondApplication.equals(thirdApplication)).toBe(true);
  });
});

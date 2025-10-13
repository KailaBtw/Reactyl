import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ReactionDetector } from '../../src/chemistry/reactionDetector';

describe('Collision Energy Integration', () => {
  let reactionDetector: ReactionDetector;

  beforeEach(() => {
    reactionDetector = new ReactionDetector();
  });

  it('calculates collision energy correctly for different masses', () => {
    // Arrange
    const substrateMass = 95; // Methyl bromide
    const nucleophileMass = 17; // Hydroxide ion
    const relativeVelocity = 5; // m/s

    // Act
    const energy = reactionDetector.calculateCollisionEnergy(
      substrateMass,
      nucleophileMass,
      relativeVelocity
    );

    // Assert - Energy should be positive and reasonable
    expect(energy).toBeGreaterThan(0);
    expect(energy).toBeLessThan(1e25); // Reasonable upper bound
    expect(typeof energy).toBe('number');
    expect(isFinite(energy)).toBe(true);
  });

  it('collision energy scales with velocity squared', () => {
    // Arrange
    const substrateMass = 95;
    const nucleophileMass = 17;
    const velocity1 = 5;
    const velocity2 = 10;

    // Act
    const energy1 = reactionDetector.calculateCollisionEnergy(
      substrateMass,
      nucleophileMass,
      velocity1
    );
    const energy2 = reactionDetector.calculateCollisionEnergy(
      substrateMass,
      nucleophileMass,
      velocity2
    );

    // Assert - Energy should scale with velocity squared (4x for 2x velocity)
    const ratio = energy2 / energy1;
    expect(ratio).toBeCloseTo(4, 1); // Should be approximately 4
  });

  it('collision energy scales with reduced mass', () => {
    // Arrange
    const velocity = 5;
    const mass1 = 50;
    const mass2 = 50;
    const mass3 = 100;
    const mass4 = 100;

    // Act
    const energy1 = reactionDetector.calculateCollisionEnergy(mass1, mass2, velocity);
    const energy2 = reactionDetector.calculateCollisionEnergy(mass3, mass4, velocity);

    // Assert - Higher masses should result in higher collision energy
    expect(energy2).toBeGreaterThan(energy1);
  });

  it('handles zero velocity gracefully', () => {
    // Arrange
    const substrateMass = 95;
    const nucleophileMass = 17;
    const velocity = 0;

    // Act
    const energy = reactionDetector.calculateCollisionEnergy(
      substrateMass,
      nucleophileMass,
      velocity
    );

    // Assert - Zero velocity should result in zero energy
    expect(energy).toBe(0);
  });

  it('handles very small masses', () => {
    // Arrange
    const substrateMass = 0.001; // Very small mass
    const nucleophileMass = 0.001;
    const velocity = 5;

    // Act
    const energy = reactionDetector.calculateCollisionEnergy(
      substrateMass,
      nucleophileMass,
      velocity
    );

    // Assert - Should handle small masses without issues
    expect(energy).toBeGreaterThan(0);
    expect(isFinite(energy)).toBe(true);
  });

  it('handles very large masses', () => {
    // Arrange
    const substrateMass = 10000; // Very large mass
    const nucleophileMass = 10000;
    const velocity = 5;

    // Act
    const energy = reactionDetector.calculateCollisionEnergy(
      substrateMass,
      nucleophileMass,
      velocity
    );

    // Assert - Should handle large masses without issues
    expect(energy).toBeGreaterThan(0);
    expect(isFinite(energy)).toBe(true);
  });

  it('handles very high velocities', () => {
    // Arrange
    const substrateMass = 95;
    const nucleophileMass = 17;
    const velocity = 1000; // Very high velocity

    // Act
    const energy = reactionDetector.calculateCollisionEnergy(
      substrateMass,
      nucleophileMass,
      velocity
    );

    // Assert - Should handle high velocities without issues
    expect(energy).toBeGreaterThan(0);
    expect(isFinite(energy)).toBe(true);
  });

  it('energy calculation is deterministic', () => {
    // Arrange
    const substrateMass = 95;
    const nucleophileMass = 17;
    const velocity = 5;

    // Act - Calculate energy multiple times
    const energy1 = reactionDetector.calculateCollisionEnergy(
      substrateMass,
      nucleophileMass,
      velocity
    );
    const energy2 = reactionDetector.calculateCollisionEnergy(
      substrateMass,
      nucleophileMass,
      velocity
    );
    const energy3 = reactionDetector.calculateCollisionEnergy(
      substrateMass,
      nucleophileMass,
      velocity
    );

    // Assert - Results should be identical
    expect(energy1).toBe(energy2);
    expect(energy2).toBe(energy3);
  });

  it('energy calculation handles edge cases', () => {
    // Test various edge cases
    const testCases = [
      { mass1: 1, mass2: 1, velocity: 1 },
      { mass1: 0.1, mass2: 0.1, velocity: 0.1 },
      { mass1: 1000, mass2: 1000, velocity: 1000 },
      { mass1: 1e-6, mass2: 1e-6, velocity: 1e-6 },
      { mass1: 1e6, mass2: 1e6, velocity: 1e6 }
    ];

    testCases.forEach(({ mass1, mass2, velocity }) => {
      const energy = reactionDetector.calculateCollisionEnergy(mass1, mass2, velocity);
      expect(energy).toBeGreaterThanOrEqual(0);
      expect(isFinite(energy)).toBe(true);
    });
  });
});

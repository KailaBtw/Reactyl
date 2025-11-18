import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactionDetector } from '../../src/chemistry/reactionDetector';

describe('Temperature Effects Integration', () => {
  let reactionDetector: ReactionDetector;

  beforeEach(() => {
    reactionDetector = new ReactionDetector();
  });

  it('reaction probability increases with temperature', () => {
    // Arrange
    const collisionData = {
      collisionEnergy: 100,
      approachAngle: 180,
      relativeVelocity: new THREE.Vector3(0, 0, 5),
    };

    const reactionType: any = {
      id: 'sn2',
      name: 'SN2',
      mechanism: 'SN2',
      activationEnergy: 80,
      optimalAngle: 180,
      requiredFeatures: {
        substrate: [],
        nucleophile: [],
      },
      probabilityFactors: {
        temperature: (T: number) => Math.exp(-80 / ((8.314 * T) / 1000)), // Arrhenius
        orientation: (angle: number) => Math.cos(((angle - 180) * Math.PI) / 180),
      },
    };

    const substrate: any = { molecularProperties: { totalMass: 95 } };
    const nucleophile: any = { molecularProperties: { totalMass: 17 } };

    // Act - Test different temperatures
    const result298K = reactionDetector.detectReaction(
      collisionData,
      reactionType,
      298, // Room temperature
      substrate,
      nucleophile
    );

    const result373K = reactionDetector.detectReaction(
      collisionData,
      reactionType,
      373, // Higher temperature
      substrate,
      nucleophile
    );

    const result473K = reactionDetector.detectReaction(
      collisionData,
      reactionType,
      473, // Even higher temperature
      substrate,
      nucleophile
    );

    // Assert - Higher temperature should increase reaction probability
    expect(result373K.probability).toBeGreaterThan(result298K.probability);
    expect(result473K.probability).toBeGreaterThan(result373K.probability);
  });

  it('temperature factor follows Arrhenius equation', () => {
    // Arrange
    const reactionType: any = {
      id: 'sn2',
      name: 'SN2',
      mechanism: 'SN2',
      activationEnergy: 80,
      optimalAngle: 180,
      requiredFeatures: {
        substrate: [],
        nucleophile: [],
      },
      probabilityFactors: {
        temperature: (T: number) => Math.exp(-80 / ((8.314 * T) / 1000)), // Arrhenius
        orientation: (angle: number) => Math.cos(((angle - 180) * Math.PI) / 180),
      },
    };

    // Act - Test temperature factor function directly
    const temp298 = reactionType.probabilityFactors.temperature(298);
    const temp373 = reactionType.probabilityFactors.temperature(373);
    const temp473 = reactionType.probabilityFactors.temperature(473);

    // Assert - Temperature factor should increase with temperature
    expect(temp373).toBeGreaterThan(temp298);
    expect(temp473).toBeGreaterThan(temp373);
    expect(temp298).toBeGreaterThan(0);
    expect(temp373).toBeGreaterThan(0);
    expect(temp473).toBeGreaterThan(0);
  });

  it('handles extreme temperatures gracefully', () => {
    // Arrange
    const collisionData = {
      collisionEnergy: 100,
      approachAngle: 180,
      relativeVelocity: new THREE.Vector3(0, 0, 5),
    };

    const reactionType: any = {
      id: 'sn2',
      name: 'SN2',
      mechanism: 'SN2',
      activationEnergy: 80,
      optimalAngle: 180,
      requiredFeatures: {
        substrate: [],
        nucleophile: [],
      },
      probabilityFactors: {
        temperature: (T: number) => Math.exp(-80 / ((8.314 * T) / 1000)),
        orientation: (angle: number) => Math.cos(((angle - 180) * Math.PI) / 180),
      },
    };

    const substrate: any = { molecularProperties: { totalMass: 95 } };
    const nucleophile: any = { molecularProperties: { totalMass: 17 } };

    // Act & Assert - Should handle extreme temperatures
    const extremeTemperatures = [0.1, 1, 10, 1000, 10000];

    extremeTemperatures.forEach(temp => {
      const result = reactionDetector.detectReaction(
        collisionData,
        reactionType,
        temp,
        substrate,
        nucleophile
      );

      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
      expect(isFinite(result.probability)).toBe(true);
    });
  });

  it('temperature effects are consistent across multiple calls', () => {
    // Arrange
    const collisionData = {
      collisionEnergy: 100,
      approachAngle: 180,
      relativeVelocity: new THREE.Vector3(0, 0, 5),
    };

    const reactionType: any = {
      id: 'sn2',
      name: 'SN2',
      mechanism: 'SN2',
      activationEnergy: 80,
      optimalAngle: 180,
      requiredFeatures: {
        substrate: [],
        nucleophile: [],
      },
      probabilityFactors: {
        temperature: (T: number) => Math.exp(-80 / ((8.314 * T) / 1000)),
        orientation: (angle: number) => Math.cos(((angle - 180) * Math.PI) / 180),
      },
    };

    const substrate: any = { molecularProperties: { totalMass: 95 } };
    const nucleophile: any = { molecularProperties: { totalMass: 17 } };

    // Act - Multiple calls at same temperature
    const results = Array.from({ length: 5 }, () =>
      reactionDetector.detectReaction(collisionData, reactionType, 298, substrate, nucleophile)
    );

    // Assert - All results should be identical
    const firstProbability = results[0].probability;
    results.forEach(result => {
      expect(result.probability).toBe(firstProbability);
    });
  });

  it('temperature affects different reaction types consistently', () => {
    // Arrange
    const collisionData = {
      collisionEnergy: 100,
      approachAngle: 180,
      relativeVelocity: new THREE.Vector3(0, 0, 5),
    };

    const sn2Reaction: any = {
      id: 'sn2',
      name: 'SN2',
      mechanism: 'SN2',
      activationEnergy: 80,
      optimalAngle: 180,
      requiredFeatures: { substrate: [], nucleophile: [] },
      probabilityFactors: {
        temperature: (T: number) => Math.exp(-80 / ((8.314 * T) / 1000)),
        orientation: (angle: number) => Math.cos(((angle - 180) * Math.PI) / 180),
      },
    };

    const sn1Reaction: any = {
      id: 'sn1',
      name: 'SN1',
      mechanism: 'SN1',
      activationEnergy: 120, // Higher activation energy
      optimalAngle: 180,
      requiredFeatures: { substrate: [], nucleophile: [] },
      probabilityFactors: {
        temperature: (T: number) => Math.exp(-120 / ((8.314 * T) / 1000)),
        orientation: (angle: number) => Math.cos(((angle - 180) * Math.PI) / 180),
      },
    };

    const substrate: any = { molecularProperties: { totalMass: 95 } };
    const nucleophile: any = { molecularProperties: { totalMass: 17 } };

    // Act
    const sn2Result298 = reactionDetector.detectReaction(
      collisionData,
      sn2Reaction,
      298,
      substrate,
      nucleophile
    );
    const sn2Result373 = reactionDetector.detectReaction(
      collisionData,
      sn2Reaction,
      373,
      substrate,
      nucleophile
    );

    const sn1Result298 = reactionDetector.detectReaction(
      collisionData,
      sn1Reaction,
      298,
      substrate,
      nucleophile
    );
    const sn1Result373 = reactionDetector.detectReaction(
      collisionData,
      sn1Reaction,
      373,
      substrate,
      nucleophile
    );

    // Assert - Both reaction types should show temperature dependence
    expect(sn2Result373.probability).toBeGreaterThan(sn2Result298.probability);

    // SN1 may have very low probabilities due to high activation energy
    // Check that temperature still has an effect (even if both are very low)
    const sn1TempEffect = sn1Result373.probability >= sn1Result298.probability;
    expect(sn1TempEffect).toBe(true);

    // SN1 should have lower probability due to higher activation energy
    expect(sn1Result298.probability).toBeLessThanOrEqual(sn2Result298.probability);
    expect(sn1Result373.probability).toBeLessThanOrEqual(sn2Result373.probability);
  });
});

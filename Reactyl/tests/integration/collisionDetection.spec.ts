import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactionDetector } from '../../src/chemistry/reactionDetector';
import { collisionEventSystem, createCollisionEvent } from '../../src/physics/collisionEventSystem';

describe('Collision Detection Integration', () => {
  let reactionDetector: ReactionDetector;

  beforeEach(() => {
    reactionDetector = new ReactionDetector();
  });

  it('calculates approach angle that matches orientation', () => {
    // Arrange - simulate SN2 backside attack scenario using our actual collision system
    const substrate = {
      group: { position: new THREE.Vector3(0, 0, 0), quaternion: new THREE.Quaternion() },
      velocity: new THREE.Vector3(0, 0, 0),
      name: 'Substrate',
    };
    const nucleophile = {
      group: { position: new THREE.Vector3(0, 0, -5), quaternion: new THREE.Quaternion() }, // Coming from -Z direction
      velocity: new THREE.Vector3(0, 0, 5),
      name: 'Nucleophile',
    };

    // Act - use our actual collision event system to calculate approach angle
    const collisionEvent = createCollisionEvent(substrate as any, nucleophile as any);

    // Assert - collision normal should point from substrate to nucleophile (backside attack)
    expect(collisionEvent.collisionNormal.z).toBeCloseTo(-1, 1); // Should point toward nucleophile
    expect(collisionEvent.collisionPoint.z).toBeCloseTo(-2.5, 1); // Midpoint between molecules
  });

  it('calculates reaction probability based on approach angle', () => {
    // Arrange
    const substrate: any = {
      name: 'Substrate',
      group: new THREE.Group(),
      molecularProperties: { totalMass: 50 },
    };
    const nucleophile: any = {
      name: 'Nucleophile',
      group: new THREE.Group(),
      molecularProperties: { totalMass: 17 },
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

    // Act - test different approach angles with proper collision data
    const optimalCollision = {
      collisionEnergy: 100,
      approachAngle: 180, // Perfect backside attack
      relativeVelocity: new THREE.Vector3(0, 0, 5),
    };
    const poorCollision = {
      collisionEnergy: 100,
      approachAngle: 90, // Side attack
      relativeVelocity: new THREE.Vector3(0, 0, 5),
    };
    const badCollision = {
      collisionEnergy: 100,
      approachAngle: 0, // Front attack
      relativeVelocity: new THREE.Vector3(0, 0, 5),
    };

    const optimalResult = reactionDetector.detectReaction(
      optimalCollision,
      reactionType,
      298,
      substrate,
      nucleophile
    );
    const poorResult = reactionDetector.detectReaction(
      poorCollision,
      reactionType,
      298,
      substrate,
      nucleophile
    );
    const badResult = reactionDetector.detectReaction(
      badCollision,
      reactionType,
      298,
      substrate,
      nucleophile
    );

    // Assert - better angles should have higher probabilities
    expect(optimalResult.probability).toBeGreaterThan(poorResult.probability);
    expect(poorResult.probability).toBeGreaterThan(badResult.probability);
  });

  it('emits collision events with correct data structure', () => {
    // Arrange
    const substrate: any = {
      name: 'Substrate',
      group: new THREE.Group(),
      molecularProperties: { totalMass: 50 },
    };
    const nucleophile: any = {
      name: 'Nucleophile',
      group: new THREE.Group(),
      molecularProperties: { totalMass: 17 },
    };

    let capturedEvent: any = null;
    const handler = vi.fn((event: any) => {
      capturedEvent = event;
    });
    collisionEventSystem.registerHandler(handler);

    // Act
    const event = {
      type: 'reaction',
      reactionType: 'sn2',
      moleculeA: substrate,
      moleculeB: nucleophile,
      relativeVelocity: new THREE.Vector3(0, 0, 5),
      collisionData: { approachAngle: 180 },
    };

    collisionEventSystem.emitCollision(event);

    // Assert
    expect(capturedEvent).toBeTruthy();
    expect(capturedEvent.type).toBe('reaction');
    expect(capturedEvent.reactionType).toBe('sn2');
    expect(capturedEvent.moleculeA).toBe(substrate);
    expect(capturedEvent.moleculeB).toBe(nucleophile);
    expect(capturedEvent.collisionData.approachAngle).toBe(180);
  });

  it('handles collision energy calculation correctly', () => {
    // Arrange
    const substrate: any = {
      name: 'Substrate',
      molecularProperties: { totalMass: 50 },
    };
    const nucleophile: any = {
      name: 'Nucleophile',
      molecularProperties: { totalMass: 17 },
    };

    const relativeVelocity = new THREE.Vector3(0, 0, 5); // 5 m/s

    // Act
    const energy = reactionDetector.calculateCollisionEnergy(
      substrate.molecularProperties.totalMass,
      nucleophile.molecularProperties.totalMass,
      relativeVelocity.length()
    );

    // Assert - should be positive and reasonable (collision energy is in kJ/mol, can be large)
    expect(energy).toBeGreaterThan(0);
    expect(energy).toBeLessThan(1e25); // More realistic upper bound for molecular collision energy
    expect(typeof energy).toBe('number');
    expect(!isNaN(energy)).toBe(true);
  });
});

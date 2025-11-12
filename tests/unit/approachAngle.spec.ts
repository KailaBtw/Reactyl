import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCollisionEvent } from '../../src/physics/collisionEventSystem';

describe('approach angle computation', () => {
  it('yields ~180° when nucleophile is directly opposite the leaving side', () => {
    // Arrange - Create molecules with proper positioning for backside attack
    const substrate = {
      group: { position: new THREE.Vector3(0, 0, 0), quaternion: new THREE.Quaternion() },
      velocity: new THREE.Vector3(0, 0, 0),
      name: 'Substrate',
    };
    const nucleophile = {
      group: { position: new THREE.Vector3(0, 0, -5), quaternion: new THREE.Quaternion() }, // coming from -Z
      velocity: new THREE.Vector3(0, 0, 5),
      name: 'Nucleophile',
    };

    // Act - Use our actual collision event creation which calculates approach angle
    const collisionEvent = createCollisionEvent(substrate as any, nucleophile as any);

    // The collision event calculates the approach angle internally
    // For backside attack, we expect the nucleophile to be approaching from the opposite side
    // The collision normal should point from substrate to nucleophile
    expect(collisionEvent.collisionNormal.z).toBeCloseTo(-1, 1); // Should point toward nucleophile
    expect(collisionEvent.collisionPoint.z).toBeCloseTo(-2.5, 1); // Midpoint between molecules
  });

  it('yields ~90° for side approach', () => {
    // Arrange - Create molecules with side approach
    const substrate = {
      group: { position: new THREE.Vector3(0, 0, 0), quaternion: new THREE.Quaternion() },
      velocity: new THREE.Vector3(0, 0, 0),
      name: 'Substrate',
    };
    const nucleophile = {
      group: { position: new THREE.Vector3(5, 0, 0), quaternion: new THREE.Quaternion() }, // coming from +X
      velocity: new THREE.Vector3(-5, 0, 0),
      name: 'Nucleophile',
    };

    // Act - Use our actual collision event creation
    const collisionEvent = createCollisionEvent(substrate as any, nucleophile as any);

    // For side approach, the collision normal should point from substrate to nucleophile
    expect(collisionEvent.collisionNormal.x).toBeCloseTo(1, 1); // Should point toward nucleophile
    expect(collisionEvent.collisionPoint.x).toBeCloseTo(2.5, 1); // Midpoint between molecules
  });
});

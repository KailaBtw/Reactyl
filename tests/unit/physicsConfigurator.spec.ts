import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { computeKinematics } from '../../src/reactions/physicsConfigurator';

describe('computeKinematics', () => {
  it('generates nucleophile velocity consistent with approachAngle (world Y-rotation)', () => {
    const { nucleophile } = computeKinematics({ approachAngle: 180, relativeVelocity: 5 });
    // approachAngle 180 => direction (0,0,-1) negated => (0,0,1) * 5
    expect(nucleophile.velocity.x).toBeCloseTo(0, 6);
    expect(nucleophile.velocity.y).toBeCloseTo(0, 6);
    expect(nucleophile.velocity.z).toBeCloseTo(5, 6);
  });
});



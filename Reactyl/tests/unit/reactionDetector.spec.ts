import { describe, expect, it } from 'vitest';
import { ReactionDetector } from '../../src/chemistry/reactionDetector';

describe('ReactionDetector', () => {
  it('calculates higher orientation factor near optimal angle', () => {
    const det = new ReactionDetector();
    // @ts-expect-error access private via any for test
    const near = (det as any).calculateOrientationFactor(182, 180);
    // @ts-expect-error access private via any for test
    const far = (det as any).calculateOrientationFactor(90, 180);
    expect(near).toBeGreaterThan(far);
  });

  it('calculates collision energy proportional to v^2', () => {
    const det = new ReactionDetector();
    const e1 = det.calculateCollisionEnergy(10, 10, 1);
    const e2 = det.calculateCollisionEnergy(10, 10, 2);
    expect(e2).toBeGreaterThan(e1 * 3.9);
    expect(e2).toBeLessThan(e1 * 4.1);
  });
});

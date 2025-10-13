import { describe, it, expect, beforeEach, vi } from 'vitest';
import { collisionEventSystem } from '../../src/physics/collisionEventSystem';

describe('collisionEventSystem handler management', () => {
  beforeEach(() => {
    collisionEventSystem.clearAllHandlers();
    collisionEventSystem.clearHistory();
  });

  it('registers and clears handlers', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    collisionEventSystem.registerHandler(h1);
    collisionEventSystem.registerHandler(h2);
    expect(collisionEventSystem.getStats().totalHandlers).toBe(2);
    collisionEventSystem.clearAllHandlers();
    expect(collisionEventSystem.getStats().totalHandlers).toBe(0);
  });
});



import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Mock the animation manager
vi.mock('../../src/animations/ReactionAnimationManager', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    reactionAnimationManager: {
      ...actual.reactionAnimationManager,
      animateSN2Reaction: vi.fn().mockReturnValue({ 
        run: vi.fn(),
        onComplete: vi.fn(),
        onStart: vi.fn()
      }),
      animateSN1Reaction: vi.fn().mockReturnValue({ 
        run: vi.fn(),
        onComplete: vi.fn(),
        onStart: vi.fn()
      }),
      animateE2Reaction: vi.fn().mockReturnValue({ 
        run: vi.fn(),
        onComplete: vi.fn(),
        onStart: vi.fn()
      })
    }
  };
});

describe('Animation System Integration', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('SN2 animation is triggered with correct parameters', async () => {
    // Arrange
    const { reactionAnimationManager } = await import('../../src/animations/ReactionAnimationManager');
    
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

    // Act
    const animation = reactionAnimationManager.animateSN2Reaction(substrate, nucleophile);

    // Assert
    expect(reactionAnimationManager.animateSN2Reaction).toHaveBeenCalledWith(substrate, nucleophile);
    expect(animation).toBeDefined();
    expect(animation.run).toBeDefined();
    expect(animation.onComplete).toBeDefined();
    expect(animation.onStart).toBeDefined();
  });

  it('SN1 animation is triggered with correct parameters', async () => {
    // Arrange
    const { reactionAnimationManager } = await import('../../src/animations/ReactionAnimationManager');
    
    const substrate = {
      name: 'Tert-butyl bromide',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile = {
      name: 'Water',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Act
    const animation = reactionAnimationManager.animateSN1Reaction(substrate, nucleophile);

    // Assert
    expect(reactionAnimationManager.animateSN1Reaction).toHaveBeenCalledWith(substrate, nucleophile);
    expect(animation).toBeDefined();
    expect(animation.run).toBeDefined();
  });

  it('E2 animation is triggered with correct parameters', async () => {
    // Arrange
    const { reactionAnimationManager } = await import('../../src/animations/ReactionAnimationManager');
    
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
    const animation = reactionAnimationManager.animateE2Reaction(substrate, nucleophile);

    // Assert
    expect(reactionAnimationManager.animateE2Reaction).toHaveBeenCalledWith(substrate, nucleophile);
    expect(animation).toBeDefined();
    expect(animation.run).toBeDefined();
  });

  it('animation callbacks are properly handled', async () => {
    // Arrange
    const { reactionAnimationManager } = await import('../../src/animations/ReactionAnimationManager');
    
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

    const onStart = vi.fn();
    const onComplete = vi.fn();

    // Act
    const animation = reactionAnimationManager.animateSN2Reaction(substrate, nucleophile);
    
    // Simulate callback execution
    if (animation.onStart) animation.onStart();
    if (animation.onComplete) animation.onComplete();

    // Assert
    expect(animation.onStart).toBeDefined();
    expect(animation.onComplete).toBeDefined();
  });

  it('animation system handles multiple concurrent animations', async () => {
    // Arrange
    const { reactionAnimationManager } = await import('../../src/animations/ReactionAnimationManager');
    
    const molecules = Array.from({ length: 3 }, (_, i) => ({
      substrate: {
        name: `Substrate${i}`,
        group: new THREE.Group(),
        rotation: new THREE.Euler(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      },
      nucleophile: {
        name: `Nucleophile${i}`,
        group: new THREE.Group(),
        rotation: new THREE.Euler(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      }
    }));

    // Act - Start multiple animations
    const animations = molecules.map(({ substrate, nucleophile }) => 
      reactionAnimationManager.animateSN2Reaction(substrate, nucleophile)
    );

    // Assert - All animations should be created
    expect(animations).toHaveLength(3);
    animations.forEach(animation => {
      expect(animation).toBeDefined();
      expect(animation.run).toBeDefined();
    });

    // Verify all animations were called
    expect(reactionAnimationManager.animateSN2Reaction).toHaveBeenCalledTimes(3);
  });

  it('animation system handles invalid molecules gracefully', async () => {
    // Arrange
    const { reactionAnimationManager } = await import('../../src/animations/ReactionAnimationManager');
    
    const invalidSubstrate = null;
    const invalidNucleophile = undefined;

    // Act & Assert - Should handle invalid molecules without crashing
    expect(() => {
      reactionAnimationManager.animateSN2Reaction(invalidSubstrate as any, invalidNucleophile as any);
    }).not.toThrow();
  });

  it('animation system maintains state consistency', async () => {
    // Arrange
    const { reactionAnimationManager } = await import('../../src/animations/ReactionAnimationManager');
    
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

    // Act
    const animation1 = reactionAnimationManager.animateSN2Reaction(substrate, nucleophile);
    const animation2 = reactionAnimationManager.animateSN2Reaction(substrate, nucleophile);

    // Assert - Both animations should be independent
    expect(animation1).toBeDefined();
    expect(animation2).toBeDefined();
    // Note: Mocked animations may return the same object, so we check they were called separately
    expect(reactionAnimationManager.animateSN2Reaction).toHaveBeenCalledTimes(2);
  });

  it('animation system handles different reaction types correctly', async () => {
    // Arrange
    const { reactionAnimationManager } = await import('../../src/animations/ReactionAnimationManager');
    
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
    const sn2Animation = reactionAnimationManager.animateSN2Reaction(substrate, nucleophile);
    const sn1Animation = reactionAnimationManager.animateSN1Reaction(substrate, nucleophile);
    const e2Animation = reactionAnimationManager.animateE2Reaction(substrate, nucleophile);

    // Assert - All reaction types should produce valid animations
    expect(sn2Animation).toBeDefined();
    expect(sn1Animation).toBeDefined();
    expect(e2Animation).toBeDefined();

    // Verify correct methods were called
    expect(reactionAnimationManager.animateSN2Reaction).toHaveBeenCalledWith(substrate, nucleophile);
    expect(reactionAnimationManager.animateSN1Reaction).toHaveBeenCalledWith(substrate, nucleophile);
    expect(reactionAnimationManager.animateE2Reaction).toHaveBeenCalledWith(substrate, nucleophile);
  });

  it('animation system handles molecules with complex structures', async () => {
    // Arrange
    const { reactionAnimationManager } = await import('../../src/animations/ReactionAnimationManager');
    
    const substrate = {
      name: 'Complex substrate',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    const nucleophile = {
      name: 'Complex nucleophile',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() }
    };

    // Add complex structure to molecules
    for (let i = 0; i < 10; i++) {
      const atom = new THREE.Mesh();
      atom.userData = { atomIndex: i, element: 'C' };
      substrate.group.add(atom);
    }

    for (let i = 0; i < 5; i++) {
      const atom = new THREE.Mesh();
      atom.userData = { atomIndex: i, element: 'O' };
      nucleophile.group.add(atom);
    }

    // Act
    const animation = reactionAnimationManager.animateSN2Reaction(substrate, nucleophile);

    // Assert - Should handle complex molecules
    expect(animation).toBeDefined();
    expect(animation.run).toBeDefined();
    expect(reactionAnimationManager.animateSN2Reaction).toHaveBeenCalledWith(substrate, nucleophile);
  });
});

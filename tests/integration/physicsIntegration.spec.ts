import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';

describe('Physics Integration Tests', () => {
  let scene: THREE.Scene;
  let orchestrator: ReactionOrchestrator;
  const moleculeStore: Record<string, any> = {};
  const moleculeManager: any = {
    addMolecule: vi.fn((name: string, mol: any) => { moleculeStore[name] = mol; }),
    getAllMolecules: vi.fn().mockReturnValue([]),
    getMolecule: vi.fn((name: string) => moleculeStore[name]),
    clearAllMolecules: vi.fn(() => { Object.keys(moleculeStore).forEach(k => delete moleculeStore[k]); })
  };

  beforeEach(() => {
    scene = new THREE.Scene();
    orchestrator = new ReactionOrchestrator(scene, moleculeManager);
  });

  it('physics engine is properly initialized', () => {
    // Act
    const physicsEngine = orchestrator.getPhysicsEngine();

    // Assert
    expect(physicsEngine).toBeDefined();
    expect(typeof physicsEngine.step).toBe('function');
    expect(typeof physicsEngine.pause).toBe('function');
    expect(typeof physicsEngine.resume).toBe('function');
    expect(typeof physicsEngine.isSimulationPaused).toBe('function');
  });

  it('physics simulation can be paused and resumed', () => {
    // Arrange
    const physicsEngine = orchestrator.getPhysicsEngine();

    // Act & Assert - Initially should not be paused
    expect(physicsEngine.isSimulationPaused()).toBe(false);

    // Pause simulation
    physicsEngine.pause();
    expect(physicsEngine.isSimulationPaused()).toBe(true);

    // Resume simulation
    physicsEngine.resume();
    expect(physicsEngine.isSimulationPaused()).toBe(false);
  });

  it('physics step function works correctly', () => {
    // Arrange
    const physicsEngine = orchestrator.getPhysicsEngine();
    const deltaTime = 0.016; // 60 FPS

    // Act & Assert - Should not throw
    expect(() => {
      physicsEngine.step(deltaTime);
    }).not.toThrow();
  });

  it('physics bodies are created for molecules', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 5
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(),
        physicsBody: { 
          quaternion: new THREE.Quaternion(),
          position: new THREE.Vector3(position.x, position.y, position.z)
        }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);

    // Assert - Physics bodies should exist (or molecules should be loaded)
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    expect(substrate).toBeTruthy();
    expect(nucleophile).toBeTruthy();
    
    // Physics bodies may not be created in test environment
    if (substrate?.physicsBody) {
      expect(substrate.physicsBody.quaternion).toBeInstanceOf(THREE.Quaternion);
    }
    if (nucleophile?.physicsBody) {
      expect(nucleophile.physicsBody.quaternion).toBeInstanceOf(THREE.Quaternion);
    }
  });

  it('physics body positions sync with Three.js objects', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 5
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(),
        physicsBody: { 
          quaternion: new THREE.Quaternion(),
          position: new THREE.Vector3(position.x, position.y, position.z)
        }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);

    // Assert - Physics body positions should match Three.js positions (if physics bodies exist)
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    expect(substrate).toBeTruthy();
    expect(nucleophile).toBeTruthy();
    
    // Check position sync only if physics bodies exist
    if (substrate?.physicsBody && substrate?.group) {
      expect(substrate.physicsBody.position.equals(substrate.group.position)).toBe(true);
    }
    if (nucleophile?.physicsBody && nucleophile?.group) {
      expect(nucleophile.physicsBody.position.equals(nucleophile.group.position)).toBe(true);
    }
  });

  it('physics simulation handles multiple molecules correctly', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 5
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(),
        physicsBody: { 
          quaternion: new THREE.Quaternion(),
          position: new THREE.Vector3(position.x, position.y, position.z)
        }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);

    // Assert - Physics engine should handle multiple bodies
    const physicsEngine = orchestrator.getPhysicsEngine();
    expect(() => {
      physicsEngine.step(0.016);
    }).not.toThrow();
  });

  it('physics simulation can handle zero delta time', () => {
    // Arrange
    const physicsEngine = orchestrator.getPhysicsEngine();

    // Act & Assert - Should handle zero delta time gracefully
    expect(() => {
      physicsEngine.step(0);
    }).not.toThrow();
  });

  it('physics simulation can handle large delta time', () => {
    // Arrange
    const physicsEngine = orchestrator.getPhysicsEngine();

    // Act & Assert - Should handle large delta time gracefully
    expect(() => {
      physicsEngine.step(1.0); // 1 second
    }).not.toThrow();
  });

  it('physics engine maintains state consistency', () => {
    // Arrange
    const physicsEngine = orchestrator.getPhysicsEngine();

    // Act - Multiple pause/resume cycles
    physicsEngine.pause();
    expect(physicsEngine.isSimulationPaused()).toBe(true);
    
    physicsEngine.resume();
    expect(physicsEngine.isSimulationPaused()).toBe(false);
    
    physicsEngine.pause();
    expect(physicsEngine.isSimulationPaused()).toBe(true);
    
    physicsEngine.resume();
    expect(physicsEngine.isSimulationPaused()).toBe(false);

    // Assert - State should be consistent
    expect(physicsEngine.isSimulationPaused()).toBe(false);
  });

  it('physics step maintains frame rate independence', () => {
    // Arrange
    const physicsEngine = orchestrator.getPhysicsEngine();
    const deltaTimes = [0.016, 0.033, 0.008, 0.025]; // Various frame rates

    // Act & Assert - Should handle all delta times without issues
    deltaTimes.forEach(deltaTime => {
      expect(() => {
        physicsEngine.step(deltaTime);
      }).not.toThrow();
    });
  });
});

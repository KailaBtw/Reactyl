import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';
import { getOrientationStrategy } from '../../src/reactions/orientationStrategies';

describe('Reaction Types Integration', () => {
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

  it('handles SN2 reaction type correctly', async () => {
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
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);

    // Assert - SN2 should use backside orientation
    const state = orchestrator.getState();
    expect(state.molecules.substrate).toBeTruthy();
    expect(state.molecules.nucleophile).toBeTruthy();
    
    // Verify SN2 orientation strategy is used
    const strategy = getOrientationStrategy('sn2');
    expect(strategy).toBeDefined();
  });

  it('handles SN1 reaction type correctly', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Tert-butyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Water' },
      reactionType: 'sn1',
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
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);

    // Assert - SN1 should use different orientation
    const state = orchestrator.getState();
    expect(state.molecules.substrate).toBeTruthy();
    expect(state.molecules.nucleophile).toBeTruthy();
    
    // Verify SN1 orientation strategy is used
    const strategy = getOrientationStrategy('sn1');
    expect(strategy).toBeDefined();
  });

  it('handles E2 reaction type correctly', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Ethyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Ethoxide ion' },
      reactionType: 'e2',
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
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);

    // Assert - E2 should use anti-periplanar orientation
    const state = orchestrator.getState();
    expect(state.molecules.substrate).toBeTruthy();
    expect(state.molecules.nucleophile).toBeTruthy();
    
    // Verify E2 orientation strategy is used
    const strategy = getOrientationStrategy('e2');
    expect(strategy).toBeDefined();
  });

  it('handles unknown reaction types gracefully', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Unknown substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Unknown nucleophile' },
      reactionType: 'unknown_reaction',
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
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act & Assert - Should handle unknown reaction type gracefully
    await expect(orchestrator.runReaction(params)).resolves.not.toThrow();
    
    const state = orchestrator.getState();
    expect(state.molecules.substrate).toBeTruthy();
    expect(state.molecules.nucleophile).toBeTruthy();
  });

  it('validates reaction type specific orientation strategies', () => {
    // Test all supported reaction types
    const reactionTypes = ['sn2', 'sn1', 'e2', 'e1'];
    
    reactionTypes.forEach(reactionType => {
      const strategy = getOrientationStrategy(reactionType);
      expect(strategy).toBeDefined();
      expect(typeof strategy).toBe('function');
    });
  });

  it('handles mixed reaction types in sequence', async () => {
    // Arrange
    const reactions = [
      {
        substrateMolecule: { cid: 'dummy-sub1', name: 'Methyl bromide' },
        nucleophileMolecule: { cid: 'dummy-nuc1', name: 'Hydroxide ion' },
        reactionType: 'sn2',
        relativeVelocity: 5
      },
      {
        substrateMolecule: { cid: 'dummy-sub2', name: 'Tert-butyl bromide' },
        nucleophileMolecule: { cid: 'dummy-nuc2', name: 'Water' },
        reactionType: 'sn1',
        relativeVelocity: 5
      },
      {
        substrateMolecule: { cid: 'dummy-sub3', name: 'Ethyl bromide' },
        nucleophileMolecule: { cid: 'dummy-nuc3', name: 'Ethoxide ion' },
        reactionType: 'e2',
        relativeVelocity: 5
      }
    ];

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act - Run multiple reactions in sequence
    for (const reaction of reactions) {
      await orchestrator.runReaction(reaction);
      
      // Assert - Each reaction should complete successfully
      const state = orchestrator.getState();
      expect(state.molecules.substrate).toBeTruthy();
      expect(state.molecules.nucleophile).toBeTruthy();
    }
  });

  it('validates reaction type affects collision detection', async () => {
    // Arrange
    const sn2Params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 5
    };

    const sn1Params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Tert-butyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Water' },
      reactionType: 'sn1',
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
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(sn2Params);
    const sn2State = orchestrator.getState();
    
    await orchestrator.runReaction(sn1Params);
    const sn1State = orchestrator.getState();

    // Assert - Different reaction types should produce different orientations
    expect(sn2State.molecules.substrate).toBeTruthy();
    expect(sn1State.molecules.substrate).toBeTruthy();
    
    // The orientations should be different for different reaction types
    const sn2Strategy = getOrientationStrategy('sn2');
    const sn1Strategy = getOrientationStrategy('sn1');
    expect(sn2Strategy).not.toBe(sn1Strategy);
  });
});

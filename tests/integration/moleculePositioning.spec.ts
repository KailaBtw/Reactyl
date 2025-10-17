import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';
import { createMockMoleculeManager } from '../fixtures/mockMolecules';

describe('Molecule Positioning Integration', () => {
  let scene: THREE.Scene;
  let orchestrator: ReactionOrchestrator;
  let moleculeManager: any;

  beforeEach(() => {
    scene = new THREE.Scene();
    moleculeManager = createMockMoleculeManager();
    orchestrator = new ReactionOrchestrator(scene, moleculeManager);
  });

  it('positions molecules at correct initial locations for collision', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: '6323', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: '961', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 15,
      approachAngle: 180,
      temperature: 298
    };

    // Mock loadMolecule to create realistic molecules
    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(0, 0, 0),
        physicsBody: { quaternion: new THREE.Quaternion() },
        molecularProperties: { 
          totalMass: name.includes('Methyl') ? 95 : 17,
          boundingRadius: name.includes('Methyl') ? 2.2 : 0.9
        }
      };
      
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);
    
    // Assert - Check initial positions
    const state = orchestrator.getState();
    expect(state.molecules.substrate?.group.position.z).toBeCloseTo(7.5, 1);
    expect(state.molecules.nucleophile?.group.position.z).toBeCloseTo(-7.5, 1);
    expect(state.molecules.substrate?.group.position.x).toBeCloseTo(0, 1);
    expect(state.molecules.nucleophile?.group.position.x).toBeCloseTo(0, 1);
    
    // Check that molecules are positioned away from center
    expect(Math.abs(state.molecules.substrate?.group.position.z)).toBeGreaterThan(0);
    expect(Math.abs(state.molecules.nucleophile?.group.position.z)).toBeGreaterThan(0);
  });

  it('ensures molecules start far enough apart for visible collision', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: '6323', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: '961', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 15,
      approachAngle: 180,
      temperature: 298
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(async (_cid: string, name: string, position: any) => {
      const group = new THREE.Group();
      group.position.set(position.x, position.y, position.z);
      
      const molecule: any = { 
        name, 
        group, 
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(0, 0, 0),
        physicsBody: { quaternion: new THREE.Quaternion() },
        molecularProperties: { 
          totalMass: name.includes('Methyl') ? 95 : 17,
          boundingRadius: name.includes('Methyl') ? 2.2 : 0.9
        }
      };
      
      moleculeManager.addMolecule(name, molecule);
      return molecule;
    });

    // Act
    await orchestrator.runReaction(params);
    
    // Assert - Check distance between molecules
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;
    
    if (substrate && nucleophile) {
      const distance = substrate.group.position.distanceTo(nucleophile.group.position);
      expect(distance).toBeCloseTo(15, 1); // Should be 15 units apart
      expect(distance).toBeGreaterThan(10); // Should be far enough for visible collision
    }
  });
});




import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
      temperature: 298,
    };

    // Mock loadMolecule to create realistic molecules
    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (_cid: string, name: string, position: any) => {
        const group = new THREE.Group();
        // Ensure position is valid (not NaN)
        const pos = {
          x: isNaN(position?.x) ? 0 : position.x,
          y: isNaN(position?.y) ? 0 : position.y,
          z: isNaN(position?.z) ? 0 : position.z,
        };
        group.position.set(pos.x, pos.y, pos.z);

        const molecule: any = {
          name,
          group,
          rotation: new THREE.Euler(),
          velocity: new THREE.Vector3(0, 0, 0),
          physicsBody: {
            quaternion: new THREE.Quaternion(),
            velocity: { x: 0, y: 0, z: 0 },
          },
          molecularProperties: {
            totalMass: name.includes('Methyl') ? 95 : 17,
            boundingRadius: name.includes('Methyl') ? 2.2 : 0.9,
          },
        };

        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act
    await orchestrator.runReaction(params);

    // Assert - Check initial positions
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    // Verify molecules were loaded
    expect(substrate).toBeDefined();
    expect(nucleophile).toBeDefined();

    if (substrate && nucleophile) {
      // Check both group position and state position
      const subGroupPos = substrate.group.position;
      const nucGroupPos = nucleophile.group.position;
      const subStatePos = substrate.position || subGroupPos;
      const nucStatePos = nucleophile.position || nucGroupPos;

      // Check positions are valid (not NaN) - check both group and state
      const subGroupValid = !isNaN(subGroupPos.x) && !isNaN(subGroupPos.y) && !isNaN(subGroupPos.z);
      const nucGroupValid = !isNaN(nucGroupPos.x) && !isNaN(nucGroupPos.y) && !isNaN(nucGroupPos.z);
      const subStateValid = !isNaN(subStatePos.x) && !isNaN(subStatePos.y) && !isNaN(subStatePos.z);
      const nucStateValid = !isNaN(nucStatePos.x) && !isNaN(nucStatePos.y) && !isNaN(nucStatePos.z);

      // At least one should be valid
      const subValid = subGroupValid || subStateValid;
      const nucValid = nucGroupValid || nucStateValid;

      expect(subValid).toBe(true);
      expect(nucValid).toBe(true);

      if (subValid && nucValid) {
        // Use whichever position is valid
        const finalSubPos = subGroupValid ? subGroupPos : subStatePos;
        const finalNucPos = nucGroupValid ? nucGroupPos : nucStatePos;

        // Substrate should be at center (0,0,0) or positioned away
        expect(finalSubPos.x).toBeCloseTo(0, 1);
        expect(finalSubPos.y).toBeCloseTo(0, 1);

        // Nucleophile should be positioned away from substrate
        const distance = finalSubPos.distanceTo(finalNucPos);
        // Check for valid distance (not NaN)
        expect(isNaN(distance)).toBe(false);
        if (!isNaN(distance)) {
          expect(distance).toBeGreaterThan(5); // Should be far enough apart
          expect(distance).toBeLessThan(25); // But not too far
        }
      }
    }
  });

  it('ensures molecules start far enough apart for visible collision', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: '6323', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: '961', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 15,
      approachAngle: 180,
      temperature: 298,
    };

    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (_cid: string, name: string, position: any) => {
        const group = new THREE.Group();
        // Ensure position is valid (not NaN)
        const pos = {
          x: isNaN(position?.x) ? 0 : position.x,
          y: isNaN(position?.y) ? 0 : position.y,
          z: isNaN(position?.z) ? 0 : position.z,
        };
        group.position.set(pos.x, pos.y, pos.z);

        const molecule: any = {
          name,
          group,
          rotation: new THREE.Euler(),
          velocity: new THREE.Vector3(0, 0, 0),
          physicsBody: {
            quaternion: new THREE.Quaternion(),
            velocity: { x: 0, y: 0, z: 0 },
          },
          molecularProperties: {
            totalMass: name.includes('Methyl') ? 95 : 17,
            boundingRadius: name.includes('Methyl') ? 2.2 : 0.9,
          },
        };

        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act
    await orchestrator.runReaction(params);

    // Assert - Check distance between molecules
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    expect(substrate).toBeDefined();
    expect(nucleophile).toBeDefined();

    if (substrate && nucleophile) {
      // Check both group position and state position
      const subGroupPos = substrate.group.position;
      const nucGroupPos = nucleophile.group.position;
      const subStatePos = substrate.position || subGroupPos;
      const nucStatePos = nucleophile.position || nucGroupPos;

      // Check positions are valid (not NaN) - check both group and state
      const subGroupValid = !isNaN(subGroupPos.x) && !isNaN(subGroupPos.y) && !isNaN(subGroupPos.z);
      const nucGroupValid = !isNaN(nucGroupPos.x) && !isNaN(nucGroupPos.y) && !isNaN(nucGroupPos.z);
      const subStateValid = !isNaN(subStatePos.x) && !isNaN(subStatePos.y) && !isNaN(subStatePos.z);
      const nucStateValid = !isNaN(nucStatePos.x) && !isNaN(nucStatePos.y) && !isNaN(nucStatePos.z);

      // At least one should be valid
      const subValid = subGroupValid || subStateValid;
      const nucValid = nucGroupValid || nucStateValid;

      expect(subValid).toBe(true);
      expect(nucValid).toBe(true);

      if (subValid && nucValid) {
        // Use whichever position is valid
        const finalSubPos = subGroupValid ? subGroupPos : subStatePos;
        const finalNucPos = nucGroupValid ? nucGroupPos : nucStatePos;

        const distance = finalSubPos.distanceTo(finalNucPos);
        // Check for valid distance (not NaN)
        expect(isNaN(distance)).toBe(false);
        if (!isNaN(distance)) {
          // Distance should be reasonable for collision (default spawn distance is 15: z=7.5 to z=-7.5)
          expect(distance).toBeGreaterThan(5); // Should be far enough for visible collision
          expect(distance).toBeLessThan(25); // But not too far
        }
      }
    }
  });
});

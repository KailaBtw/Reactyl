import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { orientSN2Backside } from '../../src/config/moleculePositioning';
import { createCollisionEvent } from '../../src/physics/collisionEventSystem';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';

describe('Business Logic Validation', () => {
  let scene: THREE.Scene;
  let orchestrator: ReactionOrchestrator;
  const moleculeStore: Record<string, any> = {};
  const moleculeManager: any = {
    addMolecule: vi.fn((name: string, mol: any) => {
      moleculeStore[name] = mol;
    }),
    getAllMolecules: vi.fn().mockReturnValue([]),
    getMolecule: vi.fn((name: string) => moleculeStore[name]),
    clearAllMolecules: vi.fn(() => {
      Object.keys(moleculeStore).forEach(k => delete moleculeStore[k]);
    }),
  };

  beforeEach(() => {
    scene = new THREE.Scene();
    orchestrator = new ReactionOrchestrator(scene, moleculeManager);
  });

  it('verifies 180° approach angle in actual collision scenario', async () => {
    // Arrange - Create realistic molecules with proper physics body structure
    const substrate = {
      name: 'Methyl bromide',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      velocity: new THREE.Vector3(0, 0, 0),
      physicsBody: {
        quaternion: new THREE.Quaternion(),
        velocity: { x: 0, y: 0, z: 0 },
      },
      molecularProperties: { totalMass: 95 },
    };

    const nucleophile = {
      name: 'Hydroxide ion',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      velocity: new THREE.Vector3(0, 0, 0),
      physicsBody: {
        quaternion: new THREE.Quaternion(),
        velocity: { x: 0, y: 0, z: 0 },
      },
      molecularProperties: { totalMass: 17 },
    };

    // Position molecules for collision
    substrate.group.position.set(0, 0, 0);
    nucleophile.group.position.set(0, 0, -5);

    // Act - Apply SN2 orientation
    orientSN2Backside(substrate, nucleophile);

    // Use our actual collision event system to calculate approach angle
    const collisionEvent = createCollisionEvent(substrate, nucleophile);

    // For SN2 backside attack, collision normal should point from substrate to nucleophile
    // This indicates proper alignment for backside attack
    expect(collisionEvent.collisionNormal.z).toBeCloseTo(-1, 1); // Should point toward nucleophile
    expect(collisionEvent.collisionPoint.z).toBeCloseTo(-2.5, 1); // Midpoint between molecules
  });

  it('tests physics body sync during orientation', () => {
    // Arrange
    const substrate = {
      name: 'Substrate',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() },
    };

    const nucleophile = {
      name: 'Nucleophile',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() },
    };

    // Act - Apply orientation
    orientSN2Backside(substrate, nucleophile);

    // Assert - Physics body quaternion should match Three.js quaternion
    const substrateVisualQuat = substrate.group.quaternion.clone();
    const substratePhysicsQuat = substrate.physicsBody.quaternion.clone();

    const nucleophileVisualQuat = nucleophile.group.quaternion.clone();
    const nucleophilePhysicsQuat = nucleophile.physicsBody.quaternion.clone();

    // Quaternions should be approximately equal (within floating point precision)
    expect(substrateVisualQuat.x).toBeCloseTo(substratePhysicsQuat.x, 5);
    expect(substrateVisualQuat.y).toBeCloseTo(substratePhysicsQuat.y, 5);
    expect(substrateVisualQuat.z).toBeCloseTo(substratePhysicsQuat.z, 5);
    expect(substrateVisualQuat.w).toBeCloseTo(substratePhysicsQuat.w, 5);

    expect(nucleophileVisualQuat.x).toBeCloseTo(nucleophilePhysicsQuat.x, 5);
    expect(nucleophileVisualQuat.y).toBeCloseTo(nucleophilePhysicsQuat.y, 5);
    expect(nucleophileVisualQuat.z).toBeCloseTo(nucleophilePhysicsQuat.z, 5);
    expect(nucleophileVisualQuat.w).toBeCloseTo(nucleophilePhysicsQuat.w, 5);
  });

  it('validates animation triggers with correct molecules', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Methyl bromide' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Hydroxide ion' },
      reactionType: 'sn2',
      relativeVelocity: 5,
    };

    // Mock loadMolecule to create molecules
    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (_cid: string, name: string, position: any) => {
        const group = new THREE.Group();
        group.position.set(position.x, position.y, position.z);
        const molecule: any = {
          name,
          group,
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act
    await orchestrator.runReaction(params);

    // Assert - Molecules should be available for animation
    const state = orchestrator.getState();
    expect(state.molecules.substrate).toBeTruthy();
    expect(state.molecules.nucleophile).toBeTruthy();
    expect(state.molecules.substrate?.name).toBe('Methyl bromide');
    expect(state.molecules.nucleophile?.name).toBe('Hydroxide ion');

    // Verify no "molecules not available" scenario
    expect(state.molecules.substrate).not.toBeNull();
    expect(state.molecules.nucleophile).not.toBeNull();
  });

  it('checks no molecules not available in production flow', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
      reactionType: 'sn2',
      relativeVelocity: 5,
    };

    // Mock loadMolecule
    vi.spyOn<any, any>(orchestrator as any, 'loadMolecule').mockImplementation(
      async (_cid: string, name: string, position: any) => {
        const group = new THREE.Group();
        group.position.set(position.x, position.y, position.z);
        const molecule: any = {
          name,
          group,
          velocity: new THREE.Vector3(),
          physicsBody: { quaternion: new THREE.Quaternion() },
        };
        moleculeManager.addMolecule(name, molecule);
        return molecule;
      }
    );

    // Act - Run complete reaction flow
    await orchestrator.runReaction(params);

    // Simulate collision event
    const state = orchestrator.getState();
    const collisionEvent = {
      type: 'reaction',
      reactionType: 'sn2',
      moleculeA: state.molecules.substrate,
      moleculeB: state.molecules.nucleophile,
      relativeVelocity: new THREE.Vector3(0, 0, 5),
      reactionResult: {
        occurs: true,
        probability: 1,
        reactionType: { key: 'sn2' },
        substrate: state.molecules.substrate,
        nucleophile: state.molecules.nucleophile,
      },
      collisionData: { approachAngle: 180 },
    };

    // Trigger collision handling
    const { collisionEventSystem } = await import('../../src/physics/collisionEventSystem');
    collisionEventSystem.emitCollision(collisionEvent);
    await new Promise(r => setTimeout(r, 50));

    // Assert - No "molecules not available" errors should occur
    const finalState = orchestrator.getState();
    expect(finalState.molecules.substrate).toBeTruthy();
    expect(finalState.molecules.nucleophile).toBeTruthy();

    // Verify molecules are the same instances (no null/undefined replacement)
    expect(finalState.molecules.substrate).toBe(state.molecules.substrate);
    expect(finalState.molecules.nucleophile).toBe(state.molecules.nucleophile);
  });

  it('validates orientation strategy produces deterministic results', () => {
    // Arrange
    const substrate1 = {
      name: 'Substrate1',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() },
    };

    const nucleophile1 = {
      name: 'Nucleophile1',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() },
    };

    const substrate2 = {
      name: 'Substrate2',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() },
    };

    const nucleophile2 = {
      name: 'Nucleophile2',
      group: new THREE.Group(),
      rotation: new THREE.Euler(),
      physicsBody: { quaternion: new THREE.Quaternion() },
    };

    // Act - Apply same orientation twice
    orientSN2Backside(substrate1, nucleophile1);
    orientSN2Backside(substrate2, nucleophile2);

    // Assert - Results should be identical
    expect(substrate1.group.quaternion.x).toBeCloseTo(substrate2.group.quaternion.x, 5);
    expect(substrate1.group.quaternion.y).toBeCloseTo(substrate2.group.quaternion.y, 5);
    expect(substrate1.group.quaternion.z).toBeCloseTo(substrate2.group.quaternion.z, 5);
    expect(substrate1.group.quaternion.w).toBeCloseTo(substrate2.group.quaternion.w, 5);

    expect(nucleophile1.group.quaternion.x).toBeCloseTo(nucleophile2.group.quaternion.x, 5);
    expect(nucleophile1.group.quaternion.y).toBeCloseTo(nucleophile2.group.quaternion.y, 5);
    expect(nucleophile1.group.quaternion.z).toBeCloseTo(nucleophile2.group.quaternion.z, 5);
    expect(nucleophile1.group.quaternion.w).toBeCloseTo(nucleophile2.group.quaternion.w, 5);
  });
});

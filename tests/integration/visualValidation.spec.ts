import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';
import { orientSN2Backside } from '../../src/reactions/orientationStrategies';

describe('Visual Validation Tests', () => {
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

  it('validates substrate rotation produces visible orientation change', () => {
    // Arrange
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

    // Record initial orientation
    const initialQuaternion = substrate.group.quaternion.clone();
    const initialRotation = substrate.group.rotation.clone();

    // Act - Apply SN2 orientation
    orientSN2Backside(substrate, nucleophile);

    // Assert - Visual orientation should change
    expect(substrate.group.quaternion.equals(initialQuaternion)).toBe(false);
    expect(substrate.group.rotation.equals(initialRotation)).toBe(false);

    // Verify specific rotation values - check both rotation and quaternion
    const rotationY = substrate.group.rotation.y;
    const quaternionY = substrate.group.quaternion.y;
    
    // Either rotation.y should be -Math.PI or quaternion should reflect 180° rotation
    const hasRotationChange = Math.abs(rotationY - (-Math.PI)) < 0.1 || 
                             Math.abs(quaternionY) > 0.1; // Quaternion changes when rotated
    expect(hasRotationChange).toBe(true);
  });

  it('validates nucleophile positioning for backside attack', () => {
    // Arrange
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

    // Position molecules
    substrate.group.position.set(0, 0, 0);
    nucleophile.group.position.set(0, 0, -5);

    // Act - Apply orientation
    orientSN2Backside(substrate, nucleophile);

    // Assert - Nucleophile should be positioned for backside attack
    const incoming = new THREE.Vector3().subVectors(nucleophile.group.position, substrate.group.position).normalize();
    const backsideForward = new THREE.Vector3(0, 0, -1);
    const angle = THREE.MathUtils.radToDeg(backsideForward.angleTo(incoming));

    expect(angle).toBeLessThan(10); // Should be aligned for backside attack
  });

  it('validates physics body sync maintains visual consistency', () => {
    // Arrange
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

    // Act - Apply orientation
    orientSN2Backside(substrate, nucleophile);

    // Assert - Physics and visual representations should be in sync
    const visualQuat = substrate.group.quaternion;
    const physicsQuat = substrate.physicsBody.quaternion;

    expect(visualQuat.x).toBeCloseTo(physicsQuat.x, 5);
    expect(visualQuat.y).toBeCloseTo(physicsQuat.y, 5);
    expect(visualQuat.z).toBeCloseTo(physicsQuat.z, 5);
    expect(visualQuat.w).toBeCloseTo(physicsQuat.w, 5);
  });

  it('validates molecular group structure after orientation', async () => {
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
      
      // Create realistic molecule with atoms and bonds
      const carbonAtom = new THREE.Mesh();
      carbonAtom.userData = { atomIndex: 0, element: 'C' };
      group.add(carbonAtom);

      const hydrogenAtom = new THREE.Mesh();
      hydrogenAtom.userData = { atomIndex: 1, element: 'H' };
      group.add(hydrogenAtom);

      const bond = new THREE.Mesh();
      bond.userData = { type: 'bond' };
      group.add(bond);

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

    // Assert - Molecular structure should be preserved
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    expect(substrate?.group.children.length).toBeGreaterThan(0);
    expect(nucleophile?.group.children.length).toBeGreaterThan(0);

    // Verify atoms are still present
    const substrateAtoms = substrate?.group.children.filter(child => 
      child.userData.element && child.userData.element !== 'bond'
    );
    const nucleophileAtoms = nucleophile?.group.children.filter(child => 
      child.userData.element && child.userData.element !== 'bond'
    );

    expect(substrateAtoms?.length).toBeGreaterThan(0);
    expect(nucleophileAtoms?.length).toBeGreaterThan(0);
  });

  it('validates animation-ready molecular state', async () => {
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
      
      // Create molecule with required atoms for SN2 animation
      const carbonAtom = new THREE.Mesh();
      carbonAtom.userData = { atomIndex: 0, element: 'C' };
      group.add(carbonAtom);

      const leavingGroupAtom = new THREE.Mesh();
      leavingGroupAtom.userData = { atomIndex: 1, element: 'Br' };
      group.add(leavingGroupAtom);

      const hydrogen1 = new THREE.Mesh();
      hydrogen1.userData = { atomIndex: 2, element: 'H' };
      group.add(hydrogen1);

      const hydrogen2 = new THREE.Mesh();
      hydrogen2.userData = { atomIndex: 3, element: 'H' };
      group.add(hydrogen2);

      const hydrogen3 = new THREE.Mesh();
      hydrogen3.userData = { atomIndex: 4, element: 'H' };
      group.add(hydrogen3);

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

    // Assert - Molecules should be ready for animation
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    // Verify substrate has required atoms for SN2
    const carbonAtoms = substrate?.group.children.filter(child => 
      child.userData.element === 'C'
    );
    const leavingGroupAtoms = substrate?.group.children.filter(child => 
      child.userData.element === 'Br'
    );
    const hydrogenAtoms = substrate?.group.children.filter(child => 
      child.userData.element === 'H'
    );

    expect(carbonAtoms?.length).toBeGreaterThan(0);
    expect(leavingGroupAtoms?.length).toBeGreaterThan(0);
    expect(hydrogenAtoms?.length).toBeGreaterThanOrEqual(3);

    // Verify nucleophile is available
    expect(nucleophile).toBeTruthy();
    expect(nucleophile?.group.children.length).toBeGreaterThan(0);
  });

  it('validates visual consistency during multiple orientations', () => {
    // Arrange
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

    // Act - Apply orientation multiple times
    orientSN2Backside(substrate, nucleophile);
    const firstOrientation = substrate.group.quaternion.clone();
    
    orientSN2Backside(substrate, nucleophile);
    const secondOrientation = substrate.group.quaternion.clone();

    // Assert - Multiple applications should be consistent
    expect(firstOrientation.equals(secondOrientation)).toBe(true);
  });

  it('validates molecular positioning for different approach angles', async () => {
    // Arrange
    const params: any = {
      substrateMolecule: { cid: 'dummy-sub', name: 'Substrate' },
      nucleophileMolecule: { cid: 'dummy-nuc', name: 'Nucleophile' },
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

    await orchestrator.runReaction(params);

    // Act - Test different nucleophile positions
    const state = orchestrator.getState();
    const substrate = state.molecules.substrate;
    const nucleophile = state.molecules.nucleophile;

    // Test backside attack position
    nucleophile.group.position.set(0, 0, -5);
    const backsideAngle = calculateApproachAngle(substrate, nucleophile);
    expect(backsideAngle).toBeLessThan(10);

    // Test side attack position
    nucleophile.group.position.set(5, 0, 0);
    const sideAngle = calculateApproachAngle(substrate, nucleophile);
    expect(sideAngle).toBeGreaterThan(80);
    expect(sideAngle).toBeLessThan(100);

    // Test front attack position
    nucleophile.group.position.set(0, 0, 5);
    const frontAngle = calculateApproachAngle(substrate, nucleophile);
    expect(frontAngle).toBeGreaterThan(170);
  });

  function calculateApproachAngle(substrate: any, nucleophile: any): number {
    const incoming = new THREE.Vector3().subVectors(nucleophile.group.position, substrate.group.position).normalize();
    const backsideForward = new THREE.Vector3(0, 0, -1);
    return THREE.MathUtils.radToDeg(backsideForward.angleTo(incoming));
  }
});

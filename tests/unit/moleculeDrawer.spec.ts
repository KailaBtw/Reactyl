import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { drawMolecule } from '../../src/components/moleculeDrawer';
import { physicsEngine } from '../../src/physics/cannonPhysicsEngine';
import { createMockMoleculeManager, createMockPhysicsEngine } from '../fixtures/mockMolecules';
import { MOL_FILES, TEST_POSITIONS } from '../fixtures/molFiles';

describe('Molecule Drawer', () => {
  let scene: THREE.Scene;
  let moleculeManager: any;
  let mockPhysicsEngine: any;

  beforeEach(() => {
    scene = new THREE.Scene();
    moleculeManager = createMockMoleculeManager();
    mockPhysicsEngine = createMockPhysicsEngine();

    // Mock physics engine
    vi.spyOn(physicsEngine, 'addMolecule').mockReturnValue(true);
    vi.spyOn(physicsEngine, 'getPhysicsBody').mockReturnValue({
      quaternion: new THREE.Quaternion(),
    });
    vi.spyOn(physicsEngine, 'setVelocity').mockImplementation(() => {});
  });

  it('positions molecules at correct initial location', () => {
    // Arrange
    const position = TEST_POSITIONS.SIDE_ATTACK;

    // Act
    drawMolecule(MOL_FILES.METHYL_BROMIDE, moleculeManager, scene, position, 'TestMolecule', false);

    // Assert
    const createdMolecule = moleculeManager.newMolecule.mock.results[0].value;
    expect(createdMolecule.group.position.x).toBeCloseTo(position.x, 1);
    expect(createdMolecule.group.position.y).toBeCloseTo(position.y, 1);
    expect(createdMolecule.group.position.z).toBeCloseTo(position.z, 1);
  });

  it('initializes molecules with zero velocity', () => {
    // Act
    drawMolecule(
      MOL_FILES.METHYL_BROMIDE,
      moleculeManager,
      scene,
      TEST_POSITIONS.CENTER,
      'TestMolecule',
      false
    );

    // Assert
    const createdMolecule = moleculeManager.newMolecule.mock.results[0].value;
    expect(createdMolecule.velocity.x).toBeCloseTo(0, 6);
    expect(createdMolecule.velocity.y).toBeCloseTo(0, 6);
    expect(createdMolecule.velocity.z).toBeCloseTo(0, 6);
  });

  it('does not call setMoleculeVelocity automatically', () => {
    // Act
    drawMolecule(
      MOL_FILES.METHYL_BROMIDE,
      moleculeManager,
      scene,
      TEST_POSITIONS.CENTER,
      'TestMolecule',
      false
    );

    // Assert - setMoleculeVelocity should not be called
    expect(moleculeManager.setMoleculeVelocity).not.toHaveBeenCalled();
  });

  it('adds physics body to molecules', () => {
    // Act
    drawMolecule(
      MOL_FILES.METHYL_BROMIDE,
      moleculeManager,
      scene,
      TEST_POSITIONS.CENTER,
      'TestMolecule',
      false
    );

    // Assert
    expect(physicsEngine.addMolecule).toHaveBeenCalled();
    expect(physicsEngine.getPhysicsBody).toHaveBeenCalled();
  });

  it('adds molecule to scene', () => {
    // Arrange
    const initialChildCount = scene.children.length;

    // Act
    drawMolecule(
      MOL_FILES.METHYL_BROMIDE,
      moleculeManager,
      scene,
      TEST_POSITIONS.CENTER,
      'TestMolecule',
      false
    );

    // Assert
    expect(scene.children.length).toBe(initialChildCount + 1);
  });

  it('handles different molecule sizes correctly', () => {
    // Act - Small molecule (2 atoms)
    drawMolecule(
      MOL_FILES.HYDROXIDE_ION,
      moleculeManager,
      scene,
      TEST_POSITIONS.CENTER,
      'SmallMolecule',
      false
    );

    // Assert
    expect(physicsEngine.addMolecule).toHaveBeenCalled();
    const createdMolecule = moleculeManager.newMolecule.mock.results[0].value;
    // The actual molecular properties are calculated from the MOL file, not our mock
    expect(createdMolecule.molecularProperties.totalMass).toBeCloseTo(17.007, 1); // Actual hydroxide ion mass
    expect(createdMolecule.molecularProperties.boundingRadius).toBeGreaterThan(0); // Should have some radius
  });

  it('applies random rotation when requested', () => {
    // Act
    drawMolecule(
      MOL_FILES.METHYL_BROMIDE,
      moleculeManager,
      scene,
      TEST_POSITIONS.CENTER,
      'TestMolecule',
      true
    );

    // Assert
    const createdMolecule = moleculeManager.newMolecule.mock.results[0].value;
    // Random rotation should be applied (not zero)
    expect(createdMolecule.group.rotation.x).not.toBe(0);
    expect(createdMolecule.group.rotation.z).not.toBe(0);
  });

  it('does not apply random rotation when not requested', () => {
    // Act
    drawMolecule(
      MOL_FILES.METHYL_BROMIDE,
      moleculeManager,
      scene,
      TEST_POSITIONS.CENTER,
      'TestMolecule',
      false
    );

    // Assert
    const createdMolecule = moleculeManager.newMolecule.mock.results[0].value;
    // No random rotation should be applied (should be zero)
    expect(createdMolecule.group.rotation.x).toBe(0);
    expect(createdMolecule.group.rotation.z).toBe(0);
  });
});

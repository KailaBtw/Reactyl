import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { orientSN2Backside } from '../../src/reactions/orientationStrategies';
import { createCollisionEvent } from '../../src/physics/collisionEventSystem';
import { computeKinematics } from '../../src/reactions/physicsConfigurator';

describe('Performance Tests', () => {
  beforeEach(() => {
    // Mock console.log to avoid performance impact from debug logging
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('orientation strategy completes within acceptable time', () => {
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

    // Act & Measure
    const startTime = performance.now();
    orientSN2Backside(substrate, nucleophile);
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Assert - Should complete within 2ms (allowing for test environment overhead)
    expect(executionTime).toBeLessThan(2);
  });

  it('handles multiple rapid orientations efficiently', () => {
    // Arrange
    const molecules = Array.from({ length: 100 }, (_, i) => ({
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

    // Act & Measure
    const startTime = performance.now();
    molecules.forEach(({ substrate, nucleophile }) => {
      orientSN2Backside(substrate, nucleophile);
    });
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Assert - 100 orientations should complete within 15ms (after removing debug logs)
    expect(executionTime).toBeLessThan(15);
  });

  it('quaternion operations are efficient', () => {
    // Arrange
    const quaternions = Array.from({ length: 1000 }, () => new THREE.Quaternion());
    const rotations = Array.from({ length: 1000 }, () => new THREE.Euler());

    // Act & Measure
    const startTime = performance.now();
    quaternions.forEach((quat, i) => {
      quat.setFromEuler(rotations[i]);
    });
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Assert - 1000 quaternion operations should complete within 5ms
    expect(executionTime).toBeLessThan(5);
  });

  it('collision event creation is efficient', () => {
    // Arrange - Test our actual collision event creation function
    const molecules = Array.from({ length: 100 }, () => ({
      group: { position: new THREE.Vector3(Math.random() * 100, Math.random() * 100, Math.random() * 100) },
      velocity: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
      name: 'TestMolecule'
    }));

    // Act & Measure
    const startTime = performance.now();
    for (let i = 0; i < 50; i++) {
      createCollisionEvent(molecules[i], molecules[i + 50]);
    }
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Assert - 50 collision event creations should complete within 5ms
    expect(executionTime).toBeLessThan(5);
  });

  it('kinematics computation is efficient', () => {
    // Arrange - Test our actual kinematics computation function
    const testParams = Array.from({ length: 100 }, () => ({
      approachAngle: Math.random() * 360,
      relativeVelocity: Math.random() * 10
    }));

    // Act & Measure
    const startTime = performance.now();
    testParams.forEach(params => {
      computeKinematics(params);
    });
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Assert - 100 kinematics computations should complete within 5ms
    expect(executionTime).toBeLessThan(5);
  });

  it('molecule creation and manipulation is efficient', () => {
    // Arrange
    const moleculeCount = 100;

    // Act & Measure
    const startTime = performance.now();
    const molecules = Array.from({ length: moleculeCount }, (_, i) => {
      const group = new THREE.Group();
      group.position.set(i, 0, 0);
      
      // Add some atoms
      for (let j = 0; j < 5; j++) {
        const atom = new THREE.Mesh();
        atom.userData = { atomIndex: j, element: 'C' };
        group.add(atom);
      }

      return {
        name: `Molecule${i}`,
        group,
        rotation: new THREE.Euler(),
        velocity: new THREE.Vector3(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };
    });

    // Apply orientations
    molecules.forEach((molecule, i) => {
      const nucleophile = molecules[(i + 1) % molecules.length];
      orientSN2Backside(molecule, nucleophile);
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Assert - 100 molecules with orientations should complete within 70ms (test environment overhead)
    expect(executionTime).toBeLessThan(70);
  });

  it('memory usage remains stable during repeated operations', () => {
    // Arrange
    const iterations = 1000;
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Act
    for (let i = 0; i < iterations; i++) {
      const substrate = {
        name: `Substrate${i}`,
        group: new THREE.Group(),
        rotation: new THREE.Euler(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };

      const nucleophile = {
        name: `Nucleophile${i}`,
        group: new THREE.Group(),
        rotation: new THREE.Euler(),
        physicsBody: { quaternion: new THREE.Quaternion() }
      };

      orientSN2Backside(substrate, nucleophile);
    }

    // Assert - Memory usage should not grow excessively
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryGrowth = finalMemory - initialMemory;
    
    // Allow for some memory growth but not excessive
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
  });

  it('orientation strategy scales linearly with molecule count', () => {
    // Arrange
    const moleculeCounts = [10, 50, 100];
    const executionTimes: number[] = [];

    moleculeCounts.forEach(count => {
      const molecules = Array.from({ length: count }, (_, i) => ({
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

      // Act & Measure
      const startTime = performance.now();
      molecules.forEach(({ substrate, nucleophile }) => {
        orientSN2Backside(substrate, nucleophile);
      });
      const endTime = performance.now();
      executionTimes.push(endTime - startTime);
    });

    // Assert - Execution time should scale roughly linearly (with more tolerance for test environment)
    const ratio1 = executionTimes[1] / executionTimes[0]; // 50/10 = 5x
    const ratio2 = executionTimes[2] / executionTimes[0]; // 100/10 = 10x

    expect(ratio1).toBeLessThan(15); // Allow more variance for test environment
    expect(ratio2).toBeLessThan(25); // Allow more variance for test environment
  });
});

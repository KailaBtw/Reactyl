import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { getNormalizedVectorAB } from '../../src/utils/vectorHelper';

describe('Math Utilities', () => {
  describe('Vector Helper Functions', () => {
    it('getNormalizedVectorAB calculates correct direction vectors', () => {
      // Arrange
      const positionA = new THREE.Vector3(0, 0, 0);
      const positionB = new THREE.Vector3(3, 4, 0);

      // Act
      const direction = getNormalizedVectorAB(positionA, positionB);

      // Assert
      expect(direction.x).toBeCloseTo(0.6, 2); // 3/5
      expect(direction.y).toBeCloseTo(0.8, 2); // 4/5
      expect(direction.z).toBeCloseTo(0, 2);
      expect(direction.length()).toBeCloseTo(1, 5); // Should be normalized
    });

    it('handles zero distance vectors correctly', () => {
      // Arrange
      const positionA = new THREE.Vector3(5, 5, 5);
      const positionB = new THREE.Vector3(5, 5, 5); // Same position

      // Act
      const direction = getNormalizedVectorAB(positionA, positionB);

      // Assert - Should handle zero distance gracefully
      expect(direction.x).toBeCloseTo(0, 5);
      expect(direction.y).toBeCloseTo(0, 5);
      expect(direction.z).toBeCloseTo(0, 5);
    });

    it('handles negative coordinates correctly', () => {
      // Arrange
      const positionA = new THREE.Vector3(1, 1, 1);
      const positionB = new THREE.Vector3(-1, -1, -1);

      // Act
      const direction = getNormalizedVectorAB(positionA, positionB);

      // Assert
      expect(direction.x).toBeCloseTo(-Math.sqrt(3)/3, 2);
      expect(direction.y).toBeCloseTo(-Math.sqrt(3)/3, 2);
      expect(direction.z).toBeCloseTo(-Math.sqrt(3)/3, 2);
      expect(direction.length()).toBeCloseTo(1, 5);
    });

    it('handles large coordinates correctly', () => {
      // Arrange
      const positionA = new THREE.Vector3(0, 0, 0);
      const positionB = new THREE.Vector3(1000, 0, 0);

      // Act
      const direction = getNormalizedVectorAB(positionA, positionB);

      // Assert
      expect(direction.x).toBeCloseTo(1, 5);
      expect(direction.y).toBeCloseTo(0, 5);
      expect(direction.z).toBeCloseTo(0, 5);
      expect(direction.length()).toBeCloseTo(1, 5);
    });
  });
});
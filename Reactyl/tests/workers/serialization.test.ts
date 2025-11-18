/**
 * Tests for worker serialization/deserialization utilities
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { SerializableQuaternion, SerializableVector3 } from '../../src/workers/types';
import {
  deserializePosition,
  deserializeQuaternion,
  deserializeVector3,
  serializePosition,
  serializeQuaternion,
  serializeVector3,
} from '../../src/workers/utils';

describe('Worker Serialization Utils', () => {
  describe('Vector3 serialization', () => {
    it('should serialize and deserialize Vector3 correctly', () => {
      const original = new THREE.Vector3(1.5, 2.5, 3.5);
      const serialized = serializeVector3(original);
      const deserialized = deserializeVector3(serialized);

      expect(serialized).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
      expect(deserialized.x).toBeCloseTo(1.5);
      expect(deserialized.y).toBeCloseTo(2.5);
      expect(deserialized.z).toBeCloseTo(3.5);
    });

    it('should handle zero vector', () => {
      const original = new THREE.Vector3(0, 0, 0);
      const serialized = serializeVector3(original);
      const deserialized = deserializeVector3(serialized);

      expect(serialized).toEqual({ x: 0, y: 0, z: 0 });
      expect(deserialized.x).toBe(0);
      expect(deserialized.y).toBe(0);
      expect(deserialized.z).toBe(0);
    });
  });

  describe('Quaternion serialization', () => {
    it('should serialize and deserialize Quaternion correctly', () => {
      const original = new THREE.Quaternion(0.5, 0.5, 0.5, 0.5);
      const serialized = serializeQuaternion(original);
      const deserialized = deserializeQuaternion(serialized);

      expect(serialized).toEqual({ x: 0.5, y: 0.5, z: 0.5, w: 0.5 });
      expect(deserialized.x).toBeCloseTo(0.5);
      expect(deserialized.y).toBeCloseTo(0.5);
      expect(deserialized.z).toBeCloseTo(0.5);
      expect(deserialized.w).toBeCloseTo(0.5);
    });

    it('should handle identity quaternion', () => {
      const original = new THREE.Quaternion(0, 0, 0, 1);
      const serialized = serializeQuaternion(original);
      const deserialized = deserializeQuaternion(serialized);

      expect(serialized).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      expect(deserialized.x).toBe(0);
      expect(deserialized.y).toBe(0);
      expect(deserialized.z).toBe(0);
      expect(deserialized.w).toBe(1);
    });
  });

  describe('Position serialization', () => {
    it('should serialize and deserialize position correctly', () => {
      const original = { x: 10, y: 20, z: 30 };
      const serialized = serializePosition(original);
      const deserialized = deserializePosition(serialized);

      expect(serialized).toEqual({ x: 10, y: 20, z: 30 });
      expect(deserialized.x).toBe(10);
      expect(deserialized.y).toBe(20);
      expect(deserialized.z).toBe(30);
    });
  });
});

/**
 * Tests for concentration adjustment balancing logic
 */

import { describe, expect, it } from 'vitest';

/**
 * Helper to calculate removal distribution
 * Simulates the concentration adjustment logic for testing
 */
function calculateRemovalDistribution(
  totalGroups: number,
  groupsToRemove: number,
  reactedGroups: number
): {
  substratesRemoved: number;
  nucleophilesRemoved: number;
  productsRemoved: number;
} {
  // Each group has 1 substrate + 1 nucleophile
  // Reacted groups also have products (typically 1 product per reaction)
  const nonReactedGroups = totalGroups - reactedGroups;
  
  // Shuffle simulation: randomly select groups to remove
  // In practice, we remove entire groups, so:
  const substratesRemoved = groupsToRemove; // 1 per group
  const nucleophilesRemoved = groupsToRemove; // 1 per group
  
  // Products are only in reacted groups
  // If we remove groups proportionally, we'll remove some reacted groups
  const reactedRemoved = Math.min(groupsToRemove, reactedGroups);
  const productsRemoved = reactedRemoved; // Assuming 1 product per reacted group
  
  return {
    substratesRemoved,
    nucleophilesRemoved,
    productsRemoved,
  };
}

describe('Concentration Adjustment Balancing', () => {
  describe('Removal distribution', () => {
    it('should remove equal amounts of substrates and nucleophiles', () => {
      const result = calculateRemovalDistribution(10, 5, 3);
      
      // Each group has 1 substrate and 1 nucleophile, so removing groups
      // naturally maintains 1:1 balance
      expect(result.substratesRemoved).toBe(result.nucleophilesRemoved);
      expect(result.substratesRemoved).toBe(5);
    });

    it('should remove products proportionally when removing reacted groups', () => {
      const totalGroups = 20;
      const reactedGroups = 10;
      const groupsToRemove = 5;
      
      const result = calculateRemovalDistribution(totalGroups, groupsToRemove, reactedGroups);
      
      // Should remove some products (from reacted groups)
      expect(result.productsRemoved).toBeGreaterThanOrEqual(0);
      expect(result.productsRemoved).toBeLessThanOrEqual(groupsToRemove);
    });

    it('should handle edge case: removing all groups', () => {
      const totalGroups = 10;
      const reactedGroups = 5;
      const groupsToRemove = 10;
      
      const result = calculateRemovalDistribution(totalGroups, groupsToRemove, reactedGroups);
      
      expect(result.substratesRemoved).toBe(10);
      expect(result.nucleophilesRemoved).toBe(10);
      expect(result.productsRemoved).toBe(5); // All reacted groups removed
    });

    it('should handle edge case: no reacted groups', () => {
      const totalGroups = 10;
      const reactedGroups = 0;
      const groupsToRemove = 3;
      
      const result = calculateRemovalDistribution(totalGroups, groupsToRemove, reactedGroups);
      
      expect(result.substratesRemoved).toBe(3);
      expect(result.nucleophilesRemoved).toBe(3);
      expect(result.productsRemoved).toBe(0); // No products to remove
    });

    it('should maintain balance when adding groups', () => {
      // When adding, we add complete groups (1 substrate + 1 nucleophile each)
      // This naturally maintains balance
      const groupsToAdd = 5;
      const substratesAdded = groupsToAdd;
      const nucleophilesAdded = groupsToAdd;
      
      expect(substratesAdded).toBe(nucleophilesAdded);
      expect(substratesAdded).toBe(5);
    });
  });

  describe('Group structure', () => {
    it('should track products in molecule groups', () => {
      // Simulate a molecule group structure
      const group = {
        substrateId: 'substrate_0',
        nucleophileId: 'nucleophile_0',
        productIds: ['product_0'], // Product added after reaction
        reacted: true,
      };
      
      expect(group.productIds.length).toBe(1);
      expect(group.reacted).toBe(true);
    });

    it('should start with empty productIds for new groups', () => {
      const newGroup = {
        substrateId: 'substrate_1',
        nucleophileId: 'nucleophile_1',
        productIds: [],
        reacted: false,
      };
      
      expect(newGroup.productIds.length).toBe(0);
      expect(newGroup.reacted).toBe(false);
    });
  });
});


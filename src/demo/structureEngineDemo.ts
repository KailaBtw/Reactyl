/**
 * Simple demo script to test StructureEngine integration
 * Can be called from browser console for testing
 */

import * as THREE from 'three';
import { StructureEngine } from '../engines/structureEngine';
import { ChemicalDataService } from '../chemistry/chemicalDataService';
import { createMoleculeManager } from '../services/moleculeManager';
import { log } from '../utils/debug';

/**
 * Test the StructureEngine system
 * Call from browser console: window.testStructureEngine()
 */
export async function testStructureEngine(): Promise<void> {
  log('🧪 Testing StructureEngine System...');
  
  try {
    // Get scene from existing system
    const scene = (window as any).scene || (window as any).threeJSBridge?.scene;
    if (!scene) {
      log('❌ No Three.js scene found');
      return;
    }
    
    // Initialize StructureEngine
    const structureEngine = new StructureEngine(scene);
    log('✅ StructureEngine initialized');
    
    // Test available reactions
    const reactions = structureEngine.getAvailableReactionTypes();
    log(`Available reactions: ${reactions.join(', ')}`);
    
    // Test chemical data service
    const chemService = new ChemicalDataService();
    
    // Load a simple molecule (methyl bromide)
    log('Loading methyl bromide...');
    const molecularData = await chemService.fetchMoleculeByCID('6323');
    
    // Create enhanced structure
    log('Creating enhanced structure...');
    const structure = await structureEngine.createStructure(
      'test_methyl_bromide',
      molecularData,
      new THREE.Vector3(2, 0, 0) // Offset from center
    );
    
    log(`✅ Created structure with ${structure.atoms.length} atoms and ${structure.bonds.length} bonds`);
    
    // Test reaction detection with single molecule (should find no reactions)
    const possibleReactions = await structureEngine.detectPossibleReactions(['test_methyl_bromide']);
    log(`Possible reactions with 1 molecule: ${possibleReactions.length}`);
    
    // Load second molecule (hydroxide)
    log('Loading hydroxide ion...');
    const nucleophileData = await chemService.fetchMoleculeByCID('961');
    
    const nucleophileStructure = await structureEngine.createStructure(
      'test_hydroxide',
      nucleophileData,
      new THREE.Vector3(-2, 0, 0) // Opposite side
    );
    
    log(`✅ Created nucleophile with ${nucleophileStructure.atoms.length} atoms`);
    
    // Test reaction detection with two molecules
    const twoMoleculeReactions = await structureEngine.detectPossibleReactions([
      'test_methyl_bromide', 
      'test_hydroxide'
    ]);
    
    log(`Possible reactions with 2 molecules: ${twoMoleculeReactions.length}`);
    
    if (twoMoleculeReactions.length > 0) {
      const bestReaction = twoMoleculeReactions[0];
      log(`Best reaction: ${bestReaction.type} (confidence: ${(bestReaction.confidence * 100).toFixed(1)}%)`);
      
      // Test orientation
      log('Testing molecular orientation...');
      await structureEngine.orientForReaction(
        ['test_methyl_bromide', 'test_hydroxide'],
        bestReaction.type
      );
      
      log('✅ Molecular orientation completed');
      
      // Get optimal conditions
      const conditions = structureEngine.getOptimalConditions(
        ['test_methyl_bromide', 'test_hydroxide'], 
        bestReaction.type
      );
      
      log(`Optimal conditions: ${JSON.stringify(conditions, null, 2)}`);
    }
    
    // Get system statistics
    const stats = structureEngine.getStats();
    log(`System statistics:`, stats);
    
    log('🎉 StructureEngine test completed successfully!');
    
    // Store reference for further testing
    (window as any).structureEngine = structureEngine;
    log('💡 StructureEngine stored as window.structureEngine for further testing');
    
  } catch (error) {
    log(`❌ StructureEngine test failed: ${error}`);
    console.error('Full error:', error);
  }
}

/**
 * Test enhanced reaction demo
 * Call from browser console: window.testEnhancedDemo()
 */
export async function testEnhancedDemo(): Promise<void> {
  log('🎬 Testing Enhanced Reaction Demo...');
  
  try {
    // Get scene and molecule manager from existing system
    const scene = (window as any).scene;
    const moleculeManager = (window as any).moleculeManager || createMoleculeManager();
    
    if (!scene) {
      log('❌ No Three.js scene found');
      return;
    }
    
    // Import and test enhanced demo
    const { EnhancedReactionDemo } = await import('../components/enhancedReactionDemo');
    
    const enhancedDemo = new EnhancedReactionDemo(scene);
    
    // Test system
    await enhancedDemo.testEnhancedSystem();
    
    // Test molecule loading
    log('Testing direct molecule loading...');
    const structureIds = await enhancedDemo.loadMoleculesDirectly(
      moleculeManager,
      scene,
      (status) => log(`Status: ${status}`)
    );
    
    log(`✅ Loaded ${structureIds.length} structures directly`);
    
    // Get enhanced stats
    const stats = enhancedDemo.getEnhancedStats();
    log('Enhanced demo stats:', stats);
    
    log('🎉 Enhanced demo test completed!');
    
    // Store reference
    (window as any).enhancedDemo = enhancedDemo;
    log('💡 Enhanced demo stored as window.enhancedDemo');
    
  } catch (error) {
    log(`❌ Enhanced demo test failed: ${error}`);
    console.error('Full error:', error);
  }
}

/**
 * Quick cache test
 */
export async function testCacheSystem(): Promise<void> {
  log('💾 Testing Cache System...');
  
  try {
    const { enhancedCacheService } = await import('../services/enhancedCacheService');
    
    // Test cache stats
    const stats = await enhancedCacheService.getCacheStats();
    log('Cache statistics:', stats);
    
    // Test cache cleanup
    await enhancedCacheService.clearExpiredCache();
    
    log('✅ Cache system test completed');
    
  } catch (error) {
    log(`❌ Cache test failed: ${error}`);
  }
}

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testStructureEngine = testStructureEngine;
  (window as any).testEnhancedDemo = testEnhancedDemo;
  (window as any).testCacheSystem = testCacheSystem;
  
  log('🔧 Demo functions available:');
  log('  - window.testStructureEngine()');
  log('  - window.testEnhancedDemo()'); 
  log('  - window.testCacheSystem()');
}

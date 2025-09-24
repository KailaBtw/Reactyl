/**
 * Enhanced Reaction Demo that integrates StructureEngine with existing systems
 * Extends the current ReactionDemo while preserving all existing functionality
 */

import * as THREE from 'three';
import { ReactionDemo } from './reactionDemo';
import { StructureEngine } from '../engines/structureEngine';
import { ChemicalDataService } from '../chemistry/chemicalDataService';
import { drawMolecule } from './moleculeDrawer';
import type { MoleculeManager } from '../types';
import { log } from '../utils/debug';

export class EnhancedReactionDemo extends ReactionDemo {
  private structureEngine: StructureEngine;
  
  constructor(scene: THREE.Scene) {
    super(scene);
    this.structureEngine = new StructureEngine(scene);
    
    log('🚀 EnhancedReactionDemo initialized');
  }
  
  /**
   * Enhanced demo that uses StructureEngine for intelligent positioning
   */
  async runEnhancedSN2Demo(
    moleculeManager: MoleculeManager,
    scene: THREE.Scene,
    timeControls: any,
    reactionParams: any
  ): Promise<void> {
    
    log('🎬 Starting Enhanced SN2 Reaction Demo...');
    
    try {
      // Load molecules with enhanced structures
      const structureIds = await this.loadMoleculesWithEnhancement(moleculeManager, scene);
      
      if (structureIds.length < 2) {
        log('❌ Need at least 2 molecules for SN2 reaction');
        return;
      }
      
      // Detect possible reactions
      const possibleReactions = await this.structureEngine.detectPossibleReactions(structureIds);
      
      if (possibleReactions.length === 0) {
        log('❌ No feasible reactions detected');
        return;
      }
      
      const bestReaction = possibleReactions[0];
      log(`🎯 Best reaction: ${bestReaction.type} (confidence: ${(bestReaction.confidence * 100).toFixed(1)}%)`);
      
      // Get optimal conditions
      const optimalConditions = this.structureEngine.getOptimalConditions(structureIds, bestReaction.type);
      log(`🌡️ Optimal conditions: ${JSON.stringify(optimalConditions)}`);
      
      // Orient molecules using intelligent system (replaces complex manual orientation)
      await this.structureEngine.orientForReaction(structureIds, bestReaction.type, optimalConditions);
      
      // Set up collision system (preserve existing physics)
      const molecules = moleculeManager.getAllMolecules();
      this.setupCollisionSystem(molecules, reactionParams);
      
      // Create and animate transition state
      const transitionState = await this.structureEngine.createTransitionState(
        [structureIds[0]], // substrate
        [structureIds[1]], // nucleophile  
        bestReaction.type,
        optimalConditions
      );
      
      // Start demo animation (preserve existing timing controls)
      this.startDemoAnimation(timeControls, molecules);
      
      // Animate complete reaction pathway
      setTimeout(async () => {
        try {
          await this.structureEngine.animateReaction(
            `ts_${structureIds[0]}_${structureIds[1]}_${bestReaction.type}`,
            3000 // 3 seconds
          );
          
          log('✅ Enhanced SN2 demo completed successfully!');
        } catch (error) {
          log(`⚠️ Animation error: ${error}`);
        }
      }, 2000); // Start animation after 2 seconds
      
    } catch (error) {
      log(`❌ Enhanced demo failed: ${error}`);
      // Fallback to original demo
      await this.runDemo(moleculeManager, scene, timeControls, reactionParams);
    }
  }
  
  /**
   * Load molecules and create enhanced structures
   */
  private async loadMoleculesWithEnhancement(
    moleculeManager: MoleculeManager,
    scene: THREE.Scene
  ): Promise<string[]> {
    
    const structureIds: string[] = [];
    
    // Auto-load demo molecules if needed
    let molecules = moleculeManager.getAllMolecules();
    if (molecules.length < 2) {
      log('🔄 Auto-loading demo molecules...');
      await this.loadDemoMolecules(moleculeManager, scene, (status) => {
        log(`Loading: ${status}`);
      });
      molecules = moleculeManager.getAllMolecules();
    }
    
    // Create enhanced structures for existing molecules
    for (const molecule of molecules.slice(0, 2)) { // Take first 2 molecules
      try {
        const structureId = await this.createEnhancedStructure(molecule);
        if (structureId) {
          structureIds.push(structureId);
        }
      } catch (error) {
        log(`⚠️ Failed to enhance molecule ${molecule.name}: ${error}`);
      }
    }
    
    log(`✅ Created ${structureIds.length} enhanced structures`);
    return structureIds;
  }
  
  /**
   * Create enhanced structure from existing molecule
   */
  private async createEnhancedStructure(molecule: any): Promise<string | null> {
    try {
      // Get molecular data - try multiple approaches
      let molecularData = null;
      
      // Try to get from existing molObject
      if (molecule.molObject && molecule.name) {
        // Try to fetch fresh data using the chemical service
        const cid = await this.extractCIDFromName(molecule.name);
        if (cid) {
          molecularData = await this.chemicalService.fetchMoleculeByCID(cid);
        }
      }
      
      if (!molecularData) {
        log(`⚠️ Could not get molecular data for ${molecule.name}`);
        return null;
      }
      
      // Create enhanced structure
      const structureId = `enhanced_${molecule.name}`;
      const structure = await this.structureEngine.createStructure(
        structureId,
        molecularData,
        new THREE.Vector3(molecule.position.x, molecule.position.y, molecule.position.z)
      );
      
      // Integrate with existing molecule group
      this.structureEngine.integrateWithMoleculeGroup(structureId, molecule);
      
      return structureId;
      
    } catch (error) {
      log(`❌ Failed to create enhanced structure: ${error}`);
      return null;
    }
  }
  
  /**
   * Extract CID from molecule name (simple heuristic)
   */
  private async extractCIDFromName(name: string): Promise<string | null> {
    // Extract CID from demo molecule names like "demo_Methyl_bromide"
    const demoMolecules: { [key: string]: string } = {
      'demo_Methyl_bromide': '6323',
      'demo_Methyl_chloride': '6325', 
      'demo_Hydroxide_ion': '961',
      'Methyl_bromide': '6323',
      'Methyl_chloride': '6325',
      'Hydroxide_ion': '961'
    };
    
    return demoMolecules[name] || null;
  }
  
  /**
   * Enhanced molecule loading that creates structures directly
   */
  async loadMoleculesDirectly(
    moleculeManager: MoleculeManager,
    scene: THREE.Scene,
    statusCallback: (status: string) => void
  ): Promise<string[]> {
    
    const structureIds: string[] = [];
    
    try {
      // Load substrate (methyl bromide)
      statusCallback('Loading substrate...');
      const substrateData = await this.chemicalService.fetchMoleculeByCID('6323');
      const substrateName = 'enhanced_substrate';
      
      const substrateStructure = await this.structureEngine.createStructure(
        substrateName,
        substrateData,
        new THREE.Vector3(0, 0, 0) // At origin
      );
      
      // Also create traditional molecule for physics compatibility
      drawMolecule(substrateData.mol3d || '', moleculeManager, scene, { x: 0, y: 0, z: 0 }, 'traditional_substrate');
      const traditionalSubstrate = moleculeManager.getMolecule('traditional_substrate');
      
      if (traditionalSubstrate) {
        this.structureEngine.integrateWithMoleculeGroup(substrateName, traditionalSubstrate);
      }
      
      structureIds.push(substrateName);
      statusCallback('Substrate loaded ✅');
      
      // Load nucleophile (hydroxide)
      statusCallback('Loading nucleophile...');
      const nucleophileData = await this.chemicalService.fetchMoleculeByCID('961');
      const nucleophileName = 'enhanced_nucleophile';
      
      const nucleophileStructure = await this.structureEngine.createStructure(
        nucleophileName,
        nucleophileData,
        new THREE.Vector3(0, 0, -8) // Behind substrate for backside attack
      );
      
      // Also create traditional molecule for physics compatibility
      drawMolecule(nucleophileData.mol3d || '', moleculeManager, scene, { x: 0, y: 0, z: -8 }, 'traditional_nucleophile');
      const traditionalNucleophile = moleculeManager.getMolecule('traditional_nucleophile');
      
      if (traditionalNucleophile) {
        this.structureEngine.integrateWithMoleculeGroup(nucleophileName, traditionalNucleophile);
      }
      
      structureIds.push(nucleophileName);
      statusCallback('Nucleophile loaded ✅');
      
      statusCallback(`Enhanced demo ready with ${structureIds.length} molecules!`);
      return structureIds;
      
    } catch (error) {
      log(`❌ Failed to load molecules directly: ${error}`);
      statusCallback(`Error: ${error}`);
      return [];
    }
  }
  
  /**
   * Get enhanced demo statistics
   */
  getEnhancedStats(): any {
    const structureStats = this.structureEngine.getStats();
    const originalStats = this.getStats ? this.getStats() : {};
    
    return {
      ...originalStats,
      enhanced: {
        structuresCreated: structureStats.totalStructures,
        transitionStates: structureStats.totalTransitionStates,
        availableReactions: structureStats.availableReactions,
        cacheEfficiency: structureStats.cacheStats
      }
    };
  }
  
  /**
   * Cleanup enhanced resources
   */
  dispose(): void {
    this.structureEngine.dispose();
    log('🗑️ EnhancedReactionDemo disposed');
  }
  
  /**
   * Fallback method - runs original demo if enhancement fails
   */
  async runFallbackDemo(
    moleculeManager: MoleculeManager,
    scene: THREE.Scene,
    timeControls: any,
    reactionParams: any
  ): Promise<void> {
    
    log('🔄 Running fallback to original demo...');
    
    try {
      await this.runDemo(moleculeManager, scene, timeControls, reactionParams);
      log('✅ Fallback demo completed');
    } catch (error) {
      log(`❌ Even fallback demo failed: ${error}`);
    }
  }
  
  /**
   * Test method for development
   */
  async testEnhancedSystem(): Promise<void> {
    log('🧪 Testing Enhanced Reaction System...');
    
    try {
      // Test structure engine
      const availableReactions = this.structureEngine.getAvailableReactionTypes();
      log(`Available reactions: ${availableReactions.join(', ')}`);
      
      // Test cache system
      const stats = this.structureEngine.getStats();
      log(`System stats: ${JSON.stringify(stats, null, 2)}`);
      
      log('✅ Enhanced system test completed');
      
    } catch (error) {
      log(`❌ Enhanced system test failed: ${error}`);
    }
  }
}

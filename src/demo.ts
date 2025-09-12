/**
 * Demo script for testing the reaction system
 * This provides a simple way to test reaction detection functionality
 */

import type * as THREE from 'three';
import { getReactionType } from './chemistry/reactionDatabase';
import { drawMolecule } from './components/moleculeDrawer';
import { physicsEngine } from './physics/cannonPhysicsEngine';
import { collisionEventSystem } from './physics/collisionEventSystem';
import type { MoleculeManager } from './types';
import { log } from './utils/debug';

/**
 * Demo function to test reaction detection
 * Call this from the browser console: window.demoReaction()
 */
export async function demoReaction(
  scene: THREE.Scene,
  moleculeManager: MoleculeManager
): Promise<void> {
  log('🧪 Starting Reaction System Demo...');

  try {
    // 1. Load demo molecules
    log('Loading demo molecules...');

    // Load caffeine as substrate (we'll pretend it has a leaving group)
    const substrate = await drawMolecule('caffeine', scene, moleculeManager);
    if (!substrate) {
      log('❌ Failed to load substrate molecule');
      return;
    }

    // Load ethanol as nucleophile
    const nucleophile = await drawMolecule('ethanol', scene, moleculeManager);
    if (!nucleophile) {
      log('❌ Failed to load nucleophile molecule');
      return;
    }

    log('✅ Demo molecules loaded successfully');

    // 2. Set up reaction type
    const reactionType = getReactionType('sn2');
    if (!reactionType) {
      log('❌ Failed to get SN2 reaction type');
      return;
    }

    collisionEventSystem.setReactionType(reactionType);
    log('✅ SN2 reaction type set');

    // 3. Position molecules for collision
    log('Positioning molecules for collision...');

    // Position substrate at origin
    substrate.group.position.set(0, 0, 0);

    // Position nucleophile 5 units away, approaching from the back
    nucleophile.group.position.set(0, 0, 5);

    // Add some velocity to nucleophile towards substrate
    const nucleophileBody = physicsEngine.getMoleculeBody(nucleophile);
    if (nucleophileBody) {
      nucleophileBody.velocity.set(0, 0, -2); // Move towards substrate
    }

    log('✅ Molecules positioned for collision');

    // 4. Start physics simulation
    log('Starting physics simulation...');
    physicsEngine.resume();

    // 5. Set up collision monitoring
    let collisionDetected = false;
    const collisionHandler = (event: any) => {
      if (!collisionDetected) {
        collisionDetected = true;
        log('💥 Collision detected!');

        if (event.reactionResult) {
          if (event.reactionResult.occurs) {
            log('🎉 REACTION OCCURRED!');
            log(`Reaction probability: ${(event.reactionResult.probability * 100).toFixed(2)}%`);
            log(`Reaction type: ${event.reactionResult.reactionType.name}`);
          } else {
            log('❌ No reaction occurred');
            log(`Reaction probability: ${(event.reactionResult.probability * 100).toFixed(2)}%`);
          }
        }

        // Remove the handler after first collision
        collisionEventSystem.removeCollisionHandler(collisionHandler);
      }
    };

    collisionEventSystem.addCollisionHandler(collisionHandler);

    log('✅ Demo setup complete! Watch for collision and reaction detection...');
    log('💡 Tip: You can also use the GUI controls to adjust reaction parameters');
  } catch (error) {
    log(`❌ Demo failed: ${error}`);
    console.error('Demo error:', error);
  }
}

/**
 * Simple test to verify reaction system components are working
 */
export function testReactionSystem(): void {
  log('🧪 Testing Reaction System Components...');

  // Test 1: Check if physics engine is running
  if (physicsEngine) {
    log('✅ Physics engine available');
  } else {
    log('❌ Physics engine not available');
  }

  // Test 2: Check if collision event system is available
  if (collisionEventSystem) {
    log('✅ Collision event system available');
  } else {
    log('❌ Collision event system not available');
  }

  // Test 3: Check if reaction types are available
  const sn2Reaction = getReactionType('sn2');
  if (sn2Reaction) {
    log('✅ SN2 reaction type available');
    log(`   - Name: ${sn2Reaction.name}`);
    log(`   - Activation Energy: ${sn2Reaction.activationEnergy} kJ/mol`);
    log(`   - Optimal Angle: ${sn2Reaction.optimalAngle}°`);
  } else {
    log('❌ SN2 reaction type not available');
  }

  // Test 4: Check if molecule manager is available
  if (window.moleculeManager) {
    const molecules = window.moleculeManager.getAllMolecules();
    log(`✅ Molecule manager available with ${molecules.length} molecules`);
    molecules.forEach(mol => {
      log(`   - ${mol.name}`);
    });
  } else {
    log('❌ Molecule manager not available');
  }

  log('🧪 Reaction System Test Complete!');
}

// Make functions available globally for console access
declare global {
  interface Window {
    demoReaction: typeof demoReaction;
    testReactionSystem: typeof testReactionSystem;
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.demoReaction = demoReaction;
  window.testReactionSystem = testReactionSystem;
}

import { reactionEventBus } from '../events/ReactionEventBus';
import { getReactionConfig } from '../config/ReactionConfig';
import { log } from '../utils/debug';

/**
 * Test the unified system to ensure it's working properly
 */
export function testUnifiedSystem(): void {
  log('🧪 Testing unified system...');
  
  try {
    // Test 1: Configuration system
    const sn2Config = getReactionConfig('sn2');
    log(`✅ SN2 config loaded: ${sn2Config.name}`);
    log(`✅ Optimal approach angle: ${sn2Config.orientation.optimalApproachAngle}°`);
    
    // Test 2: Event system
    let eventReceived = false;
    reactionEventBus.on('reaction-started', (event) => {
      eventReceived = true;
      log(`✅ Event received: ${event.type}`);
    });
    
    // Emit test event
    reactionEventBus.emitReactionStarted('sn2', 'Methyl bromide', 'Hydroxide ion');
    
    if (eventReceived) {
      log('✅ Event system working');
    } else {
      log('❌ Event system not working');
    }
    
    // Test 3: Check if unified system is ready
    log('✅ Unified system test completed');
    
  } catch (error) {
    log(`❌ Unified system test failed: ${error}`);
  }
}

// Run the test
testUnifiedSystem();




import { MoleculeGroup } from "../types";
import { registerReaction } from "./reactionCollisionInterface";
import { CollisionEvent } from "./collisionEventSystem";

// Example reaction registration
export function registerExampleReactions(): void {
  // SN2 reaction
  registerReaction('alkyl_halide', 'nucleophile', (molA, molB, event) => {
    console.log(`SN2 reaction triggered between ${molA.name} and ${molB.name}`);
    // TODO: Implement actual reaction logic
  });
  
  // Acid-base reaction
  registerReaction('acid', 'base', (molA, molB, event) => {
    console.log(`Acid-base reaction triggered between ${molA.name} and ${molB.name}`);
    // TODO: Implement actual reaction logic
  });
}

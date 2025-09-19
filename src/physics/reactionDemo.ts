import type { MoleculeGroup } from '../types';
import { log } from '../utils/debug';
import { sn2ReactionSystem } from '../chemistry/sn2Reaction';
import { reactionGraphics } from '../graphics/reactions';

// Define CollisionEvent interface locally since it's not exported from types
interface CollisionEvent {
  moleculeA: MoleculeGroup;
  moleculeB: MoleculeGroup;
  reactionResult?: {
    occurs: boolean;
    reactionType: { name: string };
  };
}

/**
 * Reaction Demo System
 * Handles visual demonstration of chemical reactions
 * This is a proof of concept for testing visual systems before implementing full chemistry engine
 */
export class ReactionDemo {
  constructor() {
    log('ReactionDemo initialized');

    // Add test function to window for debugging
    (window as any).testReactionTransformation = () => {
      this.testTransformation();
    };
    
    // Add function to create test CH3Br molecule
    (window as any).createTestCH3Br = () => {
      this.createTestCH3Br();
    };
    
    // Add function to invert a molecule
    (window as any).invertMolecule = () => {
      this.invertMoleculeFromScene();
    };
    
    // Add function to replace an atom
    (window as any).replaceAtom = (atomIndex: number, newElement: string) => {
      this.replaceAtomFromScene(atomIndex, newElement);
    };
    
    // Add function to test SN2 reaction
    (window as any).testSN2Reaction = () => {
      this.testSN2Reaction();
    };
  }

  /**
   * Test function to manually trigger transformation for debugging
   */
  testTransformation(): void {
    console.log('🧪 Testing reaction transformation...');

    // Find molecules in the scene
    const scene = (window as any).scene || (window as any).threeJSBridge?.scene;
    if (!scene) {
      console.log('❌ No scene found for testing');
      return;
    }

    const molecules: any[] = [];
    scene.traverse((child: any) => {
      if (child.userData && child.userData.molecule) {
        molecules.push(child.userData.molecule);
      }
    });

    console.log(
      `🧪 Found ${molecules.length} molecules:`,
      molecules.map(m => m.name)
    );

    if (molecules.length >= 2) {
      const substrate = molecules[0];
      const nucleophile = molecules[1];

      console.log(`🧪 Testing transformation with ${substrate.name} + ${nucleophile.name}`);

      // Create a mock collision event
      const mockEvent = {
        moleculeA: substrate,
        moleculeB: nucleophile,
        reactionResult: {
          occurs: true,
          reactionType: { name: 'SN2' },
        },
      } as any;

      this.generateReactionProducts(mockEvent);
    } else {
      console.log('❌ Need at least 2 molecules for testing');
    }
  }

  /**
   * Create a simple test CH3Br molecule for debugging
   */
  createTestCH3Br(): void {
    console.log('🧪 Creating test CH3Br molecule...');
    
    // Create a simple CH3Br structure manually
    const testCH3Br = {
      header: {
        title: 'Test CH3Br',
        program: 'Manual',
        date: new Date().toISOString(),
        comment: 'Test molecule for SN2 reaction'
      },
      counts: {
        atoms: 5,
        bonds: 4
      },
      atoms: [
        { type: 'C', position: { x: '0.0', y: '0.0', z: '0.0' } }, // Central carbon
        { type: 'H', position: { x: '1.0', y: '0.0', z: '0.0' } }, // H1
        { type: 'H', position: { x: '-0.5', y: '0.866', z: '0.0' } }, // H2
        { type: 'H', position: { x: '-0.5', y: '-0.866', z: '0.0' } }, // H3
        { type: 'Br', position: { x: '0.0', y: '0.0', z: '1.5' } } // Br leaving group
      ],
      bonds: [
        ['1', '2', '1'], // C-H1
        ['1', '3', '1'], // C-H2
        ['1', '4', '1'], // C-H3
        ['1', '5', '1']  // C-Br
      ]
    };
    
    console.log('🧪 Test CH3Br structure:', testCH3Br);
    console.log('🧪 Atom types:', testCH3Br.atoms.map(atom => atom.type));
    
    // You can use this structure to test the transformation
    console.log('✅ Test CH3Br created. Use this structure to test transformations.');
  }

  /**
   * Helper method to invert a molecule from the scene
   */
  invertMoleculeFromScene(): void {
    console.log('🧪 Inverting molecule from scene...');
    
    // Find molecules in the scene
    const scene = (window as any).scene || (window as any).threeJSBridge?.scene;
    if (!scene) {
      console.log('❌ No scene found for inversion');
      return;
    }
    
    const molecules: any[] = [];
    scene.traverse((child: any) => {
      if (child.userData && child.userData.molecule) {
        molecules.push(child.userData.molecule);
      }
    });
    
    console.log(`🧪 Found ${molecules.length} molecules:`, molecules.map(m => m.name));
    
    if (molecules.length >= 1) {
      const molecule = molecules[0]; // Invert the first molecule
      console.log(`🧪 Inverting molecule: ${molecule.name}`);
      reactionGraphics.invertMolecule(molecule);
    } else {
      console.log('❌ No molecules found for inversion');
    }
  }

  /**
   * Helper method to replace an atom in a molecule from the scene
   */
  replaceAtomFromScene(atomIndex: number, newElement: string): void {
    console.log(`🧪 Replacing atom ${atomIndex} with ${newElement}...`);
    
    // Find molecules in the scene
    const scene = (window as any).scene || (window as any).threeJSBridge?.scene;
    if (!scene) {
      console.log('❌ No scene found for atom replacement');
      return;
    }
    
    const molecules: any[] = [];
    scene.traverse((child: any) => {
      if (child.userData && child.userData.molecule) {
        molecules.push(child.userData.molecule);
      }
    });
    
    console.log(`🧪 Found ${molecules.length} molecules:`, molecules.map(m => m.name));
    
    if (molecules.length >= 1) {
      const molecule = molecules[0]; // Use the first molecule
      console.log(`🧪 Replacing atom in molecule: ${molecule.name}`);
      reactionGraphics.replaceAtom(molecule, atomIndex, newElement);
    } else {
      console.log('❌ No molecules found for atom replacement');
    }
  }

  /**
   * Test SN2 reaction with molecules from scene
   */
  testSN2Reaction(): void {
    console.log('🧪 Testing SN2 reaction...');
    
    // Find molecules in the scene
    const scene = (window as any).scene || (window as any).threeJSBridge?.scene;
    if (!scene) {
      console.log('❌ No scene found for SN2 testing');
      return;
    }
    
    const molecules: any[] = [];
    scene.traverse((child: any) => {
      if (child.userData && child.userData.molecule) {
        molecules.push(child.userData.molecule);
      }
    });
    
    console.log(`🧪 Found ${molecules.length} molecules:`, molecules.map(m => m.name));
    
    if (molecules.length >= 2) {
      const substrate = molecules[0];
      const nucleophile = molecules[1];
      
      console.log(`🧪 Testing SN2 reaction with ${substrate.name} + ${nucleophile.name}`);
      
      // Execute SN2 reaction
      const result = sn2ReactionSystem.executeReaction(substrate, nucleophile);
      
      if (result.success) {
        const equation = sn2ReactionSystem.getReactionEquation(substrate, nucleophile);
        console.log(`✅ SN2 reaction successful! ${equation}`);
      } else {
        console.log('❌ SN2 reaction failed');
      }
    } else {
      console.log('❌ Need at least 2 molecules for SN2 reaction testing');
    }
  }

  /**
   * Transform existing molecules to show reaction products
   */
  generateReactionProducts(event: CollisionEvent): void {
    if (!event.reactionResult) return;

    console.log(
      `🧪 ReactionDemo.generateReactionProducts called for ${event.moleculeA.name} + ${event.moleculeB.name}`
    );

    try {
      // Use the simple SN2 reaction system
      const result = sn2ReactionSystem.executeReaction(event.moleculeA, event.moleculeB);

      if (result.success) {
        const reactionEquation = sn2ReactionSystem.getReactionEquation(event.moleculeA, event.moleculeB);
        console.log(`🎉 SN2 reaction successful! ${reactionEquation}`);

        // Update GUI display
        if ((window as unknown as { updateProductsDisplay?: Function }).updateProductsDisplay) {
          (window as unknown as { updateProductsDisplay: Function }).updateProductsDisplay({
            mainProductName: result.product?.name || 'Product',
            leavingGroupName: result.leavingGroup?.name || 'Leaving Group',
            reactionEquation: reactionEquation,
            reactionType: 'SN2',
          });
        }
      } else {
        console.log('❌ SN2 reaction failed');
      }
    } catch (error) {
      console.error('Error in SN2 reaction:', error);
    }
  }



}

// Export singleton instance
export const reactionDemo = new ReactionDemo();

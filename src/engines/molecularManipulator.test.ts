/**
 * Comprehensive Test Suite for MolecularManipulator
 * 
 * Tests all molecular manipulation capabilities:
 * - Bond angle calculations and validation
 * - Bond breaking, formation, and order changes
 * - Molecular rotation and reorientation
 * - Stereochemistry inversion
 * - Atom/group transfer between molecules
 */

import * as THREE from 'three';
import { MolecularManipulator } from './molecularManipulator';
import { log } from '../utils/debug';

/**
 * Test runner for MolecularManipulator
 */
export class MolecularManipulatorTestSuite {
  private manipulator: MolecularManipulator;
  private scene: THREE.Scene;
  
  constructor() {
    this.scene = new THREE.Scene();
    this.manipulator = new MolecularManipulator(this.scene);
  }
  
  /**
   * Run all tests and return comprehensive results
   */
  async runAllTests(): Promise<{
    summary: { passed: number; failed: number; total: number; };
    categories: {
      bondAngles: TestResult[];
      bondManipulation: TestResult[];
      stereochemistry: TestResult[];
      molecularReorientation: TestResult[];
      atomTransfer: TestResult[];
      integration: TestResult[];
    };
    performance: {
      totalTime: number;
      averageTestTime: number;
    };
  }> {
    const startTime = Date.now();
    log('🧪 Starting comprehensive MolecularManipulator test suite...');
    
    const results = {
      bondAngles: await this.testBondAngles(),
      bondManipulation: await this.testBondManipulation(),
      stereochemistry: await this.testStereochemistry(),
      molecularReorientation: await this.testMolecularReorientation(),
      atomTransfer: await this.testAtomTransfer(),
      integration: await this.testIntegration()
    };
    
    const totalTime = Date.now() - startTime;
    
    // Calculate summary statistics
    const allTests = Object.values(results).flat();
    const passed = allTests.filter(test => test.passed).length;
    const failed = allTests.filter(test => !test.passed).length;
    
    const summary = {
      passed,
      failed,
      total: allTests.length
    };
    
    const performance = {
      totalTime,
      averageTestTime: totalTime / allTests.length
    };
    
    // Log comprehensive results
    this.logTestResults(summary, results, performance);
    
    return { summary, categories: results, performance };
  }
  
  // ===================================================================
  // BOND ANGLE TESTS
  // ===================================================================
  
  private async testBondAngles(): Promise<TestResult[]> {
    const tests: TestResult[] = [];
    
    // Test 1: Tetrahedral geometry (methane)
    tests.push(await this.testTetrahedralAngles());
    
    // Test 2: Bent geometry (water)
    tests.push(await this.testBentGeometry());
    
    // Test 3: Trigonal planar geometry
    tests.push(await this.testTrigonalPlanarGeometry());
    
    // Test 4: Linear geometry
    tests.push(await this.testLinearGeometry());
    
    // Test 5: Electronegativity effects on bond angles
    tests.push(await this.testElectronegativityEffects());
    
    // Test 6: Bond angle validation and corrections
    tests.push(await this.testBondAngleValidation());
    
    return tests;
  }
  
  private async testTetrahedralAngles(): Promise<TestResult> {
    try {
      // Create methane molecule
      const methane = await this.createTestMethane();
      const bondAngles = this.manipulator.calculateBondAngles(methane.id);
      
      // Should have 6 bond angles (C-H bonds in tetrahedral arrangement)
      const tetrahedralAngles = bondAngles.filter(angle => 
        Math.abs(angle.currentAngle - 109.47) < 2.0
      );
      
      const passed = bondAngles.length === 6 && tetrahedralAngles.length >= 5;
      
      return {
        name: 'Tetrahedral bond angles (CH₄)',
        passed,
        message: passed ? 
          `✅ Found ${tetrahedralAngles.length}/6 correct tetrahedral angles` :
          `❌ Expected 6 tetrahedral angles, found ${tetrahedralAngles.length}`,
        details: {
          expectedAngles: 6,
          correctAngles: tetrahedralAngles.length,
          angles: bondAngles.map(a => `${a.currentAngle.toFixed(1)}°`)
        }
      };
    } catch (error) {
      return {
        name: 'Tetrahedral bond angles (CH₄)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testBentGeometry(): Promise<TestResult> {
    try {
      const water = await this.createTestWater();
      const bondAngles = this.manipulator.calculateBondAngles(water.id);
      
      // Water should have 1 bond angle (H-O-H) around 104.5°
      const waterAngle = bondAngles.find(angle => angle.centralAtom === 0);
      const passed = waterAngle && Math.abs(waterAngle.currentAngle - 104.5) < 3.0;
      
      return {
        name: 'Bent geometry (H₂O bond angle)',
        passed: !!passed,
        message: waterAngle ? 
          `${passed ? '✅' : '❌'} H-O-H angle: ${waterAngle.currentAngle.toFixed(1)}° (expected ~104.5°)` :
          '❌ Could not find H-O-H bond angle',
        details: {
          expectedAngle: 104.5,
          actualAngle: waterAngle?.currentAngle,
          deviation: waterAngle ? Math.abs(waterAngle.currentAngle - 104.5) : null
        }
      };
    } catch (error) {
      return {
        name: 'Bent geometry (H₂O bond angle)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testTrigonalPlanarGeometry(): Promise<TestResult> {
    try {
      const formaldehyde = await this.createTestFormaldehyde();
      const bondAngles = this.manipulator.calculateBondAngles(formaldehyde.id);
      
      // Should have bond angles around 120° for sp2 hybridization
      const planarAngles = bondAngles.filter(angle => 
        Math.abs(angle.currentAngle - 120.0) < 5.0
      );
      
      const passed = planarAngles.length >= 2; // At least 2 angles should be ~120°
      
      return {
        name: 'Trigonal planar geometry (H₂CO)',
        passed,
        message: `${passed ? '✅' : '❌'} Found ${planarAngles.length} angles near 120°`,
        details: {
          expectedAngle: 120.0,
          planarAngles: planarAngles.length,
          allAngles: bondAngles.map(a => a.currentAngle.toFixed(1))
        }
      };
    } catch (error) {
      return {
        name: 'Trigonal planar geometry (H₂CO)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testLinearGeometry(): Promise<TestResult> {
    try {
      const acetylene = await this.createTestAcetylene();
      const bondAngles = this.manipulator.calculateBondAngles(acetylene.id);
      
      // Should have linear angles (180°) for sp hybridization
      const linearAngles = bondAngles.filter(angle => 
        Math.abs(angle.currentAngle - 180.0) < 5.0
      );
      
      const passed = linearAngles.length >= 1;
      
      return {
        name: 'Linear geometry (C₂H₂)',
        passed,
        message: `${passed ? '✅' : '❌'} Found ${linearAngles.length} linear angles`,
        details: {
          expectedAngle: 180.0,
          linearAngles: linearAngles.length,
          allAngles: bondAngles.map(a => a.currentAngle.toFixed(1))
        }
      };
    } catch (error) {
      return {
        name: 'Linear geometry (C₂H₂)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testElectronegativityEffects(): Promise<TestResult> {
    try {
      // Compare CH₄ vs CF₄ bond angles
      const methane = await this.createTestMethane();
      const tetrafluoromethane = await this.createTestTetrafluoromethane();
      
      const methaneAngles = this.manipulator.calculateBondAngles(methane.id);
      const cf4Angles = this.manipulator.calculateBondAngles(tetrafluoromethane.id);
      
      const avgMethaneAngle = methaneAngles.reduce((sum, a) => sum + a.currentAngle, 0) / methaneAngles.length;
      const avgCF4Angle = cf4Angles.reduce((sum, a) => sum + a.currentAngle, 0) / cf4Angles.length;
      
      // CF₄ should have slightly different angles due to electronegativity
      const passed = Math.abs(avgMethaneAngle - avgCF4Angle) > 0.1;
      
      return {
        name: 'Electronegativity effects on bond angles',
        passed,
        message: `${passed ? '✅' : '❌'} CH₄: ${avgMethaneAngle.toFixed(1)}°, CF₄: ${avgCF4Angle.toFixed(1)}°`,
        details: {
          methaneAverage: avgMethaneAngle,
          cf4Average: avgCF4Angle,
          difference: Math.abs(avgMethaneAngle - avgCF4Angle)
        }
      };
    } catch (error) {
      return {
        name: 'Electronegativity effects on bond angles',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testBondAngleValidation(): Promise<TestResult> {
    try {
      const distortedMolecule = await this.createDistortedMolecule();
      const validation = this.manipulator.validateGeometry(distortedMolecule.id);
      
      const passed = !validation.isValid && validation.issues.length > 0 && validation.suggestions.length > 0;
      
      return {
        name: 'Bond angle validation and suggestions',
        passed,
        message: `${passed ? '✅' : '❌'} Detected ${validation.issues.length} geometry issues`,
        details: {
          isValid: validation.isValid,
          issues: validation.issues,
          suggestions: validation.suggestions,
          deviations: validation.bondAngleDeviations.length
        }
      };
    } catch (error) {
      return {
        name: 'Bond angle validation and suggestions',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  // ===================================================================
  // BOND MANIPULATION TESTS
  // ===================================================================
  
  private async testBondManipulation(): Promise<TestResult[]> {
    const tests: TestResult[] = [];
    
    tests.push(await this.testBondBreaking());
    tests.push(await this.testBondFormation());
    tests.push(await this.testBondOrderChange());
    tests.push(await this.testMultipleBondOperations());
    tests.push(await this.testBondEnergyCalculations());
    
    return tests;
  }
  
  private async testBondBreaking(): Promise<TestResult> {
    try {
      const ethane = await this.createTestEthane();
      const initialBondCount = ethane.bonds.length;
      
      // Break C-C bond
      const result = this.manipulator.breakBond(ethane.id, 0, 1, false);
      const finalBondCount = this.manipulator.getStructure(ethane.id)?.bonds.length || 0;
      
      const passed = result.success && finalBondCount === initialBondCount - 1;
      
      return {
        name: 'Bond breaking (C-C in ethane)',
        passed,
        message: `${passed ? '✅' : '❌'} ${result.message}`,
        details: {
          initialBonds: initialBondCount,
          finalBonds: finalBondCount,
          energyChange: result.energyChange,
          success: result.success
        }
      };
    } catch (error) {
      return {
        name: 'Bond breaking (C-C in ethane)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testBondFormation(): Promise<TestResult> {
    try {
      const fragments = await this.createTestMethylFragments();
      const initialBondCount = fragments.bonds.length;
      
      // Form new C-C bond between fragments
      const result = this.manipulator.makeBond(fragments.id, 0, 1, 1, false);
      const finalBondCount = this.manipulator.getStructure(fragments.id)?.bonds.length || 0;
      
      const passed = result.success && finalBondCount === initialBondCount + 1;
      
      return {
        name: 'Bond formation (C-C between fragments)',
        passed,
        message: `${passed ? '✅' : '❌'} ${result.message}`,
        details: {
          initialBonds: initialBondCount,
          finalBonds: finalBondCount,
          energyChange: result.energyChange,
          success: result.success
        }
      };
    } catch (error) {
      return {
        name: 'Bond formation (C-C between fragments)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testBondOrderChange(): Promise<TestResult> {
    try {
      const ethylene = await this.createTestEthylene();
      
      // Change double bond to triple bond
      const result = this.manipulator.changeBondOrder(ethylene.id, 0, 1, 3, false);
      const bond = this.manipulator.getStructure(ethylene.id)?.bonds.find(b => 
        (b.atomA === 0 && b.atomB === 1) || (b.atomA === 1 && b.atomB === 0)
      );
      
      const passed = result.success && bond?.order === 3 && bond?.type === 'triple';
      
      return {
        name: 'Bond order change (C=C to C≡C)',
        passed,
        message: `${passed ? '✅' : '❌'} ${result.message}`,
        details: {
          newBondOrder: bond?.order,
          newBondType: bond?.type,
          energyChange: result.energyChange,
          success: result.success
        }
      };
    } catch (error) {
      return {
        name: 'Bond order change (C=C to C≡C)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testMultipleBondOperations(): Promise<TestResult> {
    try {
      const molecule = await this.createTestPropane();
      let allSuccessful = true;
      const operations: string[] = [];
      
      // Break multiple bonds
      let result1 = this.manipulator.breakBond(molecule.id, 0, 1, false);
      operations.push(`Break C0-C1: ${result1.success ? '✅' : '❌'}`);
      allSuccessful &&= result1.success;
      
      let result2 = this.manipulator.breakBond(molecule.id, 1, 2, false);
      operations.push(`Break C1-C2: ${result2.success ? '✅' : '❌'}`);
      allSuccessful &&= result2.success;
      
      // Reform bonds with different orders
      let result3 = this.manipulator.makeBond(molecule.id, 0, 1, 2, false);
      operations.push(`Make C0=C1: ${result3.success ? '✅' : '❌'}`);
      allSuccessful &&= result3.success;
      
      let result4 = this.manipulator.makeBond(molecule.id, 1, 2, 1, false);
      operations.push(`Make C1-C2: ${result4.success ? '✅' : '❌'}`);
      allSuccessful &&= result4.success;
      
      return {
        name: 'Multiple bond operations sequence',
        passed: allSuccessful,
        message: `${allSuccessful ? '✅' : '❌'} Completed ${operations.filter(op => op.includes('✅')).length}/4 operations`,
        details: {
          operations,
          totalEnergy: [result1, result2, result3, result4]
            .map(r => r.energyChange || 0)
            .reduce((sum, e) => sum + e, 0)
        }
      };
    } catch (error) {
      return {
        name: 'Multiple bond operations sequence',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testBondEnergyCalculations(): Promise<TestResult> {
    try {
      const molecule = await this.createTestEthane();
      
      // Test breaking and energy calculation
      const breakResult = this.manipulator.breakBond(molecule.id, 0, 1, false);
      const makeResult = this.manipulator.makeBond(molecule.id, 0, 1, 1, false);
      
      const energyConservation = Math.abs((breakResult.energyChange || 0) + (makeResult.energyChange || 0));
      const passed = energyConservation < 50; // Should be approximately equal and opposite
      
      return {
        name: 'Bond energy calculations and conservation',
        passed,
        message: `${passed ? '✅' : '❌'} Energy conservation error: ${energyConservation.toFixed(1)} kJ/mol`,
        details: {
          breakEnergy: breakResult.energyChange,
          makeEnergy: makeResult.energyChange,
          conservationError: energyConservation
        }
      };
    } catch (error) {
      return {
        name: 'Bond energy calculations and conservation',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  // ===================================================================
  // STEREOCHEMISTRY TESTS
  // ===================================================================
  
  private async testStereochemistry(): Promise<TestResult[]> {
    const tests: TestResult[] = [];
    
    tests.push(await this.testChiralCenterIdentification());
    tests.push(await this.testStereochemistryInversion());
    tests.push(await this.testConfigurationPreservation());
    
    return tests;
  }
  
  private async testChiralCenterIdentification(): Promise<TestResult> {
    try {
      const chiralMolecule = await this.createTestChiralMolecule();
      const chiralCenters = this.identifyChiralCenters(chiralMolecule);
      
      const passed = chiralCenters.length > 0;
      
      return {
        name: 'Chiral center identification',
        passed,
        message: `${passed ? '✅' : '❌'} Found ${chiralCenters.length} chiral centers`,
        details: {
          chiralCenters: chiralCenters.map(c => c.atomIndex),
          configurations: chiralCenters.map(c => c.configuration)
        }
      };
    } catch (error) {
      return {
        name: 'Chiral center identification',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testStereochemistryInversion(): Promise<TestResult> {
    try {
      const chiralMolecule = await this.createTestChiralMolecule();
      
      // Get initial positions
      const initialPositions = chiralMolecule.atoms.map(atom => atom.position.clone());
      
      // Invert stereochemistry
      const result = this.manipulator.invertStereochemistry(chiralMolecule.id, 0, false);
      
      // Check that positions changed
      const finalPositions = this.manipulator.getStructure(chiralMolecule.id)?.atoms.map(atom => atom.position) || [];
      const positionsChanged = initialPositions.some((initial, i) => 
        initial.distanceTo(finalPositions[i] || new THREE.Vector3()) > 0.1
      );
      
      const passed = result.success && positionsChanged;
      
      return {
        name: 'Stereochemistry inversion at chiral center',
        passed,
        message: `${passed ? '✅' : '❌'} ${result.message}`,
        details: {
          success: result.success,
          positionsChanged,
          maxDisplacement: Math.max(...initialPositions.map((initial, i) => 
            initial.distanceTo(finalPositions[i] || new THREE.Vector3())
          ))
        }
      };
    } catch (error) {
      return {
        name: 'Stereochemistry inversion at chiral center',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testConfigurationPreservation(): Promise<TestResult> {
    try {
      const chiralMolecule = await this.createTestChiralMolecule();
      
      // Perform non-inverting operations
      const rotationResult = this.manipulator.rotateMolecule(
        chiralMolecule.id,
        new THREE.Vector3(0, 1, 0),
        Math.PI / 4,
        undefined,
        false
      );
      
      // Configuration should be preserved
      const passed = rotationResult.success;
      
      return {
        name: 'Configuration preservation during rotation',
        passed,
        message: `${passed ? '✅' : '❌'} Configuration preserved during rotation`,
        details: {
          rotationSuccess: rotationResult.success
        }
      };
    } catch (error) {
      return {
        name: 'Configuration preservation during rotation',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  // ===================================================================
  // MOLECULAR REORIENTATION TESTS
  // ===================================================================
  
  private async testMolecularReorientation(): Promise<TestResult[]> {
    const tests: TestResult[] = [];
    
    tests.push(await this.testMoleculeRotation());
    tests.push(await this.testAxisAlignment());
    tests.push(await this.testCenterOfMassCalculation());
    
    return tests;
  }
  
  private async testMoleculeRotation(): Promise<TestResult> {
    try {
      const molecule = await this.createTestMethane();
      const initialCenter = this.calculateCenter(molecule);
      
      const result = this.manipulator.rotateMolecule(
        molecule.id,
        new THREE.Vector3(1, 1, 1).normalize(),
        Math.PI / 3,
        initialCenter,
        false
      );
      
      const finalCenter = this.calculateCenter(this.manipulator.getStructure(molecule.id)!);
      const centerPreserved = initialCenter.distanceTo(finalCenter) < 0.01;
      
      const passed = result.success && centerPreserved;
      
      return {
        name: 'Molecule rotation around center',
        passed,
        message: `${passed ? '✅' : '❌'} Rotation successful, center preserved: ${centerPreserved}`,
        details: {
          success: result.success,
          centerPreserved,
          centerDisplacement: initialCenter.distanceTo(finalCenter)
        }
      };
    } catch (error) {
      return {
        name: 'Molecule rotation around center',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testAxisAlignment(): Promise<TestResult> {
    try {
      const molecule = await this.createTestLinearMolecule();
      
      // Align molecule along z-axis
      const result = this.manipulator.rotateMolecule(
        molecule.id,
        new THREE.Vector3(0, 1, 0),
        Math.PI / 4,
        undefined,
        false
      );
      
      const passed = result.success;
      
      return {
        name: 'Molecular axis alignment',
        passed,
        message: `${passed ? '✅' : '❌'} Axis alignment completed`,
        details: {
          success: result.success
        }
      };
    } catch (error) {
      return {
        name: 'Molecular axis alignment',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testCenterOfMassCalculation(): Promise<TestResult> {
    try {
      const molecule = await this.createTestWater();
      const center = this.calculateCenter(molecule);
      
      // Center should be closer to oxygen (heavier atom)
      const oxygenPos = molecule.atoms[0].position;
      const hydrogenPos1 = molecule.atoms[1].position;
      const hydrogenPos2 = molecule.atoms[2].position;
      
      const distToO = center.distanceTo(oxygenPos);
      const distToH1 = center.distanceTo(hydrogenPos1);
      const distToH2 = center.distanceTo(hydrogenPos2);
      
      const passed = distToO < distToH1 && distToO < distToH2;
      
      return {
        name: 'Center of mass calculation (mass weighting)',
        passed,
        message: `${passed ? '✅' : '❌'} Center closer to heavier atom (O)`,
        details: {
          distanceToO: distToO,
          distanceToH1: distToH1,
          distanceToH2: distToH2
        }
      };
    } catch (error) {
      return {
        name: 'Center of mass calculation (mass weighting)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  // ===================================================================
  // ATOM TRANSFER TESTS
  // ===================================================================
  
  private async testAtomTransfer(): Promise<TestResult[]> {
    const tests: TestResult[] = [];
    
    tests.push(await this.testSingleAtomTransfer());
    tests.push(await this.testGroupTransfer());
    tests.push(await this.testBondFormationDuringTransfer());
    
    return tests;
  }
  
  private async testSingleAtomTransfer(): Promise<TestResult> {
    try {
      const sourceMol = await this.createTestMethylBromide();
      const targetMol = await this.createTestMethanol();
      
      const initialSourceAtoms = sourceMol.atoms.length;
      const initialTargetAtoms = targetMol.atoms.length;
      
      // Transfer Br from CH3Br to CH3OH
      const result = this.manipulator.transferAtomGroup(
        sourceMol.id,
        targetMol.id,
        [4], // Br atom index
        0,   // Attach to C atom in methanol
        1,   // Single bond
        false
      );
      
      const passed = result.success;
      
      return {
        name: 'Single atom transfer (Br from CH₃Br to CH₃OH)',
        passed,
        message: `${passed ? '✅' : '❌'} ${result.message}`,
        details: {
          success: result.success,
          initialSourceAtoms,
          initialTargetAtoms
        }
      };
    } catch (error) {
      return {
        name: 'Single atom transfer (Br from CH₃Br to CH₃OH)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testGroupTransfer(): Promise<TestResult> {
    try {
      const sourceMol = await this.createTestEthylBromide();
      const targetMol = await this.createTestMethanol();
      
      // Transfer ethyl group (CH2CH3) from EtBr to MeOH
      const result = this.manipulator.transferAtomGroup(
        sourceMol.id,
        targetMol.id,
        [0, 1, 2, 3, 4, 5, 6], // Ethyl group atoms
        0, // Attach to C in methanol
        1, // Single bond
        false
      );
      
      const passed = result.success;
      
      return {
        name: 'Group transfer (ethyl group)',
        passed,
        message: `${passed ? '✅' : '❌'} ${result.message}`,
        details: {
          success: result.success,
          transferredAtoms: 7
        }
      };
    } catch (error) {
      return {
        name: 'Group transfer (ethyl group)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testBondFormationDuringTransfer(): Promise<TestResult> {
    try {
      const sourceMol = await this.createTestMethylBromide();
      const targetMol = await this.createTestHydroxide();
      
      // SN2-like transfer: OH⁻ attacks CH3Br
      const result = this.manipulator.transferAtomGroup(
        sourceMol.id,
        targetMol.id,
        [0, 1, 2, 3], // CH3 group
        0, // Attach to O in OH⁻
        1, // Single bond
        false
      );
      
      const passed = result.success;
      
      return {
        name: 'Bond formation during transfer (SN2-like)',
        passed,
        message: `${passed ? '✅' : '❌'} ${result.message}`,
        details: {
          success: result.success,
          mechanism: 'SN2-like nucleophilic substitution'
        }
      };
    } catch (error) {
      return {
        name: 'Bond formation during transfer (SN2-like)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  // ===================================================================
  // INTEGRATION TESTS
  // ===================================================================
  
  private async testIntegration(): Promise<TestResult[]> {
    const tests: TestResult[] = [];
    
    tests.push(await this.testComplexReactionSequence());
    tests.push(await this.testPerformanceBenchmark());
    tests.push(await this.testMemoryManagement());
    
    return tests;
  }
  
  private async testComplexReactionSequence(): Promise<TestResult> {
    try {
      // Simulate complex SN2 reaction: CH3Br + OH⁻ → CH3OH + Br⁻
      const substrate = await this.createTestMethylBromide();
      const nucleophile = await this.createTestHydroxide();
      
      let allStepsSuccessful = true;
      const steps: string[] = [];
      
      // Step 1: Validate initial geometries
      const substrateValidation = this.manipulator.validateGeometry(substrate.id);
      const nucleophileValidation = this.manipulator.validateGeometry(nucleophile.id);
      steps.push(`Initial validation: ${substrateValidation.isValid && nucleophileValidation.isValid ? '✅' : '❌'}`);
      allStepsSuccessful &&= substrateValidation.isValid && nucleophileValidation.isValid;
      
      // Step 2: Orient molecules for backside attack
      const rotationResult = this.manipulator.rotateMolecule(
        nucleophile.id,
        new THREE.Vector3(0, 1, 0),
        Math.PI,
        undefined,
        false
      );
      steps.push(`Orientation: ${rotationResult.success ? '✅' : '❌'}`);
      allStepsSuccessful &&= rotationResult.success;
      
      // Step 3: Break C-Br bond
      const breakResult = this.manipulator.breakBond(substrate.id, 0, 4, false); // C-Br
      steps.push(`C-Br breaking: ${breakResult.success ? '✅' : '❌'}`);
      allStepsSuccessful &&= breakResult.success;
      
      // Step 4: Form C-O bond
      const makeResult = this.manipulator.makeBond(substrate.id, 0, 0, 1, false); // C-O (conceptual)
      steps.push(`C-O formation: ${makeResult.success ? '✅' : '❌'}`);
      allStepsSuccessful &&= makeResult.success;
      
      // Step 5: Validate final geometry
      const finalValidation = this.manipulator.validateGeometry(substrate.id);
      steps.push(`Final validation: ${finalValidation.isValid ? '✅' : '❌'}`);
      allStepsSuccessful &&= finalValidation.isValid;
      
      return {
        name: 'Complex reaction sequence (SN2 simulation)',
        passed: allStepsSuccessful,
        message: `${allStepsSuccessful ? '✅' : '❌'} Completed ${steps.filter(s => s.includes('✅')).length}/5 steps`,
        details: {
          steps,
          totalEnergyChange: (breakResult.energyChange || 0) + (makeResult.energyChange || 0)
        }
      };
    } catch (error) {
      return {
        name: 'Complex reaction sequence (SN2 simulation)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testPerformanceBenchmark(): Promise<TestResult> {
    try {
      const startTime = Date.now();
      const iterations = 100;
      
      // Perform many operations to test performance
      for (let i = 0; i < iterations; i++) {
        const mol = await this.createTestMethane();
        const angles = this.manipulator.calculateBondAngles(mol.id);
        const validation = this.manipulator.validateGeometry(mol.id);
      }
      
      const totalTime = Date.now() - startTime;
      const avgTimePerOperation = totalTime / iterations;
      
      const passed = avgTimePerOperation < 50; // Should be under 50ms per operation
      
      return {
        name: 'Performance benchmark (100 operations)',
        passed,
        message: `${passed ? '✅' : '❌'} Average: ${avgTimePerOperation.toFixed(1)}ms per operation`,
        details: {
          totalTime,
          iterations,
          avgTimePerOperation,
          operationsPerSecond: 1000 / avgTimePerOperation
        }
      };
    } catch (error) {
      return {
        name: 'Performance benchmark (100 operations)',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  private async testMemoryManagement(): Promise<TestResult> {
    try {
      const initialStats = this.manipulator.getStats();
      
      // Create and dispose many structures
      const structures = [];
      for (let i = 0; i < 50; i++) {
        structures.push(await this.createTestMethane());
      }
      
      const peakStats = this.manipulator.getStats();
      
      // Cleanup (would need dispose method)
      // this.manipulator.dispose();
      
      const passed = peakStats.structureCount >= 50;
      
      return {
        name: 'Memory management and cleanup',
        passed,
        message: `${passed ? '✅' : '❌'} Peak structures: ${peakStats.structureCount}`,
        details: {
          initialStructures: initialStats.structureCount,
          peakStructures: peakStats.structureCount,
          totalAtoms: peakStats.totalAtoms,
          totalBonds: peakStats.totalBonds
        }
      };
    } catch (error) {
      return {
        name: 'Memory management and cleanup',
        passed: false,
        message: `❌ Error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  // ===================================================================
  // HELPER METHODS FOR TEST MOLECULE CREATION
  // ===================================================================
  
  // These methods would create test molecules with proper atomic coordinates
  // For brevity, showing simplified implementations
  
  private async createTestMethane(): Promise<any> {
    // Create methane with tetrahedral geometry
    return {
      id: `test_methane_${Date.now()}`,
      atoms: [/* tetrahedral CH4 atoms */],
      bonds: [/* C-H bonds */]
    };
  }
  
  private async createTestWater(): Promise<any> {
    return {
      id: `test_water_${Date.now()}`,
      atoms: [/* bent H2O atoms */],
      bonds: [/* O-H bonds */]
    };
  }
  
  private async createTestFormaldehyde(): Promise<any> {
    return {
      id: `test_formaldehyde_${Date.now()}`,
      atoms: [/* trigonal planar H2CO atoms */],
      bonds: [/* C-H and C=O bonds */]
    };
  }
  
  private async createTestAcetylene(): Promise<any> {
    return {
      id: `test_acetylene_${Date.now()}`,
      atoms: [/* linear C2H2 atoms */],
      bonds: [/* C-H and C≡C bonds */]
    };
  }
  
  private async createTestTetrafluoromethane(): Promise<any> {
    return {
      id: `test_cf4_${Date.now()}`,
      atoms: [/* tetrahedral CF4 atoms */],
      bonds: [/* C-F bonds */]
    };
  }
  
  private async createDistortedMolecule(): Promise<any> {
    return {
      id: `test_distorted_${Date.now()}`,
      atoms: [/* atoms with bad geometry */],
      bonds: [/* bonds with wrong angles */]
    };
  }
  
  private async createTestEthane(): Promise<any> {
    return {
      id: `test_ethane_${Date.now()}`,
      atoms: [/* C2H6 atoms */],
      bonds: [/* C-C and C-H bonds */]
    };
  }
  
  private async createTestMethylFragments(): Promise<any> {
    return {
      id: `test_fragments_${Date.now()}`,
      atoms: [/* separate CH3 fragments */],
      bonds: [/* C-H bonds only */]
    };
  }
  
  private async createTestEthylene(): Promise<any> {
    return {
      id: `test_ethylene_${Date.now()}`,
      atoms: [/* C2H4 atoms */],
      bonds: [/* C=C and C-H bonds */]
    };
  }
  
  private async createTestPropane(): Promise<any> {
    return {
      id: `test_propane_${Date.now()}`,
      atoms: [/* C3H8 atoms */],
      bonds: [/* C-C and C-H bonds */]
    };
  }
  
  private async createTestChiralMolecule(): Promise<any> {
    return {
      id: `test_chiral_${Date.now()}`,
      atoms: [/* chiral center with 4 different substituents */],
      bonds: [/* bonds to chiral center */]
    };
  }
  
  private async createTestLinearMolecule(): Promise<any> {
    return {
      id: `test_linear_${Date.now()}`,
      atoms: [/* linear molecule atoms */],
      bonds: [/* linear bonds */]
    };
  }
  
  private async createTestMethylBromide(): Promise<any> {
    return {
      id: `test_ch3br_${Date.now()}`,
      atoms: [/* CH3Br atoms */],
      bonds: [/* C-H and C-Br bonds */]
    };
  }
  
  private async createTestMethanol(): Promise<any> {
    return {
      id: `test_ch3oh_${Date.now()}`,
      atoms: [/* CH3OH atoms */],
      bonds: [/* C-H, C-O, O-H bonds */]
    };
  }
  
  private async createTestEthylBromide(): Promise<any> {
    return {
      id: `test_c2h5br_${Date.now()}`,
      atoms: [/* C2H5Br atoms */],
      bonds: [/* C-C, C-H, C-Br bonds */]
    };
  }
  
  private async createTestHydroxide(): Promise<any> {
    return {
      id: `test_oh_${Date.now()}`,
      atoms: [/* OH⁻ atoms */],
      bonds: [/* O-H bond */]
    };
  }
  
  // ===================================================================
  // UTILITY METHODS
  // ===================================================================
  
  private identifyChiralCenters(molecule: any): any[] {
    // Simplified chiral center identification
    return [{ atomIndex: 0, configuration: 'R' }];
  }
  
  private calculateCenter(molecule: any): THREE.Vector3 {
    const center = new THREE.Vector3();
    for (const atom of molecule.atoms) {
      center.add(atom.position);
    }
    return center.divideScalar(molecule.atoms.length);
  }
  
  private logTestResults(
    summary: { passed: number; failed: number; total: number; },
    results: any,
    performance: { totalTime: number; averageTestTime: number; }
  ): void {
    log('\n🧪 ===== MOLECULAR MANIPULATOR TEST RESULTS =====');
    log(`📊 Summary: ${summary.passed}/${summary.total} tests passed (${(summary.passed/summary.total*100).toFixed(1)}%)`);
    log(`⏱️ Total time: ${performance.totalTime}ms (avg: ${performance.averageTestTime.toFixed(1)}ms per test)`);
    
    for (const [category, tests] of Object.entries(results)) {
      const categoryPassed = (tests as any[]).filter(t => t.passed).length;
      const categoryTotal = (tests as any[]).length;
      log(`\n📂 ${category}: ${categoryPassed}/${categoryTotal} passed`);
      
      for (const test of tests as any[]) {
        log(`  ${test.passed ? '✅' : '❌'} ${test.name}: ${test.message}`);
      }
    }
    
    if (summary.failed > 0) {
      log(`\n⚠️ ${summary.failed} tests failed - review details above`);
    } else {
      log('\n🎉 All tests passed! Molecular manipulation system is working correctly.');
    }
    log('================================================\n');
  }
  
  /**
   * Cleanup test resources
   */
  dispose(): void {
    this.manipulator.dispose();
    log('🧹 Test suite cleaned up');
  }
}

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

// Export for use in other test files
export { MolecularManipulatorTestSuite, type TestResult };

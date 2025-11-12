import type * as THREE from 'three';
import type { CollisionData, MoleculeGroup, ReactionType } from '../types';
import { log } from '../utils/debug';

export interface ReactionResult {
  occurs: boolean;
  probability: number;
  reactionType: ReactionType;
  collisionData: CollisionData;
  substrate: MoleculeGroup;
  nucleophile: MoleculeGroup;
}

export class ReactionDetector {
  private readonly R = 8.314; // J/(mol·K) - Gas constant
  private readonly N_A = 6.022e23; // Avogadro's number

  /**
   * Detect if a reaction occurs based on collision data and reaction type
   */
  detectReaction(
    collision: CollisionData,
    reaction: ReactionType,
    temperature: number,
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup
  ): ReactionResult {
    // CRITICAL: Hard threshold - if collision energy < activation energy, NO reaction ever
    // Molecules just bounce apart if insufficient energy
    if (collision.collisionEnergy < reaction.activationEnergy) {
      return {
        occurs: false,
        probability: 0,
        reactionType: reaction,
        collisionData: collision,
        substrate,
        nucleophile,
      };
    }

    // 1. Check energy factor (only calculated if energy >= activation energy)
    const energyFactor = this.calculateEnergyFactor(
      collision.collisionEnergy,
      reaction.activationEnergy
    );

    // 2. Check orientation factor
    const orientationFactor = this.calculateOrientationFactor(
      collision.approachAngle,
      reaction.optimalAngle
    );

    // 3. Calculate temperature factor (Arrhenius equation)
    const tempFactor = reaction.probabilityFactors.temperature(temperature);

    // 4. Check molecular compatibility
    const compatibilityFactor = this.calculateCompatibilityFactor(substrate, nucleophile, reaction);

    // 5. Combined probability (only factors matter if energy >= activation energy)
    const probability = energyFactor * orientationFactor * tempFactor * compatibilityFactor;

    // 6. Stochastic determination (only if energy threshold passed)
    const occurs = Math.random() < probability;

    const result: ReactionResult = {
      occurs,
      probability,
      reactionType: reaction,
      collisionData: collision,
      substrate,
      nucleophile,
    };

    if(occurs) { // hide non-rxns
      // Only log if reaction occurs or probability is significant
      if (occurs || probability > 0.01) {
        log(`Reaction: ${occurs ? 'YES' : 'NO'} ${(probability * 100).toFixed(1)}%`);
      }
    }

    return result;
  }

  /**
   * Calculate energy factor based on collision energy vs activation energy
   */
  private calculateEnergyFactor(collisionE: number, activationE: number): number {
    if (collisionE < activationE) {
      return 0; // Insufficient energy
    }

    // Excess energy increases probability
    const excess = collisionE - activationE;
    const energyFactor = Math.min(1, 1 - Math.exp(-excess / activationE));

    return energyFactor;
  }

  /**
   * Calculate orientation factor based on approach angle
   * 
   * COLLISION THEORY: Molecules must collide in correct orientation
   * - SN2 reactions require backside attack (180° optimal)
   * - E2 reactions require anti-periplanar (180° optimal)
   * - SN1/E1 have no orientation requirement (optimal = 0, factor = 1.0)
   * 
   * Uses Gaussian distribution: factor decreases as deviation from optimal increases
   * @param actual - Actual approach angle in degrees
   * @param optimal - Optimal angle for reaction (e.g., 180° for SN2)
   * @returns Orientation factor (0-1), where 1 = perfect orientation
   */
  private calculateOrientationFactor(actual: number, optimal: number): number {
    // If no optimal angle specified (optimal = 0), orientation doesn't matter
    if (optimal === 0) {
      return 1.0;
    }
    
    // Gaussian distribution around optimal angle
    const deviation = Math.abs(actual - optimal);
    const sigma = 30; // degrees tolerance (standard deviation)
    // Gaussian: exp(-(x-μ)²/(2σ²)) where μ = optimal, σ = tolerance
    const orientationFactor = Math.exp(-(deviation ** 2) / (2 * sigma ** 2));

    return orientationFactor;
  }

  /**
   * Calculate molecular compatibility factor
   */
  calculateCompatibilityFactor(
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup,
    reaction: ReactionType
  ): number {
    let compatibility = 1.0;

    // Check substrate compatibility
    if (substrate.reactionFeatures) {
      const substrateCompatible = this.checkFeatureCompatibility(
        substrate.reactionFeatures,
        reaction.requiredFeatures.substrate
      );
      compatibility *= substrateCompatible;
    }

    // Check nucleophile compatibility
    if (nucleophile.reactionFeatures) {
      const nucleophileCompatible = this.checkFeatureCompatibility(
        nucleophile.reactionFeatures,
        reaction.requiredFeatures.nucleophile
      );
      compatibility *= nucleophileCompatible;
    }

    return compatibility;
  }

  /**
   * Check if molecular features match required features
   */
  private checkFeatureCompatibility(moleculeFeatures: any, requiredFeatures: any[]): number {
    let maxCompatibility = 0;

    for (const requiredFeature of requiredFeatures) {
      const featureType = requiredFeature.type;
      const moleculeFeaturesOfType = moleculeFeatures[featureType] || [];

      for (const moleculeFeature of moleculeFeaturesOfType) {
        if (requiredFeature.atoms.includes(moleculeFeature.atomType)) {
          // Calculate compatibility based on strength
          const strength = moleculeFeature.strength / 10; // Normalize to 0-1
          maxCompatibility = Math.max(maxCompatibility, strength);
        }
      }
    }

    return maxCompatibility;
  }

  /**
   * Calculate collision energy from molecular masses and relative velocity
   * 
   * Uses reduced mass and scales visualization speeds to real molecular speeds
   * based on temperature using Maxwell-Boltzmann distribution.
   * 
   * @param mass1 - Mass of molecule 1 in AMU
   * @param mass2 - Mass of molecule 2 in AMU  
   * @param relativeVelocity - Relative velocity magnitude in m/s (visualization speed)
   * @param temperature - Current temperature in K (for proper scaling)
   * @returns Collision energy in kJ/mol
   */
  calculateCollisionEnergy(mass1: number, mass2: number, relativeVelocity: number, temperature: number = 298): number {
    const AMU_TO_KG = 1.660539e-27; // kg per atomic mass unit
    const BOLTZMANN_CONSTANT = 1.380649e-23; // J/K
    const REFERENCE_TEMP = 298; // K
    const VISUALIZATION_BASE_SPEED = 12.0; // m/s at reference temp
    
    // Scale visualization velocity to real molecular velocity using Maxwell-Boltzmann
    // Real molecular speeds: v_rms = sqrt(3kT/m)
    const avgMass = (mass1 + mass2) / 2;
    const mass_kg = avgMass * AMU_TO_KG;
    const realVrms_at_T = Math.sqrt((3 * BOLTZMANN_CONSTANT * temperature) / mass_kg);
    const realVrms_at_ref = Math.sqrt((3 * BOLTZMANN_CONSTANT * REFERENCE_TEMP) / mass_kg);
    const velocityScaleFactor = realVrms_at_T / realVrms_at_ref;
    const realVelocity = relativeVelocity * velocityScaleFactor;
    
    // Calculate collision energy using reduced mass
    const mass1_kg = mass1 * AMU_TO_KG;
    const mass2_kg = mass2 * AMU_TO_KG;
    const reducedMass_kg = (mass1_kg * mass2_kg) / (mass1_kg + mass2_kg);
    const kineticEnergy_J = 0.5 * reducedMass_kg * realVelocity ** 2;
    
    // Convert to kJ/mol
    const energy_kJ_per_mol = (kineticEnergy_J * this.N_A) / 1000;

    return energy_kJ_per_mol;
  }

  /**
   * Calculate approach angle from molecular orientations
   */
  calculateApproachAngle(
    _substrateOrientation: THREE.Quaternion,
    _nucleophileOrientation: THREE.Quaternion,
    _collisionPoint: THREE.Vector3
  ): number {
    // This is a simplified calculation
    // In practice, you'd analyze the specific molecular geometry

    // For SN2 reactions, we want backside attack (180°)
    // For now, return a random angle for demonstration
    const angle = Math.random() * 360;


    return angle;
  }

  /**
   * Get reaction rate constant using Arrhenius equation
   */
  getReactionRateConstant(
    reaction: ReactionType,
    temperature: number,
    preExponentialFactor: number = 1e12 // s^-1
  ): number {
    const rateConstant =
      preExponentialFactor * Math.exp((-reaction.activationEnergy * 1000) / (this.R * temperature));

    log(`Rate constant: ${rateConstant.toExponential(2)} s^-1 at ${temperature}K`);

    return rateConstant;
  }

  /**
   * Calculate reaction probability from rate constant
   */
  calculateReactionProbability(
    rateConstant: number,
    timeStep: number = 1e-12 // 1 ps
  ): number {
    const probability = 1 - Math.exp(-rateConstant * timeStep);

    log(`Reaction probability: ${(probability * 100).toFixed(6)}% per ${timeStep}s`);

    return probability;
  }

  /**
   * Get detailed reaction analysis
   */
  getReactionAnalysis(
    collision: CollisionData,
    reaction: ReactionType,
    temperature: number
  ): {
    energyAnalysis: {
      collisionEnergy: number;
      activationEnergy: number;
      excessEnergy: number;
      energyFactor: number;
    };
    orientationAnalysis: {
      approachAngle: number;
      optimalAngle: number;
      deviation: number;
      orientationFactor: number;
    };
    temperatureAnalysis: {
      temperature: number;
      tempFactor: number;
      rateConstant: number;
    };
    overallProbability: number;
  } {
    const energyFactor = this.calculateEnergyFactor(
      collision.collisionEnergy,
      reaction.activationEnergy
    );
    const orientationFactor = this.calculateOrientationFactor(
      collision.approachAngle,
      reaction.optimalAngle
    );
    const tempFactor = reaction.probabilityFactors.temperature(temperature);
    const rateConstant = this.getReactionRateConstant(reaction, temperature);

    return {
      energyAnalysis: {
        collisionEnergy: collision.collisionEnergy,
        activationEnergy: reaction.activationEnergy,
        excessEnergy: collision.collisionEnergy - reaction.activationEnergy,
        energyFactor,
      },
      orientationAnalysis: {
        approachAngle: collision.approachAngle,
        optimalAngle: reaction.optimalAngle,
        deviation: Math.abs(collision.approachAngle - reaction.optimalAngle),
        orientationFactor,
      },
      temperatureAnalysis: {
        temperature,
        tempFactor,
        rateConstant,
      },
      overallProbability: energyFactor * orientationFactor * tempFactor,
    };
  }
}

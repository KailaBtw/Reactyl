import * as THREE from 'three';
import { ReactionType, CollisionData, MoleculeGroup } from '../types';
import { log } from './debug';

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
  private readonly kB = 1.38e-23; // Boltzmann constant
  
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
    
    log(`Detecting reaction: ${reaction.name} at ${temperature}K`);
    
    // 1. Check energy threshold
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
    const compatibilityFactor = this.calculateCompatibilityFactor(
      substrate,
      nucleophile,
      reaction
    );
    
    // 5. Combined probability
    const probability = energyFactor * orientationFactor * tempFactor * compatibilityFactor;
    
    // 6. Stochastic determination
    const occurs = Math.random() < probability;
    
    const result: ReactionResult = {
      occurs,
      probability,
      reactionType: reaction,
      collisionData: collision,
      substrate,
      nucleophile
    };
    
    log(`Reaction detection result: ${occurs ? 'SUCCESS' : 'FAILED'} (probability: ${(probability * 100).toFixed(2)}%)`);
    
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
    
    log(`Energy factor: ${energyFactor.toFixed(3)} (collision: ${collisionE.toFixed(1)} kJ/mol, activation: ${activationE} kJ/mol)`);
    
    return energyFactor;
  }
  
  /**
   * Calculate orientation factor based on approach angle
   */
  private calculateOrientationFactor(actual: number, optimal: number): number {
    // Gaussian distribution around optimal angle
    const deviation = Math.abs(actual - optimal);
    const sigma = 30; // degrees tolerance
    const orientationFactor = Math.exp(-(deviation ** 2) / (2 * sigma ** 2));
    
    log(`Orientation factor: ${orientationFactor.toFixed(3)} (actual: ${actual.toFixed(1)}°, optimal: ${optimal}°)`);
    
    return orientationFactor;
  }
  
  /**
   * Calculate molecular compatibility factor
   */
  private calculateCompatibilityFactor(
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
    
    log(`Compatibility factor: ${compatibility.toFixed(3)}`);
    
    return compatibility;
  }
  
  /**
   * Check if molecular features match required features
   */
  private checkFeatureCompatibility(
    moleculeFeatures: any,
    requiredFeatures: any[]
  ): number {
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
   */
  calculateCollisionEnergy(
    mass1: number,
    mass2: number,
    relativeVelocity: number
  ): number {
    // Convert kinetic energy to kJ/mol
    const reducedMass = (mass1 * mass2) / (mass1 + mass2);
    const kineticEnergy = 0.5 * reducedMass * relativeVelocity ** 2;
    const energyInJoules = kineticEnergy * this.N_A; // Convert to J/mol
    const energyInKJ = energyInJoules / 1000; // Convert to kJ/mol
    
    log(`Collision energy: ${energyInKJ.toFixed(2)} kJ/mol (reduced mass: ${reducedMass.toFixed(3)} kg, velocity: ${relativeVelocity.toFixed(2)} m/s)`);
    
    return energyInKJ;
  }
  
  /**
   * Calculate approach angle from molecular orientations
   */
  calculateApproachAngle(
    substrateOrientation: THREE.Quaternion,
    nucleophileOrientation: THREE.Quaternion,
    collisionPoint: THREE.Vector3
  ): number {
    // This is a simplified calculation
    // In practice, you'd analyze the specific molecular geometry
    
    // For SN2 reactions, we want backside attack (180°)
    // For now, return a random angle for demonstration
    const angle = Math.random() * 360;
    
    log(`Approach angle: ${angle.toFixed(1)}°`);
    
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
    const rateConstant = preExponentialFactor * Math.exp(-reaction.activationEnergy * 1000 / (this.R * temperature));
    
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
    const energyFactor = this.calculateEnergyFactor(collision.collisionEnergy, reaction.activationEnergy);
    const orientationFactor = this.calculateOrientationFactor(collision.approachAngle, reaction.optimalAngle);
    const tempFactor = reaction.probabilityFactors.temperature(temperature);
    const rateConstant = this.getReactionRateConstant(reaction, temperature);
    
    return {
      energyAnalysis: {
        collisionEnergy: collision.collisionEnergy,
        activationEnergy: reaction.activationEnergy,
        excessEnergy: collision.collisionEnergy - reaction.activationEnergy,
        energyFactor
      },
      orientationAnalysis: {
        approachAngle: collision.approachAngle,
        optimalAngle: reaction.optimalAngle,
        deviation: Math.abs(collision.approachAngle - reaction.optimalAngle),
        orientationFactor
      },
      temperatureAnalysis: {
        temperature,
        tempFactor,
        rateConstant
      },
      overallProbability: energyFactor * orientationFactor * tempFactor
    };
  }
}

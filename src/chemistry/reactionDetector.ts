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
    temperature: number, // Temperature is accounted for in collision.collisionEnergy via velocity scaling
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup
  ): ReactionResult {
    if (!reaction || !reaction.activationEnergy) {
      return {
        occurs: false,
        probability: 0,
        reactionType: reaction || { id: 'unknown', activationEnergy: 0, optimalAngle: 0 },
        collisionData: collision,
        substrate,
        nucleophile,
      };
    }
    
    const collisionEnergy = this.ensureFinite(collision.collisionEnergy);
    const approachAngle = this.normalizeAngle(collision.approachAngle);
    const sanitizedCollision: CollisionData = {
      ...collision,
      collisionEnergy,
      approachAngle,
    };

    // DETERMINISTIC ENERGY CHECK: Below activation energy = NO reaction EVER
    // This is realistic physical chemistry - no thermal fluctuations can overcome a barrier
    // if the collision energy is fundamentally insufficient
    if (collisionEnergy < reaction.activationEnergy) {
      return {
        occurs: false,
        probability: 0,
        reactionType: reaction,
        collisionData: sanitizedCollision,
        substrate,
        nucleophile,
      };
    }

    // STOCHASTIC REACTION DETECTION (for collisions with sufficient energy):
    // Reaction probability depends on:
    // 1. Energy factor: Higher energy above activation = higher probability
    // 2. Orientation factor: Better alignment with optimal angle = higher probability
    // Temperature affects collision energy through velocity scaling (Maxwell-Boltzmann)
    
    // Detect rate mode by checking molecule naming convention
    const isRateMode = substrate?.name?.startsWith('substrate_') || substrate?.name?.startsWith('nucleophile_');
    
    // 1. Calculate energy factor using smooth exponential
    // Since we already confirmed collisionEnergy >= activationEnergy, factor is always > 0
    const energyFactor = Math.min(1, 1 - Math.exp(-(collisionEnergy - reaction.activationEnergy) / reaction.activationEnergy));
    
    // 2. Calculate orientation factor (angle-dependent)
    // Pass isRateMode flag to use appropriate tolerance: strict for single collision, lenient for rate mode
    const orientationFactor = this.calculateOrientationFactor(
      approachAngle,
      reaction.optimalAngle,
      isRateMode
    );
    
    // 3. Combined probability: product of energy and orientation factors
    // This gives realistic reaction rates: most collisions don't react, but some do
    let probability = Math.min(Math.max(energyFactor * orientationFactor, 0), 1);
    
    // Boost probability for rate mode to make reactions more visible/educational
    // In rate mode, we want to see more reactions happening for better visualization
    if (isRateMode && probability > 0) {
      // Boost probability by 2.5x, but cap at 50% max (still realistic)
      probability = Math.min(probability * 2.5, 0.5);
    }
    
    // 4. Stochastic determination: random roll against probability
    // This creates realistic reaction kinetics where:
    // - Collisions with just enough energy may still not react (orientation matters!)
    // - High energy + good orientation = high chance
    // - Temperature increases both collision energy AND frequency
    const occurs = probability > 0 ? Math.random() < probability : false;

    const result: ReactionResult = {
      occurs,
      probability,
      reactionType: reaction,
      collisionData: sanitizedCollision,
      substrate,
      nucleophile,
    };

    if (occurs) {
      // hide non-rxns
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
   * @param isRateMode - Whether we're in rate simulation mode (lenient) or single collision mode (strict)
   * @returns Orientation factor (0-1), where 1 = perfect orientation
   */
  private calculateOrientationFactor(actual: number, optimal: number, isRateMode: boolean = false): number {
    // If no optimal angle specified (optimal = 0), orientation doesn't matter
    if (optimal === 0) {
      return 1.0;
    }

    // Gaussian distribution around optimal angle
    // Handle angle wrapping: 338.8° is 21.2° away from 180°, not 158.8°
    const normalizedActual = this.normalizeAngle(actual);
    const normalizedOptimal = this.normalizeAngle(optimal);
    let deviation = Math.abs(normalizedActual - normalizedOptimal);
    if (deviation > 180) {
      deviation = 360 - deviation;
    }
    
    // Orientation tolerance:
    // - Single collision mode: STRICT ±10° tolerance (realistic physical chemistry)
    // - Rate mode: LENIENT ±90° tolerance (educational, shows more reactions)
    const sigma = isRateMode ? 60 : 10; // degrees tolerance (standard deviation)
    // Gaussian: exp(-(x-μ)²/(2σ²)) where μ = optimal, σ = tolerance
    const orientationFactor = Math.exp(-(deviation ** 2) / (2 * sigma ** 2));

    return orientationFactor;
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
  calculateCollisionEnergy(
    mass1: number,
    mass2: number,
    relativeVelocity: number,
    temperature: number = 298
  ): number {
    const AMU_TO_KG = 1.660539e-27; // kg per atomic mass unit
    const BOLTZMANN_CONSTANT = 1.380649e-23; // J/K
    const REFERENCE_TEMP = 298; // K
    // NOTE: Rate mode uses baseSpeed 60.0 m/s for visualization, but we need to scale to real molecular speeds
    // Real molecular speeds are ~100-1000 m/s, so visualization speeds are scaled down less now
    // IMPORTANT: Use the same baseSpeed as ReactionRateSimulator (60.0 m/s) for consistency
    const VISUALIZATION_BASE_SPEED = 60.0; // m/s - matches ReactionRateSimulator baseSpeed

    // Calculate real molecular RMS velocity using Maxwell-Boltzmann: v_rms = sqrt(3kT/m)
    const avgMass = (mass1 + mass2) / 2;
    const mass_kg = avgMass * AMU_TO_KG;
    const realVrms_at_T = Math.sqrt((3 * BOLTZMANN_CONSTANT * temperature) / mass_kg);
    const realVrms_at_ref = Math.sqrt((3 * BOLTZMANN_CONSTANT * REFERENCE_TEMP) / mass_kg);
    
    // Scale visualization velocity UP to real molecular velocity
    // Visualization speeds are scaled down for display (12 m/s), real speeds are much higher (~280 m/s for 95 AMU at 298K)
    // Scale factor: how much faster real molecules move compared to visualization
    const visualizationToRealScale = realVrms_at_ref / VISUALIZATION_BASE_SPEED;
    const temperatureScaleFactor = realVrms_at_T / realVrms_at_ref;
    const sanitizedVelocity = Number.isFinite(relativeVelocity) ? relativeVelocity : 0;
    const realVelocity = sanitizedVelocity * visualizationToRealScale * temperatureScaleFactor;

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

    return this.normalizeAngle(angle);
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

  /**
   * Ensure numbers are finite to avoid NaNs propagating
   */
  private ensureFinite(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
  }

  /**
   * Normalize angles to 0-360°
   */
  private normalizeAngle(angle: number): number {
    if (!Number.isFinite(angle)) {
      return 0;
    }
    const normalized = angle % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }
}

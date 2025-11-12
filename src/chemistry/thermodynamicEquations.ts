/**
 * Thermodynamic Equations for Molecular Reaction Simulator
 * 
 * This file contains the scientific equations used to calculate
 * activation energy profiles and reaction thermodynamics.
 */

/**
 * Activation Energy Profile Curve
 * 
 * Simplified curve for educational purposes that shows the energy barrier
 * between reactants and products. Uses a simple parabolic shape that is
 * easier to understand than complex exponential functions.
 * 
 * @param reactionCoordinate - Position along reaction coordinate (0-1)
 * @param reactantEnergy - Starting energy level (kJ/mol)
 * @param productEnergy - Final energy level (kJ/mol)
 * @param activationEnergy - Energy barrier height (kJ/mol)
 * @returns Energy at given reaction coordinate (kJ/mol)
 */
export function calculateActivationEnergyProfile(
  reactionCoordinate: number,
  reactantEnergy: number,
  productEnergy: number,
  activationEnergy: number
): number {
  const transitionStateEnergy = reactantEnergy + activationEnergy;
  
  // Simple parabolic curve: energy peaks at midpoint (transition state)
  // For educational clarity, use a simple inverted parabola
  // E(x) = reactantEnergy + (transitionStateEnergy - reactantEnergy) * 4x(1-x) for x in [0, 0.5]
  // Then linear interpolation from transition state to products
  
  if (reactionCoordinate <= 0.5) {
    // Reactants to transition state - parabolic rise to barrier
    const t = reactionCoordinate * 2; // normalize to 0-1 for this segment
    // Simple parabola: peaks at t=0.5 (reactionCoordinate=0.5)
    const parabola = 4 * t * (1 - t); // 0 at t=0, 1 at t=0.5, 0 at t=1
    return reactantEnergy + (transitionStateEnergy - reactantEnergy) * parabola;
  } else {
    // Transition state to products - linear descent
    const t = (reactionCoordinate - 0.5) * 2; // normalize to 0-1 for this segment
    return transitionStateEnergy - (transitionStateEnergy - productEnergy) * t;
  }
}

/**
 * Arrhenius Equation for Reaction Rate
 * 
 * Calculates the rate constant based on activation energy and temperature
 * 
 * @param activationEnergy - Activation energy (kJ/mol)
 * @param temperature - Temperature (Kelvin)
 * @param preExponentialFactor - Pre-exponential factor (default: 1e13 s^-1)
 * @returns Rate constant (s^-1)
 */
export function calculateArrheniusRate(
  activationEnergy: number,
  temperature: number,
  preExponentialFactor: number = 1e13
): number {
  const R = 8.314e-3; // Gas constant in kJ/(mol·K)
  return preExponentialFactor * Math.exp(-activationEnergy / (R * temperature));
}

/**
 * Kinetic Energy from Velocity
 * 
 * Converts molecular velocity to kinetic energy per mole.
 * Formula: KE = 0.5 * m * v^2 where m is mass per mole.
 * 
 * @param velocity - Molecular velocity (m/s)
 * @param molecularMass - Molecular mass (kg/mol)
 * @returns Kinetic energy (kJ/mol)
 */
export function calculateKineticEnergy(
  velocity: number,
  molecularMass: number = 0.028 // Default for CH3Br in kg/mol
): number {
  // KE = 0.5 * m * v^2 gives energy in J/mol
  // Convert to kJ/mol by dividing by 1000
  return 0.5 * molecularMass * Math.pow(velocity, 2) / 1000;
}

/**
 * Reaction Probability from Kinetic vs Activation Energy
 * 
 * Determines if reaction will proceed based on kinetic energy
 * 
 * @param kineticEnergy - Current kinetic energy (kJ/mol)
 * @param activationEnergy - Required activation energy (kJ/mol)
 * @returns Reaction probability (0-1)
 */
export function calculateReactionProbability(
  kineticEnergy: number,
  activationEnergy: number
): number {
  return Math.min(1, kineticEnergy / activationEnergy);
}

/**
 * Simplified Transition State Theory Rate Constant
 * 
 * Simplified rate calculation for educational purposes.
 * Uses Arrhenius equation with entropy correction, avoiding quantum mechanical constants.
 * 
 * @param activationEnergy - Activation energy (kJ/mol)
 * @param temperature - Temperature (Kelvin)
 * @param deltaS - Entropy change (J/(mol·K))
 * @param preExponentialFactor - Pre-exponential factor (default: 1e13 s^-1)
 * @returns Rate constant (s^-1)
 */
export function calculateTransitionStateRate(
  activationEnergy: number,
  temperature: number,
  deltaS: number = 0,
  preExponentialFactor: number = 1e13
): number {
  const R = 8.314e-3; // Gas constant in kJ/(mol·K)
  
  // Simplified approach: Arrhenius with entropy correction
  // Avoids quantum mechanical constants (Planck's constant) for educational clarity
  const entropyFactor = Math.exp(deltaS / (R * 1000)); // Entropy contribution
  const rate = preExponentialFactor * Math.exp(-activationEnergy / (R * temperature)) * entropyFactor;
  
  return rate;
}

/**
 * Energy Scale Conversion
 * 
 * Converts between different energy units commonly used in chemistry
 * 
 * @param value - Energy value
 * @param fromUnit - Source unit ('kJ/mol' | 'kcal/mol' | 'eV' | 'J/mol')
 * @param toUnit - Target unit ('kJ/mol' | 'kcal/mol' | 'eV' | 'J/mol')
 * @returns Converted energy value
 */
export function convertEnergyUnits(
  value: number,
  fromUnit: 'kJ/mol' | 'kcal/mol' | 'eV' | 'J/mol',
  toUnit: 'kJ/mol' | 'kcal/mol' | 'eV' | 'J/mol'
): number {
  // Conversion factors to kJ/mol
  const toKJmol: Record<string, number> = {
    'kJ/mol': 1,
    'kcal/mol': 4.184,
    'eV': 96.485,
    'J/mol': 0.001
  };
  
  // Convert to kJ/mol first, then to target unit
  const valueInKJmol = value * toKJmol[fromUnit];
  return valueInKJmol / toKJmol[toUnit];
}

/**
 * Temperature Effects on Activation Energy
 * 
 * Calculates how activation energy changes with temperature
 * (for reactions with temperature-dependent barriers)
 * 
 * @param baseActivationEnergy - Base activation energy (kJ/mol)
 * @param temperature - Current temperature (Kelvin)
 * @param referenceTemperature - Reference temperature (Kelvin, default: 298.15)
 * @param temperatureCoefficient - Temperature coefficient (default: 0.1)
 * @returns Temperature-adjusted activation energy (kJ/mol)
 */
export function adjustActivationEnergyForTemperature(
  baseActivationEnergy: number,
  temperature: number,
  referenceTemperature: number = 298.15,
  temperatureCoefficient: number = 0.1
): number {
  const temperatureRatio = temperature / referenceTemperature;
  return baseActivationEnergy * Math.pow(temperatureRatio, temperatureCoefficient);
}

/**
 * Reaction Enthalpy from Bond Energies
 * 
 * Calculates reaction enthalpy from bond breaking and forming
 * 
 * @param bondsBroken - Array of bond energies being broken (kJ/mol)
 * @param bondsFormed - Array of bond energies being formed (kJ/mol)
 * @returns Reaction enthalpy (kJ/mol)
 */
export function calculateReactionEnthalpy(
  bondsBroken: number[],
  bondsFormed: number[]
): number {
  const energyToBreak = bondsBroken.reduce((sum, energy) => sum + energy, 0);
  const energyReleased = bondsFormed.reduce((sum, energy) => sum + energy, 0);
  return energyReleased - energyToBreak; // Negative for exothermic
}

/**
 * Standard Thermodynamic Data for Common Reactions
 * 
 * Pre-calculated thermodynamic data for typical organic reactions
 */
export const STANDARD_THERMODYNAMIC_DATA = {
  SN2: {
    activationEnergy: 30.0, // kJ/mol - realistic for CH3Br + OH-
    reactionEnthalpy: -23.1, // kJ/mol (exothermic)
    reactantEnergy: 0, // Reference point
    productEnergy: -23.1, // Final energy
    temperature: 298.15 // Room temperature
  },
  SN1: {
    activationEnergy: 85.0, // kJ/mol (higher barrier for carbocation)
    reactionEnthalpy: -15.2, // kJ/mol
    reactantEnergy: 0,
    productEnergy: -15.2,
    temperature: 298.15
  },
  E2: {
    activationEnergy: 60.0, // kJ/mol - intermediate for elimination
    reactionEnthalpy: -18.7, // kJ/mol
    reactantEnergy: 0,
    productEnergy: -18.7,
    temperature: 298.15
  }
} as const;

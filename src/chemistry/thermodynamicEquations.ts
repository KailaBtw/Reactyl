/**
 * Thermodynamic Equations for Molecular Reaction Simulator
 * 
 * This file contains the scientific equations used to calculate
 * activation energy profiles and reaction thermodynamics.
 */

/**
 * Modified Morse Potential for Activation Energy Curve
 * 
 * This equation generates a scientifically accurate activation energy profile
 * that matches the shape of real chemical reaction energy diagrams.
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
  
  if (reactionCoordinate <= 0.5) {
    // Reactants to transition state - exponential approach to barrier
    const t = reactionCoordinate * 2; // normalize to 0-1 for this segment
    // Modified Morse potential approach for realistic shape
    return reactantEnergy + (transitionStateEnergy - reactantEnergy) * 
           (1 - Math.exp(-3 * t)) * Math.exp(-0.8 * (1 - t));
  } else {
    // Transition state to products - exponential decay from barrier
    const t = (reactionCoordinate - 0.5) * 2; // normalize to 0-1 for this segment
    return transitionStateEnergy - (transitionStateEnergy - productEnergy) * 
           (1 - Math.exp(-3 * t)) * Math.exp(-0.8 * (1 - t));
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
 * Converts molecular velocity to kinetic energy
 * 
 * @param velocity - Molecular velocity (m/s)
 * @param molecularMass - Molecular mass (kg/mol)
 * @returns Kinetic energy (kJ/mol)
 */
export function calculateKineticEnergy(
  velocity: number,
  molecularMass: number = 0.028 // Default for CH3Br
): number {
  return 0.5 * molecularMass * Math.pow(velocity, 2) * 6.022e23 / 1000; // Convert to kJ/mol
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
 * Transition State Theory Rate Constant
 * 
 * More sophisticated rate calculation using transition state theory
 * 
 * @param activationEnergy - Activation energy (kJ/mol)
 * @param temperature - Temperature (Kelvin)
 * @param deltaS - Entropy change (J/(mol·K))
 * @returns Rate constant (s^-1)
 */
export function calculateTransitionStateRate(
  activationEnergy: number,
  temperature: number,
  deltaS: number = 0
): number {
  const R = 8.314e-3; // Gas constant in kJ/(mol·K)
  const kB = 1.381e-23; // Boltzmann constant
  const h = 6.626e-34; // Planck constant
  
  const kBT = kB * temperature;
  const rate = (kBT / h) * Math.exp(-activationEnergy / (R * temperature)) * Math.exp(deltaS / (R * 1000));
  
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
    activationEnergy: 45.2, // kJ/mol
    reactionEnthalpy: -23.1, // kJ/mol (exothermic)
    reactantEnergy: 0, // Reference point
    productEnergy: -23.1, // Final energy
    temperature: 298.15 // Room temperature
  },
  SN1: {
    activationEnergy: 85.4, // kJ/mol (higher barrier)
    reactionEnthalpy: -15.2, // kJ/mol
    reactantEnergy: 0,
    productEnergy: -15.2,
    temperature: 298.15
  },
  E2: {
    activationEnergy: 52.3, // kJ/mol
    reactionEnthalpy: -18.7, // kJ/mol
    reactantEnergy: 0,
    productEnergy: -18.7,
    temperature: 298.15
  }
} as const;

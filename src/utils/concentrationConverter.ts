/**
 * Utility functions for converting between concentration (mol/L) and particle count
 * for reaction rate simulations
 */

// Container dimensions (cubic volume in arbitrary units)
// The visualization container is 50 units per side (arbitrary visualization units)
// But we represent a tiny realistic cube sample from a larger solution
// Volume chosen to give max ~500 molecules at 10 mol/L for performance
// Lower concentrations will have fewer molecules (with a minimum floor)
// Using mantissa/exponent representation to avoid floating point precision errors
const VOLUME_MANTISSA = 8.305; // Mantissa part
const VOLUME_EXPONENT = -23;   // Exponent part (8.305e-23 L)
const CONTAINER_VOLUME_LITERS = VOLUME_MANTISSA * Math.pow(10, VOLUME_EXPONENT);
const MIN_PAIRS = 5; // Minimum pairs to show at very low concentrations

// No visualization scale - showing actual molecules in this tiny volume
const AVOGADRO_NUMBER = 6.022e23;

/**
 * Convert concentration (mol/L) to number of molecule pairs
 * Uses high-precision calculation to avoid floating point errors
 * @param concentration - Concentration in mol/L (0.001 - 10)
 * @returns Number of molecule pairs to spawn
 */
export function concentrationToParticleCount(concentration: number): number {
  // High-precision calculation using mantissa/exponent to avoid floating point errors
  // Calculate as: concentration × (mantissa × 10^exponent) × Avogadro
  // Group constants: (mantissa × Avogadro) × concentration × 10^exponent
  
  // Pre-compute mantissa × Avogadro for precision
  const mantissaTimesAvogadro = VOLUME_MANTISSA * AVOGADRO_NUMBER;
  
  // Calculate: concentration × mantissa × Avogadro × 10^exponent
  // This avoids very small intermediate values
  const molecules = concentration * mantissaTimesAvogadro * Math.pow(10, VOLUME_EXPONENT);
  
  // Round to nearest integer, with minimum floor for visibility
  const pairs = Math.max(MIN_PAIRS, Math.round(molecules));
  
  return pairs;
}

/**
 * Convert number of molecule pairs to concentration (mol/L)
 * @param particleCount - Number of molecule pairs
 * @returns Concentration in mol/L
 */
export function particleCountToConcentration(particleCount: number): number {
  // Reverse the calculation
  const moles = particleCount / AVOGADRO_NUMBER;
  const concentration = moles / CONTAINER_VOLUME_LITERS;
  
  return Math.max(0.001, Math.min(10, concentration));
}

/**
 * Get container volume in liters
 */
export function getContainerVolume(): number {
  return CONTAINER_VOLUME_LITERS;
}


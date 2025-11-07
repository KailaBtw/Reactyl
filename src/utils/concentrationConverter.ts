/**
 * Utility functions for converting between concentration (mol/L) and particle count
 * for reaction rate simulations
 */

// Container dimensions (cubic volume in arbitrary units)
// Container is 50 units per side, treating 1 unit = 1 cm for volume calculation
const CONTAINER_SIZE = 50; // cm
const CONTAINER_VOLUME_LITERS = Math.pow(CONTAINER_SIZE / 100, 3); // Convert cm³ to liters

// Scale factor for visualization (1 molecule per 1e20 real molecules)
const VISUALIZATION_SCALE = 1e-20;
const AVOGADRO_NUMBER = 6.022e23;

/**
 * Convert concentration (mol/L) to number of molecule pairs
 * @param concentration - Concentration in mol/L (0.001 - 10)
 * @returns Number of molecule pairs to spawn (1 - 100)
 */
export function concentrationToParticleCount(concentration: number): number {
  // Calculate number of moles in container
  const moles = concentration * CONTAINER_VOLUME_LITERS;
  
  // Convert to number of pairs (each pair = 1 substrate + 1 nucleophile)
  // Apply visualization scale factor
  const actualPairs = moles * AVOGADRO_NUMBER * VISUALIZATION_SCALE;
  
  // Round to nearest integer, with minimum of 1 and maximum of 100
  return Math.max(1, Math.min(100, Math.round(actualPairs)));
}

/**
 * Convert number of molecule pairs to concentration (mol/L)
 * @param particleCount - Number of molecule pairs (1 - 100)
 * @returns Concentration in mol/L (0.001 - 10)
 */
export function particleCountToConcentration(particleCount: number): number {
  // Reverse the calculation
  const actualPairs = particleCount / VISUALIZATION_SCALE;
  const moles = actualPairs / AVOGADRO_NUMBER;
  const concentration = moles / CONTAINER_VOLUME_LITERS;
  
  return Math.max(0.001, Math.min(10, concentration));
}

/**
 * Get container volume in liters
 */
export function getContainerVolume(): number {
  return CONTAINER_VOLUME_LITERS;
}


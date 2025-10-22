import { simpleCacheService } from '../../services/simpleCacheService';

// Fallback molecular mass lookup table for common molecules (kg/mol)
// This is used when cached data is not available
export const MOLECULAR_MASS_LOOKUP: { [key: string]: number } = {
  // Substrates
  'demo_Methyl_bromide': 0.095,  // CH3Br
  'demo_Ethyl_iodide': 0.156,    // C2H5I
  'demo_Methyl_chloride': 0.050, // CH3Cl
  'demo_Methyl_iodide': 0.142,   // CH3I
  'demo_2_Bromobutane': 0.137,   // C4H9Br
  'demo_2_Chlorobutane': 0.092,  // C4H9Cl
  
  // Nucleophiles
  'demo_Hydroxide_ion': 0.017,   // OH-
  'demo_Cyanide_ion': 0.026,     // CN-
  'demo_Ammonia': 0.017,          // NH3
  'demo_Methoxide': 0.031,        // CH3O-
  'demo_Chloride_ion': 0.035,     // Cl-
  'demo_Bromide_ion': 0.080,     // Br-
  'demo_Iodide_ion': 0.127,      // I-
  
  // Bases
  'demo_Potassium_tert_butoxide': 0.112, // K+ t-BuO-
  'demo_DBU': 0.152,             // C9H16N2
  
  // Default fallbacks
  'default_substrate': 0.028,    // CH3Br equivalent
  'default_nucleophile': 0.017,  // OH- equivalent
  'default_base': 0.031,         // CH3O- equivalent
};

/**
 * Get molecular mass for a molecule by name
 * @param moleculeName - The molecule identifier
 * @param role - The role in the reaction (substrate, nucleophile, base)
 * @returns Molecular mass in kg/mol
 */
export function getMolecularMass(moleculeName: string, role: 'substrate' | 'nucleophile' | 'base' = 'substrate'): number {
  // First try to get from cached molecular data
  const cachedMolecule = simpleCacheService.getMolecule(moleculeName);
  if (cachedMolecule && cachedMolecule.molWeight) {
    // Convert from g/mol to kg/mol
    return cachedMolecule.molWeight / 1000;
  }
  
  // Fallback to hardcoded lookup table
  if (MOLECULAR_MASS_LOOKUP[moleculeName]) {
    return MOLECULAR_MASS_LOOKUP[moleculeName];
  }
  
  // Final fallback based on role
  switch (role) {
    case 'substrate':
      return MOLECULAR_MASS_LOOKUP['default_substrate'];
    case 'nucleophile':
      return MOLECULAR_MASS_LOOKUP['default_nucleophile'];
    case 'base':
      return MOLECULAR_MASS_LOOKUP['default_base'];
    default:
      return MOLECULAR_MASS_LOOKUP['default_substrate'];
  }
}

/**
 * Get molecular masses for both reactants
 * @param substrate - Substrate molecule name
 * @param nucleophile - Nucleophile molecule name
 * @returns Object with substrate and nucleophile masses
 */
export function getReactionMasses(substrate: string, nucleophile: string): {
  substrateMass: number;
  nucleophileMass: number;
} {
  return {
    substrateMass: getMolecularMass(substrate, 'substrate'),
    nucleophileMass: getMolecularMass(nucleophile, 'nucleophile')
  };
}

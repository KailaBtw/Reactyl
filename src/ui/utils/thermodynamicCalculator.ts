import { simpleCacheService } from '../../services/simpleCacheService';

/**
 * Calculate thermodynamic properties for specific molecule combinations
 */
export interface ThermodynamicResult {
  activationEnergy: number;    // kJ/mol
  enthalpyChange: number;      // kJ/mol (ΔH)
  reactantEnergy: number;       // kJ/mol (reference point)
  productEnergy: number;        // kJ/mol
  transitionStateEnergy: number; // kJ/mol
  substrateMass: number;        // kg/mol
  nucleophileMass: number;      // kg/mol
}

/**
 * Bond energy lookup table (kJ/mol)
 */
const BOND_ENERGIES = {
  // C-X bonds (leaving groups)
  'C-Br': 285,   // Carbon-Bromine
  'C-Cl': 327,   // Carbon-Chlorine  
  'C-I': 240,    // Carbon-Iodine
  'C-OH': 380,   // Carbon-Hydroxyl
  
  // O-H bonds
  'O-H': 463,    // Hydroxyl
  
  // C-H bonds
  'C-H': 413,    // Carbon-Hydrogen
} as const;

/**
 * Calculate activation energy based on specific molecule combination
 */
export function calculateActivationEnergy(
  substrate: string,
  nucleophile: string,
  reactionType: string
): number {
  // Get molecular data - try different lookup methods
  let substrateData = simpleCacheService.getMolecule(substrate);
  let nucleophileData = simpleCacheService.getMolecule(nucleophile);
  
  // If not found by name, try by CID or common names
  if (!substrateData) {
    // Try common molecule lookups
    if (substrate.includes('Methyl') || substrate.includes('bromide') || substrate.includes('CH3Br')) {
      substrateData = simpleCacheService.getMolecule('6323'); // Methyl bromide CID
    }
  }
  
  if (!nucleophileData) {
    // Try common nucleophile lookups
    if (nucleophile.includes('Hydroxide') || nucleophile.includes('OH')) {
      nucleophileData = simpleCacheService.getMolecule('961'); // Hydroxide CID
    }
  }
  
  
  // Base activation energies by reaction type
  const baseActivationEnergies = {
    'sn2': 35.0,  // Base SN2 activation energy
    'sn1': 85.0,  // Base SN1 activation energy  
    'e2': 60.0,   // Base E2 activation energy
  };
  
  let activationEnergy = baseActivationEnergies[reactionType.toLowerCase()] || 35.0;
  
  // Adjust based on substrate (leaving group effects)
  if (substrateData?.formula) {
    if (substrateData.formula.includes('Br')) {
      activationEnergy -= 5.0; // Bromine is good leaving group
    } else if (substrateData.formula.includes('Cl')) {
      activationEnergy += 2.0; // Chlorine is moderate leaving group
    } else if (substrateData.formula.includes('I')) {
      activationEnergy -= 8.0; // Iodine is excellent leaving group
    }
  }
  
  // Adjust based on nucleophile
  if (nucleophileData?.formula) {
    if (nucleophileData.formula.includes('OH')) {
      activationEnergy += 3.0; // Hydroxide is moderate nucleophile
    } else if (nucleophileData.formula.includes('CN')) {
      activationEnergy -= 2.0; // Cyanide is good nucleophile
    } else if (nucleophileData.formula.includes('NH')) {
      activationEnergy += 5.0; // Ammonia is weak nucleophile
    }
  }
  
  // SCIENTIFICALLY ACCURATE: Activation energy is FIXED
  // Attack mode and velocity affect REACTION PROBABILITY, not activation energy
  // The barrier height is determined by molecular structure and reaction type only
  
  return Math.max(10.0, activationEnergy); // Minimum 10 kJ/mol
}

/**
 * Calculate reaction enthalpy from bond energies
 */
export function calculateReactionEnthalpy(
  substrate: string,
  nucleophile: string,
  reactionType: string
): number {
  // Get molecular data
  const substrateData = simpleCacheService.getMolecule(substrate);
  const nucleophileData = simpleCacheService.getMolecule(nucleophile);
  
  let enthalpyChange = -20.0; // Base exothermic value
  
  // Adjust based on substrate leaving group
  if (substrateData?.formula) {
    if (substrateData.formula.includes('Br')) {
      enthalpyChange -= 5.0; // Bromine bond is weaker
    } else if (substrateData.formula.includes('Cl')) {
      enthalpyChange += 2.0; // Chlorine bond is stronger
    } else if (substrateData.formula.includes('I')) {
      enthalpyChange -= 8.0; // Iodine bond is much weaker
    }
  }
  
  // Adjust based on nucleophile
  if (nucleophileData?.formula) {
    if (nucleophileData.formula.includes('OH')) {
      enthalpyChange -= 3.0; // OH bond formation is favorable
    } else if (nucleophileData.formula.includes('CN')) {
      enthalpyChange -= 5.0; // CN bond formation is very favorable
    }
  }
  
  return enthalpyChange;
}

/**
 * Get molecular masses for the selected molecules
 */
export function getMolecularMasses(
  substrate: string,
  nucleophile: string
): { substrateMass: number; nucleophileMass: number } {
  let substrateData = simpleCacheService.getMolecule(substrate);
  let nucleophileData = simpleCacheService.getMolecule(nucleophile);
  
  // If not found by name, try by CID
  if (!substrateData) {
    if (substrate.includes('Methyl') || substrate.includes('bromide') || substrate.includes('CH3Br')) {
      substrateData = simpleCacheService.getMolecule('6323'); // Methyl bromide CID
    }
  }
  
  if (!nucleophileData) {
    if (nucleophile.includes('Hydroxide') || nucleophile.includes('OH')) {
      nucleophileData = simpleCacheService.getMolecule('961'); // Hydroxide CID
    }
  }
  
  const substrateMass = substrateData?.molWeight ? substrateData.molWeight / 1000 : 0.095; // kg/mol
  const nucleophileMass = nucleophileData?.molWeight ? nucleophileData.molWeight / 1000 : 0.017; // kg/mol
  
  
  return { substrateMass, nucleophileMass };
}

/**
 * Calculate complete thermodynamic data for a reaction
 */
export function calculateThermodynamicData(
  substrate: string,
  nucleophile: string,
  reactionType: string
): ThermodynamicResult {
  const activationEnergy = calculateActivationEnergy(substrate, nucleophile, reactionType);
  const enthalpyChange = calculateReactionEnthalpy(substrate, nucleophile, reactionType);
  const { substrateMass, nucleophileMass } = getMolecularMasses(substrate, nucleophile);
  
  const reactantEnergy = 0; // Reference point
  const productEnergy = reactantEnergy + enthalpyChange;
  const transitionStateEnergy = reactantEnergy + activationEnergy;
  
  return {
    activationEnergy,
    enthalpyChange,
    reactantEnergy,
    productEnergy,
    transitionStateEnergy,
    substrateMass,
    nucleophileMass
  };
}

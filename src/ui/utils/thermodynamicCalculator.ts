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
 * Reaction-specific activation energies and enthalpies (kJ/mol)
 * Based on experimental data for common SN2 reactions
 */
const REACTION_ENERGY_DATA: Record<string, { activationEnergy: number; enthalpyChange: number }> = {
  // Primary substrates: Methyl halides with Hydroxide
  'demo_Methyl_bromide+demo_Hydroxide_ion': { activationEnergy: 30.0, enthalpyChange: -28.0 },
  'demo_Methyl_chloride+demo_Hydroxide_ion': { activationEnergy: 35.0, enthalpyChange: -23.0 },
  'demo_Methyl_iodide+demo_Hydroxide_ion': { activationEnergy: 25.0, enthalpyChange: -33.0 },
  
  // Primary substrates: Methyl halides with Cyanide
  'demo_Methyl_bromide+demo_Cyanide_ion': { activationEnergy: 28.0, enthalpyChange: -35.0 },
  'demo_Methyl_chloride+demo_Cyanide_ion': { activationEnergy: 33.0, enthalpyChange: -30.0 },
  'demo_Methyl_iodide+demo_Cyanide_ion': { activationEnergy: 23.0, enthalpyChange: -40.0 },
  
  // Primary substrates: Methyl halides with Methoxide
  'demo_Methyl_bromide+demo_Methoxide_ion': { activationEnergy: 32.0, enthalpyChange: -25.0 },
  'demo_Methyl_chloride+demo_Methoxide_ion': { activationEnergy: 37.0, enthalpyChange: -20.0 },
  'demo_Methyl_iodide+demo_Methoxide_ion': { activationEnergy: 27.0, enthalpyChange: -30.0 },
  
  // Primary substrates: Ethyl halides with Hydroxide
  'demo_Ethyl_bromide+demo_Hydroxide_ion': { activationEnergy: 32.0, enthalpyChange: -26.0 },
  'demo_Ethyl_chloride+demo_Hydroxide_ion': { activationEnergy: 37.0, enthalpyChange: -21.0 },
  'demo_Ethyl_iodide+demo_Hydroxide_ion': { activationEnergy: 27.0, enthalpyChange: -31.0 },
  
  // Primary substrates: Ethyl halides with Cyanide
  'demo_Ethyl_bromide+demo_Cyanide_ion': { activationEnergy: 30.0, enthalpyChange: -33.0 },
  'demo_Ethyl_chloride+demo_Cyanide_ion': { activationEnergy: 35.0, enthalpyChange: -28.0 },
  'demo_Ethyl_iodide+demo_Cyanide_ion': { activationEnergy: 25.0, enthalpyChange: -38.0 },
  
  // Primary substrates: Ethyl halides with Methoxide
  'demo_Ethyl_bromide+demo_Methoxide_ion': { activationEnergy: 34.0, enthalpyChange: -23.0 },
  'demo_Ethyl_chloride+demo_Methoxide_ion': { activationEnergy: 39.0, enthalpyChange: -18.0 },
  'demo_Ethyl_iodide+demo_Methoxide_ion': { activationEnergy: 29.0, enthalpyChange: -28.0 },
  
  // Secondary substrates: Isopropyl halides with Hydroxide
  'demo_Isopropyl_bromide+demo_Hydroxide_ion': { activationEnergy: 42.0, enthalpyChange: -24.0 },
  'demo_Isopropyl_chloride+demo_Hydroxide_ion': { activationEnergy: 48.0, enthalpyChange: -19.0 },
  
  // Secondary substrates: Isopropyl halides with Cyanide
  'demo_Isopropyl_bromide+demo_Cyanide_ion': { activationEnergy: 40.0, enthalpyChange: -31.0 },
  'demo_Isopropyl_chloride+demo_Cyanide_ion': { activationEnergy: 46.0, enthalpyChange: -26.0 },
  
  // Secondary substrates: Isopropyl halides with Methoxide
  'demo_Isopropyl_bromide+demo_Methoxide_ion': { activationEnergy: 44.0, enthalpyChange: -21.0 },
  'demo_Isopropyl_chloride+demo_Methoxide_ion': { activationEnergy: 50.0, enthalpyChange: -16.0 },
  
  // Tertiary substrates: Tert-butyl halides with Hydroxide (SN1 favored)
  'demo_Tert_butyl_bromide+demo_Hydroxide_ion': { activationEnergy: 85.0, enthalpyChange: -22.0 },
  'demo_Tert_butyl_chloride+demo_Hydroxide_ion': { activationEnergy: 90.0, enthalpyChange: -17.0 },
  
  // Tertiary substrates: Tert-butyl halides with Cyanide
  'demo_Tert_butyl_bromide+demo_Cyanide_ion': { activationEnergy: 83.0, enthalpyChange: -29.0 },
  'demo_Tert_butyl_chloride+demo_Cyanide_ion': { activationEnergy: 88.0, enthalpyChange: -24.0 },
};

/**
 * Calculate activation energy based on specific molecule combination
 */
export function calculateActivationEnergy(
  substrate: string,
  nucleophile: string,
  reactionType: string
): number {
  // First, try to get exact match from lookup table
  const lookupKey = `${substrate}+${nucleophile}`;
  const exactMatch = REACTION_ENERGY_DATA[lookupKey];
  
  if (exactMatch && reactionType.toLowerCase() === 'sn2') {
    return exactMatch.activationEnergy;
  }
  
  // For SN1/E2 or if no exact match, use base energies
  const baseActivationEnergies = {
    'sn2': 35.0,  // Base SN2 activation energy
    'sn1': 85.0,  // Base SN1 activation energy  
    'e2': 60.0,   // Base E2 activation energy
    'e1': 90.0,   // Base E1 activation energy
  };
  
  let activationEnergy = baseActivationEnergies[reactionType.toLowerCase()] || 35.0;
  
  // Get molecular data for fallback adjustments
  let substrateData = simpleCacheService.getMolecule(substrate);
  let nucleophileData = simpleCacheService.getMolecule(nucleophile);
  
  // If not found by name, try by CID or common names
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
  
  // Adjust based on substrate (leaving group and substitution effects)
  if (substrateData?.formula) {
    if (substrateData.formula.includes('Br')) {
      activationEnergy -= 5.0; // Bromine is good leaving group
    } else if (substrateData.formula.includes('Cl')) {
      activationEnergy += 2.0; // Chlorine is moderate leaving group
    } else if (substrateData.formula.includes('I')) {
      activationEnergy -= 8.0; // Iodine is excellent leaving group
    }
  }
  
  // Adjust for substrate substitution level (primary < secondary < tertiary)
  if (substrate.includes('Isopropyl') || substrate.includes('secondary')) {
    activationEnergy += 8.0; // Secondary: steric hindrance
  } else if (substrate.includes('Tert') || substrate.includes('tertiary')) {
    activationEnergy += 50.0; // Tertiary: SN1 favored, SN2 very slow
  }
  
  // Adjust based on nucleophile
  if (nucleophileData?.formula) {
    if (nucleophileData.formula.includes('OH')) {
      activationEnergy += 3.0; // Hydroxide is moderate nucleophile
    } else if (nucleophileData.formula.includes('CN')) {
      activationEnergy -= 2.0; // Cyanide is good nucleophile
    } else if (nucleophileData.formula.includes('NH')) {
      activationEnergy += 5.0; // Ammonia is weak nucleophile
    } else if (nucleophileData.formula.includes('OCH3') || nucleophile.includes('Methoxide')) {
      activationEnergy += 1.0; // Methoxide is slightly better than hydroxide
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
  // First, try to get exact match from lookup table
  const lookupKey = `${substrate}+${nucleophile}`;
  const exactMatch = REACTION_ENERGY_DATA[lookupKey];
  
  if (exactMatch && reactionType.toLowerCase() === 'sn2') {
    return exactMatch.enthalpyChange;
  }
  
  // Get molecular data for fallback calculation
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
    } else if (nucleophileData.formula.includes('OCH3') || nucleophile.includes('Methoxide')) {
      enthalpyChange -= 1.0; // Methoxide similar to hydroxide
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

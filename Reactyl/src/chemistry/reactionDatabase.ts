import type { ReactionType } from '../types';

export const REACTION_TYPES: Record<string, ReactionType> = {
  sn2: {
    id: 'sn2',
    name: 'Bimolecular Nucleophilic Substitution',
    mechanism: 'SN2',
    requiredFeatures: {
      substrate: [
        {
          type: 'leaving_group',
          atoms: ['Cl', 'Br', 'I', 'OTs', 'OMs'],
          strength: 1.0,
        },
      ],
      nucleophile: [
        {
          type: 'nucleophile',
          atoms: ['O-', 'CN-', 'N', 'S-'],
          strength: 1.0,
        },
      ],
    },
    activationEnergy: 30, // kJ/mol - realistic for CH3Br + OH- SN2
    optimalAngle: 180, // backside attack
    probabilityFactors: {
      temperature: T => Math.exp(-30000 / (8.314 * T)), // 30 kJ/mol activation energy
      orientation: angle => {
        const deviation = Math.abs(angle - 180);
        const tolerance = 60; // More forgiving tolerance
        return Math.max(0, 1 - deviation / tolerance);
      },
    },
  },

  sn1: {
    id: 'sn1',
    name: 'Unimolecular Nucleophilic Substitution',
    mechanism: 'SN1',
    requiredFeatures: {
      substrate: [
        {
          type: 'leaving_group',
          atoms: ['Cl', 'Br', 'I', 'OTs'],
          strength: 1.0,
        },
      ],
      nucleophile: [
        {
          type: 'nucleophile',
          atoms: ['O-', 'N', 'S-'],
          strength: 0.5, // Less critical for SN1
        },
      ],
    },
    activationEnergy: 85, // kJ/mol - higher due to carbocation formation
    optimalAngle: 0, // No specific angle requirement
    probabilityFactors: {
      temperature: T => Math.exp(-85000 / (8.314 * T)), // 85 kJ/mol activation energy
      orientation: _angle => 1.0, // No orientation dependence
    },
  },

  e2: {
    id: 'e2',
    name: 'Bimolecular Elimination',
    mechanism: 'E2',
    requiredFeatures: {
      substrate: [
        {
          type: 'leaving_group',
          atoms: ['Cl', 'Br', 'I', 'OTs'],
          strength: 1.0,
        },
      ],
      nucleophile: [
        {
          type: 'nucleophile',
          atoms: ['O-', 'N'],
          strength: 1.0,
        },
      ],
    },
    activationEnergy: 100, // kJ/mol
    optimalAngle: 180, // anti-periplanar elimination
    probabilityFactors: {
      temperature: T => Math.exp(-100000 / (8.314 * T)),
      orientation: angle => Math.cos(((angle - 180) * Math.PI) / 180) ** 2,
    },
  },

  e1: {
    id: 'e1',
    name: 'Unimolecular Elimination',
    mechanism: 'E1',
    requiredFeatures: {
      substrate: [
        {
          type: 'leaving_group',
          atoms: ['Cl', 'Br', 'I', 'OTs'],
          strength: 1.0,
        },
      ],
      nucleophile: [
        {
          type: 'nucleophile',
          atoms: ['O-', 'N'],
          strength: 0.3, // Less critical for E1
        },
      ],
    },
    activationEnergy: 140, // kJ/mol - highest due to carbocation formation
    optimalAngle: 0, // No specific angle requirement
    probabilityFactors: {
      temperature: T => Math.exp(-140000 / (8.314 * T)),
      orientation: _angle => 1.0, // No orientation dependence
    },
  },
};

// Predefined reaction participants for common reactions
export const REACTION_PARTICIPANTS = {
  sn2: {
    substrates: [
      { name: 'Methyl bromide', smiles: 'CBr', leaving: 'Br', molFile: 'methyl_bromide.mol' },
      { name: 'Ethyl chloride', smiles: 'CCCl', leaving: 'Cl', molFile: 'ethyl_chloride.mol' },
      { name: 'Methyl iodide', smiles: 'CI', leaving: 'I', molFile: 'methyl_iodide.mol' },
      {
        name: 'Methyl tosylate',
        smiles: 'COS(=O)(=O)c1ccc(C)cc1',
        leaving: 'OTs',
        molFile: 'methyl_tosylate.mol',
      },
    ],
    nucleophiles: [
      { name: 'Hydroxide', smiles: '[OH-]', attacking: 'O', molFile: 'hydroxide.mol' },
      { name: 'Cyanide', smiles: '[C-]#N', attacking: 'C', molFile: 'cyanide.mol' },
      { name: 'Ammonia', smiles: 'N', attacking: 'N', molFile: 'ammonia.mol' },
      { name: 'Methoxide', smiles: 'C[O-]', attacking: 'O', molFile: 'methoxide.mol' },
    ],
  },

  e2: {
    substrates: [
      { name: '2-Bromobutane', smiles: 'CC(Br)CC', leaving: 'Br', molFile: '2_bromobutane.mol' },
      { name: '2-Chlorobutane', smiles: 'CC(Cl)CC', leaving: 'Cl', molFile: '2_chlorobutane.mol' },
    ],
    bases: [
      {
        name: 'Potassium tert-butoxide',
        smiles: 'CC(C)(C)[O-]',
        pKa: 19,
        molFile: 't_butoxide.mol',
      },
      { name: 'DBU', smiles: 'C1CCC2=NCCCN2CC1', pKa: 12, molFile: 'dbu.mol' },
    ],
  },
};

export function getReactionType(id: string): ReactionType | null {
  return REACTION_TYPES[id] || null;
}

export function getAllReactionTypes(): ReactionType[] {
  return Object.values(REACTION_TYPES);
}

export function getReactionParticipants(reactionType: string): unknown {
  return REACTION_PARTICIPANTS[reactionType] || null;
}

export function isMoleculeCompatibleWithReaction(
  moleculeFeatures: unknown,
  reactionType: ReactionType,
  role: 'substrate' | 'nucleophile'
): boolean {
  const requiredFeatures =
    role === 'substrate'
      ? reactionType.requiredFeatures.substrates
      : reactionType.requiredFeatures.nucleophile;

  // Check if molecule has any of the required features
  for (const requiredFeature of requiredFeatures) {
    if (moleculeFeatures[requiredFeature.type]) {
      const moleculeFeaturesOfType = moleculeFeatures[requiredFeature.type];
      for (const feature of moleculeFeaturesOfType) {
        if (requiredFeature.atoms.includes(feature.atomType)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Helper function to get reaction mechanism description
export function getReactionDescription(reactionType: ReactionType): string {
  const descriptions = {
    SN2: 'Bimolecular nucleophilic substitution - nucleophile attacks from the backside, displacing leaving group in one step',
    SN1: 'Unimolecular nucleophilic substitution - leaving group departs first to form carbocation, then nucleophile attacks',
    E2: 'Bimolecular elimination - base removes proton while leaving group departs simultaneously',
    E1: 'Unimolecular elimination - leaving group departs first to form carbocation, then base removes proton',
  };

  return descriptions[reactionType.mechanism] || 'Unknown reaction mechanism';
}

// Helper function to get activation energy in different units
export function getActivationEnergyInUnits(
  energy: number,
  unit: 'kJ/mol' | 'kcal/mol' | 'eV'
): number {
  switch (unit) {
    case 'kcal/mol':
      return energy / 4.184; // Convert kJ/mol to kcal/mol
    case 'eV':
      return energy * 0.010364; // Convert kJ/mol to eV
    default:
      return energy;
  }
}

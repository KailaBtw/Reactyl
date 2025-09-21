// Content definitions for InfoBubbles based on reaction types and terms

export interface InfoContent {
  term: string;
  explanation: string;
}

export type ReactionType = 'sn1' | 'sn2' | 'e1' | 'e2';
export type InfoTerm = 'substrate' | 'nucleophile' | 'leaving_group' | 'base' | 'electrophile' | 'carbocation' | 'temperature' | 'approach_angle' | 'impact_parameter' | 'relative_velocity';

// Content database for different reaction types and terms
export const INFO_CONTENT: Record<ReactionType, Record<InfoTerm, InfoContent>> = {
  sn2: {
    substrate: {
      term: "Substrate (SN2)",
      explanation: "The molecule that undergoes nucleophilic substitution. In SN2 reactions, this is typically a primary or secondary alkyl halide (like CH₃Br). The nucleophile attacks from the backside, causing inversion of stereochemistry (Walden inversion)."
    },
    nucleophile: {
      term: "Nucleophile (SN2)",
      explanation: "A molecule or ion that attacks electron-deficient centers. 'Nucleus-loving' - it donates electrons to form new bonds. In SN2 reactions, it attacks the carbon center from the backside in a concerted mechanism, causing inversion of stereochemistry."
    },
    leaving_group: {
      term: "Leaving Group (SN2)",
      explanation: "The group that departs from the substrate during the reaction. Good leaving groups are weak bases (like Br⁻, Cl⁻, I⁻). In SN2, the leaving group departs as the nucleophile attacks in a single concerted step."
    },
    base: {
      term: "Base (SN2)",
      explanation: "While not directly involved in the substitution mechanism, bases can compete with nucleophiles. Strong bases favor elimination (E2) over substitution (SN2)."
    },
    electrophile: {
      term: "Electrophile (SN2)",
      explanation: "The electron-deficient carbon center that is attacked by the nucleophile. In SN2, this carbon must be accessible for backside attack, making primary carbons most reactive."
    },
    carbocation: {
      term: "Carbocation (SN2)",
      explanation: "SN2 reactions do NOT involve carbocation intermediates. The mechanism is concerted - bond breaking and forming occur simultaneously. This distinguishes SN2 from SN1 reactions."
    }
  },
  sn1: {
    substrate: {
      term: "Substrate (SN1)",
      explanation: "The molecule that undergoes nucleophilic substitution. In SN1 reactions, this is typically a tertiary alkyl halide that can form stable carbocations. Secondary substrates may also undergo SN1 under certain conditions."
    },
    nucleophile: {
      term: "Nucleophile (SN1)",
      explanation: "A molecule or ion that attacks the carbocation intermediate. In SN1, nucleophile strength doesn't affect the rate since carbocation formation is the rate-determining step. Weak nucleophiles can participate effectively."
    },
    leaving_group: {
      term: "Leaving Group (SN1)",
      explanation: "The group that departs first to form a carbocation intermediate. Good leaving groups are essential for SN1 as they must leave spontaneously. The stability of the resulting carbocation is crucial."
    },
    base: {
      term: "Base (SN1)",
      explanation: "Can compete with nucleophiles for the carbocation intermediate, leading to elimination products (E1). Weak bases favor substitution over elimination in SN1 conditions."
    },
    electrophile: {
      term: "Electrophile (SN1)",
      explanation: "The electron-deficient carbon that loses the leaving group to form a carbocation. Tertiary carbons are most stable and reactive in SN1 due to hyperconjugation and inductive effects."
    },
    carbocation: {
      term: "Carbocation (SN1)",
      explanation: "The key intermediate in SN1 reactions. A positively charged carbon species formed after leaving group departure. Tertiary carbocations are most stable due to hyperconjugation. Can undergo rearrangements."
    }
  },
  e2: {
    substrate: {
      term: "Substrate (E2)",
      explanation: "The molecule that undergoes elimination. In E2 reactions, this is typically a secondary or tertiary alkyl halide. The reaction requires an antiperiplanar arrangement of the β-hydrogen and leaving group."
    },
    nucleophile: {
      term: "Base (E2)",
      explanation: "In elimination reactions, we typically call this a 'base' rather than nucleophile. Strong bases like OH⁻, OR⁻ abstract a β-hydrogen while the leaving group departs simultaneously in a concerted mechanism."
    },
    leaving_group: {
      term: "Leaving Group (E2)",
      explanation: "The group that departs during elimination, typically a halide. Must be antiperiplanar to the β-hydrogen being abstracted. Good leaving groups facilitate E2 reactions."
    },
    base: {
      term: "Base (E2)",
      explanation: "The species that abstracts the β-hydrogen. Strong, bulky bases (like tert-butoxide) favor E2 elimination over SN2 substitution. The base attacks the β-hydrogen as the leaving group departs."
    },
    electrophile: {
      term: "Electrophile (E2)",
      explanation: "The carbon bearing the leaving group. While not directly attacked by the base, it's involved in the concerted mechanism as the C-X bond breaks while the C-H bond to the base forms."
    },
    carbocation: {
      term: "Carbocation (E2)",
      explanation: "E2 reactions do NOT involve carbocation intermediates. The mechanism is concerted - hydrogen abstraction, double bond formation, and leaving group departure occur simultaneously."
    }
  },
  e1: {
    substrate: {
      term: "Substrate (E1)",
      explanation: "The molecule that undergoes elimination. In E1 reactions, this is typically a tertiary alkyl halide that can form stable carbocations. The reaction proceeds through a carbocation intermediate."
    },
    nucleophile: {
      term: "Base (E1)",
      explanation: "In E1 elimination, the base abstracts a proton from the carbocation intermediate in the second step. Even weak bases can participate since the carbocation is highly reactive."
    },
    leaving_group: {
      term: "Leaving Group (E1)",
      explanation: "The group that departs first to form a carbocation intermediate. Good leaving groups are essential for E1 as carbocation formation is the rate-determining step."
    },
    base: {
      term: "Base (E1)",
      explanation: "Abstracts a β-hydrogen from the carbocation intermediate in the second step. Base strength doesn't affect the overall rate since carbocation formation is rate-determining."
    },
    electrophile: {
      term: "Electrophile (E1)",
      explanation: "The carbon that loses the leaving group to form a carbocation. Tertiary carbons are most favorable for E1 due to carbocation stability."
    },
    carbocation: {
      term: "Carbocation (E1)",
      explanation: "The key intermediate in E1 reactions. Formed after leaving group departure in the first step. Can undergo rearrangements before proton abstraction leads to alkene formation."
    }
  }
};

// Universal collision parameter content that applies to all reaction types
export const UNIVERSAL_COLLISION_CONTENT: Record<string, InfoContent> = {
  temperature: {
    term: "Temperature",
    explanation: "Controls the kinetic energy of molecules in the system. Higher temperatures increase molecular motion and collision frequency, generally increasing reaction rates. Temperature affects both the number of collisions and the fraction of collisions with sufficient energy to overcome activation barriers."
  },
  approach_angle: {
    term: "Approach Angle",
    explanation: "The angle at which one molecule approaches another during collision. Different reaction mechanisms have optimal approach angles - some require specific geometric arrangements for bond formation/breaking. Measured in degrees from 0° to 360°."
  },
  impact_parameter: {
    term: "Impact Parameter",
    explanation: "The perpendicular distance between the collision trajectory and the target molecule's center. Smaller values represent more head-on collisions, while larger values represent glancing collisions. Affects the energy transfer and orbital overlap during molecular interactions."
  },
  relative_velocity: {
    term: "Relative Velocity",
    explanation: "The speed difference between colliding molecules. Higher relative velocities provide more kinetic energy for overcoming activation barriers, but extremely high velocities may lead to non-productive collisions or molecular fragmentation. Measured in m/s."
  }
};

// Helper function to get content for a specific reaction type and term
export const getInfoContent = (reactionType: ReactionType, term: InfoTerm): InfoContent | null => {
  // For collision parameters, use universal content
  if (term in UNIVERSAL_COLLISION_CONTENT) {
    return UNIVERSAL_COLLISION_CONTENT[term];
  }
  // For reaction-specific terms, use the reaction-specific content
  return INFO_CONTENT[reactionType]?.[term] || null;
};

// Helper function to get all available terms for a reaction type
export const getAvailableTerms = (reactionType: ReactionType): InfoTerm[] => {
  return Object.keys(INFO_CONTENT[reactionType] || {}) as InfoTerm[];
};

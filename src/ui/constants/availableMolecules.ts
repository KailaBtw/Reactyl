/**
 * Centralized list of available demo molecules for the application
 * This ensures all components use the same molecule list
 */

export const AVAILABLE_MOLECULES = [
  // Substrates (alkyl halides)
  'demo_Methyl_bromide',
  'demo_Methyl_chloride',
  'demo_Methyl_iodide',
  'demo_Ethyl_bromide',
  'demo_Ethyl_chloride',
  'demo_Ethyl_iodide',
  'demo_Isopropyl_bromide',
  'demo_Isopropyl_chloride',
  'demo_Tert_butyl_bromide',
  'demo_Tert_butyl_chloride',
  // Nucleophiles
  'demo_Hydroxide_ion',
  'demo_Cyanide_ion',
  'demo_Methoxide_ion',
  'demo_Methanol',
  'demo_Water',
] as const;

export const DEFAULT_SUBSTRATE = 'demo_Methyl_bromide';
export const DEFAULT_NUCLEOPHILE = 'demo_Hydroxide_ion';



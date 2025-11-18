/**
 * Extract element symbols from molecule names
 * e.g., demo_Methyl_bromide -> ['Br'], demo_Hydroxide_ion -> ['O', 'H']
 */

const ELEMENT_MAPPINGS: Record<string, string[]> = {
  // Halides
  bromide: ['Br'],
  chloride: ['Cl'],
  iodide: ['I'],
  fluoride: ['F'],

  // Common molecule parts
  hydroxide: ['O', 'H'],
  cyanide: ['C', 'N'],
  methoxide: ['C', 'O', 'H'],
  methanol: ['C', 'O', 'H'],
  methyl: ['C', 'H'],
  ethyl: ['C', 'H'],
  isopropyl: ['C', 'H'],
  tert: ['C', 'H'],
  butyl: ['C', 'H'],
  water: ['O', 'H'],
  ammonia: ['N', 'H'],

  // Metals
  potassium: ['K'],
  sodium: ['Na'],
  lithium: ['Li'],
  magnesium: ['Mg'],
  calcium: ['Ca'],
};

/**
 * Extract all element symbols from a molecule name
 */
export function extractElementsFromMolecule(moleculeName: string): string[] {
  const elements = new Set<string>();
  const lowerName = moleculeName.toLowerCase();

  // Always include C, H, O, N since they're common
  // Check for specific elements in the name
  for (const [key, els] of Object.entries(ELEMENT_MAPPINGS)) {
    if (lowerName.includes(key)) {
      els.forEach(el => elements.add(el));
    }
  }

  // If no specific elements found, assume common organic (C, H)
  if (elements.size === 0) {
    elements.add('C');
    elements.add('H');
  }

  // For alkyl halides, always add C and H
  if (
    lowerName.includes('methyl') ||
    lowerName.includes('ethyl') ||
    lowerName.includes('propyl') ||
    lowerName.includes('butyl')
  ) {
    elements.add('C');
    elements.add('H');
  }

  return Array.from(elements);
}

/**
 * Extract elements from multiple molecule names
 */
export function extractElementsFromMolecules(moleculeNames: string[]): string[] {
  const allElements = new Set<string>();
  moleculeNames.forEach(name => {
    const elements = extractElementsFromMolecule(name);
    elements.forEach(el => allElements.add(el));
  });
  return Array.from(allElements);
}



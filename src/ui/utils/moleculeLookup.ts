import { simpleCacheService } from '../../services/simpleCacheService';
import type { MolecularData } from '../../types';

/**
 * Get molecule CID and name from a molecule identifier string
 * Handles both demo molecule names (e.g., "demo_Methyl_bromide") and direct CIDs
 */
export function getMoleculeData(
  moleculeIdentifier: string
): { cid: string; name: string } {
  // First, try to get from cache by the identifier itself (in case it's a CID)
  let moleculeData: MolecularData | undefined = simpleCacheService.getMolecule(moleculeIdentifier);

  // If not found and it's a demo molecule name, try to extract and lookup
  if (!moleculeData && moleculeIdentifier.startsWith('demo_')) {
    // Remove "demo_" prefix and try to find by name
    const nameWithoutPrefix = moleculeIdentifier.replace('demo_', '').replace(/_/g, ' ');
    
    // Try to find in cache by searching through all molecules
    // This is a fallback - ideally molecules should be cached with their demo names
    for (const [cid, data] of simpleCacheService['molecules'] || []) {
      const title = data.title || data.name || '';
      if (
        title.toLowerCase().includes(nameWithoutPrefix.toLowerCase()) ||
        title.toLowerCase().includes(moleculeIdentifier.toLowerCase())
      ) {
        moleculeData = data;
        return {
          cid,
          name: title || nameWithoutPrefix || moleculeIdentifier,
        };
      }
    }
  }

  // If we found molecule data, return it
  if (moleculeData) {
    return {
      cid: moleculeIdentifier, // Use identifier as CID if it's numeric, otherwise use the CID from data
      name: moleculeData.title || moleculeData.name || moleculeData.formula || moleculeIdentifier,
    };
  }

  // Fallback: try common molecule mappings for demo molecules
  const commonMolecules: Record<string, { cid: string; name: string }> = {
    demo_Methyl_bromide: { cid: '6323', name: 'Methyl bromide' },
    demo_Hydroxide_ion: { cid: '961', name: 'Hydroxide ion' },
    demo_Methanol: { cid: '887', name: 'Methanol' },
    demo_Water: { cid: '962', name: 'Water' },
    demo_Methyl_chloride: { cid: '6327', name: 'Methyl chloride' },
    demo_Methyl_iodide: { cid: '6328', name: 'Methyl iodide' },
    demo_Ethyl_bromide: { cid: '6332', name: 'Ethyl bromide' },
    demo_Cyanide_ion: { cid: '5975', name: 'Cyanide ion' },
    demo_Methoxide_ion: { cid: '887', name: 'Methoxide ion' },
  };

  if (commonMolecules[moleculeIdentifier]) {
    return commonMolecules[moleculeIdentifier];
  }

  // Final fallback: assume identifier is a CID or use defaults
  if (/^\d+$/.test(moleculeIdentifier)) {
    // It's a numeric CID
    return {
      cid: moleculeIdentifier,
      name: `Molecule ${moleculeIdentifier}`,
    };
  }

  // Default fallback
  return {
    cid: '6323', // Methyl bromide as default
    name: moleculeIdentifier.replace('demo_', '').replace(/_/g, ' ') || 'Unknown molecule',
  };
}


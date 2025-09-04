import { MolecularData, ReactivityData } from '../types';
import { log } from './debug';

export class ChemicalDataService {
  private cache: Map<string, MolecularData> = new Map();
  private readonly PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
  
  /**
   * Fetch molecular data by name from PubChem
   */
  async fetchMoleculeByName(name: string): Promise<MolecularData> {
    // Check cache first
    if (this.cache.has(name)) {
      log(`Using cached data for ${name}`);
      return this.cache.get(name)!;
    }
    
    try {
      log(`Fetching data for ${name} from PubChem...`);
      
      // Get CID from name
      const cidResponse = await fetch(
        `${this.PUBCHEM_BASE}/compound/name/${encodeURIComponent(name)}/cids/JSON`
      );
      
      if (!cidResponse.ok) {
        throw new Error(`Failed to fetch CID for ${name}: ${cidResponse.statusText}`);
      }
      
      const cidData = await cidResponse.json();
      const cid = cidData.IdentifierList.CID[0];
      
      if (!cid) {
        throw new Error(`No CID found for ${name}`);
      }
      
      // Get properties
      const propResponse = await fetch(
        `${this.PUBCHEM_BASE}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,InChI/JSON`
      );
      
      if (!propResponse.ok) {
        throw new Error(`Failed to fetch properties for ${name}: ${propResponse.statusText}`);
      }
      
      const propData = await propResponse.json();
      const props = propData.PropertyTable.Properties[0];
      
      // Get 3D structure
      const mol3dResponse = await fetch(
        `${this.PUBCHEM_BASE}/compound/cid/${cid}/SDF`
      );
      
      let mol3d: string | undefined;
      if (mol3dResponse.ok) {
        mol3d = await mol3dResponse.text();
      }
      
      const molecularData: MolecularData = {
        cid,
        smiles: props.CanonicalSMILES,
        inchi: props.InChI,
        molWeight: props.MolecularWeight,
        formula: props.MolecularFormula,
        mol3d
      };
      
      this.cache.set(name, molecularData);
      log(`Successfully fetched and cached data for ${name}`);
      return molecularData;
      
    } catch (error) {
      log(`Failed to fetch data for ${name}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Fetch reactivity data for a molecule
   */
  async fetchReactivityData(smiles: string): Promise<ReactivityData> {
    // This would integrate with specialized databases
    // For now, return estimated values based on functional groups
    return this.estimateReactivity(smiles);
  }
  
  /**
   * Estimate reactivity based on SMILES pattern matching
   */
  private estimateReactivity(smiles: string): ReactivityData {
    const reactivity: ReactivityData = {
      nucleophilicity: 0,
      electrophilicity: 0,
      leavingGroupAbility: 0
    };
    
    // Simple pattern matching for common groups
    if (smiles.includes('[O-]')) reactivity.nucleophilicity = 8;
    if (smiles.includes('[S-]')) reactivity.nucleophilicity = 7;
    if (smiles.includes('[N-]')) reactivity.nucleophilicity = 6;
    if (smiles.includes('CN')) reactivity.nucleophilicity = 6;
    if (smiles.includes('NH2')) reactivity.nucleophilicity = 5;
    if (smiles.includes('OH')) reactivity.nucleophilicity = 4;
    
    // Leaving group ability
    if (smiles.includes('I')) reactivity.leavingGroupAbility = 9;
    if (smiles.includes('Br')) reactivity.leavingGroupAbility = 7;
    if (smiles.includes('Cl')) reactivity.leavingGroupAbility = 5;
    if (smiles.includes('F')) reactivity.leavingGroupAbility = 1;
    if (smiles.includes('OTs')) reactivity.leavingGroupAbility = 8;
    if (smiles.includes('OMs')) reactivity.leavingGroupAbility = 7;
    if (smiles.includes('OTf')) reactivity.leavingGroupAbility = 9;
    
    // Electrophilicity (cations, electron-deficient centers)
    if (smiles.includes('[C+]')) reactivity.electrophilicity = 8;
    if (smiles.includes('[N+]')) reactivity.electrophilicity = 7;
    if (smiles.includes('C=O')) reactivity.electrophilicity = 6;
    if (smiles.includes('C#N')) reactivity.electrophilicity = 5;
    
    return reactivity;
  }
  
  /**
   * Get cached molecular data
   */
  getCachedMolecule(name: string): MolecularData | undefined {
    return this.cache.get(name);
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    log('Chemical data cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; molecules: string[] } {
    return {
      size: this.cache.size,
      molecules: Array.from(this.cache.keys())
    };
  }
  
  /**
   * Search for molecules by partial name
   */
  async searchMolecules(query: string): Promise<{ name: string; cid: number }[]> {
    try {
      const response = await fetch(
        `${this.PUBCHEM_BASE}/compound/name/${encodeURIComponent(query)}/cids/JSON`
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const cids = data.IdentifierList.CID || [];
      
      // Return first 10 results
      return cids.slice(0, 10).map((cid: number) => ({
        name: `Compound ${cid}`,
        cid
      }));
      
    } catch (error) {
      log(`Molecule search failed: ${error}`);
      return [];
    }
  }
  
  /**
   * Get molecular properties from PubChem
   */
  async getMolecularProperties(cid: number): Promise<{
    formula: string;
    weight: number;
    smiles: string;
    inchi: string;
  }> {
    try {
      const response = await fetch(
        `${this.PUBCHEM_BASE}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,InChI/JSON`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch properties: ${response.statusText}`);
      }
      
      const data = await response.json();
      const props = data.PropertyTable.Properties[0];
      
      return {
        formula: props.MolecularFormula,
        weight: props.MolecularWeight,
        smiles: props.CanonicalSMILES,
        inchi: props.InChI
      };
      
    } catch (error) {
      log(`Failed to get molecular properties: ${error}`);
      throw error;
    }
  }
}

// Export singleton instance
export const chemicalDataService = new ChemicalDataService();

// Preloaded reaction database
export const REACTION_DATABASE = {
  SN2: {
    substrates: [
      { name: 'Methyl bromide', smiles: 'CBr', leaving: 'Br', molFile: 'methyl_bromide.mol' },
      { name: 'Ethyl chloride', smiles: 'CCCl', leaving: 'Cl', molFile: 'ethyl_chloride.mol' },
      { name: 'Methyl iodide', smiles: 'CI', leaving: 'I', molFile: 'methyl_iodide.mol' },
      { name: 'Methyl tosylate', smiles: 'COS(=O)(=O)c1ccc(C)cc1', leaving: 'OTs', molFile: 'methyl_tosylate.mol' }
    ],
    nucleophiles: [
      { name: 'Hydroxide', smiles: '[OH-]', attacking: 'O', molFile: 'hydroxide.mol' },
      { name: 'Cyanide', smiles: '[C-]#N', attacking: 'C', molFile: 'cyanide.mol' },
      { name: 'Ammonia', smiles: 'N', attacking: 'N', molFile: 'ammonia.mol' },
      { name: 'Methoxide', smiles: 'C[O-]', attacking: 'O', molFile: 'methoxide.mol' }
    ]
  },
  E2: {
    substrates: [
      { name: '2-Bromobutane', smiles: 'CC(Br)CC', leaving: 'Br', molFile: '2_bromobutane.mol' },
      { name: '2-Chlorobutane', smiles: 'CC(Cl)CC', leaving: 'Cl', molFile: '2_chlorobutane.mol' }
    ],
    bases: [
      { name: 'Potassium tert-butoxide', smiles: 'CC(C)(C)[O-]', pKa: 19, molFile: 't_butoxide.mol' },
      { name: 'DBU', smiles: 'C1CCC2=NCCCN2CC1', pKa: 12, molFile: 'dbu.mol' }
    ]
  }
};

/**
 * Integration helper for reaction data management
 */
export class ReactionDataManager {
  private dataService: ChemicalDataService;
  
  constructor() {
    this.dataService = chemicalDataService;
  }
  
  /**
   * Load reaction participants for a specific reaction type
   */
  async loadReactionParticipants(reactionType: string): Promise<{
    substrates: MolecularData[];
    reactants: MolecularData[];
  }> {
    const participants = (REACTION_DATABASE as any)[reactionType];
    
    if (!participants) {
      throw new Error(`Unknown reaction type: ${reactionType}`);
    }
    
    const substrates = await Promise.all(
      participants.substrates.map((s: any) => this.dataService.fetchMoleculeByName(s.name))
    );
    
    const reactants = await Promise.all(
      participants.nucleophiles?.map((n: any) => this.dataService.fetchMoleculeByName(n.name)) || []
    );
    
    return { substrates, reactants };
  }
  
  /**
   * Get available reaction types
   */
  getAvailableReactionTypes(): string[] {
    return Object.keys(REACTION_DATABASE);
  }
  
  /**
   * Get reaction participants for a type
   */
  getReactionParticipants(reactionType: string): any {
    return (REACTION_DATABASE as any)[reactionType] || null;
  }
}

// Export singleton instance
export const reactionDataManager = new ReactionDataManager();

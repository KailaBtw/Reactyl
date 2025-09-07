import { MolecularData, ReactivityData } from '../types';
import { log } from './debug';
import { extractPubChemMetadata } from './molFileToJSON';
import { simpleCacheService } from './simpleCacheService';

export class ChemicalDataService {
  private readonly PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
  
  /**
   * Throttle requests to respect PubChem limits
   */
  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      log(`⏳ Throttling request: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Fetch molecular data by CID from PubChem
   */
  async fetchMoleculeByCID(cid: string): Promise<MolecularData> {
    // Check cache first
    const cachedData = simpleCacheService.getMolecule(cid);
    if (cachedData) {
      log(`Using cached data for CID ${cid}`);
      return cachedData;
    }
    
    try {
      log(`Fetching data for CID ${cid} from PubChem...`);
      
      // Throttle request to respect PubChem limits
      await this.throttleRequest();
      
      // Get properties using correct PubChem REST API format
      const propUrl = `${this.PUBCHEM_BASE}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,InChI,IUPACName,Title/JSON`;
      log(`Fetching properties from: ${propUrl}`);
      
      const propResponse = await fetch(propUrl);
      
      if (!propResponse.ok) {
        const errorText = await propResponse.text();
        log(`PubChem API error: ${propResponse.status} ${propResponse.statusText}`);
        log(`Error response: ${errorText}`);
        throw new Error(`Failed to fetch properties for CID ${cid}: ${propResponse.status} ${propResponse.statusText}`);
      }
      
      const propData = await propResponse.json();
      const props = propData.PropertyTable.Properties[0];
      
      // Fetch synonyms
      let synonyms: string[] = [];
      try {
        const synonymsUrl = `${this.PUBCHEM_BASE}/compound/cid/${cid}/synonyms/JSON`;
        log(`Fetching synonyms from: ${synonymsUrl}`);
        
        const synonymsResponse = await fetch(synonymsUrl);
        if (synonymsResponse.ok) {
          const synonymsData = await synonymsResponse.json();
          synonyms = synonymsData.InformationList?.Information?.[0]?.Synonym || [];
          log(`Found ${synonyms.length} synonyms for CID ${cid}`);
        }
      } catch (error) {
        log(`Failed to fetch synonyms for CID ${cid}: ${error}`);
      }
      
      // Get 3D structure using correct PubChem REST API format
      const mol3dUrl = `${this.PUBCHEM_BASE}/compound/cid/${cid}/SDF?record_type=3d`;
      log(`Fetching 3D structure from: ${mol3dUrl}`);
      
      const mol3dResponse = await fetch(mol3dUrl);
      
      if (!mol3dResponse.ok) {
        // Fallback to 2D if 3D not available
        log(`3D structure not available for CID ${cid}, trying 2D...`);
        const mol2dUrl = `${this.PUBCHEM_BASE}/compound/cid/${cid}/SDF`;
        log(`Fetching 2D structure from: ${mol2dUrl}`);
        
        const mol2dResponse = await fetch(mol2dUrl);
        
        if (!mol2dResponse.ok) {
          const errorText = await mol2dResponse.text();
          log(`PubChem SDF error: ${mol2dResponse.status} ${mol2dResponse.statusText}`);
          log(`Error response: ${errorText}`);
          throw new Error(`Failed to fetch structure for CID ${cid}: ${mol2dResponse.status} ${mol2dResponse.statusText}`);
        }
        
        const molData = await mol2dResponse.text();
        
        // Extract metadata from the MOL data itself (in case API properties are missing)
        const molMetadata = extractPubChemMetadata(molData);
        
        const molecularData: MolecularData = {
          cid: parseInt(cid),
          name: props.IUPACName || molMetadata.name || undefined,
          title: props.Title || molMetadata.title || undefined,
          synonyms: synonyms.length > 0 ? synonyms : molMetadata.synonyms || undefined,
          smiles: props.CanonicalSMILES || molMetadata.smiles || '',
          inchi: props.InChI || molMetadata.inchi || '',
          molWeight: parseFloat(props.MolecularWeight) || parseFloat(molMetadata.molecularWeight || '0'),
          formula: props.MolecularFormula || molMetadata.molecularFormula || 'Unknown',
          mol3d: molData,
          properties: {
            pka: undefined,
            logP: undefined,
            polarSurfaceArea: undefined
          }
        };
        
        // Cache the result
        await simpleCacheService.saveMolecule(cid, molecularData);
        
        log(`Successfully fetched 2D data for CID ${cid}: ${molecularData.formula}`);
        return molecularData;
      }
      
      const mol3dData = await mol3dResponse.text();
      
      // Extract metadata from the MOL data itself (in case API properties are missing)
      const molMetadata = extractPubChemMetadata(mol3dData);
      
      const molecularData: MolecularData = {
        cid: parseInt(cid),
        name: props.IUPACName || molMetadata.name || undefined,
        title: props.Title || molMetadata.title || undefined,
        synonyms: synonyms.length > 0 ? synonyms : molMetadata.synonyms || undefined,
        smiles: props.CanonicalSMILES || molMetadata.smiles || '',
        inchi: props.InChI || molMetadata.inchi || '',
        molWeight: parseFloat(props.MolecularWeight) || parseFloat(molMetadata.molecularWeight || '0'),
        formula: props.MolecularFormula || molMetadata.molecularFormula || 'Unknown',
        mol3d: mol3dData,
        properties: {
          pka: undefined,
          logP: undefined,
          polarSurfaceArea: undefined
        }
      };
      
      // Cache the result
      await simpleCacheService.saveMolecule(cid, molecularData);
      
      log(`Successfully fetched 3D data for CID ${cid}`);
      return molecularData;
      
    } catch (error) {
      log(`Error fetching data for CID ${cid}: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch molecular data by name from PubChem
   */
  async fetchMoleculeByName(name: string): Promise<MolecularData> {
    // Check cache first
    const cachedData = simpleCacheService.getMolecule(name);
    if (cachedData) {
      log(`Using cached data for ${name}`);
      return cachedData;
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
      
      await simpleCacheService.saveMolecule(name, molecularData);
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
   * Get cache statistics
   */
  getCacheStats(): { size: number; molecules: string[] } {
    const stats = simpleCacheService.getStats();
    return {
      size: stats.molecules,
      molecules: [] // Not needed for the simplified system
    };
  }

  
  /**
   * Fetch molecular data by InChIKey from PubChem
   */
  async fetchMoleculeByInChIKey(inchikey: string): Promise<MolecularData> {
    // Check cache first
    const cachedData = simpleCacheService.getMolecule(inchikey);
    if (cachedData) {
      log(`Using cached data for InChIKey ${inchikey}`);
      return cachedData;
    }
    
    try {
      log(`Fetching data for InChIKey ${inchikey} from PubChem...`);
      
      // Throttle request to respect PubChem limits
      await this.throttleRequest();
      
      // Get CID from InChIKey first
      const cidUrl = `${this.PUBCHEM_BASE}/compound/inchikey/${inchikey}/cids/JSON`;
      const cidResponse = await fetch(cidUrl);
      
      if (!cidResponse.ok) {
        throw new Error(`Failed to get CID for InChIKey ${inchikey}: ${cidResponse.status}`);
      }
      
      const cidData = await cidResponse.json();
      const cid = cidData.IdentifierList?.Identifier?.[0];
      
      if (!cid) {
        throw new Error(`No CID found for InChIKey ${inchikey}`);
      }
      
      // Now fetch the molecular data using the CID
      return await this.fetchMoleculeByCID(cid.toString());
      
    } catch (error) {
      log(`Failed to fetch data for InChIKey ${inchikey}: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch molecular data by SMILES from PubChem
   */
  async fetchMoleculeBySMILES(smiles: string): Promise<MolecularData> {
    // Check cache first
    const cachedData = simpleCacheService.getMolecule(smiles);
    if (cachedData) {
      log(`Using cached data for SMILES ${smiles}`);
      return cachedData;
    }
    
    try {
      log(`Fetching data for SMILES ${smiles} from PubChem...`);
      
      // Throttle request to respect PubChem limits
      await this.throttleRequest();
      
      // Get CID from SMILES first
      const cidUrl = `${this.PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(smiles)}/cids/JSON`;
      const cidResponse = await fetch(cidUrl);
      
      if (!cidResponse.ok) {
        throw new Error(`Failed to get CID for SMILES ${smiles}: ${cidResponse.status}`);
      }
      
      const cidData = await cidResponse.json();
      const cid = cidData.IdentifierList?.Identifier?.[0];
      
      if (!cid) {
        throw new Error(`No CID found for SMILES ${smiles}`);
      }
      
      // Now fetch the molecular data using the CID
      return await this.fetchMoleculeByCID(cid.toString());
      
    } catch (error) {
      log(`Failed to fetch data for SMILES ${smiles}: ${error}`);
      throw error;
    }
  }

  /**
   * Search for molecules by formula
   */
  async searchMoleculesByFormula(formula: string, limit: number = 10): Promise<Array<{cid: string, name: string, formula: string}>> {
    if (!formula || formula.length < 1) return [];
    
    // First check local cache
    const localResults = simpleCacheService.searchMolecules(formula, limit);
    if (localResults.length > 0) {
      log(`Using local cache for formula search: ${formula}`);
      return localResults;
    }
    
    try {
      log(`Searching for formula: ${formula}`);
      
      // Throttle request to respect PubChem limits
      await this.throttleRequest();
      
      // Search by formula
      const searchUrl = `${this.PUBCHEM_BASE}/compound/fastformula/${formula}/cids/JSON?MaxRecords=${limit}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`Formula search failed: ${response.status}`);
      }
      
      const data = await response.json();
      const cids = data.IdentifierList?.Identifier || [];
      
      // Get basic info for each CID
      const results: Array<{cid: string, name: string, formula: string}> = [];
      for (const cid of cids.slice(0, limit)) {
        try {
          const molecularData = await this.fetchMoleculeByCID(cid.toString());
          results.push({
            cid: cid.toString(),
            name: molecularData.title || molecularData.name || molecularData.formula || `CID ${cid}`,
            formula: molecularData.formula || 'Unknown'
          });
        } catch (error) {
          log(`Failed to get details for CID ${cid}: ${error}`);
        }
      }
      
      log(`Found ${results.length} results for formula: ${formula}`);
      return results;
      
    } catch (error) {
      log(`Formula search failed for ${formula}: ${error}`);
      return [];
    }
  }

  /**
   * Search for molecules by partial name with enhanced results
   */
  async searchMolecules(query: string, limit: number = 10): Promise<Array<{cid: string, name: string, formula: string}>> {
    if (!query || query.length < 2) return [];
    
    // First check local cache
    const localResults = simpleCacheService.searchMolecules(query, limit);
    if (localResults.length > 0) {
      log(`Using local cache for search: ${query}`);
      return localResults;
    }
    
    try {
      log(`Searching PubChem for: ${query}`);
      
      // Throttle request to respect PubChem limits
      await this.throttleRequest();
      
      // Use PubChem's compound name search
      const searchUrl = `${this.PUBCHEM_BASE}/compound/name/${encodeURIComponent(query)}/cids/JSON?MaxRecords=${limit}`;
      log(`Search URL: ${searchUrl}`);
      
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        log(`PubChem search error: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      const cids = data.IdentifierList?.CID || [];
      
      if (cids.length === 0) {
        log(`No compounds found for: ${query}`);
        return [];
      }
      
      // Get basic info for each CID
      const results = await Promise.all(
        cids.slice(0, limit).map(async (cid: number) => {
          try {
            const propUrl = `${this.PUBCHEM_BASE}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,Title/JSON`;
            const propResponse = await fetch(propUrl);
            
            if (propResponse.ok) {
              const propData = await propResponse.json();
              const props = propData.PropertyTable.Properties[0];
              
              return {
                cid: cid.toString(),
                name: props.Title || `CID ${cid}`,
                formula: props.MolecularFormula || 'Unknown'
              };
            }
          } catch (error) {
            log(`Error fetching properties for CID ${cid}: ${error}`);
          }
          
          return {
            cid: cid.toString(),
            name: `CID ${cid}`,
            formula: 'Unknown'
          };
        })
      );
      
      // Results are automatically cached when molecules are fetched
      
      log(`Found ${results.length} compounds for: ${query}`);
      log(`Search results:`, results.map(r => `${r.name} (${r.formula}) - CID: ${r.cid}`));
      return results;
      
    } catch (error) {
      log(`Error searching PubChem: ${error}`);
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

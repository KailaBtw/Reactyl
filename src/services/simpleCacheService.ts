/**
 * Simple cache service for individual molecule files
 * Loads from individual JSON files, saves individual molecules
 */

import type { MolecularData } from '../types';
import { log } from '../utils/debug';

export class SimpleCacheService {
  private molecules: Map<string, MolecularData> = new Map();
  private searchCount = 0;
  private readonly LOCALSTORAGE_KEY = 'reactyl_cache';
  private readonly isDev =
    window.location.hostname === 'localhost' || window.location.port === '5173';

  constructor() {
    log(`Running in ${this.isDev ? 'development' : 'production'} mode`);
    this.loadCache();
  }

  /**
   * Load cache from backend or localStorage
   */
  private async loadCache(): Promise<void> {
    try {
      if (this.isDev) {
        // Try to load from backend API first
        try {
          const response = await fetch('http://localhost:3000/api/molecules');
          if (response.ok) {
            const data = await response.json();
            log(`📖 Found ${data.count} molecules in backend`);

            // Load each molecule individually
            for (const cid of data.molecules) {
              try {
                const molResponse = await fetch(`http://localhost:3000/api/molecule/${cid}`);
                if (molResponse.ok) {
                  const molecularData = await molResponse.json();
                  this.molecules.set(cid, molecularData);
                }
              } catch (error) {
                log(`Failed to load molecule ${cid}: ${error}`);
              }
            }

            log(`✅ Loaded ${this.molecules.size} molecules from backend`);
            return;
          }
        } catch (_error) {
          log('Backend not available, trying localStorage...');
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(this.LOCALSTORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.molecules) {
          Object.entries(data.molecules).forEach(([cid, molData]) => {
            this.molecules.set(cid, molData as MolecularData);
          });
          log(`✅ Loaded ${this.molecules.size} molecules from localStorage`);
        }
      }
    } catch (error) {
      log(`Error loading cache: ${error}`);
    }
  }

  /**
   * Save cache to backend or localStorage
   */
  private async saveCache(): Promise<void> {
    try {
      if (this.isDev) {
        // In dev mode, molecules are saved individually when fetched
        // This method is kept for compatibility but doesn't do bulk saves
        log(`💾 Dev mode: molecules saved individually`);
        return;
      }

      // Production mode: save to localStorage
      const data = {
        molecules: Object.fromEntries(this.molecules),
        metadata: {
          lastUpdated: new Date().toISOString(),
          totalMolecules: this.molecules.size,
        },
      };

      localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(data, null, 2));
      log(`💾 Cache saved to localStorage: ${this.molecules.size} molecules`);
    } catch (error) {
      log(`Error saving cache: ${error}`);
    }
  }

  /**
   * Save individual molecule to backend
   */
  async saveMolecule(cid: string, molecularData: MolecularData): Promise<void> {
    try {
      this.molecules.set(cid, molecularData);

      if (this.isDev) {
        // Save to backend
        try {
          log(`🔄 POSTing molecule ${cid} to backend`);

          const response = await fetch('http://localhost:3000/api/save-molecule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cid, molecularData }),
          });

          if (response.ok) {
            log(`✅ Molecule ${cid} saved to backend`);
            return;
          } else {
            log(`❌ Backend responded with status: ${response.status}`);
          }
        } catch (error) {
          log(`❌ Dev server not available: ${error}`);
        }
      }

      // Fallback to localStorage
      await this.saveCache();
      log(`💾 Molecule ${cid} saved to localStorage`);
    } catch (error) {
      log(`Error saving molecule ${cid}: ${error}`);
    }
  }

  /**
   * Get molecule by CID
   */
  getMolecule(cid: string): MolecularData | undefined {
    return this.molecules.get(cid);
  }

  /**
   * Set molecule in cache
   */
  setMolecule(cid: string, data: MolecularData): void {
    this.molecules.set(cid, data);
    this.saveMolecule(cid, data).catch(error => log(`Error saving molecule cache: ${error}`));
  }

  /**
   * Search molecules by name, formula, or synonyms
   */
  searchMolecules(
    query: string,
    limit: number = 10
  ): Array<{ cid: string; name: string; formula: string }> {
    const results: Array<{ cid: string; name: string; formula: string }> = [];
    const lowerQuery = query.toLowerCase();

    for (const [cid, molecule] of this.molecules) {
      if (results.length >= limit) break;

      // Search in name
      if (molecule.name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          cid,
          name: molecule.title || molecule.name || molecule.formula || `Molecule ${cid}`,
          formula: molecule.formula || 'Unknown',
        });
        continue;
      }

      // Search in title
      if (molecule.title?.toLowerCase().includes(lowerQuery)) {
        results.push({
          cid,
          name: molecule.title || molecule.name || molecule.formula || `Molecule ${cid}`,
          formula: molecule.formula || 'Unknown',
        });
        continue;
      }

      // Search in formula
      if (molecule.formula?.toLowerCase().includes(lowerQuery)) {
        results.push({
          cid,
          name: molecule.title || molecule.name || molecule.formula || `Molecule ${cid}`,
          formula: molecule.formula || 'Unknown',
        });
        continue;
      }

      // Search in synonyms
      if (molecule.synonyms?.some(synonym => synonym.toLowerCase().includes(lowerQuery))) {
        results.push({
          cid,
          name: molecule.title || molecule.name || molecule.formula || `Molecule ${cid}`,
          formula: molecule.formula || 'Unknown',
        });
      }
    }

    return results;
  }

  /**
   * Increment search counter
   */
  incrementSearchCount(): void {
    this.searchCount++;
  }

  /**
   * Get cache statistics
   */
  getStats(): { molecules: number; searches: number; lastUpdated: string } {
    return {
      molecules: this.molecules.size,
      searches: this.searchCount,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Refresh cache from backend
   */
  async refreshFromBackend(): Promise<void> {
    if (this.isDev) {
      await this.loadCache();
      log(`✅ Cache refreshed from backend: ${this.molecules.size} molecules`);
    } else {
      log(`ℹ️ Refresh from backend only available in development mode`);
    }
  }

  /**
   * Download cache as JSON file
   */
  downloadCache(): void {
    const data = {
      molecules: Object.fromEntries(this.molecules),
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalMolecules: this.molecules.size,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'molecular_cache.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    log(`📥 Cache downloaded: ${this.molecules.size} molecules`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.molecules.clear();
    localStorage.removeItem(this.LOCALSTORAGE_KEY);
    log('Cache cleared');
  }
}

// Export singleton instance
export const simpleCacheService = new SimpleCacheService();

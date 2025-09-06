/**
 * Simple cache service for GitHub Pages
 * Loads from JSON file, adds new results, saves back to JSON
 */

import { MolecularData } from '../types';
import { log } from './debug';

interface SearchResult {
  cid: string;
  name: string;
  formula: string;
}

interface CacheData {
  molecules: Record<string, MolecularData>;
  searches: Record<string, SearchResult[]>;
  metadata: {
    lastUpdated: string;
    version: string;
    totalMolecules: number;
    totalSearches: number;
  };
}

export class SimpleCacheService {
  private cacheData: CacheData;
  private readonly VERSION = '1.0.0';
  private readonly CACHE_URL = 'data/cache/chemical_cache.json';

  constructor() {
    this.cacheData = {
      molecules: {},
      searches: {},
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: this.VERSION,
        totalMolecules: 0,
        totalSearches: 0
      }
    };
    this.loadCache();
  }

  /**
   * Load cache from JSON file
   */
  private async loadCache(): Promise<void> {
    try {
      const response = await fetch(this.CACHE_URL);
      if (response.ok) {
        this.cacheData = await response.json();
        log(`Loaded cache: ${this.cacheData.metadata.totalMolecules} molecules, ${this.cacheData.metadata.totalSearches} searches`);
      } else {
        log('No cache file found, starting fresh');
      }
    } catch (error) {
      log(`Error loading cache: ${error}`);
    }
  }

  /**
   * Save cache to downloadable JSON file
   */
  private saveCache(): void {
    try {
      this.cacheData.metadata.lastUpdated = new Date().toISOString();
      this.cacheData.metadata.totalMolecules = Object.keys(this.cacheData.molecules).length;
      this.cacheData.metadata.totalSearches = Object.keys(this.cacheData.searches).length;

      // Create downloadable file
      const jsonString = JSON.stringify(this.cacheData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'data/cache/chemical_cache.json';
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      log(`Cache saved: ${this.cacheData.metadata.totalMolecules} molecules, ${this.cacheData.metadata.totalSearches} searches`);
    } catch (error) {
      log(`Error saving cache: ${error}`);
    }
  }

  /**
   * Get molecular data from cache
   */
  getMolecule(cid: string): MolecularData | null {
    return this.cacheData.molecules[cid] || null;
  }

  /**
   * Set molecular data in cache
   */
  setMolecule(cid: string, data: MolecularData): void {
    this.cacheData.molecules[cid] = data;
    this.saveCache();
  }

  /**
   * Get search results from cache
   */
  getSearchResults(query: string): SearchResult[] | null {
    const normalizedQuery = query.toLowerCase();
    return this.cacheData.searches[normalizedQuery] || null;
  }

  /**
   * Set search results in cache
   */
  setSearchResults(query: string, results: SearchResult[]): void {
    const normalizedQuery = query.toLowerCase();
    this.cacheData.searches[normalizedQuery] = results;
    this.saveCache();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    molecules: number;
    searches: number;
    lastUpdated: string;
    version: string;
  } {
    return {
      molecules: this.cacheData.metadata.totalMolecules,
      searches: this.cacheData.metadata.totalSearches,
      lastUpdated: this.cacheData.metadata.lastUpdated,
      version: this.cacheData.metadata.version
    };
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cacheData = {
      molecules: {},
      searches: {},
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: this.VERSION,
        totalMolecules: 0,
        totalSearches: 0
      }
    };
    this.saveCache();
    log('Cache cleared');
  }

  /**
   * Export cache as JSON string
   */
  exportCache(): string {
    return JSON.stringify(this.cacheData, null, 2);
  }
}

// Export singleton instance
export const simpleCacheService = new SimpleCacheService();

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
  private readonly LOCALSTORAGE_KEY = 'molMod_cache';
  private isDev: boolean;

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
    
    // Simple dev detection
    this.isDev = window.location.hostname === 'localhost' || window.location.port === '5173';
    log(`Running in ${this.isDev ? 'development' : 'production'} mode`);
    
    this.loadCache();
  }

  /**
   * Load cache from file or localStorage
   */
  private async loadCache(): Promise<void> {
    try {
      if (this.isDev) {
        // Try to load from file first
        const response = await fetch(this.CACHE_URL);
        if (response.ok) {
          this.cacheData = await response.json();
          log(`Loaded cache from file: ${this.cacheData.metadata.totalMolecules} molecules`);
        }
      } else {
        // Load from localStorage
        const stored = localStorage.getItem(this.LOCALSTORAGE_KEY);
        if (stored) {
          this.cacheData = JSON.parse(stored);
          log(`Loaded cache from localStorage: ${this.cacheData.metadata.totalMolecules} molecules`);
        }
      }
    } catch (error) {
      log(`Error loading cache: ${error}`);
    }
  }

  /**
   * Save cache using dev server API or localStorage
   */
  private async saveCache(): Promise<void> {
    try {
      this.cacheData.metadata.lastUpdated = new Date().toISOString();
      this.cacheData.metadata.totalMolecules = Object.keys(this.cacheData.molecules).length;
      this.cacheData.metadata.totalSearches = Object.keys(this.cacheData.searches).length;

      if (this.isDev) {
        // Try to save to dev server first
        try {
          const response = await fetch('http://localhost:3000/api/save-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cacheData)
          });
          
          if (response.ok) {
            log(`✅ Cache saved to project file: ${this.cacheData.metadata.totalMolecules} molecules`);
            return;
          }
        } catch (error) {
          log('Dev server not available, falling back to localStorage');
        }
      }
      
      // Fallback to localStorage
      localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(this.cacheData, null, 2));
      log(`Cache saved to localStorage: ${this.cacheData.metadata.totalMolecules} molecules`);
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
    this.saveCache(); // Fire and forget
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
    this.saveCache(); // Fire and forget
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
   * Download cache as JSON file (manual download)
   */
  downloadCache(): void {
    try {
      const jsonString = JSON.stringify(this.cacheData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `chemical_cache_${new Date().toISOString().split('T')[0]}.json`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      log('Cache downloaded as JSON file');
    } catch (error) {
      log(`Error downloading cache: ${error}`);
    }
  }

  /**
   * Export cache as JSON string
   */
  exportCache(): string {
    return JSON.stringify(this.cacheData, null, 2);
  }

  /**
   * Get environment info for debugging
   */
  getEnvironmentInfo(): { isDev: boolean; method: string } {
    return {
      isDev: this.isDev,
      method: 'localStorage'
    };
  }
}

// Export singleton instance
export const simpleCacheService = new SimpleCacheService();

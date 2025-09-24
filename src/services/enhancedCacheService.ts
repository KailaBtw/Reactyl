/**
 * Enhanced cache service that extends SimpleCacheService
 * Adds support for enhanced molecular structures and RXN reactions
 */

import { SimpleCacheService } from './simpleCacheService';
import { log } from '../utils/debug';
import type { EnhancedMolecularJSON } from '../types/enhanced-molecular';

export interface RXNReactionData {
  // Cache metadata
  cacheKey: string;
  timestamp: number;
  expiresAt: number;
  
  // Request data
  reactants: string;
  conditions?: {
    temperature?: number;
    solvent?: string;
    catalyst?: string;
  };
  
  // RXN API response
  success: boolean;
  products?: string;
  confidence: number;
  reactionTime: number;
  fullSmiles?: string;
  
  // Integration metadata
  mechanism?: string;
  comparedWith?: {
    mechanistic: boolean;
    agreement: boolean;
    confidence_delta: number;
  };
  
  // Performance tracking
  responseTime: number;
  cached: boolean;
  source: 'rxn_api' | 'cache';
}

export class EnhancedCacheService extends SimpleCacheService {
  private readonly CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
  private readonly isDev = window.location.hostname === 'localhost';
  
  /**
   * Save enhanced molecular structure
   */
  async saveEnhancedStructure(cid: string, enhancedData: EnhancedMolecularJSON): Promise<void> {
    try {
      if (this.isDev) {
        const response = await fetch('http://localhost:3000/api/save-structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cid, enhancedData })
        });
        
        if (response.ok) {
          log(`✅ Enhanced structure cached: ${cid}`);
          return;
        }
      }
      
      // Fallback to localStorage
      const key = `molMod_structure_${cid}`;
      localStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        data: enhancedData
      }));
      
      log(`✅ Enhanced structure cached locally: ${cid}`);
    } catch (error) {
      log(`Failed to cache enhanced structure: ${error}`);
    }
  }
  
  /**
   * Get enhanced molecular structure
   */
  async getEnhancedStructure(cid: string): Promise<EnhancedMolecularJSON | null> {
    try {
      if (this.isDev) {
        const response = await fetch(`http://localhost:3000/api/structure/${cid}`);
        if (response.ok) {
          const data = await response.json();
          
          // Check expiration
          if (Date.now() - data.timestamp < this.CACHE_MAX_AGE) {
            log(`💾 Enhanced structure cache hit: ${cid}`);
            return data;
          }
        }
      }
      
      const key = `molMod_structure_${cid}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < this.CACHE_MAX_AGE) {
          log(`💾 Enhanced structure cache hit (localStorage): ${cid}`);
          return parsed.data;
        }
      }
      
    } catch (error) {
      log(`Enhanced structure cache lookup failed: ${error}`);
    }
    
    return null;
  }
  
  /**
   * Save RXN reaction prediction
   */
  async saveReaction(cacheKey: string, reactionData: RXNReactionData): Promise<void> {
    try {
      if (this.isDev) {
        const response = await fetch('http://localhost:3000/api/save-reaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cacheKey, reactionData })
        });
        
        if (response.ok) {
          log(`✅ Reaction cached: ${cacheKey}`);
          return;
        }
      }
      
      // Fallback to localStorage
      const key = `molMod_reaction_${cacheKey}`;
      localStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        data: reactionData
      }));
      
    } catch (error) {
      log(`Failed to cache reaction: ${error}`);
    }
  }
  
  /**
   * Get RXN reaction prediction
   */
  async getReaction(cacheKey: string): Promise<RXNReactionData | null> {
    try {
      if (this.isDev) {
        const response = await fetch(`http://localhost:3000/api/reaction/${cacheKey}`);
        if (response.ok) {
          const data = await response.json();
          
          // Check expiration
          if (Date.now() - data.timestamp < this.CACHE_MAX_AGE) {
            return data;
          }
        }
      }
      
      const key = `molMod_reaction_${cacheKey}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < this.CACHE_MAX_AGE) {
          return parsed.data;
        }
      }
      
    } catch (error) {
      log(`Reaction cache lookup failed: ${error}`);
    }
    
    return null;
  }
  
  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    // Check localStorage for expired entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('molMod_structure_') || key.startsWith('molMod_reaction_'))) {
        try {
          const cached = JSON.parse(localStorage.getItem(key) || '');
          if (now - cached.timestamp > this.CACHE_MAX_AGE) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Invalid cache entry, remove it
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove expired entries
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    
    if (keysToRemove.length > 0) {
      log(`🗑️ Cleared ${keysToRemove.length} expired cache entries`);
    }
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    molecules: number;
    structures: number;
    reactions: number;
    totalSize: number;
  }> {
    let molecules = 0;
    let structures = 0;
    let reactions = 0;
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        totalSize += value.length;
        
        if (key.startsWith('molMod_cache')) molecules++;
        else if (key.startsWith('molMod_structure_')) structures++;
        else if (key.startsWith('molMod_reaction_')) reactions++;
      }
    }
    
    return { molecules, structures, reactions, totalSize };
  }
}

// Export singleton instance
export const enhancedCacheService = new EnhancedCacheService();

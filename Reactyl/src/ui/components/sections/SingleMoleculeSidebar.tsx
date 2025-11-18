import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ChemicalDataService } from '../../../chemistry/chemicalDataService';
import { drawMolecule } from '../../../components/moleculeDrawer';
import { threeJSBridge } from '../../bridge/ThreeJSBridge';

interface SearchResult {
  cid: string;
  name: string;
  formula: string;
}

interface SingleMoleculeSidebarProps {
  themeClasses: any;
}

export const SingleMoleculeSidebar: React.FC<SingleMoleculeSidebarProps> = ({ themeClasses }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('Ready');
  const [showDropdown, setShowDropdown] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chemicalService = new ChemicalDataService();

  // Check if scene is ready
  useEffect(() => {
    const checkSceneReady = () => {
      const scene = threeJSBridge.getScene();
      const moleculeManager = threeJSBridge.getMoleculeManager();
      const ready = scene !== null && moleculeManager !== null;
      setSceneReady(ready);
      if (ready) {
        setSearchStatus('Ready');
      } else {
        setSearchStatus('Waiting for scene initialization...');
      }
    };

    // Check immediately
    checkSceneReady();

    // Check periodically until ready
    const interval = setInterval(checkSceneReady, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      setSearchStatus('Searching...');

      try {
        let results: SearchResult[] = [];

        // Enhanced search routing - detect input type
        if (/^\d+$/.test(query)) {
          // CID search (numeric)
          try {
            const molecularData = await chemicalService.fetchMoleculeByCID(query);
            results = [
              {
                cid: query,
                name:
                  molecularData.title ||
                  molecularData.name ||
                  molecularData.formula ||
                  `Molecule ${query}`,
                formula: molecularData.formula || 'Unknown',
              },
            ];
            setSearchStatus(`Found CID ${query}`);
          } catch (error) {
            setSearchStatus(`CID ${query} not found`);
            results = [];
          }
        } else if (isInChIKey(query)) {
          // InChIKey search (27 characters, contains hyphens)
          try {
            const molecularData = await chemicalService.fetchMoleculeByInChIKey(query);
            results = [
              {
                cid: String(molecularData.cid || 'Unknown'),
                name:
                  molecularData.title || molecularData.name || molecularData.formula || 'Unknown',
                formula: molecularData.formula || 'Unknown',
              },
            ];
            setSearchStatus(`Found InChIKey ${query}`);
          } catch (error) {
            setSearchStatus(`InChIKey ${query} not found`);
            results = [];
          }
        } else if (isSMILES(query)) {
          // SMILES search (contains special characters)
          try {
            const molecularData = await chemicalService.fetchMoleculeBySMILES(query);
            results = [
              {
                cid: String(molecularData.cid || 'Unknown'),
                name:
                  molecularData.title || molecularData.name || molecularData.formula || 'Unknown',
                formula: molecularData.formula || 'Unknown',
              },
            ];
            setSearchStatus(`Found SMILES ${query}`);
          } catch (error) {
            setSearchStatus(`SMILES ${query} not found`);
            results = [];
          }
        } else {
          // General search (name, formula, etc.)
          results = await chemicalService.searchMolecules(query, 10);
          setSearchStatus(
            results.length > 0 ? `Found ${results.length} results` : 'No results found'
          );
        }

        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (error) {
        setSearchStatus('Search failed');
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    },
    [chemicalService]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      handleResultSelect(searchResults[0]);
    }
  };

  const handleResultSelect = async (result: SearchResult) => {
    setSearchQuery(result.name);
    setShowDropdown(false);
    setSearchStatus(`Loading ${result.name}...`);

    try {
      // Get the scene and molecule manager from the threeJS bridge
      const scene = threeJSBridge.getScene();
      const moleculeManager = threeJSBridge.getMoleculeManager();

      if (!scene || !moleculeManager) {
        setSearchStatus('Error: Scene not available. Please wait for initialization...');
        console.error('Scene or molecule manager not available:', {
          scene: !!scene,
          moleculeManager: !!moleculeManager,
        });
        return;
      }

      // Load the molecule with stationary position
      const position = { x: 0, y: 0, z: 0 }; // Stationary at origin
      const molecularData = await chemicalService.fetchMoleculeByCID(result.cid);

      if (!molecularData.mol3d) {
        setSearchStatus(`❌ No 3D structure available for ${result.name}`);
        return;
      }

      drawMolecule(molecularData.mol3d, moleculeManager, scene, position, result.name);

      // Make the molecule stationary by setting zero velocity
      moleculeManager.setMoleculeVelocity(result.name, new THREE.Vector3(0, 0, 0), 0);

      setSearchStatus(`✅ Loaded ${result.name} (stationary)`);
    } catch (error) {
      console.error('Failed to load molecule:', error);
      setSearchStatus(`❌ Failed to load ${result.name}`);
    }
  };

  const isInChIKey = (query: string): boolean => {
    return query.length === 27 && query.includes('-');
  };

  const isSMILES = (query: string): boolean => {
    return /[=#@[\]()]/.test(query);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className={`${themeClasses.card} border rounded-lg p-4`}>
        <label className={`${themeClasses.text} text-sm font-semibold mb-2 block`}>
          🔍 Search Molecules
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              sceneReady
                ? 'e.g., benzene, 241, C6H6, C1=CC=CC=C1, etc...'
                : 'Waiting for scene initialization...'
            }
            disabled={!sceneReady}
            className={`w-full px-3 py-2 border rounded ${themeClasses.input} ${
              !sceneReady ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              fontSize: '14px',
            }}
          />

          {showDropdown && searchResults.length > 0 && (
            <div
              className={`absolute top-full left-0 right-0 mt-1 border rounded-lg max-h-48 overflow-y-auto z-50 ${themeClasses.card}`}
              style={{
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleResultSelect(result)}
                  className={`px-3 py-2 cursor-pointer border-b last:border-b-0 ${themeClasses.text} hover:opacity-80`}
                  style={{
                    fontSize: '13px',
                  }}
                >
                  <div className="font-semibold">{result.name}</div>
                  <div className={`${themeClasses.textSecondary} text-xs`}>
                    CID: {result.cid} | Formula: {result.formula}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`text-xs mt-2 min-h-[16px] ${
            isSearching
              ? 'text-green-600'
              : sceneReady
                ? themeClasses.textSecondary
                : 'text-red-500'
          }`}
        >
          {searchStatus}
        </div>
      </div>
    </div>
  );
};


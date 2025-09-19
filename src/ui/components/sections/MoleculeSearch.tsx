import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { ChemicalDataService } from '../../../chemistry/chemicalDataService';
import { drawMolecule } from '../../../components/moleculeDrawer';
import { sceneBridge } from '../../../services/SceneBridge';

interface SearchResult {
  cid: string;
  name: string;
  formula: string;
}

export const MoleculeSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('Ready');
  const [showDropdown, setShowDropdown] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  const chemicalService = new ChemicalDataService();

  // Check if scene is ready
  useEffect(() => {
    const checkSceneReady = () => {
      const ready = sceneBridge.isInitialized();
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

  const handleSearch = useCallback(async (query: string) => {
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
              name: molecularData.title || molecularData.name || molecularData.formula || `Molecule ${query}`,
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
              name: molecularData.title || molecularData.name || molecularData.formula || 'Unknown',
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
              name: molecularData.title || molecularData.name || molecularData.formula || 'Unknown',
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
        setSearchStatus(results.length > 0 ? `Found ${results.length} results` : 'No results found');
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
  }, [chemicalService]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
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
      // Get the scene and molecule manager from the scene bridge
      const scene = sceneBridge.getScene();
      const moleculeManager = sceneBridge.getMoleculeManager();

      if (!scene || !moleculeManager) {
        setSearchStatus('Error: Scene not available. Please wait for initialization...');
        console.error('Scene or molecule manager not available:', { 
          scene: !!scene, 
          moleculeManager: !!moleculeManager,
          bridgeInitialized: sceneBridge.isInitialized()
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
      
      drawMolecule(
        molecularData.mol3d,
        moleculeManager,
        scene,
        position,
        result.name
      );

      // Make the molecule stationary by setting zero velocity
      moleculeManager.setMoleculeVelocity(result.name, new THREE.Vector3(0, 0, 0), 0);

      setSearchStatus(`✅ Loaded ${result.name} (stationary)`);
      
      // Note: Not updating availableMolecules list - search spawns molecules independently
      // The dropdowns use hardcoded demo molecules for user testing
    } catch (error) {
      setSearchStatus(`❌ Failed to load ${result.name}`);
    }
  };

  const isInChIKey = (query: string): boolean => {
    return query.length === 27 && query.includes('-');
  };

  const isSMILES = (query: string): boolean => {
    return /[=#@\[\]()]/.test(query);
  };

  return (
    <div className="molecule-search">
      <div className="form-group">
        <label className="form-label">🔍 Search Molecules</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={sceneReady ? "e.g., benzene, 241, C6H6, C1=CC=CC=C1, etc..." : "Waiting for scene initialization..."}
            disabled={!sceneReady}
            className="form-input"
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: sceneReady ? '#2a2a2a' : '#1a1a1a',
              border: '1px solid #555',
              color: sceneReady ? '#fff' : '#666',
              fontSize: '12px',
              borderRadius: '3px',
              cursor: sceneReady ? 'text' : 'not-allowed',
            }}
          />
          
          {showDropdown && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '3px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
              }}
            >
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleResultSelect(result)}
                  style={{
                    padding: '8px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #444',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{result.name}</div>
                  <div style={{ color: '#aaa', fontSize: '10px' }}>
                    CID: {result.cid} | Formula: {result.formula}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div
          style={{
            color: isSearching ? '#81C784' : sceneReady ? '#aaa' : '#ff6b6b',
            fontSize: '10px',
            marginTop: '5px',
            minHeight: '12px',
          }}
        >
          {searchStatus}
        </div>
        
        {!sceneReady && (
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => {
                console.log('Scene bridge status:', {
                  initialized: sceneBridge.isInitialized(),
                  scene: !!sceneBridge.getScene(),
                  moleculeManager: !!sceneBridge.getMoleculeManager(),
                  globalScene: !!(window as any).threeScene,
                  globalManager: !!(window as any).moleculeManager
                });
              }}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Debug Scene Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

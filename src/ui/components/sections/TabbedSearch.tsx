import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { ChemicalDataService } from '../../../chemistry/chemicalDataService';
import { drawMolecule } from '../../../components/moleculeDrawer';
import { sceneBridge } from '../../../services/SceneBridge';
import { useUIState } from '../../context/UIStateContext';
import { threeJSBridge } from '../../bridge/ThreeJSBridge';
import { SmartInfoBubble } from '../common/SmartInfoBubble';
import type { ReactionType } from '../common/InfoBubbleContent';
import { DebugControls } from './DebugControls';
import { LiveStats } from './LiveStats';
import { ReactionControls } from './ReactionControls';
import { ReactionProducts } from './ReactionProducts';
import { sn2ReactionSystem } from '../../../chemistry/sn2Reaction';

interface SearchResult {
  cid: string;
  name: string;
  formula: string;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="sidebar-section">
      <div className="section-header" onClick={() => setIsOpen(!isOpen)}>
        {title}
        <span>{isOpen ? '▼' : '▶'}</span>
      </div>
      <div className={`section-content ${!isOpen ? 'collapsed' : ''}`}>{children}</div>
    </div>
  );
};

export const TabbedSearch: React.FC = () => {
  const { uiState, updateUIState } = useUIState();
  const [activeTab, setActiveTab] = useState<'molecules' | 'reactions' | 'debug'>(uiState.activeTab);
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

  // Auto-populate dropdowns on component mount
  useEffect(() => {
    if (uiState.availableMolecules.length === 0) {
      console.log('Auto-populating molecule dropdowns...');
      updateUIState({
        availableMolecules: ['demo_Methyl_bromide', 'demo_Hydroxide_ion', 'demo_Methanol', 'demo_Water'],
        substrateMolecule: 'demo_Methyl_bromide',
        nucleophileMolecule: 'demo_Hydroxide_ion',
      });
    }
  }, [uiState.availableMolecules.length, updateUIState]);

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
      // Clear search immediately after Enter
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
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
      
      // Reset status after showing success message
      setTimeout(() => {
        setSearchStatus('Ready');
      }, 1500);
      
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

  const getPlaceholder = () => {
    if (!sceneReady) return "Waiting for scene initialization...";
    
    if (activeTab === 'molecules') {
      return "e.g., benzene, 241, C6H6, C1=CC=CC=C1, etc...";
    } else {
      return "e.g., SN2, substitution, elimination, etc...";
    }
  };

  const getSearchLabel = () => {
    if (activeTab === 'molecules') return 'Search Molecules';
    if (activeTab === 'reactions') return 'Search Reactions';
    return 'Debug Information';
  };

  return (
    <div className="tabbed-search">
      {/* Tab Headers */}
      <div style={{ display: 'flex', marginBottom: '12px', borderBottom: '1px solid #444' }}>
        <button
          onClick={() => {
            setActiveTab('molecules');
            updateUIState({ activeTab: 'molecules' });
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: activeTab === 'molecules' ? '#4a90e2' : 'transparent',
            border: 'none',
            color: activeTab === 'molecules' ? '#fff' : '#aaa',
            fontSize: '12px',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            borderBottom: activeTab === 'molecules' ? '2px solid #4a90e2' : '2px solid transparent',
          }}
        >
          Explore Molecules
        </button>
        <button
          onClick={() => {
            setActiveTab('reactions');
            updateUIState({ activeTab: 'reactions' });
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: activeTab === 'reactions' ? '#4a90e2' : 'transparent',
            border: 'none',
            color: activeTab === 'reactions' ? '#fff' : '#aaa',
            fontSize: '12px',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            borderBottom: activeTab === 'reactions' ? '2px solid #4a90e2' : '2px solid transparent',
          }}
        >
          Explore Reactions
        </button>
        {!uiState.userTestMode && (
          <button
            onClick={() => {
              setActiveTab('debug');
              updateUIState({ activeTab: 'debug' });
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: activeTab === 'debug' ? '#4a90e2' : 'transparent',
              border: 'none',
              color: activeTab === 'debug' ? '#fff' : '#aaa',
              fontSize: '12px',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              borderBottom: activeTab === 'debug' ? '2px solid #4a90e2' : '2px solid transparent',
            }}
          >
            Debug
          </button>
        )}
      </div>

      {/* Search Interface - Only show on molecules tab */}
      {activeTab === 'molecules' && (
        <div className="form-group" style={{ 
          padding: '16px', 
          backgroundColor: 'rgba(30, 30, 30, 0.8)', 
          borderRadius: '12px', 
          margin: '12px 0',
          border: '1px solid rgba(74, 144, 226, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <label className="form-label" style={{ 
            color: '#e0e0e0', 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {getSearchLabel()}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={!sceneReady}
              className="form-input"
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: sceneReady ? '#2a2a2a' : '#1a1a1a',
                border: sceneReady ? '2px solid rgba(74, 144, 226, 0.3)' : '2px solid rgba(102, 102, 102, 0.3)',
                color: sceneReady ? '#ffffff' : '#666666',
                fontSize: '14px',
                borderRadius: '10px',
                cursor: sceneReady ? 'text' : 'not-allowed',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: sceneReady 
                  ? '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                boxSizing: 'border-box',
                maxWidth: '100%',
              }}
              onFocus={(e) => {
                if (sceneReady) {
                  e.target.style.borderColor = '#4a90e2';
                  e.target.style.boxShadow = '0 0 0 4px rgba(74, 144, 226, 0.15), 0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
                  e.target.style.backgroundColor = '#2f2f2f';
                }
              }}
              onBlur={(e) => {
                if (sceneReady) {
                  e.target.style.borderColor = 'rgba(74, 144, 226, 0.3)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
                  e.target.style.backgroundColor = '#2a2a2a';
                }
              }}
            />
            
            {showDropdown && searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#2a2a2a',
                  border: '2px solid rgba(74, 144, 226, 0.3)',
                  borderRadius: '10px',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  zIndex: 1000,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(74, 144, 226, 0.1)',
                  marginTop: '4px',
                  backdropFilter: 'blur(10px)',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleResultSelect(result)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: index < searchResults.length - 1 ? '1px solid rgba(74, 144, 226, 0.1)' : 'none',
                      color: '#ffffff',
                      fontSize: '14px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderRadius: index === 0 ? '8px 8px 0 0' : index === searchResults.length - 1 ? '0 0 8px 8px' : '0',
                      width: '100%',
                      boxSizing: 'border-box',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(74, 144, 226, 0.15)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
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
              color: isSearching ? '#4ade80' : sceneReady ? '#a1a1aa' : '#f87171',
              fontSize: '12px',
              marginTop: '12px',
              minHeight: '16px',
              fontWeight: isSearching ? '500' : '400',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSearching && <div style={{ width: '12px', height: '12px', border: '2px solid #4ade80', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
            {searchStatus}
          </div>
          

          {/* Auto Rotate Control */}
          <div className="form-group" style={{ 
            padding: '12px', 
            backgroundColor: 'rgba(40, 40, 40, 0.6)', 
            borderRadius: '8px', 
            margin: '12px 0',
            border: '1px solid rgba(74, 144, 226, 0.1)'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#e0e0e0',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              <input 
                type="checkbox" 
                onChange={(e) => {
                  const controls = threeJSBridge.getControls();
                  if (controls) {
                    controls.autoRotate = e.target.checked;
                  }
                }}
                style={{ 
                  accentColor: '#4a90e2',
                  transform: 'scale(1.1)'
                }}
              />
              🔄 Auto Rotate
            </label>
          </div>
        </div>
      )}

      {/* Tab Content - Reactions tab shows molecule selection */}
      {activeTab === 'reactions' && (
        <div style={{ marginTop: '12px', position: 'relative', overflow: 'visible' }}>
          <div className="form-group" style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #444' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>Reaction Type</label>
              <SmartInfoBubble 
                term="leaving_group"
                reactionType={uiState.reactionType as ReactionType}
              />
            </div>
            <select
              value={uiState.reactionType}
              onChange={e => updateUIState({ reactionType: e.target.value })}
              className="form-select"
              style={{ fontSize: '14px', fontWeight: '500' }}
            >
              <option value="sn2">SN2 - Bimolecular Substitution</option>
              <option value="sn1">SN1 - Unimolecular Substitution</option>
              <option value="e2">E2 - Bimolecular Elimination</option>
              <option value="e1">E1 - Unimolecular Elimination</option>
            </select>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', fontStyle: 'italic' }}>
              ↓ This determines the available molecules below
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Substrate</label>
              <SmartInfoBubble 
                term="substrate"
                reactionType={uiState.reactionType as ReactionType}
              />
            </div>
            <select
              value={uiState.substrateMolecule}
              onChange={e => updateUIState({ substrateMolecule: e.target.value })}
              className="form-select"
            >
              <option value="">Select substrate...</option>
              {uiState.availableMolecules.map(mol => (
                <option key={mol} value={mol}>
                  {mol}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                {uiState.reactionType.startsWith('e') ? 'Base' : 'Nucleophile'}
              </label>
              <SmartInfoBubble 
                term={uiState.reactionType.startsWith('e') ? 'base' : 'nucleophile'}
                reactionType={uiState.reactionType as ReactionType}
              />
            </div>
            <select
              value={uiState.nucleophileMolecule}
              onChange={e => updateUIState({ nucleophileMolecule: e.target.value })}
              className="form-select"
            >
              <option value="">Select {uiState.reactionType.startsWith('e') ? 'base' : 'nucleophile'}...</option>
              {uiState.availableMolecules.map(mol => (
                <option key={mol} value={mol}>
                  {mol}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${
                !uiState.reactionInProgress ? 'btn-success' : 
                uiState.isPlaying ? 'btn-danger' : 'btn-success'
              }`}
              onClick={async () => {
                // If no reaction started yet, start the reaction
                if (!uiState.reactionInProgress) {
                  if (!uiState.substrateMolecule || !uiState.nucleophileMolecule) {
                    alert('Please select both substrate and nucleophile molecules first');
                    return;
                  }

                  console.log('Starting reaction animation...');
                  try {
                    await threeJSBridge.startReactionAnimation();
                    updateUIState({
                      isPlaying: true,
                      reactionInProgress: true,
                    });
                  } catch (error) {
                    console.error('Error starting reaction animation:', error);
                  }
                } else {
                  // If reaction is in progress, toggle play/pause
                  updateUIState({ isPlaying: !uiState.isPlaying });
                }
              }}
              disabled={!uiState.reactionInProgress && (!uiState.substrateMolecule || !uiState.nucleophileMolecule)}
              style={{ flex: 1 }}
            >
              {!uiState.reactionInProgress ? '🚀 Start Reaction' : 
               uiState.isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                console.log('🔄 Resetting scene and clearing all molecules...');
                
                // Clear any running reaction monitoring intervals
                sn2ReactionSystem.clearAllIntervals();
                
                // Clear all molecules from scene and manager
                const scene = sceneBridge.getScene();
                const moleculeManager = sceneBridge.getMoleculeManager();
                
                if (scene && moleculeManager) {
                  // Get all molecules and remove them from scene
                  const existingMolecules = moleculeManager.getAllMolecules();
                  console.log(`Found ${existingMolecules.length} molecules to clear`);
                  
                  for (const mol of existingMolecules) {
                    if (mol.group) {
                      scene.remove(mol.group);
                      console.log(`Removed molecule: ${mol.name}`);
                    }
                  }
                  
                  // Clear molecule manager
                  if (moleculeManager.clearAllMolecules) {
                    moleculeManager.clearAllMolecules();
                  } else {
                    // Fallback: remove molecules one by one
                    for (const mol of existingMolecules) {
                      moleculeManager.removeMolecule(mol.name);
                    }
                  }
                  
                  console.log('🧹 Scene and molecules cleared successfully');
                } else {
                  console.warn('⚠️ Scene or molecule manager not available for clearing');
                }
                
                // Reset all UI state to initial values
                updateUIState({
                  isPlaying: false,
                  reactionInProgress: false,
                  lastReaction: 'None',
                  mainProduct: 'None',
                  leavingGroup: 'None',
                  reactionEquation: 'No reaction yet',
                  // Reset molecule selections
                  substrateMolecule: '',
                  nucleophileMolecule: '',
                  // Keep available molecules list so user can select new ones
                  // availableMolecules: [] // Don't clear this - keep demo molecules available
                });
                
                console.log('✅ Reset completed - ready for new reaction');
              }}
              style={{ flex: 1 }}
            >
              ⏹️ Reset
            </button>
          </div>
        </div>
      )}

      {/* Debug Tab Content */}
      {activeTab === 'debug' && (
        <div>
          <CollapsibleSection title="System Status" defaultOpen={true}>
            <div style={{ padding: '12px' }}>
              <div className="form-group">
                <h4 style={{ color: '#e0e0e0', fontSize: '14px', marginBottom: '12px' }}>Scene Status</h4>
                <div style={{ 
                  backgroundColor: 'rgba(40, 40, 40, 0.6)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    color: !sceneReady ? '#f87171' : '#4ade80',
                    fontSize: '14px',
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    Status: {sceneReady ? 'Ready' : 'Not Ready'}
                  </div>
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
                      padding: '8px 12px',
                      fontSize: '12px',
                      backgroundColor: '#4a90e2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Debug Scene Status
                  </button>
                </div>
              </div>

              <div className="form-group">
                <h4 style={{ color: '#e0e0e0', fontSize: '14px', marginBottom: '12px' }}>Search Status</h4>
                <div style={{ 
                  backgroundColor: 'rgba(40, 40, 40, 0.6)', 
                  borderRadius: '8px', 
                  padding: '12px'
                }}>
                  <div style={{
                    color: isSearching ? '#4ade80' : sceneReady ? '#a1a1aa' : '#f87171',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    {isSearching && <div style={{ width: '12px', height: '12px', border: '2px solid #4ade80', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
                    {searchStatus}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Reaction Controls" defaultOpen={true}>
            <ReactionControls />
          </CollapsibleSection>

          <CollapsibleSection title="Live Stats" defaultOpen={false}>
            <LiveStats />
          </CollapsibleSection>

          <CollapsibleSection title="Reaction Products" defaultOpen={false}>
            <ReactionProducts />
          </CollapsibleSection>

          <CollapsibleSection title="Debug Controls" defaultOpen={false}>
            <DebugControls />
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
};

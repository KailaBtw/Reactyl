import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import { ChemicalDataService } from '../../../chemistry/chemicalDataService';
import { sn2ReactionSystem } from '../../../chemistry/sn2Reaction';
import { drawMolecule } from '../../../components/moleculeDrawer';
import { sceneBridge } from '../../../services/SceneBridge';
import { threeJSBridge } from '../../bridge/ThreeJSBridge';
import { ATTACK_MODES } from '../../constants/attackModes';
import {
  AVAILABLE_MOLECULES,
  DEFAULT_NUCLEOPHILE,
  DEFAULT_SUBSTRATE,
} from '../../constants/availableMolecules';
import { useUIState } from '../../context/UIStateContext';
import type { ReactionType } from '../common/InfoBubbleContent';
import { SmartInfoBubble } from '../common/SmartInfoBubble';
import { DebugControls } from './DebugControls';
import { LiveStats } from './LiveStats';
import { MoleculeSelector } from './MoleculeSelector';
import { ReactionControls } from './ReactionControls';
import { ReactionProducts } from './ReactionProducts';
import { SidebarCard } from './SidebarCard';

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

type TabId = 'molecules' | 'reactions' | 'debug';

interface TabbedSearchProps {
  externalActiveTab?: TabId;
  onExternalTabChange?: (tab: TabId) => void;
}

export const TabbedSearch: React.FC<TabbedSearchProps> = ({
  externalActiveTab,
  onExternalTabChange,
}) => {
  const { uiState, updateUIState } = useUIState();
  const [internalTab, setInternalTab] = useState<TabId>(uiState.activeTab || 'reactions');
  const activeTab: TabId = externalActiveTab ?? internalTab;
  const setActiveTab = (tab: TabId) => {
    if (onExternalTabChange) {
      onExternalTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };
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

  // Auto-populate dropdowns on component mount (centralized list)
  useEffect(() => {
    // Always update to the centralized list
    const targetMolecules = [...AVAILABLE_MOLECULES];
    const currentMolecules = uiState.availableMolecules;

    // Check if we need to update
    const needsUpdate =
      currentMolecules.length !== targetMolecules.length ||
      !targetMolecules.every(mol => currentMolecules.includes(mol));

    if (needsUpdate) {
      updateUIState({
        availableMolecules: targetMolecules,
        substrateMolecule: uiState.substrateMolecule || DEFAULT_SUBSTRATE,
        nucleophileMolecule: uiState.nucleophileMolecule || DEFAULT_NUCLEOPHILE,
      });
    }
  }, [uiState.availableMolecules.length]);

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
          bridgeInitialized: sceneBridge.isInitialized(),
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
    return /[=#@[\]()]/.test(query);
  };

  const getPlaceholder = () => {
    if (!sceneReady) return 'Waiting for scene initialization...';

    if (activeTab === 'molecules') {
      return 'e.g., benzene, 241, C6H6, C1=CC=CC=C1, etc...';
    } else {
      return 'e.g., SN2, substitution, elimination, etc...';
    }
  };

  const getSearchLabel = () => {
    if (activeTab === 'molecules') return 'Search Molecules';
    if (activeTab === 'reactions') return 'Search Reactions';
    return 'Debug Information';
  };

  return (
    <div className="tabbed-search">
      {/* Modern Tab Headers (only when not externally controlled) */}
      {!externalActiveTab && (
        <div
          style={{
            display: 'flex',
            marginBottom: '0',
            borderBottom: '1px solid #1a1a1a',
            backgroundColor: '#222',
            gap: '0',
          }}
        >
          <button
            onClick={() => {
              setActiveTab('reactions');
              updateUIState({ activeTab: 'reactions' });
            }}
            style={{
              flex: 1,
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'reactions' ? '2px solid #4a90e2' : '2px solid transparent',
              color: activeTab === 'reactions' ? '#4a90e2' : '#999',
              fontSize: '11px',
              fontWeight: activeTab === 'reactions' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onMouseEnter={e => {
              if (activeTab !== 'reactions') {
                e.currentTarget.style.backgroundColor = 'rgba(74, 144, 226, 0.1)';
                e.currentTarget.style.color = '#ccc';
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== 'reactions') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#999';
              }
            }}
          >
            <span
              style={{
                fontSize: '14px',
                filter: activeTab === 'reactions' ? 'grayscale(0%)' : 'grayscale(100%)',
              }}
            >
              ⚗️
            </span>
            Reactions
          </button>
          <button
            onClick={() => {
              setActiveTab('molecules');
              updateUIState({ activeTab: 'molecules' });
            }}
            style={{
              flex: 1,
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'molecules' ? '2px solid #4a90e2' : '2px solid transparent',
              color: activeTab === 'molecules' ? '#4a90e2' : '#999',
              fontSize: '11px',
              fontWeight: activeTab === 'molecules' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onMouseEnter={e => {
              if (activeTab !== 'molecules') {
                e.currentTarget.style.backgroundColor = 'rgba(74, 144, 226, 0.1)';
                e.currentTarget.style.color = '#ccc';
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== 'molecules') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#999';
              }
            }}
          >
            <span
              style={{
                fontSize: '14px',
                filter: activeTab === 'molecules' ? 'grayscale(0%)' : 'grayscale(100%)',
              }}
            >
              🧪
            </span>
            Molecules
          </button>
          {!uiState.userTestMode && (
            <button
              onClick={() => {
                setActiveTab('debug');
                updateUIState({ activeTab: 'debug' });
              }}
              style={{
                flex: 1,
                padding: '10px 12px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'debug' ? '2px solid #4a90e2' : '2px solid transparent',
                color: activeTab === 'debug' ? '#4a90e2' : '#999',
                fontSize: '11px',
                fontWeight: activeTab === 'debug' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseEnter={e => {
                if (activeTab !== 'debug') {
                  e.currentTarget.style.backgroundColor = 'rgba(74, 144, 226, 0.1)';
                  e.currentTarget.style.color = '#ccc';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== 'debug') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#999';
                }
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  filter: activeTab === 'debug' ? 'grayscale(0%)' : 'grayscale(100%)',
                }}
              >
                🔧
              </span>
              Debug
            </button>
          )}
        </div>
      )}

      {/* Search Interface - Only show on molecules tab */}
      {activeTab === 'molecules' && (
        <div
          className="form-group"
          style={{
            padding: '16px',
            backgroundColor: 'rgba(30, 30, 30, 0.8)',
            borderRadius: '12px',
            margin: '12px 0',
            border: '1px solid rgba(74, 144, 226, 0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <label
            className="form-label"
            style={{
              color: '#e0e0e0',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
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
                border: sceneReady
                  ? '2px solid rgba(74, 144, 226, 0.3)'
                  : '2px solid rgba(102, 102, 102, 0.3)',
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
              onFocus={e => {
                if (sceneReady) {
                  e.target.style.borderColor = '#4a90e2';
                  e.target.style.boxShadow =
                    '0 0 0 4px rgba(74, 144, 226, 0.15), 0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
                  e.target.style.backgroundColor = '#2f2f2f';
                }
              }}
              onBlur={e => {
                if (sceneReady) {
                  e.target.style.borderColor = 'rgba(74, 144, 226, 0.3)';
                  e.target.style.boxShadow =
                    '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
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
                      borderBottom:
                        index < searchResults.length - 1
                          ? '1px solid rgba(74, 144, 226, 0.1)'
                          : 'none',
                      color: '#ffffff',
                      fontSize: '14px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderRadius:
                        index === 0
                          ? '8px 8px 0 0'
                          : index === searchResults.length - 1
                            ? '0 0 8px 8px'
                            : '0',
                      width: '100%',
                      boxSizing: 'border-box',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(74, 144, 226, 0.15)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={e => {
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
            {isSearching && (
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #4ade80',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              ></div>
            )}
            {searchStatus}
          </div>

          {/* Auto Rotate Control */}
          <div
            className="form-group"
            style={{
              padding: '12px',
              backgroundColor: 'rgba(40, 40, 40, 0.6)',
              borderRadius: '8px',
              margin: '12px 0',
              border: '1px solid rgba(74, 144, 226, 0.1)',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                onChange={e => {
                  const controls = threeJSBridge.getControls();
                  if (controls) {
                    controls.autoRotate = e.target.checked;
                  }
                }}
                style={{
                  accentColor: '#4a90e2',
                  transform: 'scale(1.1)',
                }}
              />
              🔄 Auto Rotate
            </label>
          </div>
        </div>
      )}

      {/* Tab Content - Reactions tab shows molecule selection */}
      {activeTab === 'reactions' && (
        <div style={{ position: 'relative', overflow: 'visible', padding: '8px 0' }}>
          {/* Reaction Type Section */}
          <SidebarCard
            title="Reaction Type"
            right={
              <SmartInfoBubble
                term="leaving_group"
                reactionType={uiState.reactionType as ReactionType}
                size="small"
              />
            }
          >
            <select
              value={uiState.reactionType}
              onChange={e => updateUIState({ reactionType: e.target.value })}
              className="form-select"
            >
              <option value="sn2">SN2 - Bimolecular Substitution</option>
              <option value="sn1">SN1 - Unimolecular Substitution</option>
              <option value="e2">E2 - Bimolecular Elimination</option>
              <option value="e1">E1 - Unimolecular Elimination</option>
            </select>
          </SidebarCard>

          {/* Molecule Selection Section */}
          <SidebarCard title="Molecule Selection">
            {/* Filter molecules into substrates and nucleophiles */}
            {(() => {
              const substrateOptions = uiState.availableMolecules.filter(
                mol =>
                  mol.includes('Methyl') ||
                  mol.includes('Ethyl') ||
                  mol.includes('Isopropyl') ||
                  mol.includes('Tert') ||
                  mol.includes('butyl')
              );

              const nucleophileOptions = uiState.availableMolecules.filter(
                mol =>
                  mol.includes('Hydroxide') ||
                  mol.includes('Cyanide') ||
                  mol.includes('Methoxide') ||
                  mol.includes('Methanol') ||
                  mol.includes('Water')
              );

              return (
                <>
                  <MoleculeSelector
                    label="Substrate"
                    value={uiState.substrateMolecule}
                    options={substrateOptions}
                    onChange={value => updateUIState({ substrateMolecule: value })}
                    reactionType={uiState.reactionType}
                    term="substrate"
                  />

                  <MoleculeSelector
                    label={uiState.reactionType.startsWith('e') ? 'Base' : 'Nucleophile'}
                    value={uiState.nucleophileMolecule}
                    options={nucleophileOptions}
                    onChange={value => updateUIState({ nucleophileMolecule: value })}
                    reactionType={uiState.reactionType}
                    term={uiState.reactionType.startsWith('e') ? 'base' : 'nucleophile'}
                  />
                </>
              );
            })()}
          </SidebarCard>

          {/* Reaction Parameters Section */}
          <div
            className="form-group"
            style={{
              marginBottom: '20px',
              padding: '14px',
              backgroundColor: 'rgba(40, 40, 40, 0.4)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}
            >
              <h4
                style={{
                  margin: '0',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#e0e0e0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Reaction Parameters
              </h4>
              <SmartInfoBubble
                term="attack_mode"
                reactionType={uiState.reactionType as ReactionType}
                size="small"
              />
            </div>

            {/* Attack Mode Selector */}
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#e0e0e0',
                  marginBottom: '8px',
                  display: 'block',
                  letterSpacing: '0.3px',
                }}
              >
                Attack Mode
              </label>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                {ATTACK_MODES.map(mode => {
                  const isActive =
                    uiState.approachAngle === mode.approachAngle &&
                    uiState.impactParameter === mode.impactParameter &&
                    uiState.relativeVelocity === mode.relativeVelocity;

                  return (
                    <button
                      key={mode.id}
                      onClick={() =>
                        updateUIState({
                          approachAngle: mode.approachAngle,
                          impactParameter: mode.impactParameter,
                          relativeVelocity: mode.relativeVelocity,
                        })
                      }
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: isActive ? '600' : '400',
                        backgroundColor: isActive ? '#4a90e2' : 'rgba(255, 255, 255, 0.1)',
                        color: isActive ? '#fff' : '#ccc',
                        border: `1px solid ${isActive ? '#4a90e2' : 'rgba(255, 255, 255, 0.2)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'rgba(74, 144, 226, 0.2)';
                          e.currentTarget.style.borderColor = '#4a90e2';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }
                      }}
                    >
                      {mode.name}
                    </button>
                  );
                })}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#888',
                  marginTop: '6px',
                  fontStyle: 'italic',
                }}
              >
                {ATTACK_MODES.find(
                  mode =>
                    uiState.approachAngle === mode.approachAngle &&
                    uiState.impactParameter === mode.impactParameter &&
                    uiState.relativeVelocity === mode.relativeVelocity
                )?.description || 'Custom parameters selected'}
              </div>
            </div>

            {/* Fine-tune Parameters */}
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '6px',
                padding: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <h5
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#e0e0e0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Fine-Tune Parameters
              </h5>

              {/* Impact Parameter */}
              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#e0e0e0',
                    }}
                  >
                    Impact Parameter
                  </label>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#ccc',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      minWidth: '30px',
                      textAlign: 'center',
                    }}
                  >
                    {uiState.impactParameter.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={uiState.impactParameter}
                  onChange={e => updateUIState({ impactParameter: parseFloat(e.target.value) })}
                  style={{
                    width: '100%',
                    height: '4px',
                    background: 'linear-gradient(to right, #28a745 0%, #ffc107 50%, #dc3545 100%)',
                    outline: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>

              {/* Relative Velocity */}
              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#e0e0e0',
                    }}
                  >
                    Relative Velocity
                  </label>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#ccc',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      minWidth: '40px',
                      textAlign: 'center',
                    }}
                  >
                    {uiState.relativeVelocity.toFixed(1)} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={uiState.relativeVelocity}
                  onChange={e => updateUIState({ relativeVelocity: parseFloat(e.target.value) })}
                  style={{
                    width: '100%',
                    height: '4px',
                    background: 'linear-gradient(to right, #28a745 0%, #ffc107 50%, #dc3545 100%)',
                    outline: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>

              {/* Temperature */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#e0e0e0',
                    }}
                  >
                    Temperature
                  </label>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#ccc',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      minWidth: '30px',
                      textAlign: 'center',
                    }}
                  >
                    {uiState.temperature}K
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="600"
                  value={uiState.temperature}
                  onChange={e => updateUIState({ temperature: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    height: '4px',
                    background: 'linear-gradient(to right, #007bff 0%, #ffc107 50%, #dc3545 100%)',
                    outline: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Reaction controls always available in tabbed interface */}
          <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${
                !uiState.reactionInProgress
                  ? 'btn-success'
                  : uiState.isPlaying
                    ? 'btn-danger'
                    : 'btn-success'
              }`}
              onClick={async () => {
                // If no reaction started yet, start the reaction
                if (!uiState.reactionInProgress) {
                  if (!uiState.substrateMolecule || !uiState.nucleophileMolecule) {
                    alert('Please select both substrate and nucleophile molecules first');
                    return;
                  }

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
                  // If reaction is in progress
                  if (uiState.isPlaying) {
                    // Pause
                    updateUIState({ isPlaying: false });
                  } else {
                    // Play pressed again while a reaction exists -> clear and restart
                    try {
                      threeJSBridge.clear();
                      await threeJSBridge.startReactionAnimation();
                      updateUIState({ isPlaying: true, reactionInProgress: true });
                    } catch (error) {
                      console.error('Error restarting reaction:', error);
                    }
                  }
                }
              }}
              disabled={
                !uiState.reactionInProgress &&
                (!uiState.substrateMolecule || !uiState.nucleophileMolecule)
              }
              style={{ flex: 1 }}
            >
              {!uiState.reactionInProgress
                ? 'Start Reaction'
                : uiState.isPlaying
                  ? 'Pause'
                  : 'Play'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                // Clear any running reaction monitoring intervals
                sn2ReactionSystem.clearAllIntervals();

                // Use the new clear method from ThreeJSBridge
                threeJSBridge.clear();

                // Reset all UI state to initial values
                updateUIState({
                  isPlaying: false,
                  reactionInProgress: false,
                  lastReaction: 'None',
                  mainProduct: 'None',
                  leavingGroup: 'None',
                  reactionEquation: 'No reaction yet',
                  // Keep molecule selections so user can restart immediately
                  // substrateMolecule: '',
                  // nucleophileMolecule: '',
                  // Keep available molecules list so user can select new ones
                  // availableMolecules: [] // Don't clear this - keep demo molecules available
                });
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
        <div style={{ padding: '16px' }}>
          <CollapsibleSection title="System Status" defaultOpen={true}>
            <div style={{ padding: '12px' }}>
              <div className="form-group">
                <h4 style={{ color: '#e0e0e0', fontSize: '14px', marginBottom: '12px' }}>
                  Scene Status
                </h4>
                <div
                  style={{
                    backgroundColor: 'rgba(40, 40, 40, 0.6)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      color: !sceneReady ? '#f87171' : '#4ade80',
                      fontSize: '14px',
                      marginBottom: '8px',
                      fontWeight: '500',
                    }}
                  >
                    Status: {sceneReady ? 'Ready' : 'Not Ready'}
                  </div>
                  <button
                    onClick={() => {
                      // Debug button - no action needed
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      backgroundColor: '#4a90e2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Debug Scene Status
                  </button>
                </div>
              </div>

              <div className="form-group">
                <h4 style={{ color: '#e0e0e0', fontSize: '14px', marginBottom: '12px' }}>
                  Search Status
                </h4>
                <div
                  style={{
                    backgroundColor: 'rgba(40, 40, 40, 0.6)',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <div
                    style={{
                      color: isSearching ? '#4ade80' : sceneReady ? '#a1a1aa' : '#f87171',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {isSearching && (
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid #4ade80',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}
                      ></div>
                    )}
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

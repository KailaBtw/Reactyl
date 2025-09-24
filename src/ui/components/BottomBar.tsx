import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../context/UIStateContext';
import { ChemicalDataService } from '../../chemistry/chemicalDataService';
import { useResponsive } from '../hooks/useResponsive';

// Type definition for reaction explanations
interface ReactionExplanation {
  title: string;
  mechanism: string;
  description: string;
  keyFeatures: string[];
  preference: string;
}

interface ReactionExplanations {
  [key: string]: ReactionExplanation;
}

// Type definition for molecule information
interface MoleculeInfo {
  name: string;
  formula: string;
  weight: string;
  smiles: string;
  description: string;
}

export const BottomBar: React.FC = () => {
  const { uiState, updateUIState } = useUIState();
  const responsive = useResponsive();
  const [reactionExplanations, setReactionExplanations] = useState<ReactionExplanations>({});
  const [isLoading, setIsLoading] = useState(true);
  const [moleculeInfo, setMoleculeInfo] = useState<MoleculeInfo | null>(null);
  const [isLoadingMolecule, setIsLoadingMolecule] = useState(false);
  
  // Memoize chemical service to prevent infinite re-renders
  const chemicalService = useMemo(() => new ChemicalDataService(), []);

  // Load reaction explanations from JSON
  useEffect(() => {
    const loadReactionExplanations = async () => {
      try {
        const response = await fetch('/data/reactionExplanations.json');
        if (!response.ok) {
          throw new Error('Failed to load reaction explanations');
        }
        const data = await response.json();
        setReactionExplanations(data);
      } catch (error) {
        console.error('Error loading reaction explanations:', error);
        // Fallback to default SN2 explanation if loading fails
        setReactionExplanations({
          sn2: {
            title: "SN2 - Bimolecular Nucleophilic Substitution",
            mechanism: "Concerted (one-step)",
            description: "A nucleophile attacks the substrate from the backside while the leaving group departs simultaneously.",
            keyFeatures: ["Backside attack", "Concerted mechanism", "Inversion of stereochemistry"],
            preference: "Primary > Secondary >> Tertiary substrates"
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadReactionExplanations();
  }, []);

  // Load molecule information when on molecules tab and a molecule is selected
  useEffect(() => {
    const loadMoleculeInfo = async () => {
      if (uiState.activeTab !== 'molecules') {
        setMoleculeInfo(null);
        return;
      }

      // Try to get a selected molecule from either substrate or nucleophile
      const selectedMolecule = uiState.substrateMolecule || uiState.nucleophileMolecule;
      if (!selectedMolecule) {
        setMoleculeInfo({
          name: 'No molecule selected',
          formula: 'Select a molecule to see information',
          weight: 'N/A',
          smiles: 'N/A',
          description: 'Use the molecule search or select from available molecules to see detailed information here.'
        });
        return;
      }

      setIsLoadingMolecule(true);
      try {
        // Extract CID from molecule name if it follows the pattern "name_CID"
        const cidMatch = selectedMolecule.match(/_(\d+)$/);
        if (cidMatch) {
          const cid = cidMatch[1];
          
          const molecularData = await chemicalService.fetchMoleculeByCID(cid);
          setMoleculeInfo({
            name: molecularData.name || selectedMolecule,
            formula: molecularData.formula || 'Unknown',
            weight: molecularData.molWeight ? `${molecularData.molWeight} g/mol` : 'Unknown',
            smiles: molecularData.smiles || 'Not available',
            description: `${molecularData.name || selectedMolecule} is an organic compound with the molecular formula ${molecularData.formula || 'unknown'}. This molecule has a molecular weight of ${molecularData.molWeight || 'unknown'} g/mol.`
          });
        } else {
          // Fallback for molecules without CID
          setMoleculeInfo({
            name: selectedMolecule,
            formula: 'Unknown',
            weight: 'Unknown',
            smiles: 'Not available',
            description: `Information for ${selectedMolecule} is limited. This appears to be a custom or demo molecule.`
          });
        }
      } catch (error) {
        console.error('Error loading molecule info:', error);
        setMoleculeInfo({
          name: selectedMolecule,
          formula: 'Error loading data',
          weight: 'N/A',
          smiles: 'N/A',
          description: 'Unable to load molecule information. Please try again later.'
        });
      } finally {
        setIsLoadingMolecule(false);
      }
    };

    loadMoleculeInfo();
  }, [uiState.activeTab, uiState.substrateMolecule, uiState.nucleophileMolecule, chemicalService]);

  // Keyboard shortcut for expand/collapse (Ctrl/Cmd + B)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        updateUIState({ bottomBarExpanded: !uiState.bottomBarExpanded });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiState.bottomBarExpanded, updateUIState]);
  
  // Get current reaction explanation
  const currentReaction = reactionExplanations[uiState.reactionType] || reactionExplanations.sn2;


  // Show loading state
  if (isLoading) {
  return (
    <div className="bottom-bar">
      <div className="bottom-bar-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            Loading reaction explanations...
          </div>
            </div>
          </div>
    );
  }

  // Show fallback if no current reaction found
  if (!currentReaction) {
    return (
      <div className="bottom-bar">
        <div className="bottom-bar-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            No explanation available for reaction type: {uiState.reactionType}
          </div>
        </div>
      </div>
    );
  }

  // Render molecule information panel
  const renderMoleculeInfo = () => (
    <div 
      style={{
        height: '100%',
        padding: '2px',
        backgroundColor: 'rgba(30, 30, 30, 0.7)',
        borderRadius: '3px',
        border: '1px solid rgba(74, 144, 226, 0.2)',
        overflow: 'auto',
        fontSize: '10px'
      }}
    >
      {isLoadingMolecule ? (
        <div style={{ color: '#888', fontSize: '9px' }}>Loading...</div>
      ) : moleculeInfo ? (
        <>
          <div 
            style={{ 
              fontSize: '11px', 
              fontWeight: 'bold', 
              color: '#4a90e2', 
              marginBottom: '2px',
              borderBottom: '1px solid rgba(74, 144, 226, 0.1)',
              paddingBottom: '1px'
            }}
          >
            {moleculeInfo.name}
          </div>
          
          <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px' }}>
            <strong>Formula:</strong> {moleculeInfo.formula}
        </div>

          <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px' }}>
            <strong>Weight:</strong> {moleculeInfo.weight} g/mol
          </div>

          <div style={{ 
            fontSize: '8px', 
            color: '#777', 
            marginBottom: '3px', 
            wordBreak: 'break-all',
            lineHeight: '1.1'
          }}>
            <strong>SMILES:</strong> {moleculeInfo.smiles}
          </div>
          
          <div style={{ 
            fontSize: '9px', 
            color: '#ccc', 
            lineHeight: '1.2',
            overflow: 'auto',
            maxHeight: '30px'
          }}>
            <strong>Description:</strong> {moleculeInfo.description}
          </div>
        </>
      ) : (
        <div style={{ color: '#888', fontSize: '9px' }}>
          No molecule selected
        </div>
      )}
    </div>
  );

  // Render reaction information panel
  const renderReactionInfo = () => (
    <div 
      style={{
        height: '100%',
        padding: '2px',
        backgroundColor: 'rgba(30, 30, 30, 0.7)',
        borderRadius: '3px',
        border: '1px solid rgba(74, 144, 226, 0.2)',
        overflow: 'auto',
        fontSize: '10px'
      }}
    >
      <div 
        style={{ 
          fontSize: '11px', 
          fontWeight: 'bold', 
          color: '#4a90e2', 
          marginBottom: '2px',
          borderBottom: '1px solid rgba(74, 144, 226, 0.1)',
          paddingBottom: '1px'
        }}
      >
        {currentReaction.title}
      </div>
      
      <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px' }}>
        <strong>Mechanism:</strong> {currentReaction.mechanism}
      </div>
      
      <div style={{ 
        fontSize: '9px', 
        color: '#ccc', 
        marginBottom: '3px', 
        lineHeight: '1.2',
        overflow: 'auto',
        maxHeight: '35px'
      }}>
        <strong>Description:</strong> {currentReaction.description}
      </div>
      
      <div style={{ 
        fontSize: '8px', 
        color: '#aaa', 
        overflow: 'auto',
        maxHeight: '25px'
      }}>
        <strong>Key Features:</strong>
        <ul style={{ margin: '2px 0 0 0', paddingLeft: '12px', lineHeight: '1.1' }}>
          {currentReaction.keyFeatures.slice(0, 3).map((feature, index) => (
            <li key={index} style={{ marginBottom: '1px' }}>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  // Get the current panel title
  const getPanelTitle = () => {
    const baseTitle = uiState.activeTab === 'molecules' 
      ? (moleculeInfo ? `Molecule: ${moleculeInfo.name}` : 'Molecule Information')
      : (currentReaction ? currentReaction.title : 'Reaction Information');
    
    // When collapsed, add a hint about expanding for details
    if (!uiState.bottomBarExpanded) {
      return `${baseTitle} - Click to expand for details`;
    }
    
    return baseTitle;
  };

  return (
    <motion.div 
      className={`bottom-bar ${!uiState.bottomBarExpanded ? 'bottom-bar-collapsed' : ''}`}
      variants={responsive.animationVariants.container}
      animate={uiState.bottomBarExpanded ? 'expanded' : 'collapsed'}
      initial={false}
      onClick={!uiState.bottomBarExpanded ? () => updateUIState({ bottomBarExpanded: true }) : undefined}
      style={{ 
        cursor: !uiState.bottomBarExpanded ? 'pointer' : 'default'
      }}
    >
      {/* Header with title and expand button - Hide when collapsed */}
      <AnimatePresence>
        {uiState.bottomBarExpanded && (
          <motion.div 
            className="bottom-bar-header"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => updateUIState({ bottomBarExpanded: !uiState.bottomBarExpanded })}
            style={{ cursor: 'pointer' }}
          >
        <motion.div 
          className="bottom-bar-title"
          key={getPanelTitle()} // Re-animate when title changes
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {getPanelTitle()}
        </motion.div>
        
        <button 
          className="expand-button"
          onClick={(e) => {
            e.stopPropagation();
            updateUIState({ bottomBarExpanded: !uiState.bottomBarExpanded });
          }}
          title={uiState.bottomBarExpanded ? 'Collapse (Ctrl/Cmd+B)' : 'Expand for more details (Ctrl/Cmd+B)'}
        >
          <motion.span
            animate={{ rotate: uiState.bottomBarExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▲
          </motion.span>
        </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <motion.div 
        className="bottom-bar-content"
        style={{ 
          gap: uiState.bottomBarExpanded ? responsive.contentGap : '0',
          padding: uiState.bottomBarExpanded ? responsive.contentPadding : '0 16px',
          flexDirection: uiState.bottomBarExpanded ? (responsive.bottomBarLayout === 'vertical' ? 'column' : 'row') : 'row',
          alignItems: uiState.bottomBarExpanded ? 'flex-start' : 'center',
          height: '100%',
          justifyContent: uiState.bottomBarExpanded ? 'flex-start' : 'space-between',
          overflow: uiState.bottomBarExpanded ? 'auto' : 'visible',
          maxHeight: '100%'
        }}
        variants={responsive.animationVariants.content}
        animate="visible"
        initial="hidden"
      >
        {uiState.bottomBarExpanded ? (
          <>
            {/* Expanded View - Detailed Stats Grid */}
            <motion.div 
              className="stats-grid" 
              style={{ 
                flex: '0 0 auto',
                display: 'grid',
                gridTemplateColumns: responsive.isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: responsive.isSmall ? '4px' : '6px',
                order: responsive.bottomBarLayout === 'vertical' ? 1 : 0,
                fontSize: '11px'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {[
                { label: 'Distance', value: uiState.distance.toFixed(2) },
                { label: 'Relative Velocity', value: `${uiState.relativeVelocity.toFixed(2)} m/s` },
                { label: 'Time to Collision', value: uiState.timeToCollision ? `${uiState.timeToCollision.toFixed(2)}s` : 'N/A' },
                { label: 'Reaction Probability', value: `${uiState.reactionProbability.toFixed(1)}%` }
              ].map((stat, index) => (
                <motion.div 
                  key={stat.label}
                  className="stat-item"
                  style={{
                    padding: '2px 4px',
                    fontSize: '10px',
                    textAlign: 'center'
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05, duration: 0.2 }}
                >
                  <div className="stat-label" style={{ fontSize: '9px', marginBottom: '1px' }}>{stat.label}</div>
                  <div className="stat-value" style={{ fontSize: '11px', fontWeight: 'bold' }}>{stat.value}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Expanded View - Detailed Reaction Status */}
            <motion.div 
              style={{ 
                flex: '0 0 auto',
                padding: '0 8px',
                fontSize: '10px',
                order: responsive.bottomBarLayout === 'vertical' ? 2 : 1,
                minWidth: '120px'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              <div style={{ marginBottom: '2px', fontSize: '10px' }}>
                <strong>Last Reaction:</strong> {uiState.lastReaction}
              </div>
              <div style={{ marginBottom: '2px', fontSize: '10px' }}>
                <strong>Products:</strong> {uiState.mainProduct} + {uiState.leavingGroup}
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                fontSize: '9px', 
                color: '#888',
                marginTop: '2px'
              }}>
                <span>{uiState.reactionInProgress ? '⚡ Reacting' : '✅ Ready'}</span>
                <span>{uiState.isPlaying ? '▶️ Running' : '⏸️ Paused'}</span>
              </div>
            </motion.div>
          </>
        ) : (
          /* Collapsed View - Ultra-narrow bar with key statistics */
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              height: '100%',
              padding: '0 12px',
              fontSize: responsive.isSmall ? '9px' : '10px',
              color: '#ccc',
              cursor: 'pointer'
            }}
            onClick={() => updateUIState({ bottomBarExpanded: true })}
          >
            {/* Left side - Compact stats */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: responsive.isSmall ? '8px' : '12px',
              fontSize: responsive.isSmall ? '8px' : '9px'
            }}>
              <span style={{ color: '#4a90e2' }}>D:{uiState.distance.toFixed(1)}</span>
              <span style={{ color: '#66bb6a' }}>V:{uiState.relativeVelocity.toFixed(1)}</span>
              <span style={{ color: '#ffa726' }}>P:{uiState.reactionProbability.toFixed(0)}%</span>
              <span style={{ color: uiState.timeToCollision ? '#f06292' : '#777' }}>
                T:{uiState.timeToCollision ? uiState.timeToCollision.toFixed(1) : 'N/A'}
              </span>
              <span style={{ color: uiState.reactionInProgress ? '#4CAF50' : '#888' }}>
                {uiState.reactionInProgress ? '⚡' : '✅'}
              </span>
              <span style={{ color: uiState.isPlaying ? '#4CAF50' : '#ff5722' }}>
                {uiState.isPlaying ? '▶️' : '⏸️'}
              </span>
            </div>

            {/* Right side - Current reaction info and expand */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: responsive.isSmall ? '6px' : '8px',
              fontSize: responsive.isSmall ? '8px' : '9px'
            }}>
              <span style={{ color: '#888' }}>
                {uiState.activeTab === 'molecules' 
                  ? (uiState.substrateMolecule ? uiState.substrateMolecule.split('_')[1] : 'No mol')
                  : uiState.reactionType}
              </span>
              <span style={{ color: '#aaa' }}>
                {uiState.lastReaction !== 'None' ? uiState.lastReaction : 'Ready'}
              </span>
              <div 
                style={{ 
                  fontSize: responsive.isSmall ? '10px' : '12px', 
                  cursor: 'pointer',
                  color: '#4a90e2',
                  userSelect: 'none'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  updateUIState({ bottomBarExpanded: true });
                }}
              >
                ▲
              </div>
            </div>
          </div>
        )}

        {/* Information Panel - Only show when expanded */}
        <AnimatePresence>
          {uiState.bottomBarExpanded && (
            <motion.div 
              style={{ 
                order: responsive.bottomBarLayout === 'vertical' ? 3 : 2,
                flex: '1 1 auto',
                minWidth: responsive.isSmall ? '100%' : '200px',
                maxWidth: responsive.isSmall ? '100%' : '350px',
                overflow: 'auto',
                maxHeight: responsive.isSmall ? '80px' : '100px',
                fontSize: '11px',
                padding: '4px 8px'
              }}
              variants={responsive.animationVariants.infoPanel}
              animate="visible"
              initial="hidden"
              exit="hidden"
              key={uiState.activeTab} // Re-animate when tab changes
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${uiState.activeTab}-${uiState.reactionType}-${uiState.substrateMolecule}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {uiState.activeTab === 'molecules' ? renderMoleculeInfo() : renderReactionInfo()}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

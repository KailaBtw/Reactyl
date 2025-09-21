import type React from 'react';
import { useState, useEffect } from 'react';
import { useUIState } from '../context/UIStateContext';
import { ChemicalDataService } from '../../chemistry/chemicalDataService';

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
  const [reactionExplanations, setReactionExplanations] = useState<ReactionExplanations>({});
  const [isLoading, setIsLoading] = useState(true);
  const [moleculeInfo, setMoleculeInfo] = useState<MoleculeInfo | null>(null);
  const [isLoadingMolecule, setIsLoadingMolecule] = useState(false);
  const chemicalService = new ChemicalDataService();

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
    <div style={{
      flex: '0 0 300px',
      minWidth: '280px',
      maxWidth: '400px',
      height: '100%',
      padding: '12px',
      backgroundColor: 'rgba(30, 30, 30, 0.9)',
      borderRadius: '8px',
      border: '1px solid rgba(74, 144, 226, 0.3)',
      backdropFilter: 'blur(10px)',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {isLoadingMolecule ? (
        <div style={{ textAlign: 'center', color: '#888' }}>Loading molecule information...</div>
      ) : moleculeInfo ? (
        <>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: '#4a90e2', 
            marginBottom: '6px',
            borderBottom: '1px solid rgba(74, 144, 226, 0.2)',
            paddingBottom: '4px'
          }}>
            {moleculeInfo.name}
          </div>
          
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
            <strong>Formula:</strong> {moleculeInfo.formula}
          </div>
          
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
            <strong>Molecular Weight:</strong> {moleculeInfo.weight}
          </div>
          
          <div style={{ 
            fontSize: '11px', 
            color: '#888', 
            marginBottom: '10px', 
            wordBreak: 'break-all', 
            lineHeight: '1.3',
            overflowWrap: 'break-word',
            wordWrap: 'break-word'
          }}>
            <strong>SMILES:</strong> {moleculeInfo.smiles}
          </div>
          
          <div style={{ fontSize: '12px', color: '#ccc', lineHeight: '1.5', flex: 1 }}>
            <strong>Description:</strong><br />
            {moleculeInfo.description}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', color: '#888' }}>No molecule information available</div>
      )}
    </div>
  );

  // Render reaction information panel
  const renderReactionInfo = () => (
    <div style={{
      flex: '0 0 300px',
      minWidth: '280px',
      maxWidth: '400px',
      height: '100%',
      padding: '12px',
      backgroundColor: 'rgba(30, 30, 30, 0.9)',
      borderRadius: '8px',
      border: '1px solid rgba(74, 144, 226, 0.3)',
      backdropFilter: 'blur(10px)',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: 'bold', 
        color: '#4a90e2', 
        marginBottom: '6px',
        borderBottom: '1px solid rgba(74, 144, 226, 0.2)',
        paddingBottom: '4px'
      }}>
        {currentReaction.title}
      </div>
      
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
        <strong>Mechanism:</strong> {currentReaction.mechanism}
      </div>
      
      <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '12px', lineHeight: '1.5' }}>
        <strong>Description:</strong><br />
        {currentReaction.description}
      </div>
      
      <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '12px', flex: 1 }}>
        <strong>Key Features:</strong>
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px', lineHeight: '1.4' }}>
          {currentReaction.keyFeatures.map((feature, index) => (
            <li key={index} style={{ marginBottom: '4px' }}>{feature}</li>
          ))}
        </ul>
      </div>
      
      <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: 'auto' }}>
        <strong>Substrate preference:</strong> {currentReaction.preference}
      </div>
    </div>
  );

  // Get the current panel title
  const getPanelTitle = () => {
    if (uiState.activeTab === 'molecules') {
      return moleculeInfo ? `Molecule: ${moleculeInfo.name}` : 'Molecule Information';
    } else {
      return currentReaction ? currentReaction.title : 'Reaction Information';
    }
  };

  return (
    <div className={`bottom-bar ${uiState.bottomBarExpanded ? 'expanded' : ''}`}>
      <div className="bottom-bar-header">
        <div className="bottom-bar-title">{getPanelTitle()}</div>
        <button 
          className="expand-button"
          onClick={() => updateUIState({ bottomBarExpanded: !uiState.bottomBarExpanded })}
          title={uiState.bottomBarExpanded ? 'Collapse (Ctrl/Cmd+B)' : 'Expand for more details (Ctrl/Cmd+B)'}
        >
          {uiState.bottomBarExpanded ? '▼' : '▲'}
        </button>
      </div>
      <div className="bottom-bar-content">
        {/* Left: Stats */}
        <div className="stats-grid" style={{ flex: '0 0 200px' }}>
          <div className="stat-item">
            <div className="stat-label">Distance</div>
            <div className="stat-value">{uiState.distance.toFixed(2)}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Relative Velocity</div>
            <div className="stat-value">{uiState.relativeVelocity.toFixed(2)} m/s</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Time to Collision</div>
            <div className="stat-value">
              {uiState.timeToCollision ? uiState.timeToCollision.toFixed(2) + 's' : 'N/A'}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Reaction Probability</div>
            <div className="stat-value">{uiState.reactionProbability.toFixed(1)}%</div>
          </div>
        </div>

        {/* Center: Reaction Status */}
        <div style={{ flex: 1, padding: '0 16px', minWidth: '180px', maxWidth: '300px' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Last Reaction:</strong> {uiState.lastReaction}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Products:</strong> {uiState.mainProduct} + {uiState.leavingGroup}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>{uiState.reactionEquation}</div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '12px', color: '#888' }}>
            <div>Status: {uiState.reactionInProgress ? '🔄 Reacting...' : '⏸️ Ready'}</div>
            <div>Simulation: {uiState.isPlaying ? '▶️ Running' : '⏸️ Paused'}</div>
          </div>
        </div>

        {/* Right: Dynamic Information Panel */}
        {uiState.activeTab === 'molecules' ? renderMoleculeInfo() : renderReactionInfo()}
      </div>
    </div>
  );
};

import type React from 'react';
import { useEffect } from 'react';
import { useUIState } from '../../context/UIStateContext';
import { threeJSBridge } from '../../bridge/ThreeJSBridge';
import { AVAILABLE_MOLECULES, DEFAULT_SUBSTRATE, DEFAULT_NUCLEOPHILE } from '../../constants/availableMolecules';

export const MoleculeSelection: React.FC = () => {
  const { uiState, updateUIState } = useUIState();

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
  }, []);

  const handleStartReaction = async () => {
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
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Substrate</label>
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
        <label className="form-label">Nucleophile</label>
        <select
          value={uiState.nucleophileMolecule}
          onChange={e => updateUIState({ nucleophileMolecule: e.target.value })}
          className="form-select"
        >
          <option value="">Select nucleophile...</option>
          {uiState.availableMolecules.map(mol => (
            <option key={mol} value={mol}>
              {mol}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Reaction Type</label>
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
      </div>

      <div className="form-group">
        <button
          className="btn btn-success"
          onClick={handleStartReaction}
          disabled={!uiState.substrateMolecule || !uiState.nucleophileMolecule || uiState.isPlaying}
        >
          Start Reaction Animation
        </button>
      </div>
    </div>
  );
};

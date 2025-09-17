import React from 'react';
import { useUIState } from '../../context/UIStateContext';

export const MoleculeSelection: React.FC = () => {
  const { uiState, updateUIState } = useUIState();

  const handleRefreshMolecules = () => {
    // This will be connected to the actual molecule manager
    console.log('Refreshing molecule list...');
    // For now, just add some demo molecules
    updateUIState({
      availableMolecules: ['demo_Methyl_bromide', 'demo_Methanol', 'demo_Water'],
      substrateMolecule: 'demo_Methyl_bromide',
      nucleophileMolecule: 'demo_Methanol'
    });
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Substrate</label>
        <select
          value={uiState.substrateMolecule}
          onChange={(e) => updateUIState({ substrateMolecule: e.target.value })}
          className="form-select"
        >
          <option value="">Select substrate...</option>
          {uiState.availableMolecules.map(mol => (
            <option key={mol} value={mol}>{mol}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Nucleophile</label>
        <select
          value={uiState.nucleophileMolecule}
          onChange={(e) => updateUIState({ nucleophileMolecule: e.target.value })}
          className="form-select"
        >
          <option value="">Select nucleophile...</option>
          {uiState.availableMolecules.map(mol => (
            <option key={mol} value={mol}>{mol}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <button 
          className="btn btn-secondary btn-small"
          onClick={handleRefreshMolecules}
        >
          🔄 Refresh Molecules
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">Reaction Type</label>
        <select
          value={uiState.reactionType}
          onChange={(e) => updateUIState({ reactionType: e.target.value })}
          className="form-select"
        >
          <option value="sn2">SN2 - Bimolecular Substitution</option>
          <option value="sn1">SN1 - Unimolecular Substitution</option>
          <option value="e2">E2 - Bimolecular Elimination</option>
          <option value="e1">E1 - Unimolecular Elimination</option>
        </select>
      </div>
    </div>
  );
};

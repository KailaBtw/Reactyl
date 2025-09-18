import type React from 'react';
import { useUIState } from '../../context/UIStateContext';

export const DebugControls: React.FC = () => {
  const { uiState, updateUIState } = useUIState();

  const handleClearScene = () => {
    console.log('Clearing scene...');
    // This will be connected to the actual scene clearing
    updateUIState({
      availableMolecules: [],
      substrateMolecule: '',
      nucleophileMolecule: '',
      lastReaction: 'None',
      mainProduct: 'None',
      leavingGroup: 'None',
      reactionEquation: 'No reaction yet',
    });
  };

  const handleGetPhysicsStats = () => {
    console.log('Getting physics stats...');
    // This will be connected to the actual physics engine
    alert('Physics stats logged to console');
  };

  const handleResetAll = () => {
    console.log('Resetting all...');
    updateUIState({
      isPlaying: false,
      timeScale: 1.0,
      temperature: 298,
      approachAngle: 180,
      impactParameter: 0.0,
      relativeVelocity: 5.0,
      substrateMolecule: '',
      nucleophileMolecule: '',
      availableMolecules: [],
      reactionType: 'sn2',
      reactionInProgress: false,
      testingMode: false,
      lastReaction: 'None',
      mainProduct: 'None',
      leavingGroup: 'None',
      reactionEquation: 'No reaction yet',
      showAxes: true,
      showStats: true,
      distance: 0,
      relativeVelocity: 0,
      timeToCollision: 0,
      reactionProbability: 0,
    });
  };

  const handleTestingMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUIState({ testingMode: e.target.checked });
  };

  return (
    <div>
      <div className="form-group">
        <button className="btn btn-danger btn-small" onClick={handleClearScene}>
          🗑️ Clear All Molecules
        </button>
      </div>

      <div className="form-group">
        <button className="btn btn-secondary btn-small" onClick={handleGetPhysicsStats}>
          📊 Physics Stats
        </button>
      </div>

      <div className="form-group">
        <button className="btn btn-secondary btn-small" onClick={handleResetAll}>
          🔄 Reset All
        </button>
      </div>

      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <input type="checkbox" checked={uiState.testingMode} onChange={handleTestingMode} />🧪
          Testing Mode (100% reaction probability)
        </label>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#1a1a1a',
          borderRadius: '4px',
        }}
      >
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Debug Info:</div>
        <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.4' }}>
          <div>Molecules: {uiState.availableMolecules.length}</div>
          <div>Reaction Type: {uiState.reactionType}</div>
          <div>UI State: {uiState.reactionInProgress ? 'Reacting' : 'Idle'}</div>
          <div>Testing Mode: {uiState.testingMode ? 'ON' : 'OFF'}</div>
        </div>
      </div>
    </div>
  );
};

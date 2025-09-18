import type React from 'react';
import { threeJSBridge } from '../../bridge/ThreeJSBridge';
import { useUIState } from '../../context/UIStateContext';

export const ReactionControls: React.FC = () => {
  const { uiState, updateUIState } = useUIState();

  const handleSetupCollision = async () => {
    if (!uiState.substrateMolecule || !uiState.nucleophileMolecule) {
      alert('Please select both substrate and nucleophile molecules');
      return;
    }

    console.log('Setting up collision...');
    try {
      await threeJSBridge.setupCollision();
      updateUIState({ reactionInProgress: false });
    } catch (error) {
      console.error('Error setting up collision:', error);
    }
  };

  const handleStartReaction = async () => {
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
  };

  const handleStopReaction = async () => {
    console.log('Stopping reaction...');
    try {
      await threeJSBridge.stopReaction();
      updateUIState({
        isPlaying: false,
        reactionInProgress: false,
      });
    } catch (error) {
      console.error('Error stopping reaction:', error);
    }
  };

  const handleRunDemo = async () => {
    console.log('Running reaction demo...');
    try {
      await threeJSBridge.startReactionAnimation();
      updateUIState({
        isPlaying: true,
        reactionInProgress: false,
        substrateMolecule: 'demo_Methyl_bromide',
        nucleophileMolecule: 'demo_Methanol',
        reactionType: 'sn2',
      });
    } catch (error) {
      console.error('Error running demo:', error);
    }
  };

  return (
    <div>
      <div className="form-group">
        <button
          className="btn btn-secondary"
          onClick={handleSetupCollision}
          disabled={!uiState.substrateMolecule || !uiState.nucleophileMolecule}
        >
          Setup Collision
        </button>
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

      <div className="form-group">
        <button
          className="btn btn-danger"
          onClick={handleStopReaction}
          disabled={!uiState.isPlaying}
        >
          Stop Reaction
        </button>
      </div>

      <div className="form-group">
        <button className="btn" onClick={handleRunDemo}>
          🎬 Run Demo
        </button>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#1a1a1a',
          borderRadius: '4px',
        }}
      >
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Status:</div>
        <div style={{ fontSize: '14px' }}>
          {uiState.reactionInProgress ? '🔄 Reacting...' : '⏸️ Ready'}
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
          Simulation: {uiState.isPlaying ? '▶️ Running' : '⏸️ Paused'}
        </div>
      </div>
    </div>
  );
};

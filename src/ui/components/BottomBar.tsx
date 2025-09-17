import React from 'react';
import { useUIState } from '../context/UIStateContext';

export const BottomBar: React.FC = () => {
  const { uiState } = useUIState();

  return (
    <div className="bottom-bar">
      <div className="bottom-bar-content">
        <div className="stats-grid">
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

        <div style={{ flex: 1, padding: '0 20px' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Last Reaction:</strong> {uiState.lastReaction}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Products:</strong> {uiState.mainProduct} + {uiState.leavingGroup}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {uiState.reactionEquation}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#888' }}>
            Status: {uiState.reactionInProgress ? '🔄 Reacting...' : '⏸️ Ready'}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            Simulation: {uiState.isPlaying ? '▶️ Running' : '⏸️ Paused'}
          </div>
        </div>
      </div>
    </div>
  );
};

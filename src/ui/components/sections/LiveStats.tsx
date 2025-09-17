import React from 'react';
import { useUIState } from '../../context/UIStateContext';

export const LiveStats: React.FC = () => {
  const { uiState } = useUIState();

  return (
    <div>
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

      <div style={{ marginTop: '16px' }}>
        <div className="form-group">
          <label className="form-label">Current Parameters</label>
          <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.4' }}>
            <div>Approach Angle: {uiState.approachAngle}°</div>
            <div>Impact Parameter: {uiState.impactParameter.toFixed(1)}</div>
            <div>Temperature: {uiState.temperature}K</div>
            <div>Time Scale: {uiState.timeScale.toFixed(1)}x</div>
          </div>
        </div>
      </div>
    </div>
  );
};

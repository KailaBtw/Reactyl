import React from 'react';
import { useUIState } from '../../context/UIStateContext';

export const CollisionParameters: React.FC = () => {
  const { uiState, updateUIState } = useUIState();

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Approach Angle (°)</label>
        <input
          type="range"
          min="0"
          max="360"
          value={uiState.approachAngle}
          onChange={(e) => updateUIState({ approachAngle: parseInt(e.target.value) })}
          className="form-range"
        />
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#888' }}>
          {uiState.approachAngle}°
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Impact Parameter</label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={uiState.impactParameter}
          onChange={(e) => updateUIState({ impactParameter: parseFloat(e.target.value) })}
          className="form-range"
        />
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#888' }}>
          {uiState.impactParameter.toFixed(1)}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Relative Velocity (m/s)</label>
        <input
          type="range"
          min="1"
          max="20"
          step="0.5"
          value={uiState.relativeVelocity}
          onChange={(e) => updateUIState({ relativeVelocity: parseFloat(e.target.value) })}
          className="form-range"
        />
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#888' }}>
          {uiState.relativeVelocity.toFixed(1)} m/s
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Temperature (K)</label>
        <input
          type="range"
          min="100"
          max="600"
          value={uiState.temperature}
          onChange={(e) => updateUIState({ temperature: parseInt(e.target.value) })}
          className="form-range"
        />
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#888' }}>
          {uiState.temperature}K
        </div>
      </div>
    </div>
  );
};

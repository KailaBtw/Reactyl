import type React from 'react';
import { useState } from 'react';
import { useUIState } from '../../context/UIStateContext';

export const CollisionParametersOverlay: React.FC = () => {
  const { uiState, updateUIState } = useUIState();
  const [isVisible, setIsVisible] = useState(true);

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUIState({ temperature: parseFloat(e.target.value) });
  };

  const handleApproachAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUIState({ approachAngle: parseFloat(e.target.value) });
  };

  const handleImpactParameterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUIState({ impactParameter: parseFloat(e.target.value) });
  };

  const handleRelativeVelocityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUIState({ relativeVelocity: parseFloat(e.target.value) });
  };

  if (!isVisible) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setIsVisible(true)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
          }}
        >
          ⚛️ Show Parameters
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '280px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '16px',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          ⚛️ Collision Parameters
        </div>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '3px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            color: '#fff',
            fontSize: '12px',
            marginBottom: '4px',
          }}
        >
          Temperature: {uiState.temperature}K
        </label>
        <input
          type="range"
          min="100"
          max="2000"
          step="10"
          value={uiState.temperature}
          onChange={handleTemperatureChange}
          style={{
            width: '100%',
            height: '6px',
            background: 'linear-gradient(to right, #4a90e2 0%, #f39c12 50%, #e74c3c 100%)',
            outline: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            WebkitAppearance: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            color: '#fff',
            fontSize: '12px',
            marginBottom: '4px',
          }}
        >
          Approach Angle: {uiState.approachAngle.toFixed(1)}°
        </label>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={uiState.approachAngle}
          onChange={handleApproachAngleChange}
          style={{
            width: '100%',
            height: '6px',
            background: 'linear-gradient(to right, #27ae60 0%, #f39c12 50%, #e74c3c 100%)',
            outline: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            WebkitAppearance: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            color: '#fff',
            fontSize: '12px',
            marginBottom: '4px',
          }}
        >
          Impact Parameter: {uiState.impactParameter.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.01"
          value={uiState.impactParameter}
          onChange={handleImpactParameterChange}
          style={{
            width: '100%',
            height: '6px',
            background: 'linear-gradient(to right, #27ae60 0%, #f39c12 50%, #e74c3c 100%)',
            outline: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            WebkitAppearance: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label
          style={{
            display: 'block',
            color: '#fff',
            fontSize: '12px',
            marginBottom: '4px',
          }}
        >
          Relative Velocity: {uiState.relativeVelocity.toFixed(1)} m/s
        </label>
        <input
          type="range"
          min="0"
          max="50"
          step="0.5"
          value={uiState.relativeVelocity}
          onChange={handleRelativeVelocityChange}
          style={{
            width: '100%',
            height: '6px',
            background: 'linear-gradient(to right, #27ae60 0%, #f39c12 50%, #e74c3c 100%)',
            outline: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            WebkitAppearance: 'none',
          }}
        />
      </div>

      <div
        style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#ccc',
          textAlign: 'center',
        }}
      >
        💡 Adjust parameters to control collision dynamics
      </div>
    </div>
  );
};

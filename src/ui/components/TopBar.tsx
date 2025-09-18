import type React from 'react';
import { threeJSBridge } from '../bridge/ThreeJSBridge';
import { useUIState } from '../context/UIStateContext';

export const TopBar: React.FC = () => {
  const { uiState, updateUIState } = useUIState();

  const handlePlayPause = () => {
    updateUIState({ isPlaying: !uiState.isPlaying });
  };

  const handleReset = () => {
    updateUIState({
      isPlaying: false,
      reactionInProgress: false,
      lastReaction: 'None',
      mainProduct: 'None',
      leavingGroup: 'None',
      reactionEquation: 'No reaction yet',
    });
  };

  const handleTimeScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUIState({ timeScale: parseFloat(e.target.value) });
  };

  const handleResetCamera = () => {
    const controls = threeJSBridge.getControls();
    const camera = threeJSBridge.getCamera();
    if (controls && camera) {
      // Reset to the same offset position as initial setup
      camera.position.set(15, 10, 20);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  };

  const handleAutoRotate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const controls = threeJSBridge.getControls();
    if (controls) {
      controls.autoRotate = e.target.checked;
    }
  };

  return (
    <div className="top-bar">
      <h1>🧪 MolMod - Molecular Modeler</h1>

      <div className="top-bar-controls">
        <div className="control-group">
          <button
            className={`btn ${uiState.isPlaying ? 'btn-danger' : 'btn-success'}`}
            onClick={handlePlayPause}
          >
            {uiState.isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          <button className="btn btn-secondary" onClick={handleReset}>
            ⏹️ Reset
          </button>
        </div>

        <div className="control-group">
          <label>Time Scale:</label>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={uiState.timeScale}
            onChange={handleTimeScaleChange}
            className="form-range"
          />
          <span style={{ minWidth: '40px', textAlign: 'center' }}>
            {uiState.timeScale.toFixed(1)}x
          </span>
        </div>

        <div className="control-group">
          <label>Temperature:</label>
          <input
            type="number"
            min="100"
            max="600"
            value={uiState.temperature}
            onChange={e => updateUIState({ temperature: parseInt(e.target.value) })}
            className="form-input"
            style={{ width: '80px' }}
          />
          <span>K</span>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={uiState.showAxes}
              onChange={e => updateUIState({ showAxes: e.target.checked })}
            />
            Show Axes
          </label>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={uiState.showStats}
              onChange={e => updateUIState({ showStats: e.target.checked })}
            />
            Show Stats
          </label>
        </div>

        <div className="control-group">
          <label>
            <input type="checkbox" onChange={handleAutoRotate} />🔄 Auto Rotate
          </label>
        </div>

        <div className="control-group">
          <button className="btn btn-secondary btn-small" onClick={handleResetCamera}>
            📷 Reset Camera
          </button>
        </div>
      </div>
    </div>
  );
};

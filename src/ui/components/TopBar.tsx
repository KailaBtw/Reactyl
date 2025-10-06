import type React from 'react';
import { threeJSBridge } from '../bridge/ThreeJSBridge';
import { useUIState } from '../context/UIStateContext';

export const TopBar: React.FC = () => {
  const { uiState, updateUIState } = useUIState();

  const handlePlayPause = async () => {
    try {
      if (!uiState.reactionInProgress) {
        await threeJSBridge.startReactionAnimation();
        updateUIState({ isPlaying: true, reactionInProgress: true });
      } else {
        updateUIState({ isPlaying: !uiState.isPlaying });
      }
    } catch (e) {
      // no-op UI level
    }
  };

  const handleReset = () => {
    // Soft reset flags; detailed scene reset remains on the sidebar button
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


  return (
    <div className="top-bar">
      <h1>MolMod - Molecular Modeler</h1>

      <div className="control-group" style={{ marginLeft: 'auto', gap: '6px' }}>
        <button className="pill-btn" onClick={handlePlayPause} title={uiState.isPlaying ? 'Pause' : 'Play'}>
          {uiState.isPlaying ? 'Pause' : 'Play'}
        </button>
        <button className="pill-btn" onClick={handleReset} title="Reset">
          Reset
        </button>
      </div>

      <div className="top-bar-controls">

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
            <input
              type="checkbox"
              checked={uiState.userTestMode}
              onChange={e => updateUIState({ userTestMode: e.target.checked })}
            />
            User Test Mode
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

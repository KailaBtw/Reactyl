import type React from 'react';
import { useUIState } from '../../context/UIStateContext';

export const ReactionProducts: React.FC = () => {
  const { uiState } = useUIState();

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Last Reaction</label>
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {uiState.lastReaction}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Main Product</label>
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {uiState.mainProduct}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Leaving Group</label>
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {uiState.leavingGroup}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Reaction Equation</label>
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            lineHeight: '1.4',
          }}
        >
          {uiState.reactionEquation}
        </div>
      </div>

      <div className="form-group">
        <button
          className="btn btn-secondary btn-small"
          onClick={() => {
            // Clear products display
            // This will be connected to the actual reaction system
            console.log('Clearing products display...');
          }}
        >
          Clear Products
        </button>
      </div>
    </div>
  );
};

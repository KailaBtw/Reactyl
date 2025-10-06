import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useUIState } from '../context/UIStateContext';
import { useResponsive } from '../hooks/useResponsive';
import { threeJSBridge } from '../bridge/ThreeJSBridge';
import { sceneBridge } from '../../services/SceneBridge';
import { SmartInfoBubble } from './common/SmartInfoBubble';
import type { ReactionType } from './common/InfoBubbleContent';

interface MobileReactionBarProps {}

export const MobileReactionBar: React.FC<MobileReactionBarProps> = () => {
  const { uiState, updateUIState } = useUIState();
  const responsive = useResponsive();
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show on mobile devices
  if (!responsive.needsReactionBar) {
    return null;
  }

  const handleStartReaction = async () => {
    if (!uiState.reactionInProgress) {
      if (!uiState.substrateMolecule || !uiState.nucleophileMolecule) {
        alert('Please select both substrate and nucleophile molecules first');
        return;
      }

      console.log('🚀 Starting mobile reaction...');
      try {
        await threeJSBridge.startReactionAnimation();
        updateUIState({
          reactionInProgress: true,
          isPlaying: true
        });
      } catch (error) {
        console.error('Error starting reaction animation:', error);
      }
    } else {
      // Toggle play/pause
      updateUIState({ isPlaying: !uiState.isPlaying });
    }
  };

  const handleReset = () => {
    console.log('🔄 Mobile reset...');
    
    // Clear any running reaction monitoring intervals
    const sn2ReactionSystem = (window as any).sn2ReactionSystem;
    if (sn2ReactionSystem && sn2ReactionSystem.clearAllIntervals) {
      sn2ReactionSystem.clearAllIntervals();
    }
    
    // Use the new clear method from ThreeJSBridge
    threeJSBridge.clear();
    
    updateUIState({
      isPlaying: false,
      reactionInProgress: false,
      lastReaction: 'None',
      mainProduct: 'None',
      leavingGroup: 'None',
      reactionEquation: 'No reaction yet',
      // Keep molecule selections so user can restart immediately
      // substrateMolecule: '',
      // nucleophileMolecule: ''
    });
    
    console.log('✅ Mobile reset completed - ready for new reaction');
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        opacity: { duration: 0.2 }
      }}
      style={{
        position: 'fixed',
        bottom: responsive.isVerticallyConstrained ? '45px' : '50px',
        left: 0,
        right: 0,
        backgroundColor: '#ff0000', // Bright red for debugging
        borderTop: '3px solid #ffff00', // Yellow border for visibility
        zIndex: 1000,
        pointerEvents: 'auto',
        boxShadow: '0 -4px 20px rgba(255, 0, 0, 0.5)' // Red glow
      }}
    >
      {/* Header */}
      <div 
        className="mobile-reaction-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: isExpanded ? '1px solid #333' : 'none',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
          Reactions
        </span>
        <span
          style={{ 
            fontSize: '12px',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          ▲
        </span>
      </div>

      {/* Expandable Content */}
      <motion.div
        initial={false}
        animate={{ 
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
          scale: isExpanded ? 1 : 0.95
        }}
        transition={{ 
          type: "spring",
          stiffness: 400,
          damping: 25,
          height: { duration: 0.3, ease: "easeOut" },
          opacity: { duration: 0.2, delay: isExpanded ? 0.1 : 0 },
          scale: { duration: 0.2, delay: isExpanded ? 0.1 : 0 }
        }}
        style={{ 
          overflow: 'hidden',
          pointerEvents: isExpanded ? 'auto' : 'none',
          transformOrigin: 'top center'
        }}
      >
        <div style={{ padding: isExpanded ? '16px' : '0 16px' }}>
          {/* Reaction Type Selection */}
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Reaction Type</label>
              <SmartInfoBubble term="leaving_group" reactionType={uiState.reactionType as ReactionType} />
            </div>
            <select 
              className="form-control"
              value={uiState.reactionType}
              onChange={(e) => updateUIState({ reactionType: e.target.value as ReactionType })}
            >
              <option value="sn2">SN2 - Bimolecular Nucleophilic Substitution</option>
              <option value="sn1">SN1 - Unimolecular Nucleophilic Substitution</option>
              <option value="e2">E2 - Bimolecular Elimination</option>
              <option value="e1">E1 - Unimolecular Elimination</option>
            </select>
          </div>

          {/* Molecule Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Substrate</label>
                <SmartInfoBubble term="substrate" reactionType={uiState.reactionType as ReactionType} />
              </div>
              <select 
                className="form-control"
                value={uiState.substrateMolecule}
                onChange={(e) => updateUIState({ substrateMolecule: e.target.value })}
              >
                <option value="">Select substrate...</option>
                {uiState.availableMolecules.map((mol) => (
                  <option key={mol} value={mol}>
                    {mol}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {uiState.reactionType === 'e1' || uiState.reactionType === 'e2' ? 'Base' : 'Nucleophile'}
                </label>
                <SmartInfoBubble 
                  term={uiState.reactionType === 'e1' || uiState.reactionType === 'e2' ? 'base' : 'nucleophile'} 
                  reactionType={uiState.reactionType as ReactionType} 
                />
              </div>
              <select 
                className="form-control"
                value={uiState.nucleophileMolecule}
                onChange={(e) => updateUIState({ nucleophileMolecule: e.target.value })}
              >
                <option value="">Select {uiState.reactionType === 'e1' || uiState.reactionType === 'e2' ? 'base' : 'nucleophile'}...</option>
                {uiState.availableMolecules.map((mol) => (
                  <option key={mol} value={mol}>
                    {mol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${
                !uiState.reactionInProgress ? 'btn-success' : 
                uiState.isPlaying ? 'btn-danger' : 'btn-success'
              }`}
              onClick={handleStartReaction}
              disabled={!uiState.substrateMolecule || !uiState.nucleophileMolecule}
              style={{ flex: 1 }}
            >
              {!uiState.reactionInProgress ? 'Start Reaction' : 
               uiState.isPlaying ? 'Pause' : 'Play'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleReset}
              style={{ flex: '0 0 auto' }}
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

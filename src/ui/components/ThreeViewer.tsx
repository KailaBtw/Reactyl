import React, { forwardRef, useEffect, useRef } from 'react';
import { threeJSBridge } from '../bridge/ThreeJSBridge';
import { useUIState } from '../context/UIStateContext';
import { MoleculeColorLegend } from './MoleculeColorLegend';
import type { UIState } from '../App';

interface ThreeViewerProps {
  backgroundColor?: string;
  theme?: string;
  themeClasses?: any;
}

export const ThreeViewer = forwardRef<HTMLDivElement, ThreeViewerProps>(({ 
  backgroundColor = '#1a1a1a',
  theme = 'blue',
  themeClasses
}, ref) => {
  const { uiState } = useUIState();
  const animationIdRef = useRef<number | null>(null);
  const isInitialized = useRef(false);
  const previousUIStateRef = useRef<UIState | null>(null);

  useEffect(() => {
    if (!ref || typeof ref === 'function') return;

    const container = ref.current;
    if (!container) return;

    // Only initialize if not already done (preserve user's work on hot reload)
    if (!isInitialized.current) {
      threeJSBridge.initializeScene(container);
      isInitialized.current = true;
    }

    // Optimized animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      threeJSBridge.render();
    };

    // Start animation loop
    animate();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [ref]);

  // Update background color when prop changes
  useEffect(() => {
    // Use a method to set background color instead of accessing private scene
    threeJSBridge.setBackgroundColor(backgroundColor);
  }, [backgroundColor]);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('ThreeViewer mounted, threeJSBridge:', threeJSBridge);
  }, []);

  // Handle UI state changes (your existing logic)
  useEffect(() => {
    if (!previousUIStateRef.current) {
      previousUIStateRef.current = uiState;
      return;
    }

    const prevState = previousUIStateRef.current;
    const currentState = uiState;

    // Handle state changes that affect the 3D scene
    if (prevState.isPlaying !== currentState.isPlaying) {
      if (currentState.isPlaying) {
        threeJSBridge.startReactionAnimation();
      } else {
        threeJSBridge.pauseReactionAnimation();
      }
    }

    // Update the ThreeJSBridge with all UI state changes (including timeScale, showAxes, showStats)
    threeJSBridge.updateFromUIState(currentState, prevState);

    // Update previous state
    previousUIStateRef.current = currentState;
  }, [uiState]);

      return (
        <div 
          ref={ref} 
          className="w-full h-full relative"
          style={{ background: backgroundColor }} // Fallback while Three.js loads
        >
          <MoleculeColorLegend theme={theme} themeClasses={themeClasses} />
        </div>
      );
});

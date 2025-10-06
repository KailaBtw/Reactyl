import type React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BottomBar } from './components/BottomBar';
import { MobileReactionBar } from './components/MobileReactionBar';
import { RightSidebar } from './components/RightSidebar';
import { SceneContainer } from './components/SceneContainer';
import { TopBar } from './components/TopBar';
import { UIStateProvider } from './context/UIStateContext';
import './App.css';

export interface UIState {
  // Time controls
  isPlaying: boolean;
  timeScale: number;

  // Environment
  temperature: number;

  // Collision parameters
  approachAngle: number;
  impactParameter: number;
  relativeVelocity: number;

  // Molecules
  substrateMolecule: string;
  nucleophileMolecule: string;
  availableMolecules: string[];

  // Reaction
  reactionType: string;
  reactionInProgress: boolean;
  testingMode: boolean;

  // Products display
  lastReaction: string;
  mainProduct: string;
  leavingGroup: string;
  reactionEquation: string;

  // Scene controls
  showAxes: boolean;
  showStats: boolean;
  userTestMode: boolean;
  activeTab: 'molecules' | 'reactions' | 'debug';
  bottomBarExpanded: boolean;

  // Physics stats
  distance: number;
  timeToCollision: number;
  reactionProbability: number;
}

// Helper function to determine if screen is large enough for expanded bottom bar
const getInitialBottomBarState = (): boolean => {
  if (typeof window === 'undefined') return false; // SSR safety
  return window.innerWidth >= 768; // Expanded on tablet and desktop
};

const initialState: UIState = {
  isPlaying: false,
  timeScale: 1.0,
  temperature: 298,
  approachAngle: 180,
  impactParameter: 0.0,
  relativeVelocity: 5.0,
  substrateMolecule: '',
  nucleophileMolecule: '',
  availableMolecules: [],
  reactionType: 'sn2',
  reactionInProgress: false,
  testingMode: true,
  lastReaction: 'None',
  mainProduct: 'None',
  leavingGroup: 'None',
  reactionEquation: 'No reaction yet',
  showAxes: true,
  showStats: true,
  userTestMode: true,
  activeTab: 'molecules',
  bottomBarExpanded: getInitialBottomBarState(),
  distance: 0,
  timeToCollision: 0,
  reactionProbability: 0,
};

export const App: React.FC = () => {
  const [uiState, setUIState] = useState<UIState>(initialState);
  const sceneRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (sceneRef.current && !threeSceneRef.current) {
      // This will be handled by the SceneContainer component
      console.log('Scene container ready for Three.js initialization');
    }
  }, []);

  const updateUIState = useCallback((updates: Partial<UIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  }, []);

  // Expose updateUIState and uiState globally for non-React components
  useEffect(() => {
    (window as any).updateUIState = updateUIState;
    (window as any).uiState = uiState;
    return () => {
      delete (window as any).updateUIState;
      delete (window as any).uiState;
    };
  }, [updateUIState, uiState]);

  // Handle window resize to adjust bottom bar state
  useEffect(() => {
    const handleResize = () => {
      const shouldBeExpanded = window.innerWidth >= 768;
      if (shouldBeExpanded !== uiState.bottomBarExpanded) {
        updateUIState({ bottomBarExpanded: shouldBeExpanded });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [uiState.bottomBarExpanded]);

  return (
    <UIStateProvider value={{ uiState, updateUIState }}>
      <div className="app">
        <TopBar />
        <div className="main-content">
          <div className="scene-area" style={{ position: 'relative' }}>
            <SceneContainer ref={sceneRef} />
          </div>
          <RightSidebar />
        </div>
        <MobileReactionBar />
        <BottomBar />
      </div>
    </UIStateProvider>
  );
};

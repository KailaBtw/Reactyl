import type React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MainLayout } from './components/MainLayout';
import { UIStateProvider } from './context/UIStateContext';
import { threeJSBridge } from './bridge/ThreeJSBridge';
// import './App.css'; // Temporarily disabled to fix layout conflicts

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
  relativeVelocity: 150.0,
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

  // Map UIState to MainLayout props
  const mainLayoutProps = {
    currentReaction: uiState.reactionType,
    substrate: uiState.substrateMolecule,
    nucleophile: uiState.nucleophileMolecule,
    attackAngle: uiState.approachAngle,
    isPlaying: uiState.isPlaying,
    timeScale: uiState.timeScale,
    relativeVelocity: uiState.relativeVelocity || 150.0,
    temperature: uiState.temperature || 298,
    distance: uiState.distance,
    onReactionChange: (reaction: string) => updateUIState({ reactionType: reaction }),
    onSubstrateChange: (substrate: string) => updateUIState({ substrateMolecule: substrate }),
    onNucleophileChange: (nucleophile: string) => updateUIState({ nucleophileMolecule: nucleophile }),
    onAttackAngleChange: (angle: number) => {
      console.log('Attack angle changed:', angle);
      updateUIState({ approachAngle: angle });
    },
    onTimeScaleChange: (scale: number) => updateUIState({ timeScale: scale }),
    onRelativeVelocityChange: (value: number) => updateUIState({ relativeVelocity: value }),
    onTemperatureChange: (value: number) => updateUIState({ temperature: value }),
    onPlay: () => {
      console.log('Play button clicked');
      updateUIState({ isPlaying: true });
    },
    onPause: () => {
      console.log('Pause button clicked');
      updateUIState({ isPlaying: false });
    },
    onReset: () => {
      console.log('Reset button clicked');
      // Call your existing reset logic
      threeJSBridge.clear();
      updateUIState({ 
        isPlaying: false, 
        reactionInProgress: false,
        distance: 0,
        timeToCollision: 0
      });
    },
  };

  return (
    <UIStateProvider value={{ uiState, updateUIState }}>
      <MainLayout {...mainLayoutProps} />
    </UIStateProvider>
  );
};

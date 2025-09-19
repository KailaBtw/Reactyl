import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BottomBar } from './components/BottomBar';
import { CollisionParametersOverlay } from './components/overlays/CollisionParametersOverlay';
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

  // Physics stats
  distance: number;
  timeToCollision: number;
  reactionProbability: number;
}

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

  const updateUIState = (updates: Partial<UIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  };

  return (
    <UIStateProvider value={{ uiState, updateUIState }}>
      <div className="app">
        <TopBar />
        <div className="main-content">
          <div className="scene-area" style={{ position: 'relative' }}>
            <SceneContainer ref={sceneRef} />
            <CollisionParametersOverlay />
          </div>
          <RightSidebar />
        </div>
        <BottomBar />
      </div>
    </UIStateProvider>
  );
};

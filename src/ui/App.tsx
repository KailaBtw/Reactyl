import React, { useState, useEffect, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { RightSidebar } from './components/RightSidebar';
import { BottomBar } from './components/BottomBar';
import { SceneContainer } from './components/SceneContainer';
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
  
  // Products display
  lastReaction: string;
  mainProduct: string;
  leavingGroup: string;
  reactionEquation: string;
  
  // Scene controls
  showAxes: boolean;
  showStats: boolean;
  
  // Physics stats
  distance: number;
  relativeVelocity: number;
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
  lastReaction: 'None',
  mainProduct: 'None',
  leavingGroup: 'None',
  reactionEquation: 'No reaction yet',
  showAxes: true,
  showStats: true,
  distance: 0,
  relativeVelocity: 0,
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
          <div className="scene-area">
            <SceneContainer ref={sceneRef} />
          </div>
          <RightSidebar />
        </div>
        <BottomBar />
      </div>
    </UIStateProvider>
  );
};

import type React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MainLayout } from './components/MainLayout';
import { UIStateProvider } from './context/UIStateContext';
import { threeJSBridge } from './bridge/ThreeJSBridge';
import { reactionEventBus } from '../events/ReactionEventBus';
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
  autoplay: boolean;
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
  approachAngle: 100,
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
  autoplay: false,
};

export const App: React.FC = () => {
  const [uiState, setUIState] = useState<UIState>(initialState);
  const sceneRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const autoplayTimeoutRef = useRef<number | null>(null);

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

  // Autoplay: restart shortly after a collision if enabled and not paused
  useEffect(() => {
    const handler = (_event: any) => {
      if (!uiState.autoplay) return;
      if (!uiState.isPlaying) return;
      // Delay after collision before restarting
      const delayMs = 1500;
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
      }
      autoplayTimeoutRef.current = window.setTimeout(async () => {
        try {
          threeJSBridge.clear();
          await threeJSBridge.startReactionAnimation();
          updateUIState({ isPlaying: true, reactionInProgress: true });
        } catch (err) {
          console.error('Autoplay restart failed:', err);
        }
      }, delayMs);
    };
    reactionEventBus.on('collision-detected', handler);
    return () => reactionEventBus.off('collision-detected', handler);
  }, [uiState.autoplay, uiState.isPlaying, updateUIState]);

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
    autoplay: uiState.autoplay,
    onAutoplayChange: async (enabled: boolean) => {
      updateUIState({ autoplay: enabled });
      if (enabled) {
        try {
          if (!uiState.reactionInProgress) {
            await threeJSBridge.startReactionAnimation();
            updateUIState({ isPlaying: true, reactionInProgress: true });
          } else if (!uiState.isPlaying) {
            threeJSBridge.clear();
            await threeJSBridge.startReactionAnimation();
            updateUIState({ isPlaying: true, reactionInProgress: true });
          }
        } catch (e) {
          console.error('Failed to start autoplay run:', e);
        }
      } else {
        if (autoplayTimeoutRef.current) {
          clearTimeout(autoplayTimeoutRef.current);
          autoplayTimeoutRef.current = null;
        }
      }
    },
    onPlay: async () => {
      console.log('Play button clicked');
      try {
        if (!uiState.reactionInProgress) {
          await threeJSBridge.startReactionAnimation();
          updateUIState({ isPlaying: true, reactionInProgress: true });
        } else {
          // If paused with an existing reaction, clear and restart to avoid overlap
          threeJSBridge.clear();
          await threeJSBridge.startReactionAnimation();
          updateUIState({ isPlaying: true, reactionInProgress: true });
        }
      } catch (e) {
        console.error('Error handling Play:', e);
      }
    },
    onPause: () => {
      console.log('Pause button clicked');
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
        autoplayTimeoutRef.current = null;
      }
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

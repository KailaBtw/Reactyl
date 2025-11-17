import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { reactionEventBus } from '../events/ReactionEventBus';
import { concentrationToParticleCount } from '../utils/concentrationConverter';
import { threeJSBridge } from './bridge/ThreeJSBridge';
import { MainLayout } from './components/MainLayout';
import { AutoplayManager } from './components/AutoplayManager';
import {
  AVAILABLE_MOLECULES,
  DEFAULT_NUCLEOPHILE,
  DEFAULT_SUBSTRATE,
} from './constants/availableMolecules';
import { UIStateProvider } from './context/UIStateContext';
import { calculateAngleProbability } from './utils/angleProbability';
import { calculateActivationEnergy } from './utils/thermodynamicCalculator';
import { energyFromVelocityScaled } from './utils/kineticEnergyScaling';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
import { workerManager } from '../services/workerManager';
// import './App.css'; // Temporarily disabled to fix layout conflicts

export interface UIState {
  // Simulation mode
  simulationMode: 'molecule' | 'single' | 'rate'; // Single molecule search, single collision vs reaction rate

  // Time controls
  isPlaying: boolean;
  timeScale: number;

  // Environment
  temperature: number;
  pressure: number; // Pressure in atm (not used in rate mode - reactions are in solution)

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

  // Reaction rate metrics (for rate mode)
  concentration: number; // Concentration in mol/L (0.001 - 10 mol/L)
  particleCount: number; // Number of molecules in rate simulation (calculated from concentration)
  reactionRate: number; // Successful reactions per second
  remainingReactants: number; // Percentage of reactants remaining
  productsFormed: number; // Count of products formed
}

// Helper function to determine if screen is large enough for expanded bottom bar
const getInitialBottomBarState = (): boolean => {
  if (typeof window === 'undefined') return false; // SSR safety
  return window.innerWidth >= 768; // Expanded on tablet and desktop
};

const initialState: UIState = {
  simulationMode: 'single', // Start in single collision mode
  isPlaying: false,
  timeScale: 0.8,
  temperature: 298,
  pressure: 1.0, // Standard pressure: 1 atm
  approachAngle: 100,
  impactParameter: 0.0,
  relativeVelocity: 150.0,
  substrateMolecule: DEFAULT_SUBSTRATE,
  nucleophileMolecule: DEFAULT_NUCLEOPHILE,
  availableMolecules: [...AVAILABLE_MOLECULES],
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
  autoplay: true, // Default to autoplay in single collision mode
  concentration: 0.1, // Default concentration: 0.1 mol/L
  particleCount: 20, // Will be calculated from concentration when needed
  reactionRate: 0,
  remainingReactants: 100,
  productsFormed: 0,
};

export const App: React.FC = () => {
  const [uiState, setUIState] = useState<UIState>(initialState);
  const sceneRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (sceneRef.current && !threeSceneRef.current) {
      // This will be handled by the SceneContainer component
    }
  }, []);

  const updateUIState = useCallback((updates: Partial<UIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    workerManager.enableChemistryWorker().catch(error => {
      console.warn('[UI] Failed to enable chemistry worker:', error);
    });
  }, []);

  const handleAttackAngleChange = useCallback(
    (angle: number) => {
      updateUIState({ approachAngle: angle });
    },
    [updateUIState]
  );

  const handleRelativeVelocityChange = useCallback(
    (value: number) => {
      updateUIState({ relativeVelocity: value });
    },
    [updateUIState]
  );

  const handleAutoplayChange = useCallback(
    (enabled: boolean) => {
      updateUIState({ autoplay: enabled });
    },
    [updateUIState]
  );

  const handleReset = useCallback(async () => {
    if (uiState.simulationMode === 'rate') {
      threeJSBridge.stopRateSimulation();
      updateUIState({
        isPlaying: false,
        reactionInProgress: false,
        reactionRate: 0,
        remainingReactants: 100,
        productsFormed: 0,
      });
    } else {
      threeJSBridge.clear();
      updateUIState({
        isPlaying: false,
        reactionInProgress: false,
        distance: 0,
        timeToCollision: 0,
      });
    }
  }, [uiState.simulationMode, updateUIState]);

  const handlePlay = useCallback(async () => {
    try {
      if (uiState.simulationMode === 'rate') {
        const moleculeMapping: { [key: string]: { cid: string; name: string } } = {
          demo_Methyl_bromide: { cid: '6323', name: 'Methyl bromide' },
          demo_Hydroxide_ion: { cid: '961', name: 'Hydroxide ion' },
          demo_Methanol: { cid: '887', name: 'Methanol' },
          demo_Water: { cid: '962', name: 'Water' },
        };

        const substrateMolecule = moleculeMapping[uiState.substrateMolecule] || {
          cid: '6323',
          name: 'Methyl bromide',
        };
        const nucleophileMolecule = moleculeMapping[uiState.nucleophileMolecule] || {
          cid: '961',
          name: 'Hydroxide ion',
        };

        const particleCount = concentrationToParticleCount(uiState.concentration);
        await threeJSBridge.startRateSimulation(
          particleCount,
          uiState.temperature,
          uiState.reactionType,
          substrateMolecule,
          nucleophileMolecule
        );
        updateUIState({ isPlaying: true, reactionInProgress: true });
      } else {
        if (uiState.reactionInProgress) {
          threeJSBridge.clear();
        }
        await threeJSBridge.startReactionAnimation();
        updateUIState({ isPlaying: true, reactionInProgress: true });
      }
    } catch (e) {
      console.error('Error handling Play:', e);
    }
  }, [
    uiState.simulationMode,
    uiState.reactionInProgress,
    uiState.substrateMolecule,
    uiState.nucleophileMolecule,
    uiState.concentration,
    uiState.temperature,
    uiState.reactionType,
    updateUIState,
  ]);

  const handlePause = useCallback(() => {
    updateUIState({ isPlaying: false });
  }, [updateUIState]);

  // Ensure autoplay state aligns with playback (start automatically when expected)
  useEffect(() => {
    if (uiState.simulationMode !== 'single') return;
    if (!uiState.autoplay) return;
    if (uiState.isPlaying || uiState.reactionInProgress) return;

    const startAutoplayRun = async () => {
      try {
        await threeJSBridge.startReactionAnimation();
        updateUIState({ isPlaying: true, reactionInProgress: true });
      } catch (err) {
        console.error('Failed to start autoplay run on mount:', err);
      }
    };

    startAutoplayRun();
  }, [
    uiState.simulationMode,
    uiState.autoplay,
    uiState.isPlaying,
    uiState.reactionInProgress,
    updateUIState,
  ]);

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

  // Continuously update reaction probability based on current parameters
  useEffect(() => {
    const calculateProbability = () => {
      const {
        approachAngle,
        relativeVelocity,
        temperature,
        reactionType,
        substrateMolecule,
        nucleophileMolecule,
      } = uiState;

      // Get activation energy for this specific molecule combination
      const activationEnergy = calculateActivationEnergy(
        substrateMolecule || 'demo_Methyl_bromide',
        nucleophileMolecule || 'demo_Hydroxide_ion',
        reactionType
      );

      // Calculate kinetic energy from velocity (kJ/mol) using visualization scaling
      const kineticEnergy = energyFromVelocityScaled(relativeVelocity, activationEnergy);

      // Apply temperature factor
      const temperatureFactor = Math.sqrt(temperature / 298);
      const adjustedKineticEnergy = kineticEnergy * temperatureFactor;

      // Get angle probability
      const angleResult = calculateAngleProbability(approachAngle, reactionType);

      const energyRatio = adjustedKineticEnergy / activationEnergy;

      // Smooth probability function that scales properly with energy
      let energyProbability = 0;
      if (energyRatio >= 1.0) {
        // Sufficient energy: high probability (95-100%)
        energyProbability = 0.95 + 0.05 * Math.min(1, (energyRatio - 1.0) / 0.5);
      } else if (energyRatio > 0) {
        // Arrhenius-like: probability increases exponentially with energy ratio
        // Using exp(-Ea/E) form, but inverted and scaled for 0-95% range
        // Lower energy = exponentially lower probability
        const scaledRatio = energyRatio / 1.0; // Normalize to max at 1.0
        // Use power curve: P ∝ (E/Ea)^n where n makes it steeper
        energyProbability = 0.95 * scaledRatio ** 2.5;
        // Cap at reasonable minimum for very low energies
        energyProbability = Math.max(0.001, energyProbability);
      } else {
        energyProbability = 0.001;
      }

      const overallProbability = energyProbability * angleResult.probability;
      const percentage = overallProbability * 100; // Convert to percentage

      // Always update to ensure it shows the calculated value
      updateUIState({ reactionProbability: percentage });
    };

    calculateProbability();
  }, [
    uiState.approachAngle,
    uiState.relativeVelocity,
    uiState.temperature,
    uiState.reactionType,
    uiState.substrateMolecule,
    uiState.nucleophileMolecule,
    updateUIState,
  ]);

  // Poll rate metrics when in rate mode
  useEffect(() => {
    if (uiState.simulationMode !== 'rate' || !uiState.isPlaying) {
      return;
    }

    const interval = setInterval(() => {
      const metrics = threeJSBridge.getRateMetrics();
      updateUIState({
        reactionRate: metrics.reactionRate,
        remainingReactants: metrics.remainingReactants,
        productsFormed: metrics.productsFormed,
        collisionCount: metrics.collisionCount,
        elapsedTime: metrics.elapsedTime,
      } as any);
    }, 500); // Update every 500ms - real-time updates

    return () => clearInterval(interval);
  }, [uiState.simulationMode, uiState.isPlaying, updateUIState]);

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
    onNucleophileChange: (nucleophile: string) =>
      updateUIState({ nucleophileMolecule: nucleophile }),
    onAttackAngleChange: handleAttackAngleChange,
    onTimeScaleChange: (scale: number) => updateUIState({ timeScale: scale }),
    onRelativeVelocityChange: handleRelativeVelocityChange,
    onTemperatureChange: (value: number) => updateUIState({ temperature: value }),
    autoplay: uiState.autoplay,
    onAutoplayChange: handleAutoplayChange,
    onPlay: handlePlay,
    onPause: handlePause,
    onReset: handleReset,
  };

  return (
    <UIStateProvider value={{ uiState, updateUIState }}>
      <AutoplayManager
        autoplay={uiState.autoplay}
        simulationMode={uiState.simulationMode}
        isPlaying={uiState.isPlaying}
        onReset={handleReset}
        onPlay={handlePlay}
      />
      <MainLayout {...mainLayoutProps} />
    </UIStateProvider>
  );
};

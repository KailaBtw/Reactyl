import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { reactionEventBus } from '../events/ReactionEventBus';
import { concentrationToParticleCount } from '../utils/concentrationConverter';
import { threeJSBridge } from './bridge/ThreeJSBridge';
import { MainLayout } from './components/MainLayout';
import {
  AVAILABLE_MOLECULES,
  DEFAULT_NUCLEOPHILE,
  DEFAULT_SUBSTRATE,
} from './constants/availableMolecules';
import { UIStateProvider } from './context/UIStateContext';
import { calculateAngleProbability } from './utils/angleProbability';
import { calculateActivationEnergy } from './utils/thermodynamicCalculator';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
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
  autoplay: false,
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
  const autoplayTimeoutRef = useRef<number | null>(null);
  const pendingParameterChangeRef = useRef<{ type: 'angle' | 'velocity'; value: number } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (sceneRef.current && !threeSceneRef.current) {
      // This will be handled by the SceneContainer component
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

  // Autoplay: restart shortly after a collision completes if enabled and not paused
  useEffect(() => {
    const handleRestart = () => {
      // Only restart in single mode
      if (uiState.simulationMode !== 'single') return;
      if (!uiState.autoplay) return;
      if (!uiState.isPlaying) return;
      
      // Delay after collision/reaction completes before restarting
      const delayMs = 1500;
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
      }
      autoplayTimeoutRef.current = window.setTimeout(async () => {
        try {
          // Apply any pending parameter changes before restarting
          if (pendingParameterChangeRef.current) {
            const pending = pendingParameterChangeRef.current;
            if (pending.type === 'angle') {
              updateUIState({ approachAngle: pending.value });
            } else if (pending.type === 'velocity') {
              updateUIState({ relativeVelocity: pending.value });
            }
            pendingParameterChangeRef.current = null;
          }
          
          threeJSBridge.clear();
          await threeJSBridge.startReactionAnimation();
          updateUIState({ isPlaying: true, reactionInProgress: true });
        } catch (err) {
          console.error('Autoplay restart failed:', err);
        }
      }, delayMs);
    };

    // Listen for reaction completion (successful reaction)
    const reactionHandler = (_event: any) => {
      // Only handle reactions in single mode
      if (uiState.simulationMode !== 'single') {
        return;
      }
      handleRestart();
    };
    
    // Listen for collision detection - only restart if no reaction occurred
    // (if reaction occurs, reaction-completed will handle restart)
    const collisionHandler = (event: any) => {
      // Only handle collisions in single mode
      if (uiState.simulationMode !== 'single') {
        return;
      }
      
      // Check if this collision resulted in a reaction
      const reactionOccurred = event.data?.reactionProbability === 1.0 || 
                               (event.data?.reactionProbability && event.data.reactionProbability > 0.95);
      
      // Wait a moment to see if a reaction starts (for cases where reaction is detected asynchronously)
      setTimeout(() => {
        const orchestrator = (window as any).reactionOrchestrator;
        const isReactionInProgress = orchestrator?.isReactionInProgress() || uiState.reactionInProgress;
        
        // Only restart if no reaction occurred (collision but no reaction)
        // If a reaction occurred, reaction-completed event will handle restart
        if (!isReactionInProgress && !reactionOccurred) {
          handleRestart();
        }
      }, 500); // Increased delay to ensure reaction detection completes
    };

    reactionEventBus.on('reaction-completed', reactionHandler);
    reactionEventBus.on('collision-detected', collisionHandler);
    
    return () => {
      reactionEventBus.off('reaction-completed', reactionHandler);
      reactionEventBus.off('collision-detected', collisionHandler);
    };
  }, [uiState.autoplay, uiState.isPlaying, uiState.reactionInProgress, uiState.simulationMode, updateUIState]);

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

      // Calculate kinetic energy from velocity
      const velocityScale = relativeVelocity / 500;
      const maxKineticEnergy = 40; // kJ/mol
      const kineticEnergy = velocityScale * maxKineticEnergy;

      // Apply temperature factor
      const temperatureFactor = Math.sqrt(temperature / 298);
      const adjustedKineticEnergy = kineticEnergy * temperatureFactor;

      // Get angle probability
      const angleResult = calculateAngleProbability(approachAngle, reactionType);

      // Get activation energy for this specific molecule combination
      const activationEnergy = calculateActivationEnergy(
        substrateMolecule || 'demo_Methyl_bromide',
        nucleophileMolecule || 'demo_Hydroxide_ion',
        reactionType
      );

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
    onAttackAngleChange: (angle: number) => {
      updateUIState({ approachAngle: angle });
      // Reset and restart simulation when approach angle changes (single collision mode only)
      if (uiState.isPlaying && uiState.simulationMode === 'single') {
        const orchestrator = (window as any).reactionOrchestrator;
        const isReactionInProgress = orchestrator?.isReactionInProgress() || uiState.reactionInProgress;
        
        if (isReactionInProgress && uiState.autoplay) {
          // Reaction in progress with autoplay - queue the change to apply after collision completes
          pendingParameterChangeRef.current = { type: 'angle', value: angle };
        } else {
          // No reaction in progress or autoplay disabled - reset immediately after debounce
          if ((window as any).angleChangeTimeout) {
            clearTimeout((window as any).angleChangeTimeout);
          }
          (window as any).angleChangeTimeout = setTimeout(async () => {
            try {
              threeJSBridge.clear();
              await threeJSBridge.startReactionAnimation();
              updateUIState({ isPlaying: true, reactionInProgress: true });
            } catch (e) {
              console.error('Failed to reset on angle change:', e);
            }
          }, 500);
        }
      }
    },
    onTimeScaleChange: (scale: number) => updateUIState({ timeScale: scale }),
    onRelativeVelocityChange: (value: number) => {
      updateUIState({ relativeVelocity: value });
      // If autoplay is active and simulation is playing, queue reset after collision completes
      if (uiState.autoplay && uiState.isPlaying && uiState.simulationMode === 'single') {
        const orchestrator = (window as any).reactionOrchestrator;
        const isReactionInProgress = orchestrator?.isReactionInProgress() || uiState.reactionInProgress;
        
        if (isReactionInProgress) {
          // Reaction in progress - queue the change to apply after collision completes
          pendingParameterChangeRef.current = { type: 'velocity', value: value };
        } else {
          // No reaction in progress - reset immediately after debounce
          if ((window as any).velocityChangeTimeout) {
            clearTimeout((window as any).velocityChangeTimeout);
          }
          (window as any).velocityChangeTimeout = setTimeout(async () => {
            try {
              threeJSBridge.clear();
              await threeJSBridge.startReactionAnimation();
              updateUIState({ isPlaying: true, reactionInProgress: true });
            } catch (e) {
              console.error('Failed to reset on velocity change:', e);
            }
          }, 500);
        }
      }
    },
    onTemperatureChange: (value: number) => updateUIState({ temperature: value }),
    autoplay: uiState.autoplay,
    onAutoplayChange: async (enabled: boolean) => {
      updateUIState({ autoplay: enabled });
      if (enabled) {
        // Only start autoplay in single mode
        if (uiState.simulationMode !== 'single') {
          return;
        }
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
      try {
        if (uiState.simulationMode === 'rate') {
          // Rate simulation mode
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

          // Calculate particle count from concentration
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
          // Single collision mode
          if (!uiState.reactionInProgress) {
            await threeJSBridge.startReactionAnimation();
            updateUIState({ isPlaying: true, reactionInProgress: true });
          } else {
            // If paused with an existing reaction, clear and restart to avoid overlap
            threeJSBridge.clear();
            await threeJSBridge.startReactionAnimation();
            updateUIState({ isPlaying: true, reactionInProgress: true });
          }
        }
      } catch (e) {
        console.error('Error handling Play:', e);
      }
    },
    onPause: () => {
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
        autoplayTimeoutRef.current = null;
      }

      if (uiState.simulationMode === 'rate') {
        // Rate simulation doesn't need special pause handling
        // Metrics polling will stop automatically when isPlaying = false
      }

      updateUIState({ isPlaying: false });
    },
    onReset: () => {
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
    },
  };

  return (
    <UIStateProvider value={{ uiState, updateUIState }}>
      <MainLayout {...mainLayoutProps} />
    </UIStateProvider>
  );
};

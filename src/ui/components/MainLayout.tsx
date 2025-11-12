import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { concentrationToParticleCount } from '../../utils/concentrationConverter';
import { threeJSBridge } from '../bridge/ThreeJSBridge';
import { useUIState } from '../context/UIStateContext';
import { calculateThermodynamicData } from '../utils/thermodynamicCalculator';
import { ControlsHelp } from './ControlsHelp';
import { SettingsModal } from './SettingsModal';
import { BottomEnergyPanel } from './sections/BottomEnergyPanel';
import { CompactLiveData } from './sections/CompactLiveData';
import { RateMetricsCard } from './sections/RateMetricsCard';
import { ReactionSetup } from './sections/ReactionSetup';
import { SimulationControls } from './sections/SimulationControls';
import { ThreeViewer } from './ThreeViewer';

interface MainLayoutProps {
  currentReaction: string;
  substrate: string;
  nucleophile: string;
  attackAngle: number;
  isPlaying: boolean;
  timeScale: number;
  relativeVelocity: number;
  temperature: number;
  onReactionChange: (reaction: string) => void;
  onSubstrateChange: (substrate: string) => void;
  onNucleophileChange: (nucleophile: string) => void;
  onAttackAngleChange: (angle: number) => void;
  onTimeScaleChange: (value: number) => void;
  onRelativeVelocityChange: (value: number) => void;
  onTemperatureChange: (value: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  autoplay: boolean;
  onAutoplayChange: (enabled: boolean) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentReaction,
  substrate,
  nucleophile,
  attackAngle,
  isPlaying,
  timeScale,
  relativeVelocity,
  temperature,
  onReactionChange,
  onSubstrateChange,
  onNucleophileChange,
  onAttackAngleChange,
  onTimeScaleChange,
  onRelativeVelocityChange,
  onTemperatureChange,
  onPlay,
  onPause,
  onReset,
  autoplay,
  onAutoplayChange,
}) => {
  const { uiState, updateUIState } = useUIState();
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uiTheme, setUITheme] = useState('blue');
  const sceneRef = useRef<HTMLDivElement>(null);

  // Debounce temperature updates to prevent lag
  const temperatureUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTemperatureRef = useRef<number | null>(null);

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Load from localStorage or default to 220px (narrower default)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarWidth');
      return saved ? parseInt(saved, 10) : 220;
    }
    return 220;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef<number>(0);
  const resizeStartWidthRef = useRef<number>(220);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (temperatureUpdateTimeoutRef.current) {
        clearTimeout(temperatureUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Sidebar resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = sidebarWidth;
  };

  useEffect(() => {
    if (!isResizing) return;

    let rafId: number | null = null;
    let pendingWidth: number | null = null;

    const updateWidth = () => {
      if (pendingWidth !== null) {
        setSidebarWidth(pendingWidth);
        pendingWidth = null;
      }
      rafId = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Drag left (toward center) = wider, drag right (away from center) = narrower
      // Handle is on left edge, so dragging left moves left edge left = wider sidebar
      const deltaX = resizeStartXRef.current - e.clientX;
      const maxWidth = Math.floor(window.innerWidth * 0.5);
      const newWidth = Math.max(200, Math.min(maxWidth, resizeStartWidthRef.current + deltaX));

      // Throttle updates using requestAnimationFrame to prevent flashing
      pendingWidth = newWidth;
      if (rafId === null) {
        rafId = requestAnimationFrame(updateWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (pendingWidth !== null) {
        setSidebarWidth(pendingWidth);
        localStorage.setItem('sidebarWidth', pendingWidth.toString());
      } else {
        localStorage.setItem('sidebarWidth', sidebarWidth.toString());
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isResizing, sidebarWidth]);

  // Get theme-based CSS classes
  const getThemeClasses = () => {
    switch (uiTheme) {
      case 'dark':
        return {
          background: 'bg-gray-900',
          card: 'bg-gray-800 border-gray-700',
          text: 'text-gray-50',
          textSecondary: 'text-gray-200',
          button:
            'bg-gray-700 hover:bg-gray-600 text-white border-gray-600 shadow-md hover:shadow-lg transition-all',
          input: 'bg-gray-700 border-gray-600 text-white',
        };
      case 'blue':
        return {
          background: 'bg-blue-50',
          card: 'bg-blue-100 border-blue-200',
          text: 'text-blue-900',
          textSecondary: 'text-blue-800', // Darker for better readability
          button:
            'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md hover:shadow-lg transition-all',
          input: 'bg-white border-blue-300 text-blue-900',
        };
      case 'green':
        return {
          background: 'bg-green-50',
          card: 'bg-green-100 border-green-200',
          text: 'text-green-900',
          textSecondary: 'text-green-800', // Darker for better readability
          button:
            'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md hover:shadow-lg transition-all',
          input: 'bg-white border-green-300 text-green-900',
        };
      case 'purple':
        return {
          background: 'bg-purple-50',
          card: 'bg-purple-100 border-purple-200',
          text: 'text-purple-900',
          textSecondary: 'text-purple-800', // Darker for better readability
          button:
            'bg-violet-600 hover:bg-violet-700 text-white border-violet-600 shadow-md hover:shadow-lg transition-all',
          input: 'bg-white border-purple-300 text-purple-900',
        };
      default: // light
        return {
          background: 'bg-gray-50',
          card: 'bg-white border-gray-200',
          text: 'text-gray-900',
          textSecondary: 'text-gray-700', // Darker for better readability
          button:
            'bg-gray-200 hover:bg-gray-300 text-gray-800 border-gray-300 shadow-sm hover:shadow-md transition-all',
          input: 'bg-white border-gray-300 text-gray-900',
        };
    }
  };

  const themeClasses = getThemeClasses();

  // Calculate thermodynamic data based on actual selected molecules
  const thermodynamicData = calculateThermodynamicData(
    substrate || 'demo_Methyl_bromide',
    nucleophile || 'demo_Hydroxide_ion',
    currentReaction
  );

  return (
    <div className={`h-screen flex flex-col font-sans ${themeClasses.background}`}>
      {/* Top Header Bar */}
      <header
        className={`flex justify-between items-center pl-2 pr-5 py-3 ${themeClasses.card} border-b shadow-sm min-h-[60px] flex-shrink-0`}
      >
        <div className="flex items-center gap-5">
          <img
            src={`${(import.meta as any).env.BASE_URL}Reactyl_small.png`}
            alt="Reactyl Logo"
            className="h-8 w-auto"
          />
          <h1 className={`text-xl font-semibold m-0 ${themeClasses.text}`}>Reactyl</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`w-9 h-9 border-0 rounded-md text-base cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500 ${themeClasses.button}`}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            ⚙
          </button>
          <button
            className={`w-9 h-9 border-0 rounded-md text-base cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500 ${themeClasses.button} hover:scale-105 active:scale-95`}
            onClick={() => setShowHelp(!showHelp)}
            title="Help"
          >
            ?
          </button>
        </div>
      </header>

      {/* Main Content Area - Full Height */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Content Area */}
        <div className="flex flex-col min-h-0" style={{ width: `calc(100% - ${sidebarWidth}px)` }}>
          {/* 3D Viewport */}
          <div
            className="flex-1 relative transition-colors duration-300 min-h-0"
            style={{ backgroundColor }}
          >
            <ThreeViewer
              ref={sceneRef}
              backgroundColor={backgroundColor}
              theme={uiTheme}
              themeClasses={themeClasses}
            />
          </div>

          {/* Bottom Panel - Show different cards based on simulation mode */}
          {uiState.simulationMode === 'single' ? (
            <BottomEnergyPanel
              thermodynamicData={{
                activationEnergy: thermodynamicData.activationEnergy,
                enthalpyOfFormation: thermodynamicData.enthalpyChange,
                reactantEnergy: thermodynamicData.reactantEnergy,
                productEnergy: thermodynamicData.productEnergy,
                transitionStateEnergy: thermodynamicData.transitionStateEnergy,
              }}
              isPlaying={isPlaying}
              themeClasses={themeClasses}
              reactionType={currentReaction}
              reactionProgress={0}
              currentVelocity={relativeVelocity}
              substrate={substrate}
              nucleophile={nucleophile}
              substrateMass={thermodynamicData.substrateMass}
              nucleophileMass={thermodynamicData.nucleophileMass}
              attackAngle={attackAngle}
              timeScale={timeScale}
              reactionProbability={uiState.reactionProbability}
            />
          ) : (
            <RateMetricsCard
              reactionRate={uiState.reactionRate}
              remainingReactants={uiState.remainingReactants}
              productsFormed={uiState.productsFormed || 0}
              collisionCount={(uiState as any).collisionCount || 0}
              elapsedTime={(uiState as any).elapsedTime || 0}
              themeClasses={themeClasses}
            />
          )}
        </div>

        {/* Right Control Panel - Resizable - Anchored to right edge */}
        <aside
          className={`border-l overflow-y-auto flex flex-col ${themeClasses.card} flex-shrink-0 absolute top-0 bottom-0`}
          style={{
            width: `${sidebarWidth}px`,
            maxWidth: '50%',
            right: 0,
            height: '100%',
          }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleResizeStart}
            className={`absolute left-0 top-0 bottom-0 w-2 z-10 transition-colors ${
              isResizing ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-400/50'
            }`}
            style={{ cursor: 'col-resize' }}
            title="Drag to resize sidebar"
          />
          <div className="flex-1 overflow-y-auto">
            <ReactionSetup
              currentReaction={currentReaction}
              substrate={substrate}
              nucleophile={nucleophile}
              attackAngle={attackAngle}
              relativeVelocity={relativeVelocity}
              temperature={temperature}
              simulationMode={uiState.simulationMode}
              concentration={uiState.concentration}
              onReactionChange={onReactionChange}
              onSubstrateChange={onSubstrateChange}
              onNucleophileChange={onNucleophileChange}
              onAttackAngleChange={onAttackAngleChange}
              onRelativeVelocityChange={onRelativeVelocityChange}
              onTemperatureChange={temp => {
                // Update UI state immediately for responsive slider
                onTemperatureChange(temp);

                // Debounce expensive physics updates (update velocities for all molecules)
                pendingTemperatureRef.current = temp;

                // Clear existing timeout
                if (temperatureUpdateTimeoutRef.current) {
                  clearTimeout(temperatureUpdateTimeoutRef.current);
                }

                // Only update physics after user stops dragging (300ms delay)
                temperatureUpdateTimeoutRef.current = setTimeout(() => {
                  const finalTemp = pendingTemperatureRef.current;
                  if (
                    finalTemp !== null &&
                    uiState.simulationMode === 'rate' &&
                    uiState.isPlaying
                  ) {
                    threeJSBridge.updateRateSimulationTemperature(finalTemp);
                  }
                  pendingTemperatureRef.current = null;
                }, 300);
              }}
              onSimulationModeChange={async mode => {
                const previousMode = uiState.simulationMode;
                updateUIState({ simulationMode: mode });
                // Animate camera when switching modes
                if (mode === 'rate') {
                  threeJSBridge.animateCameraToRateView();
                  // Auto-start rate simulation
                  try {
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
                  } catch (error) {
                    console.error('Failed to auto-start rate simulation:', error);
                  }
                } else {
                  threeJSBridge.animateCameraToSingleView();
                  // Always clear rate simulation when switching to single mode
                  if (previousMode === 'rate') {
                    threeJSBridge.stopRateSimulation();
                    updateUIState({ isPlaying: false, reactionInProgress: false });
                  }
                }
              }}
              onConcentrationChange={async conc => {
                const particleCount = concentrationToParticleCount(conc);
                updateUIState({ concentration: conc, particleCount });

                // If rate simulation is running, adjust concentration dynamically
                // Pass current temperature to ensure new molecules respect it
                if (uiState.simulationMode === 'rate' && uiState.isPlaying) {
                  try {
                    await threeJSBridge.adjustRateSimulationConcentration(
                      particleCount,
                      uiState.temperature
                    );
                  } catch (error) {
                    console.error('Failed to adjust concentration:', error);
                  }
                }
              }}
              themeClasses={themeClasses}
            />

            {/* Conditionally show metrics based on simulation mode - Rate mode metrics now in BottomBar */}
            {uiState.simulationMode === 'single' && (
              <CompactLiveData
                relativeVelocity={relativeVelocity}
                attackAngle={attackAngle}
                reactionProbability={uiState.reactionProbability}
                timeScale={timeScale}
                themeClasses={themeClasses}
              />
            )}

            <SimulationControls
              isPlaying={isPlaying}
              timeScale={timeScale}
              currentReaction={currentReaction}
              attackAngle={attackAngle}
              relativeVelocity={relativeVelocity}
              temperature={temperature}
              simulationMode={uiState.simulationMode}
              onPlay={onPlay}
              onPause={onPause}
              onReset={onReset}
              onTimeScaleChange={onTimeScaleChange}
              autoplay={autoplay}
              onAutoplayChange={onAutoplayChange}
              themeClasses={themeClasses}
            />
          </div>
        </aside>
      </div>

      {/* Collapsible Help */}
      <ControlsHelp isOpen={showHelp} onToggle={() => setShowHelp(!showHelp)} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        backgroundColor={backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        uiTheme={uiTheme}
        onUIThemeChange={setUITheme}
        uiColors={{
          primary: '#3b82f6',
          secondary: '#6b7280',
          accent: '#10b981',
          background: '#f9fafb',
        }}
        onUIColorChange={() => {}}
        showAxes={uiState.showAxes}
        onShowAxesChange={show => updateUIState({ showAxes: show })}
        showStats={uiState.showStats}
        onShowStatsChange={show => updateUIState({ showStats: show })}
      />
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { ControlsHelp } from './ControlsHelp';
import { ThreeViewer } from './ThreeViewer';
import { SettingsModal } from './SettingsModal';
import { ReactionSetup } from './sections/ReactionSetup';
import { SimulationControls } from './sections/SimulationControls';
import { BottomEnergyPanel } from './sections/BottomEnergyPanel';
import { useUIState } from '../context/UIStateContext';

interface MainLayoutProps {
  currentReaction: string;
  substrate: string;
  nucleophile: string;
  attackMode: string;
  impactParameter: number;
  isPlaying: boolean;
  timeScale: number;
  relativeVelocity: number;
  onReactionChange: (reaction: string) => void;
  onSubstrateChange: (substrate: string) => void;
  onNucleophileChange: (nucleophile: string) => void;
  onAttackModeChange: (mode: string) => void;
  onImpactParameterChange: (value: number) => void;
  onTimeScaleChange: (value: number) => void;
  onRelativeVelocityChange: (value: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentReaction,
  substrate,
  nucleophile,
  attackMode,
  impactParameter,
  isPlaying,
  timeScale,
  relativeVelocity,
  onReactionChange,
  onSubstrateChange,
  onNucleophileChange,
  onAttackModeChange,
  onImpactParameterChange,
  onTimeScaleChange,
  onRelativeVelocityChange,
  onPlay,
  onPause,
  onReset,
}) => {
  const { uiState, updateUIState } = useUIState();
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uiTheme, setUITheme] = useState('blue');
  const sceneRef = useRef<HTMLDivElement>(null);

  // Get theme-based CSS classes
  const getThemeClasses = () => {
    switch (uiTheme) {
      case 'dark':
        return {
          background: 'bg-gray-900',
          card: 'bg-gray-800 border-gray-700',
          text: 'text-gray-50',
          textSecondary: 'text-gray-200',
          button: 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600 shadow-md hover:shadow-lg transition-all',
          input: 'bg-gray-700 border-gray-600 text-white'
        };
      case 'blue':
        return {
          background: 'bg-blue-50',
          card: 'bg-blue-100 border-blue-200',
          text: 'text-blue-900',
          textSecondary: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md hover:shadow-lg transition-all',
          input: 'bg-white border-blue-300 text-blue-900'
        };
      case 'green':
        return {
          background: 'bg-green-50',
          card: 'bg-green-100 border-green-200',
          text: 'text-green-900',
          textSecondary: 'text-green-700',
          button: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md hover:shadow-lg transition-all',
          input: 'bg-white border-green-300 text-green-900'
        };
      case 'purple':
        return {
          background: 'bg-purple-50',
          card: 'bg-purple-100 border-purple-200',
          text: 'text-purple-900',
          textSecondary: 'text-purple-700',
          button: 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600 shadow-md hover:shadow-lg transition-all',
          input: 'bg-white border-purple-300 text-purple-900'
        };
      default: // light
        return {
          background: 'bg-gray-50',
          card: 'bg-white border-gray-200',
          text: 'text-gray-900',
          textSecondary: 'text-gray-600',
          button: 'bg-gray-200 hover:bg-gray-300 text-gray-800 border-gray-300 shadow-sm hover:shadow-md transition-all',
          input: 'bg-white border-gray-300 text-gray-900'
        };
    }
  };

  const themeClasses = getThemeClasses();


  // Thermodynamic data for energy profile
  const thermodynamicData = {
    activationEnergy: 45.2,
    enthalpyOfFormation: -23.1,
    reactantEnergy: 0,
    productEnergy: -23.1,
    transitionStateEnergy: 45.2
  };

  return (
    <div className={`h-screen flex flex-col font-sans ${themeClasses.background}`}>
      {/* Top Header */}
      <header className={`flex justify-between items-center px-5 py-3 ${themeClasses.card} border-b shadow-sm min-h-[60px]`}>
        <div className="flex items-center gap-5">
          <h1 className={`text-xl font-semibold m-0 ${themeClasses.text}`}>
            Reactyl
          </h1>
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
            className={`w-9 h-9 border-0 rounded-md text-base cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500 ${themeClasses.button}`}
            onClick={() => setShowHelp(!showHelp)}
            title="Help"
          >
            ?
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Content Area */}
        <div className="flex-1 flex flex-col">
          {/* 3D Viewport */}
          <div 
            className="flex-1 relative transition-colors duration-300" 
            style={{ backgroundColor }}
          >
            <ThreeViewer ref={sceneRef} backgroundColor={backgroundColor} theme={uiTheme} themeClasses={themeClasses} />
          </div>

          {/* Bottom Energy Panel - Only spans left area */}
          <BottomEnergyPanel 
            thermodynamicData={thermodynamicData}
            isPlaying={isPlaying}
            themeClasses={themeClasses}
            reactionType={currentReaction}
            reactionProgress={0}
            currentVelocity={relativeVelocity}
          />
        </div>

        {/* Right Control Panel */}
        <aside className={`w-80 border-l overflow-y-auto flex flex-col ${themeClasses.card} flex-shrink-0`}>
          <ReactionSetup
            currentReaction={currentReaction}
            substrate={substrate}
            nucleophile={nucleophile}
            attackMode={attackMode}
            impactParameter={impactParameter}
            timeScale={timeScale}
            relativeVelocity={relativeVelocity}
            onReactionChange={onReactionChange}
            onSubstrateChange={onSubstrateChange}
            onNucleophileChange={onNucleophileChange}
            onAttackModeChange={onAttackModeChange}
            onImpactParameterChange={onImpactParameterChange}
            onTimeScaleChange={onTimeScaleChange}
            onRelativeVelocityChange={onRelativeVelocityChange}
            themeClasses={themeClasses}
          />

          <SimulationControls
            isPlaying={isPlaying}
            onPlay={onPlay}
            onPause={onPause}
            onReset={onReset}
            themeClasses={themeClasses}
          />

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
        uiColors={{ primary: '#3b82f6', secondary: '#6b7280', accent: '#10b981', background: '#f9fafb' }}
        onUIColorChange={() => {}}
        showAxes={uiState.showAxes}
        onShowAxesChange={(show) => updateUIState({ showAxes: show })}
        showStats={uiState.showStats}
        onShowStatsChange={(show) => updateUIState({ showStats: show })}
      />
    </div>
  );
};

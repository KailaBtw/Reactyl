import React, { useState, useRef } from 'react';
import { ColorPicker } from './ColorPicker';
import { ControlsHelp } from './ControlsHelp';
import { EnergyProfile } from './EnergyProfile';
import { ScientificEnergyCurve } from './ScientificEnergyCurve';
import { ThreeViewer } from './ThreeViewer';
import { SettingsModal } from './SettingsModal';
import { ReactionSetup } from './sections/ReactionSetup';
import { SimulationControls } from './sections/SimulationControls';
import { LiveDataPanel } from './sections/LiveDataPanel';
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
  onReactionChange: (reaction: string) => void;
  onSubstrateChange: (substrate: string) => void;
  onNucleophileChange: (nucleophile: string) => void;
  onAttackModeChange: (mode: string) => void;
  onImpactParameterChange: (value: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onTimeScaleChange: (scale: number) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentReaction,
  substrate,
  nucleophile,
  attackMode,
  impactParameter,
  isPlaying,
  timeScale,
  onReactionChange,
  onSubstrateChange,
  onNucleophileChange,
  onAttackModeChange,
  onImpactParameterChange,
  onPlay,
  onPause,
  onReset,
  onTimeScaleChange,
}) => {
  const { uiState, updateUIState } = useUIState();
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [showHelp, setShowHelp] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
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
          text: 'text-gray-100',
          textSecondary: 'text-gray-300',
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
          background: 'bg-gray-100',
          card: 'bg-white border-gray-200',
          text: 'text-gray-800',
          textSecondary: 'text-gray-600',
          button: 'bg-gray-200 hover:bg-gray-300 text-gray-800 border-gray-300 shadow-sm hover:shadow-md transition-all',
          input: 'bg-white border-gray-300 text-gray-800'
        };
    }
  };

  const themeClasses = getThemeClasses();

  const liveData = {
    distance: 3.2, // TODO: Connect to actual physics distance
    velocity: 15.0, // TODO: Connect to actual physics velocity
    status: isPlaying ? 'Running' : 'Ready',
    probability: 75, // TODO: Connect to actual reaction probability
    timeToCollision: isPlaying ? 2.3 : 0 // TODO: Connect to actual collision timing
  };

  // Energy data - connect to your actual physics calculations
  const energyData = {
    activationEnergy: 45.2, // TODO: Get from reaction database
    reactionEnthalpy: -23.1, // TODO: Get from reaction database
    reactionProgress: isPlaying ? 65 : 0, // TODO: Calculate from actual reaction progress
    transitionStateEnergy: 45.2,
    currentEnergy: isPlaying ? 35.8 : 0, // TODO: Get from physics engine
    phase: isPlaying ? 
      (impactParameter < 0.3 ? 'transition' : 'approaching') : 
      'reactants' as const
  };

  // Scientific energy curve data - proper thermodynamic data structure
  const thermodynamicData = {
    reactantEnergy: 0,           // Starting energy level (reference point)
    productEnergy: -23.1,        // Final energy (enthalpy of formation)
    activationEnergy: 45.2,      // Activation energy barrier
    reactionProgress: isPlaying ? 0.65 : 0, // 0-1 scale for scientific curve
    temperature: 298.15          // Room temperature in Kelvin
  };


  return (
    <div className={`h-screen flex flex-col font-sans ${themeClasses.background}`}>
      {/* Top Header */}
      <header className={`flex justify-between items-center px-5 py-3 ${themeClasses.card} border-b shadow-sm min-h-[60px]`}>
        <div className="flex items-center gap-5">
          <h1 className={`text-xl font-semibold m-0 ${themeClasses.text}`}>
            🧪 Molecular Simulator
          </h1>
          <select 
            className={`text-base px-3 py-2 border rounded-md min-w-[250px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${themeClasses.input}`}
            value={currentReaction}
            onChange={(e) => onReactionChange(e.target.value)}
          >
            <option value="SN2">SN2 - Bimolecular Substitution</option>
            <option value="SN1">SN1 - Unimolecular Substitution</option>
            <option value="E2">E2 - Bimolecular Elimination</option>
          </select>
        </div>
            <div className="flex items-center gap-2">
              <button 
                className={`w-9 h-9 border-0 rounded-md text-base cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500 ${themeClasses.button}`}
                onClick={() => setShowSettings(true)}
                title="Settings"
              >
                ⚙️
              </button>
              <button 
                className={`w-9 h-9 border-0 rounded-md text-base cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500 ${themeClasses.button}`}
                onClick={() => setShowHelp(!showHelp)}
                title="Help"
              >
                ?
              </button>
              <div className={`text-sm font-medium px-3 py-1.5 rounded ${themeClasses.text}`}>
                Ready! ✅
              </div>
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
            <ThreeViewer ref={sceneRef} backgroundColor={backgroundColor} theme={uiTheme} />
          </div>

          {/* Bottom Energy Panel - Only spans left area */}
          <BottomEnergyPanel 
            thermodynamicData={thermodynamicData}
            isPlaying={isPlaying}
            themeClasses={themeClasses}
          />
        </div>

        {/* Right Control Panel */}
        <aside className={`w-80 border-l overflow-y-auto flex flex-col ${themeClasses.card} flex-shrink-0`}>
          {/* Reaction Setup Section */}
          <section className="p-5 border-b border-gray-100">
            <h3 className={`text-base font-semibold mb-4 flex items-center gap-2 ${themeClasses.text}`}>
              REACTION SETUP
            </h3>
            <div className="space-y-3">
              {/* Reaction Type */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-600">
                  Reaction Type:
                </label>
                <select 
                  value={currentReaction}
                  onChange={(e) => onReactionChange(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="sn2">SN2 - Bimolecular Substitution</option>
                  <option value="sn1">SN1 - Unimolecular Substitution</option>
                  <option value="e2">E2 - Bimolecular Elimination</option>
                  <option value="e1">E1 - Unimolecular Elimination</option>
                </select>
              </div>
              
              {/* Molecule Selection - Compact Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-500">
                    Substrate:
                  </label>
                  <select 
                    value={substrate}
                    onChange={(e) => onSubstrateChange(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="demo_Methyl_bromide">CH₃Br</option>
                    <option value="demo_Ethyl_iodide">C₂H₅I</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-500">
                    Nucleophile:
                  </label>
                  <select 
                    value={nucleophile}
                    onChange={(e) => onNucleophileChange(e.target.value)}
                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="demo_Hydroxide_ion">OH⁻</option>
                    <option value="demo_Cyanide_ion">CN⁻</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Attack Mode Section */}
          <section className="p-5 border-b border-gray-100">
            <h3 className={`text-base font-semibold mb-3 flex items-center gap-2 ${themeClasses.text}`}>
              🎯 ATTACK MODE
            </h3>
            <div className="space-y-3">
              {/* Attack Mode Buttons - Compact Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  className={`px-2 py-1.5 text-xs border rounded cursor-pointer transition-all font-medium ${
                    attackMode === 'backside' 
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm' 
                      : themeClasses.button
                  }`}
                  onClick={() => onAttackModeChange('backside')}
                >
                  Backside
                </button>
                <button 
                  className={`px-2 py-1.5 text-xs border rounded cursor-pointer transition-all font-medium ${
                    attackMode === 'front' 
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm' 
                      : themeClasses.button
                  }`}
                  onClick={() => onAttackModeChange('front')}
                >
                  Front
                </button>
                <button 
                  className={`px-2 py-1.5 text-xs border rounded cursor-pointer transition-all font-medium ${
                    attackMode === 'side' 
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm' 
                      : themeClasses.button
                  }`}
                  onClick={() => onAttackModeChange('side')}
                >
                  Side
                </button>
                <button 
                  className={`px-2 py-1.5 text-xs border rounded cursor-pointer transition-all font-medium ${
                    attackMode === 'glancing' 
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm' 
                      : themeClasses.button
                  }`}
                  onClick={() => onAttackModeChange('glancing')}
                >
                  Glancing
                </button>
                <button 
                  className={`px-2 py-1.5 text-xs border rounded cursor-pointer transition-all col-span-2 font-medium ${
                    attackMode === 'missed' 
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm' 
                      : themeClasses.button
                  }`}
                  onClick={() => onAttackModeChange('missed')}
                >
                  Missed
                </button>
              </div>
              
              {/* Impact Parameter and Speed - Side by Side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-500">
                    Impact: {impactParameter.toFixed(1)} Å
                  </label>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={impactParameter}
                    onChange={(e) => onImpactParameterChange(parseFloat(e.target.value))}
                    className="slider w-full h-1"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-500">
                    Speed: {timeScale.toFixed(1)}x
                  </label>
                  <input 
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={timeScale}
                    onChange={(e) => onTimeScaleChange(parseFloat(e.target.value))}
                    className="slider w-full h-1"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Simulation Controls Section */}
          <section className="p-5 border-b border-gray-100">
            <h3 className={`text-base font-semibold mb-3 flex items-center gap-2 ${themeClasses.text}`}>
              🎮 SIMULATION
            </h3>
            <div className="space-y-3">
              {/* Play/Pause and Reset Buttons */}
              <div className="flex gap-2">
                <button 
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer transition-all font-medium ${
                    isPlaying 
                      ? 'bg-red-500 text-white border-red-500 shadow-sm' 
                      : 'bg-green-500 text-white border-green-500 shadow-sm'
                  }`}
                  onClick={isPlaying ? onPause : onPlay}
                >
                  <span>{isPlaying ? '⏸' : '⏵'}</span>
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button 
                  className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer transition-all font-medium ${themeClasses.button}`}
                  onClick={onReset}
                >
                  <span>🔄</span>
                  Reset
                </button>
              </div>
              
            </div>
          </section>



          {/* Live Data Section */}
          <section className="p-5">
            <h3 className="text-base font-semibold mb-4 text-gray-800 flex items-center gap-2">
              LIVE DATA
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Distance:</span>
                <span className="font-mono font-semibold text-gray-800">{liveData.distance} Å</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Velocity:</span>
                <span className="font-mono font-semibold text-gray-800">{liveData.velocity} m/s</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="font-semibold text-gray-800">{liveData.status}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* Bottom Bar - Live Data and Energy Profile */}
      <div className={`border-t ${themeClasses.card}`}>
        <div className="flex flex-col lg:flex-row gap-3 p-4">
          {/* Live Data Panel */}
          <div className="lg:w-1/3 w-full">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-full">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                Live Data
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </h3>
              
              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Activation Energy */}
                <div className="bg-white border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Ea</div>
                  <div className="text-lg font-mono font-bold text-red-600">45.2</div>
                  <div className="text-xs text-gray-400">kJ/mol</div>
                </div>
                
                {/* Enthalpy Change */}
                <div className="bg-white border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">ΔH</div>
                  <div className="text-lg font-mono font-bold text-green-600">-23.1</div>
                  <div className="text-xs text-gray-400">kJ/mol</div>
                </div>
                
                {/* Progress */}
                <div className="bg-white border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Progress</div>
                  <div className="text-lg font-mono font-bold text-blue-600">0%</div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div className="bg-blue-500 h-1 rounded-full" style={{width: '0%'}}></div>
                  </div>
                </div>
                
                {/* Current Energy */}
                <div className="bg-white border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Energy</div>
                  <div className="text-lg font-mono font-bold text-orange-600">0.0</div>
                  <div className="text-xs text-gray-400">kJ/mol</div>
                </div>
              </div>
              
              {/* Status Indicator */}
              <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">Reaction Ready</span>
                </div>
                <div className="text-xs text-green-600 mt-1">
                  ✅ Sufficient activation energy
                </div>
              </div>
            </div>
          </div>

          {/* Energy Profile Graph */}
          <div className="lg:w-2/3 w-full">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Activation Energy Profile</h3>
              </div>
              <div className="p-2">
                <ScientificEnergyCurve
                  data={thermodynamicData}
                  isAnimating={isPlaying}
                  width={600}
                  height={180}
                  showLabels={true}
                />
              </div>
            </div>
          </div>
        </div>
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

import React from 'react';
import { AttackModeSelector } from './AttackModeSelector';
import { IdealButton } from './IdealButton';
import { AVAILABLE_MOLECULES } from '../../constants/availableMolecules';
import { concentrationToParticleCount, particleCountToConcentration } from '../../../utils/concentrationConverter';

interface ReactionSetupProps {
  currentReaction: string;
  substrate: string;
  nucleophile: string;
  attackAngle: number;
  relativeVelocity: number;
  temperature?: number;
  simulationMode?: 'single' | 'rate';
  concentration?: number;
  particleCount?: number;
  onReactionChange: (reaction: string) => void;
  onSubstrateChange: (substrate: string) => void;
  onNucleophileChange: (nucleophile: string) => void;
  onAttackAngleChange: (angle: number) => void;
  onRelativeVelocityChange: (value: number) => void;
  onTemperatureChange?: (value: number) => void;
  onSimulationModeChange?: (mode: 'single' | 'rate') => void;
  onConcentrationChange?: (concentration: number) => void;
  themeClasses: any;
}

export const ReactionSetup: React.FC<ReactionSetupProps> = ({
  currentReaction,
  substrate,
  nucleophile,
  attackAngle,
  relativeVelocity,
  temperature = 298,
  simulationMode = 'single',
  concentration = 0.1,
  particleCount = 20,
  onReactionChange,
  onSubstrateChange,
  onNucleophileChange,
  onAttackAngleChange,
  onRelativeVelocityChange,
  onTemperatureChange,
  onSimulationModeChange,
  onConcentrationChange,
  themeClasses
}) => {
  // Calculate particle count from concentration when concentration changes
  const calculatedParticleCount = concentrationToParticleCount(concentration);
  // Filter molecules into substrates and nucleophiles
  const substrateOptions = AVAILABLE_MOLECULES.filter(mol => 
    mol.includes('Methyl') || mol.includes('Ethyl') || mol.includes('Isopropyl') || 
    mol.includes('Tert') || mol.includes('butyl')
  );
  
  const nucleophileOptions = AVAILABLE_MOLECULES.filter(mol => 
    mol.includes('Hydroxide') || mol.includes('Cyanide') || mol.includes('Methoxide') ||
    mol.includes('Methanol') || mol.includes('Water')
  );

  return (
    <section className="p-5 border-b border-gray-200 dark:border-gray-700">
      {/* Tab Header */}
      <div className="flex mb-5 border-b-2 border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onSimulationModeChange?.('single')}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-all relative ${
            simulationMode === 'single'
              ? `${themeClasses.text}`
              : `${themeClasses.textSecondary} hover:${themeClasses.text}`
          }`}
        >
          Single Collision
          {simulationMode === 'single' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => onSimulationModeChange?.('rate')}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-all relative ${
            simulationMode === 'rate'
              ? `${themeClasses.text}`
              : `${themeClasses.textSecondary} hover:${themeClasses.text}`
          }`}
        >
          Reaction Rate
          {simulationMode === 'rate' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t"></div>
          )}
        </button>
      </div>
      {/* Single Collision Mode Content */}
      {simulationMode === 'single' && (
        <div className="space-y-3">
          {/* Reaction Type */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${themeClasses.textSecondary}`}>
              Reaction Type:
            </label>
            <select 
              value={currentReaction}
              onChange={(e) => onReactionChange(e.target.value)}
              className={`w-full text-sm px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${themeClasses.input}`}
            >
              <option value="sn2">SN2 - Bimolecular Substitution</option>
              <option value="sn1" disabled style={{color: '#999', backgroundColor: '#f5f5f5'}}>SN1 - Unimolecular Substitution (Coming Soon)</option>
              <option value="e2" disabled style={{color: '#999', backgroundColor: '#f5f5f5'}}>E2 - Bimolecular Elimination (Coming Soon)</option>
              <option value="e1" disabled style={{color: '#999', backgroundColor: '#f5f5f5'}}>E1 - Unimolecular Elimination (Coming Soon)</option>
            </select>
          </div>
          
          {/* Molecule Selection - Compact Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${themeClasses.textSecondary}`}>
                Substrate:
              </label>
              <select 
                value={substrate}
                onChange={(e) => onSubstrateChange(e.target.value)}
                className={`w-full text-xs px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${themeClasses.input}`}
              >
                <option value="">Select substrate...</option>
                {substrateOptions.map(mol => (
                  <option key={mol} value={mol}>
                    {mol.replace('demo_', '').replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${themeClasses.textSecondary}`}>
                Nucleophile:
              </label>
              <select 
                value={nucleophile}
                onChange={(e) => onNucleophileChange(e.target.value)}
                className={`w-full text-xs px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${themeClasses.input}`}
              >
                <option value="">Select nucleophile...</option>
                {nucleophileOptions.map(mol => (
                  <option key={mol} value={mol}>
                    {mol.replace('demo_', '').replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Attack Mode - Using extracted component */}
          <AttackModeSelector
            attackAngle={attackAngle}
            onAttackAngleChange={onAttackAngleChange}
            reactionType={currentReaction}
            themeClasses={themeClasses}
          />
          
          {/* Relative Velocity - Clean and Simple */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-medium ${themeClasses.textSecondary}`}>
                Collision Velocity: {relativeVelocity.toFixed(0)} m/s
              </label>
              <IdealButton
                isActive={relativeVelocity >= 380} // Consider "ideal" when velocity is 380+ m/s
                onClick={() => onRelativeVelocityChange(400)} // 400 m/s gives ~32 kJ/mol, well above 30 kJ/mol activation
                activeText="Ideal"
                inactiveText="Ideal"
                themeClasses={themeClasses}
              />
            </div>
            <input 
              type="range"
              min="50"
              max="500"
              step="10"
              value={relativeVelocity}
              onChange={(e) => onRelativeVelocityChange(parseFloat(e.target.value))}
              className="slider w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low Energy</span>
              <span>High Energy</span>
            </div>
          </div>
          
          {/* Temperature Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-medium ${themeClasses.textSecondary}`}>
                Temperature: {temperature}K
              </label>
              <IdealButton
                isActive={temperature >= 298 && temperature <= 350} // Consider "ideal" when temperature is 298-350K
                onClick={() => onTemperatureChange?.(298)} // 298K (room temperature) is ideal
                activeText="Ideal"
                inactiveText="Ideal"
                themeClasses={themeClasses}
              />
            </div>
            <input 
              type="range"
              min="100"
              max="600"
              step="10"
              value={temperature}
              onChange={(e) => onTemperatureChange?.(parseInt(e.target.value))}
              className="slider w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>100K</span>
              <span>600K</span>
            </div>
          </div>
        </div>
      )}

      {/* Reaction Rate Mode Content */}
      {simulationMode === 'rate' && (
        <div className="space-y-4">
          {/* Reaction Type */}
          <div>
            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wide ${themeClasses.textSecondary}`}>
              Reaction Type
            </label>
            <select 
              value={currentReaction}
              onChange={(e) => onReactionChange(e.target.value)}
              className={`w-full text-sm px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${themeClasses.input}`}
            >
              <option value="sn2">SN2 - Bimolecular Substitution</option>
              <option value="sn1" disabled>SN1 - Unimolecular Substitution (Coming Soon)</option>
              <option value="e2" disabled>E2 - Bimolecular Elimination (Coming Soon)</option>
              <option value="e1" disabled>E1 - Unimolecular Elimination (Coming Soon)</option>
            </select>
          </div>
          
          {/* Molecule Selection - Compact Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${themeClasses.textSecondary}`}>
                Substrate
              </label>
              <select 
                value={substrate}
                onChange={(e) => onSubstrateChange(e.target.value)}
                className={`w-full text-xs px-2.5 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${themeClasses.input}`}
              >
                <option value="">Select...</option>
                {substrateOptions.map(mol => (
                  <option key={mol} value={mol}>
                    {mol.replace('demo_', '').replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${themeClasses.textSecondary}`}>
                Nucleophile
              </label>
              <select 
                value={nucleophile}
                onChange={(e) => onNucleophileChange(e.target.value)}
                className={`w-full text-xs px-2.5 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${themeClasses.input}`}
              >
                <option value="">Select...</option>
                {nucleophileOptions.map(mol => (
                  <option key={mol} value={mol}>
                    {mol.replace('demo_', '').replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Concentration Slider */}
          <div className={`p-4 rounded-lg ${themeClasses.card} border border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-sm font-semibold ${themeClasses.text}`}>
                Concentration
              </label>
              <span className={`text-xs font-medium text-purple-600 dark:text-purple-400`}>
                {calculatedParticleCount} pairs
              </span>
            </div>
            <div className={`text-2xl font-bold mb-2 ${themeClasses.text}`}>
              {concentration.toFixed(3)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">mol/L</span>
            </div>
            <input 
              type="range"
              min="0.001"
              max="10"
              step="0.001"
              value={concentration}
              onChange={(e) => onConcentrationChange?.(parseFloat(e.target.value))}
              className="slider w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>0.001 M</span>
              <span className="font-medium">Dilute</span>
              <span className="font-medium">Concentrated</span>
              <span>10 M</span>
            </div>
          </div>
          
          {/* Temperature Slider */}
          <div className={`p-4 rounded-lg ${themeClasses.card} border border-orange-500/20 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-sm font-semibold ${themeClasses.text}`}>
                Temperature
              </label>
              <IdealButton
                isActive={temperature >= 298 && temperature <= 350}
                onClick={() => onTemperatureChange?.(298)}
                activeText="Ideal"
                inactiveText="Ideal"
                themeClasses={themeClasses}
              />
            </div>
            <div className={`text-2xl font-bold mb-2 ${themeClasses.text}`}>
              {temperature} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">K</span>
            </div>
            <input 
              type="range"
              min="100"
              max="600"
              step="10"
              value={temperature}
              onChange={(e) => onTemperatureChange?.(parseInt(e.target.value))}
              className="slider w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>100K</span>
              <span className="font-medium">Room Temp</span>
              <span className="font-medium">High</span>
              <span>600K</span>
            </div>
          </div>
          
          {/* Info Card */}
          <div className={`p-3 rounded-lg ${themeClasses.card} border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20`}>
            <div className="flex items-start gap-2">
              <div className="text-blue-500 mt-0.5">ℹ️</div>
              <div className="flex-1">
                <p className={`text-xs font-medium mb-1 ${themeClasses.text}`}>
                  Reaction Rate Simulation
                </p>
                <p className={`text-xs leading-relaxed ${themeClasses.textSecondary}`}>
                  Multiple molecule pairs collide randomly in a bounded container. 
                  Higher concentration and temperature increase collision frequency and reaction rate.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

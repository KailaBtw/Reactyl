import React from 'react';
import { AttackModeSelector } from './AttackModeSelector';
import { IdealButton } from './IdealButton';
import { InfoBubble } from '../common/InfoBubble';
import { AVAILABLE_MOLECULES } from '../../constants/availableMolecules';
import { concentrationToParticleCount } from '../../../utils/concentrationConverter';

interface ReactionSetupProps {
  currentReaction: string;
  substrate: string;
  nucleophile: string;
  attackAngle: number;
  relativeVelocity: number;
  temperature?: number;
  simulationMode?: 'single' | 'rate';
  concentration?: number;
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
    <section className="p-4 border-b border-gray-200 dark:border-gray-700">
      {/* Tab Header */}
      <div className="flex mb-5 border-b-2 border-gray-200 dark:border-gray-700">
        <button
          onClick={(e) => {
            // Don't switch tabs if clicking on InfoBubble
            if ((e.target as HTMLElement).closest('[data-infobubble]')) {
              return;
            }
            onSimulationModeChange?.('single');
          }}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-all relative flex items-center justify-center gap-2 ${
            simulationMode === 'single'
              ? `${themeClasses.text}`
              : `${themeClasses.textSecondary} hover:${themeClasses.text}`
          }`}
        >
          Single Collision
          <span data-infobubble>
            <InfoBubble
              term="Single Collision"
              explanation="Simulate a single collision between two molecules. Control the approach angle, collision velocity, and temperature to see how these factors affect reaction probability. Perfect for understanding the fundamentals of reaction mechanisms."
              size="small"
            />
          </span>
          {simulationMode === 'single' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t"></div>
          )}
        </button>
        <button
          onClick={(e) => {
            // Don't switch tabs if clicking on InfoBubble
            if ((e.target as HTMLElement).closest('[data-infobubble]')) {
              return;
            }
            onSimulationModeChange?.('rate');
          }}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-all relative flex items-center justify-center gap-2 ${
            simulationMode === 'rate'
              ? `${themeClasses.text}`
              : `${themeClasses.textSecondary} hover:${themeClasses.text}`
          }`}
        >
          Reaction Rate
          <span data-infobubble>
            <InfoBubble
              term="Reaction Rate"
              explanation="Simulate multiple molecule pairs colliding randomly in a container. Adjust concentration and temperature to observe how these factors affect the overall reaction rate. This mode demonstrates real-world reaction kinetics and the Arrhenius equation."
              size="small"
            />
          </span>
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
            <div className={`flex justify-between text-xs ${themeClasses.textSecondary} mt-1`}>
              <span>Low Energy</span>
              <span>High Energy</span>
            </div>
          </div>
          
          {/* Temperature Slider - Lab Realistic */}
          <div>
            <div className="mb-2">
              <label className={`text-xs font-medium ${themeClasses.textSecondary}`}>
                Temperature: {Math.round(temperature - 273.15)}°C ({temperature} K)
              </label>
            </div>
            <input 
              type="range"
              min="200"
              max="600"
              step="1"
              value={temperature}
              onChange={(e) => onTemperatureChange?.(parseInt(e.target.value))}
              className="slider w-full"
            />
            <div className={`flex justify-between text-xs ${themeClasses.textSecondary} mt-1`}>
              <span>-73°C</span>
              <span>25°C</span>
              <span>200°C</span>
              <span>327°C</span>
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
              {concentration.toFixed(3)} <span className={`text-sm font-normal ${themeClasses.textSecondary}`}>mol/L</span>
            </div>
            <div className={`text-xs ${themeClasses.textSecondary} mb-2 italic`}>
              Realistic: showing actual molecules in tiny sample volume
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
            <div className={`flex justify-between text-xs ${themeClasses.textSecondary} mt-2`}>
              <span>0.001 M</span>
              <span className="font-medium">Dilute</span>
              <span className="font-medium">Concentrated</span>
              <span>10 M</span>
            </div>
          </div>
          
          {/* Temperature Slider - Lab Realistic */}
          <div className={`p-4 rounded-lg ${themeClasses.card} border border-orange-500/20 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10`}>
            <div className="mb-3 flex items-center gap-2">
              <label className={`text-sm font-semibold ${themeClasses.text}`}>
                Temperature
              </label>
              <InfoBubble
                term="Temperature & Molecular Velocity"
                explanation={`Temperature controls molecular motion through the Maxwell-Boltzmann distribution. 

Theoretical Relationship:
v_rms = √(3kT/m)

Where:
• v_rms = root mean square velocity
• k = Boltzmann constant (1.38 × 10⁻²³ J/K)
• T = temperature in Kelvin
• m = molecular mass

In this simulation, all molecules use:
v = baseSpeed × √(T/T_ref)

Where baseSpeed = 12.0 m/s and T_ref = 298K (room temperature).

Examples:
• 200K (cryogenic): v = 12.0 × √(200/298) ≈ 9.8 m/s
• 298K (room temp): v = 12.0 × √(298/298) = 12.0 m/s
• 473K (200°C): v = 12.0 × √(473/298) ≈ 15.1 m/s

Doubling temperature increases velocity by √2 ≈ 1.41×. At higher temperatures, molecules move faster and collide more frequently, increasing reaction rates according to the Arrhenius equation:

k = A·e^(-Ea/RT)

Where reaction rate k increases exponentially with temperature T.`}
                size="small"
              />
            </div>
            
            {/* Temperature Display - Dual Units */}
            <div className="flex items-baseline gap-2 mb-3">
              <div className={`text-3xl font-bold ${themeClasses.text}`}>
                {Math.round(temperature - 273.15)}
              </div>
              <div className={`text-lg font-medium ${themeClasses.textSecondary}`}>
                °C
              </div>
              <div className={`text-lg font-medium ${themeClasses.textSecondary} ml-2`}>
                ({temperature} K)
              </div>
            </div>

            {/* Kinetic Energy Indicator */}
            {(() => {
              // Calculate relative kinetic energy (Maxwell-Boltzmann)
              const tempFactor = Math.sqrt(temperature / 298);
              const kineticEnergy = tempFactor * 2.5; // Base kinetic energy at room temp (~2.5 kJ/mol)
              const activationEnergy = 30; // kJ/mol for SN2
              const energyRatio = kineticEnergy / activationEnergy;
              
              return (
                <div className="mb-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`${themeClasses.textSecondary}`}>Molecular Kinetic Energy</span>
                    <span className={`font-medium ${energyRatio >= 0.1 ? 'text-orange-600 dark:text-orange-400' : themeClasses.textSecondary}`}>
                      {kineticEnergy.toFixed(1)} kJ/mol
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all ${
                        temperature < 298 ? 'bg-blue-500' :
                        temperature < 373 ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (tempFactor / 1.5) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })()}
            
            {/* Temperature Slider */}
            <input 
              type="range"
              min="200"
              max="473"
              step="1"
              value={temperature}
              onChange={(e) => onTemperatureChange?.(parseInt(e.target.value))}
              className="slider w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, 
                  #1e40af 0%, 
                  #1e40af ${((273 - 200) / (473 - 200)) * 100}%,
                  #3b82f6 ${((273 - 200) / (473 - 200)) * 100}%,
                  #3b82f6 ${((298 - 200) / (473 - 200)) * 100}%,
                  #f97316 ${((298 - 200) / (473 - 200)) * 100}%,
                  #f97316 ${((373 - 200) / (473 - 200)) * 100}%,
                  #ef4444 ${((373 - 200) / (473 - 200)) * 100}%,
                  #dc2626 100%)`
              }}
            />
            
            {/* Lab Temperature Markers */}
            <div className={`flex justify-between text-xs ${themeClasses.textSecondary} mt-2`}>
              <div className="text-center">
                <div className="text-blue-800 font-medium">Cryogenic</div>
                <div className="text-blue-700">-73°C</div>
              </div>
              <div className="text-center">
                <div className="text-blue-700 font-medium">Ice Bath</div>
                <div className="text-blue-600">0°C</div>
              </div>
              <div className="text-center">
                <div className="text-green-700 font-medium">Room</div>
                <div className="text-green-600">25°C</div>
              </div>
              <div className="text-center">
                <div className="text-orange-600 font-medium">Boiling</div>
                <div className="text-orange-500">100°C</div>
              </div>
              <div className="text-center">
                <div className="text-red-600 font-medium">High Temp</div>
                <div className="text-red-500">200°C</div>
              </div>
            </div>
            
            {/* Scientific Info */}
            <div className={`mt-3 text-xs italic ${themeClasses.textSecondary}`}>
              {temperature < 200 ? 'Cryogenic - extremely slow' :
               temperature < 273 ? 'Very cold - very slow reactions' :
               temperature < 298 ? 'Cold - slow reactions' :
               temperature < 310 ? 'Room temperature - typical lab conditions' :
               temperature < 373 ? 'Warm - increased reaction rate' :
               'Hot - fast reactions'}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

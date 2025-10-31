import React from 'react';
import { AttackModeSelector } from './AttackModeSelector';
import { IdealButton } from './IdealButton';

interface ReactionSetupProps {
  currentReaction: string;
  substrate: string;
  nucleophile: string;
  attackAngle: number;
  relativeVelocity: number;
  temperature?: number;
  onReactionChange: (reaction: string) => void;
  onSubstrateChange: (substrate: string) => void;
  onNucleophileChange: (nucleophile: string) => void;
  onAttackAngleChange: (angle: number) => void;
  onRelativeVelocityChange: (value: number) => void;
  onTemperatureChange?: (value: number) => void;
  themeClasses: any;
}

export const ReactionSetup: React.FC<ReactionSetupProps> = ({
  currentReaction,
  substrate,
  nucleophile,
  attackAngle,
  relativeVelocity,
  temperature = 298,
  onReactionChange,
  onSubstrateChange,
  onNucleophileChange,
  onAttackAngleChange,
  onRelativeVelocityChange,
  onTemperatureChange,
  themeClasses
}) => {
  return (
    <section className="p-5 border-b border-gray-100">
      <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${themeClasses.text}`}>
        Reaction Setup
      </h3>
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
              <option value="demo_Methyl_bromide">Methyl bromide (CH₃Br)</option>
              <option value="demo_Ethyl_iodide">Ethyl iodide (C₂H₅I)</option>
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
              <option value="demo_Hydroxide_ion">Hydroxide ion (OH⁻)</option>
              <option value="demo_Cyanide_ion">Cyanide ion (CN⁻)</option>
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
    </section>
  );
};

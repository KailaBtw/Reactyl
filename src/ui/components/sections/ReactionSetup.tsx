import React from 'react';
import { AttackModeSelector } from './AttackModeSelector';

interface ReactionSetupProps {
  currentReaction: string;
  substrate: string;
  nucleophile: string;
  attackMode: string;
  impactParameter: number;
  timeScale: number;
  relativeVelocity: number;
  onReactionChange: (reaction: string) => void;
  onSubstrateChange: (substrate: string) => void;
  onNucleophileChange: (nucleophile: string) => void;
  onAttackModeChange: (mode: string) => void;
  onImpactParameterChange: (value: number) => void;
  onTimeScaleChange: (value: number) => void;
  onRelativeVelocityChange: (value: number) => void;
  themeClasses: any;
}

export const ReactionSetup: React.FC<ReactionSetupProps> = ({
  currentReaction,
  substrate,
  nucleophile,
  attackMode,
  impactParameter,
  timeScale,
  relativeVelocity,
  onReactionChange,
  onSubstrateChange,
  onNucleophileChange,
  onAttackModeChange,
  onImpactParameterChange,
  onTimeScaleChange,
  onRelativeVelocityChange,
  themeClasses
}) => {
  return (
    <section className="p-5 border-b border-gray-100">
      <h3 className={`text-base font-semibold mb-4 flex items-center gap-2 ${themeClasses.text}`}>
        REACTION SETUP
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
            <option value="sn1">SN1 - Unimolecular Substitution</option>
            <option value="e2">E2 - Bimolecular Elimination</option>
            <option value="e1">E1 - Unimolecular Elimination</option>
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
              <option value="demo_Methyl_bromide">CH₃Br</option>
              <option value="demo_Ethyl_iodide">C₂H₅I</option>
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
              <option value="demo_Hydroxide_ion">OH⁻</option>
              <option value="demo_Cyanide_ion">CN⁻</option>
            </select>
          </div>
        </div>
        
        {/* Attack Mode - Using extracted component */}
        <AttackModeSelector
          attackMode={attackMode}
          onAttackModeChange={onAttackModeChange}
          themeClasses={themeClasses}
        />
        
        {/* Impact Parameter and Speed - Side by Side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs font-medium mb-1 ${themeClasses.textSecondary}`}>
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
            <label className={`block text-xs font-medium mb-1 ${themeClasses.textSecondary}`}>
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
        
        {/* Relative Velocity - Full Width */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${themeClasses.textSecondary}`}>
            Relative Velocity: {relativeVelocity.toFixed(1)} m/s
          </label>
          <input 
            type="range"
            min="50"
            max="500"
            step="10"
            value={relativeVelocity}
            onChange={(e) => onRelativeVelocityChange(parseFloat(e.target.value))}
            className="slider w-full h-1"
          />
        </div>
      </div>
    </section>
  );
};

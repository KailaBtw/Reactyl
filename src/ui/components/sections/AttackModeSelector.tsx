import React from 'react';

interface AttackModeSelectorProps {
  attackMode: string;
  onAttackModeChange: (mode: string) => void;
  themeClasses: any;
}

export const AttackModeSelector: React.FC<AttackModeSelectorProps> = ({
  attackMode,
  onAttackModeChange,
  themeClasses
}) => {
  const attackModes = [
    { id: 'backside', label: 'Backside' },
    { id: 'frontside', label: 'Frontside' },
    { id: 'perpendicular', label: 'Perpendicular' },
    { id: 'glancing', label: 'Glancing' },
    { id: 'missed', label: 'Missed' }
  ];

  return (
    <div>
      <label className={`block text-xs font-medium mb-2 ${themeClasses.textSecondary}`}>
        Attack Mode:
      </label>
      <div className="grid grid-cols-3 gap-1">
        {attackModes.map((mode) => (
          <button
            key={mode.id}
            className={`px-2 py-1 text-xs border rounded transition-all ${
              attackMode === mode.id 
                ? 'bg-blue-500 text-white border-blue-500 shadow-md scale-105' 
                : themeClasses.button
            }`}
            onClick={() => onAttackModeChange(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};

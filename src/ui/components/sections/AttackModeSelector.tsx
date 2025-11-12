import type React from 'react';
import { IdealButton } from './IdealButton';

interface AttackModeSelectorProps {
  attackAngle: number;
  onAttackAngleChange: (angle: number) => void;
  reactionType: string;
  themeClasses: any;
}

export const AttackModeSelector: React.FC<AttackModeSelectorProps> = ({
  attackAngle,
  onAttackAngleChange,
  reactionType,
  themeClasses,
}) => {
  // Get ideal angle for current reaction type
  const getIdealAngle = () => {
    if (reactionType.includes('SN2')) return 180; // Backside attack
    if (reactionType.includes('SN1')) return 180; // Less critical but still optimal
    if (reactionType.includes('E2')) return 180; // Anti-periplanar
    return 180; // Default
  };

  const idealAngle = getIdealAngle();
  const isIdeal = Math.abs(attackAngle - idealAngle) <= 5; // Within 5 degrees

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={`text-xs font-medium ${themeClasses.textSecondary}`}>
          Approach Angle: {attackAngle}°
        </label>
        <IdealButton
          isActive={isIdeal}
          onClick={() => onAttackAngleChange(idealAngle)}
          activeText="Ideal"
          inactiveText="Ideal"
          themeClasses={themeClasses}
        />
      </div>

      {/* Angle Slider */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max="180"
          value={attackAngle}
          onChange={e => onAttackAngleChange(parseInt(e.target.value))}
          className="slider w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0° (Front)</span>
          <span>90° (Side)</span>
          <span>180° (Back)</span>
        </div>
      </div>
    </div>
  );
};

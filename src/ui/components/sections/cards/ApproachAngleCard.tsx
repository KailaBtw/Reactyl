import type React from 'react';
import { IdealButton } from '../IdealButton';

// Constants for Approach Angle
const ANGLE_IDEAL_SN2 = 180; // Backside attack for SN2
const ANGLE_TOLERANCE = 5; // Within 5 degrees is considered ideal

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold';
const sliderClasses = 'slider w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer';
const sliderLabelsClasses = 'flex justify-between text-xs mt-1';

// Color theme configuration
const controlCardThemes = {
  indigo: {
    border: 'border-indigo-500/20',
    gradient: 'bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 dark:from-indigo-950/20 dark:to-indigo-900/10',
    accent: 'text-indigo-600 dark:text-indigo-400',
  },
} as const;

interface ApproachAngleCardProps {
  attackAngle: number;
  onAttackAngleChange: (angle: number) => void;
  reactionType: string;
  themeClasses: any;
}

export const ApproachAngleCard: React.FC<ApproachAngleCardProps> = ({
  attackAngle,
  onAttackAngleChange,
  reactionType,
  themeClasses,
}) => {
  const theme = controlCardThemes.indigo;

  // Get ideal angle for current reaction type
  const getIdealAngle = () => {
    if (reactionType.includes('SN2')) return ANGLE_IDEAL_SN2;
    if (reactionType.includes('SN1')) return ANGLE_IDEAL_SN2;
    if (reactionType.includes('E2')) return ANGLE_IDEAL_SN2;
    return ANGLE_IDEAL_SN2;
  };

  const idealAngle = getIdealAngle();
  const isIdeal = Math.abs(attackAngle - idealAngle) <= ANGLE_TOLERANCE;

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      <div className="flex items-center justify-between mb-3">
        <label className={`${cardTitleClasses} ${themeClasses.text}`}>
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
          className={sliderClasses}
        />
        <div className={`${sliderLabelsClasses} ${themeClasses.textSecondary}`}>
          <span>0° (Front)</span>
          <span>90° (Side)</span>
          <span>180° (Back)</span>
        </div>
      </div>
    </div>
  );
};


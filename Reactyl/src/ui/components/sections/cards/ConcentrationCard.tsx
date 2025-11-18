import type React from 'react';
import { concentrationToParticleCount } from '../../../../utils/concentrationConverter';
import { useRafThrottledCallback } from '../../../hooks/useRafThrottledCallback';

// Constants for Concentration Slider
const CONCENTRATION_MIN = 0.001; // mol/L
const CONCENTRATION_MAX = 10; // mol/L
const CONCENTRATION_STEP = 0.001; // mol/L

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold';
const cardHeaderClasses = 'flex items-center justify-between mb-3';
const sliderClasses = 'slider w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer';
const sliderLabelsClasses = 'flex justify-between text-xs mt-2';

// Color theme configuration
const controlCardThemes = {
  purple: {
    border: 'border-purple-500/20',
    gradient: 'bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10',
    accent: 'text-purple-600 dark:text-purple-400',
  },
} as const;

interface ConcentrationCardProps {
  concentration: number;
  onConcentrationChange: (value: number) => void;
  themeClasses: any;
}

export const ConcentrationCard: React.FC<ConcentrationCardProps> = ({
  concentration,
  onConcentrationChange,
  themeClasses,
}) => {
  const theme = controlCardThemes.purple;
  const calculatedParticleCount = concentrationToParticleCount(concentration);
  const emitConcentrationChange = useRafThrottledCallback(onConcentrationChange);

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      <div className={cardHeaderClasses}>
        <label className={`${cardTitleClasses} ${themeClasses.text}`}>Concentration</label>
        <span className={`text-xs font-medium ${theme.accent}`}>
          {calculatedParticleCount} pairs
        </span>
      </div>
      <div className={`text-2xl font-bold mb-2 ${themeClasses.text}`}>
        {concentration.toFixed(3)}{' '}
        <span className={`text-sm font-normal ${themeClasses.textSecondary}`}>mol/L</span>
      </div>
      <div className={`text-xs ${themeClasses.textSecondary} mb-2 italic`}>
        Realistic: showing actual molecules in tiny sample volume
      </div>
      <input
        type="range"
        min={CONCENTRATION_MIN}
        max={CONCENTRATION_MAX}
        step={CONCENTRATION_STEP}
        value={concentration}
        onChange={e => emitConcentrationChange(parseFloat(e.target.value))}
        className={sliderClasses}
      />
      <div className={`${sliderLabelsClasses} ${themeClasses.textSecondary}`}>
        <span>{CONCENTRATION_MIN} M</span>
        <span className="font-medium">Dilute</span>
        <span className="font-medium">Concentrated</span>
        <span>{CONCENTRATION_MAX} M</span>
      </div>
    </div>
  );
};


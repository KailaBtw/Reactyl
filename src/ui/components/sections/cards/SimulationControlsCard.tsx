import type React from 'react';
import { useRafThrottledCallback } from '../../../hooks/useRafThrottledCallback';

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold mb-3';
const subHeaderClasses = 'text-xs font-medium mb-2';
const probabilityBarClasses = 'w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2';
const sliderClasses = 'slider w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer';
const sliderLabelsClasses = 'flex justify-between text-xs mt-1';
const sectionDividerClasses = 'border-b border-gray-200 dark:border-gray-700 mb-3 pb-3';

// Color theme configuration
const controlCardThemes = {
  slate: {
    border: 'border-slate-500/20',
    gradient: 'bg-gradient-to-br from-slate-50/50 to-slate-100/30 dark:from-slate-950/20 dark:to-slate-900/10',
    accent: 'text-slate-600 dark:text-slate-400',
  },
} as const;

interface SimulationControlsCardProps {
  isPlaying: boolean;
  timeScale: number;
  reactionProbability: number;
  simulationMode?: 'single' | 'rate';
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onTimeScaleChange: (value: number) => void;
  autoplay: boolean;
  onAutoplayChange: (enabled: boolean) => void;
  themeClasses: any;
}

export const SimulationControlsCard: React.FC<SimulationControlsCardProps> = ({
  isPlaying,
  timeScale,
  reactionProbability,
  simulationMode = 'single',
  onPlay,
  onPause,
  onReset,
  onTimeScaleChange,
  autoplay,
  onAutoplayChange,
  themeClasses,
}) => {
  const theme = controlCardThemes.slate;
  const emitTimeScaleChange = useRafThrottledCallback(onTimeScaleChange);

  // Reaction probability color based on value
  const getProbabilityColor = () => {
    if (reactionProbability >= 70) return 'bg-emerald-500';
    if (reactionProbability >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isRateMode = simulationMode === 'rate';

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      {/* Main Title */}
      <label className={`${cardTitleClasses} ${themeClasses.text}`}>
        Simulation Controls
      </label>

      {/* Reaction Probability Sub-section - only show in single collision mode */}
      {!isRateMode && (
        <div className={sectionDividerClasses}>
          <label className={`${subHeaderClasses} ${themeClasses.textSecondary}`}>
            Reaction Probability
          </label>
          <div className={`text-2xl font-bold mb-2 ${themeClasses.text}`}>
            {reactionProbability.toFixed(1)}%
          </div>
          <div className={probabilityBarClasses}>
            <div
              className={`h-full ${getProbabilityColor()} transition-all duration-300`}
              style={{ width: `${Math.min(reactionProbability, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Playback Speed Sub-section */}
      <div className="mb-3">
        <label className={`${subHeaderClasses} ${themeClasses.textSecondary}`}>
          Playback Speed: {timeScale.toFixed(1)}x
        </label>
        <input
          type="range"
          min="0.1"
          max="2.0"
          step="0.1"
          value={timeScale}
          onChange={e => emitTimeScaleChange(parseFloat(e.target.value))}
          className={sliderClasses}
        />
        <div className={`${sliderLabelsClasses} ${themeClasses.textSecondary}`}>
          <span>Slower</span>
          <span>Faster</span>
        </div>
      </div>

      {/* Play/Pause and Reset Buttons */}
      <div className="flex gap-2 mb-2">
        {/* Play/Pause button - show in both modes, but behavior differs */}
        <button
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer transition-all font-medium transform hover:scale-105 active:scale-95 ${
            isPlaying
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500 shadow-red-200 shadow-md'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-blue-200 shadow-md'
          }`}
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer transition-all font-medium transform hover:scale-105 active:scale-95 bg-gradient-to-r from-red-400 to-orange-500 text-white border-red-400 shadow-red-200 shadow-md`}
          onClick={onReset}
        >
          <span>🔄</span>
          Reset
        </button>
      </div>

      {/* Autoplay toggle */}
      <div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={autoplay}
            onChange={e => onAutoplayChange(e.target.checked)}
          />
          <span className={themeClasses.textSecondary}>Autoplay</span>
        </label>
      </div>
    </div>
  );
};


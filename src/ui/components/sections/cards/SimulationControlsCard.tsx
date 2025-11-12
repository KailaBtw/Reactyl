import type React from 'react';
import { SimulationControls } from '../SimulationControls';

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold mb-3';
const probabilityRowClasses = 'flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700';
const probabilityBarClasses = 'w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2';

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
  currentReaction: string;
  attackAngle: number;
  relativeVelocity: number;
  temperature: number;
  reactionProbability: number;
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
  currentReaction,
  attackAngle,
  relativeVelocity,
  temperature,
  reactionProbability,
  onPlay,
  onPause,
  onReset,
  onTimeScaleChange,
  autoplay,
  onAutoplayChange,
  themeClasses,
}) => {
  const theme = controlCardThemes.slate;

  // Reaction probability color based on value
  const getProbabilityColor = () => {
    if (reactionProbability >= 70) return 'bg-emerald-500';
    if (reactionProbability >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      {/* Reaction Probability Section */}
      <div>
        <div className={probabilityRowClasses}>
          <div>
            <label className={`${cardTitleClasses} ${themeClasses.text}`}>
              Reaction Probability
            </label>
            <div className={`text-2xl font-bold ${themeClasses.text}`}>
              {reactionProbability.toFixed(1)}%
            </div>
          </div>
        </div>
        <div className={probabilityBarClasses}>
          <div
            className={`h-full ${getProbabilityColor()} transition-all duration-300`}
            style={{ width: `${Math.min(reactionProbability, 100)}%` }}
          />
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="mt-4 -mx-4 -mb-4">
        <SimulationControls
          isPlaying={isPlaying}
          timeScale={timeScale}
          currentReaction={currentReaction}
          attackAngle={attackAngle}
          relativeVelocity={relativeVelocity}
          temperature={temperature}
          simulationMode="single"
          onPlay={onPlay}
          onPause={onPause}
          onReset={onReset}
          onTimeScaleChange={onTimeScaleChange}
          autoplay={autoplay}
          onAutoplayChange={onAutoplayChange}
          themeClasses={themeClasses}
        />
      </div>
    </div>
  );
};


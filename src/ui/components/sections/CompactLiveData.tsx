import React from 'react';
import { useUIState } from '../../context/UIStateContext';

interface CompactLiveDataProps {
  relativeVelocity: number;
  attackAngle: number;
  reactionProbability: number;
  timeScale: number;
  themeClasses: any;
}

export const CompactLiveData: React.FC<CompactLiveDataProps> = ({
  relativeVelocity,
  attackAngle,
  reactionProbability,
  timeScale,
  themeClasses
}) => {
  // Color scheme based on importance:
  // - Reaction Probability (most important): Red/Orange/Green gradient
  // - Relative Velocity (high importance): Blue
  // - Attack Angle (medium importance): Purple/Indigo
  // - Time Scale (lower importance): Gray

  const getReactionProbabilityColor = (prob: number) => {
    if (prob >= 70) return 'bg-emerald-500'; // Green - high probability
    if (prob >= 40) return 'bg-yellow-500';  // Yellow - medium probability
    return 'bg-red-500'; // Red - low probability
  };

  const getBarWidth = (value: number, max: number) => {
    return Math.min((value / max) * 100, 100);
  };

  // Bar background that works across themes
  const barBgClass = 'bg-gray-700/30';

  return (
    <div className={`${themeClasses.card} border rounded-lg p-3 mb-2 mx-1`}>
      <h4 className={`text-xs font-semibold ${themeClasses.text} mb-3 uppercase tracking-wide`}>
        Live Data
      </h4>
      
      <div className="space-y-2.5">
        {/* Reaction Probability - Most Important */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs ${themeClasses.textSecondary} font-medium`}>
              Reaction Probability
            </span>
            <span className={`text-xs font-mono font-bold ${themeClasses.text}`}>
              {reactionProbability.toFixed(1)}%
            </span>
          </div>
          <div className={`h-2 ${barBgClass} rounded-full overflow-hidden`}>
            <div 
              className={`h-full ${getReactionProbabilityColor(reactionProbability)} transition-all duration-300`}
              style={{ width: `${getBarWidth(reactionProbability, 100)}%` }}
            />
          </div>
        </div>

        {/* Relative Velocity - High Importance */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs ${themeClasses.textSecondary} font-medium`}>
              Relative Velocity
            </span>
            <span className={`text-xs font-mono font-bold ${themeClasses.text}`}>
              {relativeVelocity.toFixed(1)} m/s
            </span>
          </div>
          <div className={`h-2 ${barBgClass} rounded-full overflow-hidden`}>
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${getBarWidth(relativeVelocity, 300)}%` }}
            />
          </div>
        </div>

        {/* Attack Angle - Medium Importance */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs ${themeClasses.textSecondary} font-medium`}>
              Attack Angle
            </span>
            <span className={`text-xs font-mono font-bold ${themeClasses.text}`}>
              {attackAngle.toFixed(0)}°
            </span>
          </div>
          <div className={`h-2 ${barBgClass} rounded-full overflow-hidden`}>
            <div 
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${getBarWidth(attackAngle, 180)}%` }}
            />
          </div>
        </div>

        {/* Time Scale - Lower Importance */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs ${themeClasses.textSecondary} font-medium`}>
              Time Scale
            </span>
            <span className={`text-xs font-mono font-bold ${themeClasses.text}`}>
              {timeScale.toFixed(1)}x
            </span>
          </div>
          <div className={`h-2 ${barBgClass} rounded-full overflow-hidden`}>
            <div 
              className="h-full bg-gray-500 transition-all duration-300"
              style={{ width: `${getBarWidth(timeScale, 5)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};


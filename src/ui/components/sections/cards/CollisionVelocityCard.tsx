import type React from 'react';
import { IdealButton } from '../IdealButton';

// Constants for Collision Velocity
const VELOCITY_MIN = 50; // m/s
const VELOCITY_MAX = 500; // m/s
const VELOCITY_STEP = 10; // m/s
const VELOCITY_IDEAL = 400; // m/s (gives ~32 kJ/mol, well above 30 kJ/mol activation)
const VELOCITY_IDEAL_THRESHOLD = 380; // m/s (consider "ideal" when velocity is 380+ m/s)
const ACTIVATION_ENERGY = 30; // kJ/mol for SN2
const AVG_MOLECULAR_MASS = 0.028; // kg/mol (average for CH3Br)

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold';
const sliderClasses = 'slider w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer';
const sliderLabelsClasses = 'flex justify-between text-xs mt-1';
const infoRowClasses = 'flex items-center justify-between text-xs mb-2';

// Color theme configuration
const controlCardThemes = {
  red: {
    border: 'border-red-500/20',
    gradient: 'bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10',
    accent: 'text-red-600 dark:text-red-400',
  },
} as const;

interface CollisionVelocityCardProps {
  relativeVelocity: number;
  onRelativeVelocityChange: (value: number) => void;
  themeClasses: any;
}

export const CollisionVelocityCard: React.FC<CollisionVelocityCardProps> = ({
  relativeVelocity,
  onRelativeVelocityChange,
  themeClasses,
}) => {
  const theme = controlCardThemes.red;
  const isIdeal = relativeVelocity >= VELOCITY_IDEAL_THRESHOLD;

  // Calculate kinetic energy from velocity
  // KE = 0.5 * m * v^2 (in J/mol), convert to kJ/mol
  const kineticEnergy = (0.5 * AVG_MOLECULAR_MASS * relativeVelocity ** 2) / 1000;
  const energyRatio = kineticEnergy / ACTIVATION_ENERGY;
  const hasSufficientEnergy = kineticEnergy >= ACTIVATION_ENERGY;

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      <div className="flex items-center justify-between mb-3">
        <label className={`${cardTitleClasses} ${themeClasses.text}`}>
          Collision Velocity: {relativeVelocity.toFixed(0)} m/s
        </label>
        <IdealButton
          isActive={isIdeal}
          onClick={() => onRelativeVelocityChange(VELOCITY_IDEAL)}
          activeText="Ideal"
          inactiveText="Ideal"
          themeClasses={themeClasses}
        />
      </div>

      {/* Kinetic Energy Display */}
      <div className={`${infoRowClasses} mb-2`}>
        <span className={themeClasses.textSecondary}>Kinetic Energy</span>
        <span className={`font-mono font-semibold ${hasSufficientEnergy ? theme.accent : themeClasses.textSecondary}`}>
          {kineticEnergy.toFixed(1)} kJ/mol
        </span>
      </div>

      {/* Energy Ratio Display */}
      <div className={`${infoRowClasses} mb-3`}>
        <span className={themeClasses.textSecondary}>vs Activation Energy (Ea = {ACTIVATION_ENERGY} kJ/mol)</span>
        <span className={`font-mono font-semibold ${hasSufficientEnergy ? theme.accent : themeClasses.textSecondary}`}>
          {(energyRatio * 100).toFixed(0)}%
        </span>
      </div>

      <input
        type="range"
        min={VELOCITY_MIN}
        max={VELOCITY_MAX}
        step={VELOCITY_STEP}
        value={relativeVelocity}
        onChange={e => onRelativeVelocityChange(parseFloat(e.target.value))}
        className={sliderClasses}
      />
      <div className={`${sliderLabelsClasses} ${themeClasses.textSecondary}`}>
        <span>Low Energy</span>
        <span>High Energy</span>
      </div>
    </div>
  );
};


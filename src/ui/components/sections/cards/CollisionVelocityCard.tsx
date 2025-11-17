import type React from 'react';
import { useMemo } from 'react';
import { IdealButton } from '../IdealButton';
import { InfoBubble } from '../../common/InfoBubble';
import { REACTION_TYPES } from '../../../../chemistry/reactionDatabase';

// Constants for Collision Velocity
const VELOCITY_MIN = 50; // m/s
const VELOCITY_STEP = 10; // m/s
const AVG_MOLECULAR_MASS = 0.028; // kg/mol (average for CH3Br)

// Calculate velocity from kinetic energy: KE = 0.5 * m * v², so v = sqrt(2 * KE / m)
// KE in kJ/mol, convert to J/mol, then solve for v in m/s
const velocityFromEnergy = (energyKJ: number): number => {
  const energyJ = energyKJ * 1000; // Convert kJ/mol to J/mol
  return Math.sqrt((2 * energyJ) / AVG_MOLECULAR_MASS);
};

// Calculate kinetic energy from velocity: KE = 0.5 * m * v²
const energyFromVelocity = (velocity: number): number => {
  return (0.5 * AVG_MOLECULAR_MASS * velocity ** 2) / 1000; // Convert J/mol to kJ/mol
};

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
  reactionType: string;
  themeClasses: any;
}

export const CollisionVelocityCard: React.FC<CollisionVelocityCardProps> = ({
  relativeVelocity,
  onRelativeVelocityChange,
  reactionType,
  themeClasses,
}) => {
  const theme = controlCardThemes.red;

  // Get activation energy for current reaction type
  const activationEnergy = useMemo(() => {
    const reaction = REACTION_TYPES[reactionType.toLowerCase()];
    return reaction?.activationEnergy || 30; // Default to SN2 if not found
  }, [reactionType]);

  // Calculate ideal velocity: velocity that gives exactly the activation energy
  const idealVelocity = useMemo(() => {
    return velocityFromEnergy(activationEnergy);
  }, [activationEnergy]);

  // Calculate max velocity: 2x the ideal velocity for exploration range
  // Ideal is 20% above minimum, so max allows testing higher energies
  const velocityMax = useMemo(() => {
    return Math.ceil(idealVelocity * 2.0);
  }, [idealVelocity]);

  // Calculate ideal velocity threshold (20% above activation energy)
  const idealVelocityThreshold = useMemo(() => {
    return idealVelocity * 1.2;
  }, [idealVelocity]);

  // Check if current velocity is ideal (at or above 20% threshold)
  const isIdeal = relativeVelocity >= idealVelocityThreshold;

  // Calculate kinetic energy from velocity
  const kineticEnergy = useMemo(() => {
    return energyFromVelocity(relativeVelocity);
  }, [relativeVelocity]);

  const hasSufficientEnergy = kineticEnergy >= activationEnergy;

  // Get velocity description
  const getVelocityDescription = () => {
    if (kineticEnergy < activationEnergy * 0.5) {
      return 'Very low energy - reaction unlikely';
    }
    if (kineticEnergy < activationEnergy) {
      return 'Below activation energy - rare reactions';
    }
    if (kineticEnergy < idealVelocityThreshold) {
      return 'Above activation energy - reactions possible';
    }
    return 'Ideal energy - frequent successful collisions';
  };

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <label className={`${cardTitleClasses} ${themeClasses.text}`}>Collision Velocity</label>
        <InfoBubble
          term="Collision Velocity & Energy"
          explanation={`The relative velocity between colliding molecules determines the kinetic energy available to overcome the activation energy barrier.

Kinetic Energy Formula:
KE = ½mv²

Where:
• m = reduced mass of the collision pair
• v = relative velocity between molecules

Energy Requirements:
• Molecules must have KE ≥ Ea (activation energy) to react
• For ${reactionType.toUpperCase()}: Ea ≈ ${activationEnergy} kJ/mol
• Minimum velocity: ${idealVelocity.toFixed(0)} m/s (exactly meets Ea)
• Ideal velocity: ${idealVelocityThreshold.toFixed(0)} m/s (20% above Ea for reliable reactions)
• Higher velocities increase both collision frequency and energy

At room temperature (298K), typical molecular velocities range from 200-600 m/s depending on molecular mass. This simulation allows you to control the collision velocity to observe how energy affects reaction probability.`}
          size="small"
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className={`text-3xl font-bold ${themeClasses.text}`}>
          {relativeVelocity.toFixed(0)}
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-lg font-medium ${themeClasses.textSecondary}`}>m/s</div>
          <IdealButton
            isActive={isIdeal}
            onClick={() => onRelativeVelocityChange(idealVelocityThreshold)}
            activeText="Ideal"
            inactiveText="Ideal"
            themeClasses={themeClasses}
          />
        </div>
      </div>

      {/* Kinetic Energy Display */}
      <div className="mb-3 text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className={themeClasses.textSecondary}>Kinetic Energy</span>
          <span className={`font-semibold ${hasSufficientEnergy ? theme.accent : themeClasses.textSecondary}`}>
            {kineticEnergy.toFixed(1)} kJ/mol
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              hasSufficientEnergy ? 'bg-red-500' : 'bg-orange-400'
            }`}
            style={{ width: `${Math.min(100, (kineticEnergy / (activationEnergy * 2)) * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className={themeClasses.textSecondary}>Ea = {activationEnergy} kJ/mol</span>
          <span className={themeClasses.textSecondary}>
            Ideal: {idealVelocityThreshold.toFixed(0)} m/s
          </span>
        </div>
      </div>

      {/* Velocity Slider */}
      <input
        type="range"
        min={VELOCITY_MIN}
        max={velocityMax}
        step={VELOCITY_STEP}
        value={relativeVelocity}
        onChange={e => onRelativeVelocityChange(parseFloat(e.target.value))}
        className={sliderClasses}
      />
      <div className={`${sliderLabelsClasses} ${themeClasses.textSecondary} mb-3`}>
        <span>{VELOCITY_MIN} m/s</span>
        <span>{Math.round(velocityMax / 2)} m/s</span>
        <span>{velocityMax} m/s</span>
      </div>

      {/* Brief Description */}
      <div className={`text-xs italic ${themeClasses.textSecondary}`}>
        {getVelocityDescription()}
      </div>
    </div>
  );
};


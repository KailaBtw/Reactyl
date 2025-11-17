import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IdealButton } from '../IdealButton';
import { InfoBubble } from '../../common/InfoBubble';
import { REACTION_TYPES } from '../../../../chemistry/reactionDatabase';
import {
  energyFromVelocityScaled,
  velocityFromEnergyScaled,
  getEnergyRange,
} from '../../../utils/kineticEnergyScaling';
import { useRafThrottledCallback } from '../../../hooks/useRafThrottledCallback';

// Constants for Kinetic Energy
const ENERGY_STEP = 0.5; // kJ/mol

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold';
const sliderClasses = 'slider w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer';
const sliderLabelsClasses = 'flex justify-between text-xs mt-1';

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
  activationEnergy?: number;
  themeClasses: any;
}

export const CollisionVelocityCard: React.FC<CollisionVelocityCardProps> = ({
  relativeVelocity,
  onRelativeVelocityChange,
  reactionType,
  activationEnergy: activationEnergyOverride,
  themeClasses,
}) => {
  const theme = controlCardThemes.red;

  // Get activation energy, preferring thermodynamic data override
  const activationEnergy = useMemo(() => {
    if (typeof activationEnergyOverride === 'number' && Number.isFinite(activationEnergyOverride)) {
      return activationEnergyOverride;
    }
    const reaction = REACTION_TYPES[reactionType.toLowerCase()];
    return reaction?.activationEnergy || 30; // Default to SN2 if not found
  }, [activationEnergyOverride, reactionType]);

  const { min: kineticEnergyMin, max: kineticEnergyMax } = useMemo(
    () => getEnergyRange(activationEnergy),
    [activationEnergy]
  );

  // Calculate kinetic energy from velocity using demo-friendly scaling
  const kineticEnergy = useMemo(() => {
    return energyFromVelocityScaled(relativeVelocity, activationEnergy);
  }, [relativeVelocity, activationEnergy]);

  const [displayEnergy, setDisplayEnergy] = useState(kineticEnergy);

  useEffect(() => {
    setDisplayEnergy(kineticEnergy);
  }, [kineticEnergy]);

  const hasSufficientEnergy = displayEnergy >= activationEnergy;
  const emitVelocityChange = useRafThrottledCallback(onRelativeVelocityChange);

  // Determine bar color: red -> yellow -> green as energy increases
  const getBarColor = (): string => {
    if (displayEnergy < activationEnergy * 0.8) {
      return 'bg-red-500'; // Red for low energy
    } else if (displayEnergy < activationEnergy) {
      return 'bg-yellow-500'; // Yellow when approaching Ea
    } else {
      return 'bg-green-700 dark:bg-green-600'; // Dark forest green when above Ea
    }
  };

  // Calculate ideal kinetic energy (~5 kJ/mol above activation energy)
  const idealKineticEnergy = useMemo(() => {
    const ideal = activationEnergy + 5;
    return Math.min(Math.max(ideal, kineticEnergyMin), kineticEnergyMax);
  }, [activationEnergy, kineticEnergyMax, kineticEnergyMin]);

  // Handle slider change: convert kinetic energy to velocity for parent callback
  const handleEnergyChange = useCallback((energyKJ: number) => {
    const clampedEnergy = Math.min(Math.max(energyKJ, kineticEnergyMin), kineticEnergyMax);
    setDisplayEnergy(clampedEnergy);
    const velocity = velocityFromEnergyScaled(clampedEnergy, activationEnergy);
    emitVelocityChange(velocity);
  }, [activationEnergy, emitVelocityChange, kineticEnergyMax, kineticEnergyMin]);

  // Calculate progress bar width based on kinetic energy position in the range
  // This directly maps kinetic energy to the progress bar position
  const progressBarWidth = useMemo(() => {
    // Ensure we have valid range
    if (kineticEnergyMax <= kineticEnergyMin) {
      return 0;
    }
    
    // Calculate where current kinetic energy falls in the range
    const energyRange = kineticEnergyMax - kineticEnergyMin;
    const energyPosition = displayEnergy - kineticEnergyMin;
    
    // Convert to percentage (0-100%)
    const percentage = (energyPosition / energyRange) * 100;
    
    // Clamp between 0 and 100
    return Math.min(100, Math.max(0, percentage));
  }, [displayEnergy, kineticEnergyMin, kineticEnergyMax]);

  // Calculate activation energy marker position on the progress bar
  const activationEnergyMarkerPosition = useMemo(() => {
    if (kineticEnergyMax <= kineticEnergyMin) {
      return 0;
    }
    const energyRange = kineticEnergyMax - kineticEnergyMin;
    const activationPosition = activationEnergy - kineticEnergyMin;
    const percentage = (activationPosition / energyRange) * 100;
    return Math.min(100, Math.max(0, percentage));
  }, [activationEnergy, kineticEnergyMin, kineticEnergyMax]);

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <label className={`${cardTitleClasses} ${themeClasses.text}`}>Kinetic Energy</label>
        <InfoBubble
          term="Kinetic Energy & Activation Energy"
          explanation={`For demo clarity we scale kinetic energy to the visually trackable velocity range (0-500 m/s) while keeping the activation-energy targets intact.

Energy Comparison:
• Current KE: ${displayEnergy.toFixed(1)} kJ/mol
• Activation Energy (Eₐ): ${activationEnergy} kJ/mol
• For ${reactionType.toUpperCase()}: Eₐ ≈ ${activationEnergy} kJ/mol

Reaction Requirements:
• KE < Eₐ: Reaction unlikely (insufficient energy)
• KE ≥ Eₐ: Reaction possible (energy barrier overcome)
• KE ≥ Eₐ + 5 kJ/mol: Ideal conditions (reliable reactions)

The slider controls the scaled kinetic energy, mapping it back to a manageable collision velocity for the 3D scene.`}
          size="small"
        />
      </div>

      {/* Kinetic Energy Display - Main Focus */}
      <div className="flex items-center justify-between mb-4">
        <div className={`text-3xl font-bold ${themeClasses.text}`}>
          {displayEnergy.toFixed(1)}
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-lg font-medium ${themeClasses.textSecondary}`}>kJ/mol</div>
          <IdealButton
            isActive={displayEnergy >= idealKineticEnergy}
            onClick={() => handleEnergyChange(idealKineticEnergy)}
            activeText="Ideal"
            inactiveText="Ideal"
            themeClasses={themeClasses}
          />
        </div>
      </div>

      {/* Activation Energy Comparison */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className={themeClasses.textSecondary}>
            E<sub className="text-[1em] align-baseline relative -top-0.5">a</sub> = {activationEnergy} kJ/mol
          </span>
          <span
            className={`font-semibold ${
              hasSufficientEnergy
                ? 'text-green-800 dark:text-green-700'
                : themeClasses.textSecondary
            }`}
          >
            {hasSufficientEnergy ? 'Above Eₐ' : 'Below Eₐ'}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative">
          {/* Mark activation energy position (Ea threshold) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-500 z-10"
            style={{ 
              left: `${activationEnergyMarkerPosition}%` 
            }}
          />
          {/* Progress bar showing current kinetic energy */}
          <div
            className={`h-2 rounded-full transition-all ${getBarColor()}`}
            style={{ width: `${progressBarWidth}%` }}
          />
        </div>
      </div>

      {/* Kinetic Energy Slider */}
      <input
        type="range"
        min={kineticEnergyMin}
        max={kineticEnergyMax}
        step={ENERGY_STEP}
        value={displayEnergy}
        onChange={e => handleEnergyChange(parseFloat(e.target.value))}
        className={sliderClasses}
      />
      <div className={`${sliderLabelsClasses} ${themeClasses.textSecondary}`}>
        <span>{kineticEnergyMin.toFixed(1)} kJ/mol</span>
        <span>{((kineticEnergyMin + kineticEnergyMax) / 2).toFixed(1)} kJ/mol</span>
        <span>{kineticEnergyMax.toFixed(1)} kJ/mol</span>
      </div>
    </div>
  );
};


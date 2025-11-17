import type React from 'react';
import { useMemo, useEffect, useState } from 'react';
import { IdealButton } from '../IdealButton';
import { InfoBubble } from '../../common/InfoBubble';
import { REACTION_TYPES } from '../../../../chemistry/reactionDatabase';
import { getReactionMasses } from '../../../utils/molecularMassLookup';

// Constants for Kinetic Energy
const ENERGY_STEP = 0.5; // kJ/mol
const DEFAULT_REDUCED_MASS = 0.028; // kg/mol fallback

// Calculate velocity from kinetic energy: KE = 0.5 * m * v², so v = sqrt(2 * KE / m)
// KE in kJ/mol, convert to J/mol, then solve for v in m/s
const velocityFromEnergy = (energyKJ: number, massKG: number): number => {
  const energyJ = energyKJ * 1000; // Convert kJ/mol to J/mol
  return Math.sqrt((2 * energyJ) / massKG);
};

// Calculate kinetic energy from velocity: KE = 0.5 * m * v²
const energyFromVelocity = (velocity: number, massKG: number): number => {
  return (0.5 * massKG * velocity ** 2) / 1000; // Convert J/mol to kJ/mol
};

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
  substrate: string;
  nucleophile: string;
  activationEnergy?: number;
  themeClasses: any;
}

export const CollisionVelocityCard: React.FC<CollisionVelocityCardProps> = ({
  relativeVelocity,
  onRelativeVelocityChange,
  reactionType,
  substrate,
  nucleophile,
  activationEnergy: activationEnergyOverride,
  themeClasses,
}) => {
  const theme = controlCardThemes.red;

  // Calculate reduced mass for the current substrate/nucleophile pair
  const { substrateMass, nucleophileMass } = useMemo(
    () => getReactionMasses(substrate, nucleophile),
    [substrate, nucleophile]
  );

  const reducedMass = useMemo(() => {
    if (!substrateMass || !nucleophileMass) {
      return DEFAULT_REDUCED_MASS;
    }
    const denominator = substrateMass + nucleophileMass;
    if (denominator === 0) {
      return DEFAULT_REDUCED_MASS;
    }
    return (substrateMass * nucleophileMass) / denominator;
  }, [substrateMass, nucleophileMass]);

  // Get activation energy, preferring thermodynamic data override
  const activationEnergy = useMemo(() => {
    if (typeof activationEnergyOverride === 'number' && Number.isFinite(activationEnergyOverride)) {
      return activationEnergyOverride;
    }
    const reaction = REACTION_TYPES[reactionType.toLowerCase()];
    return reaction?.activationEnergy || 30; // Default to SN2 if not found
  }, [activationEnergyOverride, reactionType]);

  // Calculate kinetic energy from velocity
  const kineticEnergy = useMemo(() => {
    return energyFromVelocity(relativeVelocity, reducedMass);
  }, [relativeVelocity, reducedMass]);

  const [displayEnergy, setDisplayEnergy] = useState(kineticEnergy);

  useEffect(() => {
    setDisplayEnergy(kineticEnergy);
  }, [kineticEnergy]);

  const hasSufficientEnergy = displayEnergy >= activationEnergy;

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
    return activationEnergy + 5;
  }, [activationEnergy]);

  // Calculate max kinetic energy for slider range
  const kineticEnergyMax = useMemo(() => {
    return activationEnergy + 10;
  }, [activationEnergy]);

  // Calculate min kinetic energy for slider range
  const kineticEnergyMin = useMemo(() => {
    return Math.max(5, activationEnergy * 0.5);
  }, [activationEnergy]);

  // Handle slider change: convert kinetic energy to velocity for parent callback
  const handleEnergyChange = (energyKJ: number) => {
    const clampedEnergy = Math.min(Math.max(energyKJ, kineticEnergyMin), kineticEnergyMax);
    setDisplayEnergy(clampedEnergy);
    const velocity = velocityFromEnergy(clampedEnergy, reducedMass);
    onRelativeVelocityChange(velocity);
  };

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
          explanation={`Kinetic energy (KE) is the energy of motion. For a reaction to occur, molecules must collide with enough kinetic energy to overcome the activation energy barrier (Eₐ).

Kinetic Energy Formula:
KE = ½mv²

Where:
• m = reduced mass of the collision pair
• v = relative velocity between molecules

Energy Comparison:
• Current KE: ${displayEnergy.toFixed(1)} kJ/mol
• Activation Energy (Eₐ): ${activationEnergy} kJ/mol
• For ${reactionType.toUpperCase()}: Eₐ ≈ ${activationEnergy} kJ/mol

Reaction Requirements:
• KE < Eₐ: Reaction unlikely (insufficient energy)
• KE ≥ Eₐ: Reaction possible (energy barrier overcome)
• KE ≥ Eₐ + 5 kJ/mol: Ideal conditions (reliable reactions)

The slider controls collision velocity, which determines the kinetic energy available for the reaction.`}
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


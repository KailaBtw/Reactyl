import type React from 'react';
import { InfoBubble } from '../../common/InfoBubble';
import { useRafThrottledCallback } from '../../../hooks/useRafThrottledCallback';

// Constants for Temperature Slider
const TEMP_MIN = 200; // K
const TEMP_MAX = 473; // K (200°C)
const TEMP_STEP = 1;
const TEMP_ROOM = 298; // K (25°C)
const TEMP_FREEZING = 273; // K (0°C)
const TEMP_BOILING = 373; // K (100°C)
const TEMP_ACTIVATION_ENERGY = 30; // kJ/mol for SN2
const TEMP_BASE_KINETIC_ENERGY = 2.5; // kJ/mol at room temp

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold';
const sliderClasses = 'slider w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer';
const sliderLabelsClasses = 'flex justify-between text-xs mt-2';

// Color theme configuration
const controlCardThemes = {
  orange: {
    border: 'border-orange-500/20',
    gradient: 'bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10',
    accent: 'text-orange-600 dark:text-orange-400',
  },
} as const;

interface TemperatureCardProps {
  temperature: number;
  onTemperatureChange: (value: number) => void;
  themeClasses: any;
}

export const TemperatureCard: React.FC<TemperatureCardProps> = ({
  temperature,
  onTemperatureChange,
  themeClasses,
}) => {
  // Calculate relative kinetic energy (Maxwell-Boltzmann)
  const tempFactor = Math.sqrt(temperature / TEMP_ROOM);
  const kineticEnergy = tempFactor * TEMP_BASE_KINETIC_ENERGY;
  const energyRatio = kineticEnergy / TEMP_ACTIVATION_ENERGY;
  const progressWidth = Math.min(100, (tempFactor / 1.5) * 100);

  // Temperature-based progress bar color
  const getProgressColor = () => {
    if (temperature < TEMP_ROOM) return 'bg-blue-500';
    if (temperature < TEMP_BOILING) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Calculate gradient stops for temperature slider
  const tempRange = TEMP_MAX - TEMP_MIN;
  const freezingPercent = ((TEMP_FREEZING - TEMP_MIN) / tempRange) * 100;
  const roomPercent = ((TEMP_ROOM - TEMP_MIN) / tempRange) * 100;
  const boilingPercent = ((TEMP_BOILING - TEMP_MIN) / tempRange) * 100;

  // Temperature description helper
  const getTempDescription = () => {
    if (temperature < TEMP_MIN) return 'Cryogenic - extremely slow';
    if (temperature < TEMP_FREEZING) return 'Very cold - very slow reactions';
    if (temperature < TEMP_ROOM) return 'Cold - slow reactions';
    if (temperature < 310) return 'Room temperature - typical lab conditions';
    if (temperature < TEMP_BOILING) return 'Warm - increased reaction rate';
    return 'Hot - fast reactions';
  };

  const theme = controlCardThemes.orange;
  const emitTemperatureChange = useRafThrottledCallback(onTemperatureChange);

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <label className={`${cardTitleClasses} ${themeClasses.text}`}>Temperature</label>
        <InfoBubble
          term="Temperature & Molecular Velocity"
          explanation={`Temperature controls molecular motion through the Maxwell-Boltzmann distribution. 

Theoretical Relationship:
v_rms = √(3kT/m)

Where:
• v_rms = root mean square velocity
• k = Boltzmann constant (1.38 × 10⁻²³ J/K)
• T = temperature in Kelvin
• m = molecular mass

In this simulation, all molecules use:
v = baseSpeed × √(T/T_ref)

Where baseSpeed = 60.0 m/s and T_ref = 298K (room temperature).

Examples:
• 200K (cryogenic): v = 60.0 × √(200/298) ≈ 49.1 m/s
• 298K (room temp): v = 60.0 × √(298/298) = 60.0 m/s
• 473K (200°C): v = 60.0 × √(473/298) ≈ 75.5 m/s

Doubling temperature increases velocity by √2 ≈ 1.41×. At higher temperatures, molecules move faster and collide more frequently, increasing reaction rates according to the Arrhenius equation:

k = A·e^(-Ea/RT)

Where reaction rate k increases exponentially with temperature T.`}
          size="small"
        />
      </div>

      {/* Temperature Display - Dual Units */}
      <div className="flex items-baseline gap-2 mb-3">
        <div className={`text-3xl font-bold ${themeClasses.text}`}>
          {Math.round(temperature - 273.15)}
        </div>
        <div className={`text-lg font-medium ${themeClasses.textSecondary}`}>°C</div>
        <div className={`text-lg font-medium ${themeClasses.textSecondary} ml-2`}>
          ({temperature} K)
        </div>
      </div>

      {/* Kinetic Energy Indicator */}
      <div className="mb-3 text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className={themeClasses.textSecondary}>Molecular Kinetic Energy</span>
          <span
            className={`font-medium ${
              energyRatio >= 0.1 ? theme.accent : themeClasses.textSecondary
            }`}
          >
            {kineticEnergy.toFixed(1)} kJ/mol
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${getProgressColor()}`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      {/* Temperature Slider */}
      <input
        type="range"
        min={TEMP_MIN}
        max={TEMP_MAX}
        step={TEMP_STEP}
        value={temperature}
        onChange={e => emitTemperatureChange(parseInt(e.target.value))}
        className={sliderClasses}
        style={{
          background: `linear-gradient(to right, 
            #1e40af 0%, 
            #1e40af ${freezingPercent}%,
            #3b82f6 ${freezingPercent}%,
            #3b82f6 ${roomPercent}%,
            #f97316 ${roomPercent}%,
            #f97316 ${boilingPercent}%,
            #ef4444 ${boilingPercent}%,
            #dc2626 100%)`,
        }}
      />

      {/* Lab Temperature Markers */}
      <div className={`${sliderLabelsClasses} ${themeClasses.textSecondary}`}>
        <div className="text-center">
          <div className="text-blue-800 font-medium">Cryogenic</div>
          <div className="text-blue-700">-73°C</div>
        </div>
        <div className="text-center">
          <div className="text-blue-700 font-medium">Ice Bath</div>
          <div className="text-blue-600">0°C</div>
        </div>
        <div className="text-center">
          <div className="text-green-700 font-medium">Room</div>
          <div className="text-green-600">25°C</div>
        </div>
        <div className="text-center">
          <div className="text-orange-600 font-medium">Boiling</div>
          <div className="text-orange-500">100°C</div>
        </div>
        <div className="text-center">
          <div className="text-red-600 font-medium">High Temp</div>
          <div className="text-red-500">200°C</div>
        </div>
      </div>

      {/* Scientific Info */}
      <div className={`mt-3 text-xs italic ${themeClasses.textSecondary}`}>
        {getTempDescription()}
      </div>
    </div>
  );
};


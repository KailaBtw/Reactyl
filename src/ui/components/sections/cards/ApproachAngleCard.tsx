import type React from 'react';
import { useMemo } from 'react';
import { IdealButton } from '../IdealButton';
import { InfoBubble } from '../../common/InfoBubble';

// Constants for Approach Angle
const ANGLE_IDEAL_SN2 = 180; // Backside attack for SN2
const ANGLE_TOLERANCE = 5; // Within 5 degrees is considered ideal
const SIGMA = 60; // Standard deviation for orientation factor (matches reactionDetector.ts)

// Calculate orientation factor for a given angle (Gaussian distribution)
const calculateOrientationFactor = (angle: number, optimal: number): number => {
  let deviation = Math.abs(angle - optimal);
  if (deviation > 180) {
    deviation = 360 - deviation;
  }
  // Gaussian: exp(-(x-μ)²/(2σ²)) where μ = optimal, σ = tolerance
  return Math.exp(-(deviation ** 2) / (2 * SIGMA ** 2));
};

// Get color zone for an angle based on orientation factor
const getAngleZone = (angle: number, optimal: number): 'excellent' | 'good' | 'moderate' | 'poor' => {
  const factor = calculateOrientationFactor(angle, optimal);
  if (factor >= 0.7) return 'excellent';
  if (factor >= 0.4) return 'good';
  if (factor >= 0.15) return 'moderate';
  return 'poor';
};

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold';
const sliderClasses = 'slider w-full h-2 rounded-lg appearance-none cursor-pointer relative z-10';
const sliderLabelsClasses = 'flex justify-between text-xs mt-1';

// Color theme configuration
const controlCardThemes = {
  indigo: {
    border: 'border-indigo-500/20',
    gradient: 'bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 dark:from-indigo-950/20 dark:to-indigo-900/10',
    accent: 'text-indigo-600 dark:text-indigo-400',
  },
} as const;

// Clear color zones for angle ranges (scientifically accurate)
const angleZoneColors = {
  excellent: 'bg-emerald-200 dark:bg-emerald-700',  // 135°-180°: Strong orbital overlap
  good: 'bg-lime-200 dark:bg-lime-700',              // 100°-135°: Moderate overlap
  moderate: 'bg-amber-200 dark:bg-amber-300',        // 70°-100°: Weak overlap
  poor: 'bg-rose-200 dark:bg-rose-600',              // <70°: Blocked
};

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

  // Calculate current orientation factor for display
  const currentOrientationFactor = useMemo(
    () => calculateOrientationFactor(attackAngle, idealAngle),
    [attackAngle, idealAngle]
  );

  // Generate color zones for the slider background
  const colorZones = useMemo(() => {
    const zones: Array<{ start: number; end: number; zone: 'excellent' | 'good' | 'moderate' | 'poor' }> = [];
    
    // Sample every 2 degrees for smooth transitions
    for (let angle = 0; angle <= 180; angle += 2) {
      const zone = getAngleZone(angle, idealAngle);
      const lastZone = zones[zones.length - 1];
      
      if (!lastZone || lastZone.zone !== zone) {
        // Start new zone
        if (lastZone) {
          lastZone.end = angle;
        }
        zones.push({ start: angle, end: angle + 2, zone });
      }
    }
    
    // Close the last zone
    if (zones.length > 0) {
      zones[zones.length - 1].end = 180;
    }
    
    return zones;
  }, [idealAngle]);

  // Get angle description
  const getAngleDescription = () => {
    if (currentOrientationFactor >= 0.7) return 'Excellent backside attack - high reaction probability';
    if (currentOrientationFactor >= 0.4) return 'Good approach angle - moderate reaction probability';
    if (currentOrientationFactor >= 0.15) return 'Weak orbital overlap - low reaction probability';
    return 'Poor approach - sterically blocked, minimal reaction';
  };

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <label className={`${cardTitleClasses} ${themeClasses.text}`}>Approach Angle</label>
        <InfoBubble
          term="SN2 Approach Angle"
          explanation={`The approach angle determines how the nucleophile attacks the substrate. For SN2 reactions, backside attack (180°) is required for optimal orbital overlap.

Orbital Overlap Zones:
• 135°-180° (Excellent): Strong HOMO-LUMO overlap, high reaction probability
• 100°-135° (Good): Moderate overlap, reactions possible
• 70°-100° (Moderate): Weak overlap, rare reactions
• <70° (Poor): Sterically/electronically blocked

SN2 Mechanism:
The nucleophile's HOMO (Highest Occupied Molecular Orbital) must overlap with the C-X σ* antibonding orbital. Frontal attack is blocked by electron repulsion from the leaving group's lone pairs.

Gaussian Distribution:
Orientation factor = exp(-(deviation)²/(2σ²))
Where σ = 60° (standard deviation matching realistic reaction conditions)`}
          size="small"
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className={`text-3xl font-bold ${themeClasses.text}`}>
          {attackAngle}°
        </div>
        <IdealButton
          isActive={isIdeal}
          onClick={() => onAttackAngleChange(idealAngle)}
          activeText="Ideal"
          inactiveText="Ideal"
          themeClasses={themeClasses}
        />
      </div>

      {/* Angle Slider with Colored Background */}
      <div className="mb-1 relative">
        {/* Colored background zones */}
        <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 rounded-lg overflow-hidden flex">
          {colorZones.map((zone, index) => (
            <div
              key={index}
              className={angleZoneColors[zone.zone]}
              style={{
                width: `${((zone.end - zone.start) / 180) * 100}%`,
              }}
              title={`${zone.zone}: ${zone.start}°-${zone.end}°`}
            />
          ))}
        </div>
        
        {/* Slider input */}
        <input
          type="range"
          min="0"
          max="180"
          value={attackAngle}
          onChange={e => onAttackAngleChange(parseInt(e.target.value))}
          className={`${sliderClasses} bg-transparent`}
          style={{
            background: 'transparent',
          }}
        />
      </div>
        
      {/* Labels */}
      <div className={`${sliderLabelsClasses} ${themeClasses.textSecondary} mb-3`}>
        <span>0° (Front)</span>
        <span>90° (Side)</span>
        <span>180° (Back)</span>
      </div>

      {/* Brief Description */}
      <div className={`text-xs italic ${themeClasses.textSecondary}`}>
        {getAngleDescription()}
      </div>
    </div>
  );
};

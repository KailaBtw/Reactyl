import type React from 'react';
import { getReactionMasses } from '../../utils/molecularMassLookup';
import { PlotlyEnergyProfile } from '../ScientificallyAccuratePlotlyEnergyProfile';

// Card styling constants - matching rate metrics cards style
// Card wraps content, doesn't force full height
const energyCardClasses = [
  'rounded-lg',
  'border',
  'border-blue-500/20',
  'bg-gradient-to-br',
  'from-blue-50/50',
  'to-blue-100/30',
  'dark:from-blue-950/20',
  'dark:to-blue-900/10',
  'flex',
  'flex-col',
  'relative',
  'w-full', // Card takes full width
  'p-0', // Padding inside card
].join(' ');

interface BottomEnergyPanelProps {
  height?: number;
  thermodynamicData: {
    activationEnergy: number;
    enthalpyOfFormation: number;
    reactantEnergy: number;
    productEnergy: number;
    transitionStateEnergy: number;
  };
  isPlaying: boolean;
  themeClasses: any;
  reactionType?: string;
  reactionProgress?: number;
  currentVelocity?: number;
  substrate?: string;
  nucleophile?: string;
  substrateMass?: number;
  nucleophileMass?: number;
  attackAngle?: number;
  timeScale?: number;
  reactionProbability?: number; // 0..100 percent
}

export const BottomEnergyPanel: React.FC<BottomEnergyPanelProps> = ({
  height = 250,
  thermodynamicData,
  isPlaying,
  themeClasses,
  reactionType = 'SN2',
  reactionProgress = 0,
  currentVelocity = 0,
  substrate = 'demo_Methyl_bromide',
  nucleophile = 'demo_Hydroxide_ion',
  substrateMass: propSubstrateMass,
  nucleophileMass: propNucleophileMass,
  attackAngle = 180,
  timeScale = 0.8,
  reactionProbability = 0,
}) => {
  // Use provided molecular masses or fallback to lookup
  const substrateMass =
    propSubstrateMass || getReactionMasses(substrate, nucleophile).substrateMass;
  const nucleophileMass =
    propNucleophileMass || getReactionMasses(substrate, nucleophile).nucleophileMass;
  return (
    <div className={`border-t ${themeClasses.card} h-full flex flex-col items-center justify-center relative`}>
      {/* Styled card wrapper matching rate metrics cards - wraps graph content */}
      <div className={energyCardClasses}>
        {/* Title */}
        <div className="mb-1 flex-shrink-0 px-1 pt-1">
          <h3 className={`text-sm font-semibold ${themeClasses.text} m-0`}>
            Activation Energy Profile
          </h3>
        </div>
        {/* Graph container - resizes based on bottom panel height, card wraps it */}
        <div className="flex flex-col items-center justify-center overflow-hidden px-1 pb-1 w-full" style={{ height: 'calc(100% - 2rem)' }}>
          <div 
            className="w-full h-full relative"
            style={{ 
              aspectRatio: '2 / 1',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            <PlotlyEnergyProfile
              data={{
                reactantEnergy: thermodynamicData.reactantEnergy,
                activationEnergy: thermodynamicData.activationEnergy,
                enthalpyChange: thermodynamicData.enthalpyOfFormation,
                reactionProgress: reactionProgress,
                reactionType: reactionType,
                currentVelocity: currentVelocity,
                attackAngle: attackAngle,
                substrateMass: substrateMass,
                nucleophileMass: nucleophileMass,
              }}
              isAnimating={isPlaying}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

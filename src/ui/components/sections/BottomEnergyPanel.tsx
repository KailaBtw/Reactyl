import type React from 'react';
import { getReactionMasses } from '../../utils/molecularMassLookup';
import { PlotlyEnergyProfile } from '../ScientificallyAccuratePlotlyEnergyProfile';

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
    <div className={`border-t ${themeClasses.card} h-full flex flex-col relative`}>
      {/* Title in top left corner */}
      <div className={`absolute top-2 left-3 z-10 ${themeClasses.card} px-2 py-0.5 rounded`}>
        <h3 className={`text-xs font-semibold ${themeClasses.text} m-0`}>
          Activation Energy Profile
        </h3>
      </div>
      {/* Graph container with aspect ratio and minimal padding */}
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center p-1">
        <div 
          className="w-full h-full relative"
          style={{ 
            aspectRatio: '2 / 1',
            maxWidth: '100%',
            maxHeight: '100%',
            padding: '4px'
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
  );
};

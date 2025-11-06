import React from 'react';
import { PlotlyEnergyProfile } from '../ScientificallyAccuratePlotlyEnergyProfile';
import { getReactionMasses } from '../../utils/molecularMassLookup';

interface BottomEnergyPanelProps {
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
  reactionProbability = 0
}) => {
  // Use provided molecular masses or fallback to lookup
  const substrateMass = propSubstrateMass || getReactionMasses(substrate, nucleophile).substrateMass;
  const nucleophileMass = propNucleophileMass || getReactionMasses(substrate, nucleophile).nucleophileMass;
  return (
    <div className={`border-t ${themeClasses.card}`}>
      <div className="flex flex-col lg:flex-row gap-2 p-2">
        {/* Energy Profile Graph */}
        <div className="w-full">
          <div className={`${themeClasses.card} border rounded-lg overflow-hidden h-full`}>
            <div className={`p-2 border-b ${themeClasses.card}`}>
              <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Activation Energy Profile</h3>
            </div>
            <div className="px-1 py-0">
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
            nucleophileMass: nucleophileMass
          }}
          isAnimating={isPlaying}
          width={450}
          height={200}
        />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

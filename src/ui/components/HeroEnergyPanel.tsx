import type React from 'react';
import { ScientificEnergyCurve } from './ScientificEnergyCurve';

interface ThermodynamicData {
  reactantEnergy: number; // kJ/mol
  productEnergy: number; // kJ/mol
  activationEnergy: number; // kJ/mol (Ea)
  reactionProgress: number; // 0-1 (current position along reaction coordinate)
  temperature: number; // Kelvin
}

interface EnergyProfilePanelProps {
  thermodynamicData: ThermodynamicData;
  isPlaying: boolean;
  themeClasses: {
    card: string;
    text: string;
    textSecondary: string;
    button: string;
  };
}

export const EnergyProfilePanel: React.FC<HeroEnergyPanelProps> = ({
  thermodynamicData,
  isPlaying,
  themeClasses,
}) => {
  return (
    <div className={`border-t ${themeClasses.card}`}>
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Left Panel: Live Stats */}
        <div className="lg:w-1/3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="space-y-2">
            {/* Live Stats */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  <span className="hidden md:inline">Activation Energy</span>
                  <span className="md:hidden">Ea</span>
                </span>
                <span className="text-sm font-mono font-bold text-red-600">
                  {thermodynamicData.activationEnergy.toFixed(1)} kJ/mol
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  <span className="hidden md:inline">Enthalpy Change</span>
                  <span className="md:hidden">ΔH</span>
                </span>
                <span className="text-sm font-mono font-bold text-green-600">
                  {thermodynamicData.productEnergy.toFixed(1)} kJ/mol
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-mono font-bold text-blue-600">
                  {Math.round(thermodynamicData.reactionProgress * 100)}%
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  <span className="hidden md:inline">Current Energy</span>
                  <span className="md:hidden">Current</span>
                </span>
                <span className="text-sm font-mono font-bold text-orange-600">
                  {(
                    thermodynamicData.reactantEnergy +
                    thermodynamicData.activationEnergy * thermodynamicData.reactionProgress
                  ).toFixed(1)}{' '}
                  kJ/mol
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="pt-2 border-t border-gray-300">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">Reaction Active</span>
              </div>

              <div className="bg-green-50 border border-green-200 rounded px-2 py-1">
                <div className="text-xs text-green-800">✅ Sufficient energy - Will react</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Graph - Responsive */}
        <div className="lg:w-2/3 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="w-full h-full">
            <ScientificEnergyCurve
              data={thermodynamicData}
              isAnimating={isPlaying}
              width={600}
              height={180}
              showLabels={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

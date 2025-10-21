import React from 'react';
import { PlotlyActivationCurve } from '../PlotlyActivationCurve';

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
}

export const BottomEnergyPanel: React.FC<BottomEnergyPanelProps> = ({
  thermodynamicData,
  isPlaying,
  themeClasses,
  reactionType = 'SN2',
  reactionProgress = 0,
  currentVelocity = 0
}) => {
  return (
    <div className={`border-t ${themeClasses.card}`}>
      <div className="flex flex-col lg:flex-row gap-2 p-2">
        {/* Live Data Panel */}
        <div className="lg:w-1/3 w-full">
          <div className={`${themeClasses.card} border rounded-lg p-2 h-full`}>
            <h3 className={`text-sm font-semibold ${themeClasses.text} mb-2 flex items-center gap-2`}>
              Live Data
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </h3>
            
            {/* Data Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Activation Energy */}
              <div className="bg-white border border-gray-200 rounded p-2">
                <div className="text-xs text-gray-500">Activation Energy</div>
                <div className="text-lg font-mono font-bold text-red-600">{thermodynamicData.activationEnergy.toFixed(1)}</div>
                <div className="text-xs text-gray-400">kJ/mol</div>
              </div>
              
              {/* Enthalpy Change */}
              <div className="bg-white border border-gray-200 rounded p-2">
                <div className="text-xs text-gray-500">Enthalpy Change</div>
                <div className="text-lg font-mono font-bold text-green-600">{thermodynamicData.enthalpyOfFormation.toFixed(1)}</div>
                <div className="text-xs text-gray-400">kJ/mol</div>
              </div>
              
              {/* Progress */}
              <div className="bg-white border border-gray-200 rounded p-2">
                <div className="text-xs text-gray-500">Reaction Progress</div>
                <div className="text-lg font-mono font-bold text-blue-600">0%</div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div className="bg-blue-500 h-1 rounded-full" style={{width: '0%'}}></div>
                </div>
              </div>
              
              {/* Current Energy */}
              <div className="bg-white border border-gray-200 rounded p-2">
                <div className="text-xs text-gray-500">Current Energy</div>
                <div className="text-lg font-mono font-bold text-orange-600">0.0</div>
                <div className="text-xs text-gray-400">kJ/mol</div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Energy Profile Graph */}
        <div className="lg:w-2/3 w-full">
          <div className={`${themeClasses.card} border rounded-lg overflow-hidden h-full`}>
            <div className={`p-2 border-b ${themeClasses.card}`}>
              <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Activation Energy Profile</h3>
            </div>
            <div className="p-1">
              <PlotlyActivationCurve
                data={{
                  reactantEnergy: thermodynamicData.reactantEnergy,
                  activationEnergy: thermodynamicData.activationEnergy,
                  enthalpyChange: thermodynamicData.enthalpyOfFormation,
                  reactionProgress: reactionProgress,
                  reactionType: reactionType,
                  currentVelocity: currentVelocity
                }}
                isAnimating={isPlaying}
                width={600}
                height={120}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

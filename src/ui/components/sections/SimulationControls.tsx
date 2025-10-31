import React from 'react';
import { calculateAngleProbability } from '../../utils/angleProbability';

interface SimulationControlsProps {
  isPlaying: boolean;
  timeScale: number;
  currentReaction: string;
  attackAngle: number;
  relativeVelocity: number;
  temperature: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onTimeScaleChange: (value: number) => void;
  autoplay: boolean;
  onAutoplayChange: (enabled: boolean) => void;
  themeClasses: any;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isPlaying,
  timeScale,
  currentReaction,
  attackAngle,
  relativeVelocity,
  temperature,
  onPlay,
  onPause,
  onReset,
  onTimeScaleChange,
  autoplay,
  onAutoplayChange,
  themeClasses
}) => {
  // Calculate reaction status based on current parameters
  const calculateReactionStatus = () => {
    // Calculate kinetic energy (simplified)
    const velocityScale = relativeVelocity / 500;
    const maxKineticEnergy = 40; // kJ/mol
    const kineticEnergy = velocityScale * maxKineticEnergy;
    
    // Apply temperature factor
    const temperatureFactor = Math.sqrt(temperature / 298);
    const adjustedKineticEnergy = kineticEnergy * temperatureFactor;
    
    // Get angle probability
    const angleResult = calculateAngleProbability(attackAngle, currentReaction);
    
    // Calculate overall probability
    const activationEnergy = 30; // kJ/mol
    const energyRatio = adjustedKineticEnergy / activationEnergy;
    
    let energyProbability = 0;
    if (energyRatio >= 1.0) {
      energyProbability = 0.95;
    } else if (energyRatio >= 0.9) {
      energyProbability = 0.7;
    } else if (energyRatio >= 0.8) {
      energyProbability = 0.4;
    } else if (energyRatio >= 0.6) {
      energyProbability = 0.1;
    } else {
      energyProbability = 0.01;
    }
    
    const overallProbability = energyProbability * angleResult.probability;
    
    // Determine status
    if (overallProbability > 0.7) {
      return {
        status: 'Reaction Ready',
        message: 'Optimal conditions',
        color: 'green',
        dotColor: 'bg-green-500'
      };
    } else if (overallProbability > 0.3) {
      return {
        status: 'Poor Conditions',
        message: 'Low reaction probability',
        color: 'orange',
        dotColor: 'bg-orange-500'
      };
    } else {
      return {
        status: 'No Reaction',
        message: 'Insufficient energy or poor angle',
        color: 'red',
        dotColor: 'bg-red-500'
      };
    }
  };
  
  const reactionStatus = calculateReactionStatus();
  return (
    <section className={`p-5 border-b ${themeClasses.card.includes('border-') ? themeClasses.card.split(' ').find((cls: string) => cls.startsWith('border-')) : 'border-gray-100'}`}>
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${themeClasses.text}`}>
        Simulation
      </h3>
      <div className="space-y-3">
        {/* Status Indicator */}
        <div className={`${themeClasses.card} border rounded p-3 transition-all duration-300 ${
          reactionStatus.color === 'green' ? 'border-green-200 bg-green-50' :
          reactionStatus.color === 'orange' ? 'border-orange-200 bg-orange-50' :
          'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 ${reactionStatus.dotColor} rounded-full`}></div>
            <span className={`text-sm font-medium ${
              reactionStatus.color === 'green' ? 'text-green-800' :
              reactionStatus.color === 'orange' ? 'text-orange-800' :
              'text-red-800'
            }`}>{reactionStatus.status}</span>
          </div>
          <div className={`text-xs mt-1 ${
            reactionStatus.color === 'green' ? 'text-green-600' :
            reactionStatus.color === 'orange' ? 'text-orange-600' :
            'text-red-600'
          }`}>
            {reactionStatus.message}
          </div>
        </div>
        
        {/* Speed Control */}
        <div>
          <label className={`block text-xs font-medium mb-2 ${themeClasses.textSecondary}`}>
            Playback Speed: {timeScale.toFixed(1)}x
          </label>
          <input 
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={timeScale}
            onChange={(e) => onTimeScaleChange(parseFloat(e.target.value))}
            className="slider w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Slow Motion</span>
            <span>Fast Forward</span>
          </div>
        </div>
        
        {/* Play/Pause and Reset Buttons */}
        <div className="flex gap-2">
          <button 
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer transition-all font-medium transform hover:scale-105 active:scale-95 ${
              isPlaying 
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500 shadow-red-200 shadow-md' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-blue-200 shadow-md'
            }`}
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button 
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer transition-all font-medium transform hover:scale-105 active:scale-95 bg-gradient-to-r from-red-400 to-orange-500 text-white border-red-400 shadow-red-200 shadow-md`}
            onClick={onReset}
          >
            <span>🔄</span>
            Reset
          </button>
        </div>

        {/* Autoplay toggle under the buttons */}
        <div className="mt-2">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={autoplay} onChange={(e) => onAutoplayChange(e.target.checked)} />
            Autoplay
          </label>
        </div>
      </div>
    </section>
  );
};

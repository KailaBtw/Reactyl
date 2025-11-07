import React from 'react';
import { InfoBubble } from '../common/InfoBubble';

interface PressureControlProps {
  pressure: number; // in atm
  onPressureChange?: (value: number) => void;
  themeClasses: any;
}

export const PressureControl: React.FC<PressureControlProps> = ({
  pressure = 1.0,
  onPressureChange,
  themeClasses
}) => {
  // Pressure range: 0.1 atm (vacuum) to 10 atm (high pressure)
  const minPressure = 0.1;
  const maxPressure = 10.0;
  
  // Calculate pressure factor for visualization
  const pressureFactor = pressure / 1.0; // Normalized to 1 atm
  
  return (
    <section className="p-4 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10">
      <div className="mb-3 flex items-center gap-2">
        <label className={`text-sm font-semibold ${themeClasses.text}`}>
          Pressure
        </label>
        <InfoBubble
          term="Pressure & Reaction Rate"
          explanation={`Pressure affects reaction rates by changing the frequency of molecular collisions.

Ideal Gas Law: PV = nRT
• Higher pressure → more molecules per unit volume
• More molecules → more collisions per second
• More collisions → higher reaction rate

For gas-phase reactions:
Rate ∝ P^n (where n = reaction order)

For bimolecular reactions (like SN2):
Rate ∝ P² (collision frequency increases quadratically)

In this simulation, pressure affects:
• Collision frequency between molecules
• Overall reaction rate
• Molecular density in the container

Standard conditions: 1 atm at 25°C`}
          size="small"
        />
      </div>
      
      {/* Pressure Display */}
      <div className="flex items-baseline gap-2 mb-3">
        <div className={`text-3xl font-bold ${themeClasses.text}`}>
          {pressure.toFixed(2)}
        </div>
        <div className={`text-lg font-medium text-gray-600 dark:text-gray-400`}>
          atm
        </div>
      </div>

      {/* Pressure Effect Indicator */}
      {(() => {
        const collisionFrequency = pressureFactor * pressureFactor; // Quadratic for bimolecular
        const maxCollisionFreq = maxPressure * maxPressure;
        const normalizedFreq = (collisionFrequency / maxCollisionFreq) * 100;
        
        return (
          <div className="mb-3 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className={`${themeClasses.textSecondary}`}>Collision Frequency</span>
              <span className={`font-medium ${pressureFactor >= 1 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'}`}>
                {collisionFrequency.toFixed(2)}×
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all ${
                  pressure < 0.5 ? 'bg-blue-500' :
                  pressure < 1.0 ? 'bg-purple-400' :
                  pressure < 5.0 ? 'bg-purple-500' :
                  'bg-purple-600'
                }`}
                style={{ width: `${Math.min(100, normalizedFreq)}%` }}
              />
            </div>
          </div>
        );
      })()}
      
      {/* Pressure Slider */}
      <input 
        type="range"
        min={minPressure}
        max={maxPressure}
        step="0.1"
        value={pressure}
        onChange={(e) => onPressureChange?.(parseFloat(e.target.value))}
        className="slider w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, 
            #3b82f6 0%, 
            #3b82f6 ${((0.5 - minPressure) / (maxPressure - minPressure)) * 100}%,
            #a855f7 ${((1.0 - minPressure) / (maxPressure - minPressure)) * 100}%,
            #a855f7 ${((5.0 - minPressure) / (maxPressure - minPressure)) * 100}%,
            #9333ea ${((5.0 - minPressure) / (maxPressure - minPressure)) * 100}%,
            #9333ea 100%)`
        }}
      />
      
      {/* Pressure Markers */}
      <div className={`flex justify-between text-xs ${themeClasses.textSecondary} mt-2`}>
        <div className="text-center">
          <div className="text-blue-700 font-medium">Vacuum</div>
          <div className="text-blue-600">0.1 atm</div>
        </div>
        <div className="text-center">
          <div className="text-purple-700 font-medium">Standard</div>
          <div className="text-purple-600">1.0 atm</div>
        </div>
        <div className="text-center">
          <div className="text-purple-600 font-medium">High</div>
          <div className="text-purple-500">10 atm</div>
        </div>
      </div>
      
      {/* Scientific Info */}
      <div className={`mt-3 text-xs italic ${themeClasses.textSecondary}`}>
        {pressure < 0.5 ? 'Low pressure - fewer collisions' :
         pressure < 1.0 ? 'Below standard - reduced rate' :
         pressure < 2.0 ? 'Standard pressure - normal rate' :
         pressure < 5.0 ? 'Elevated - increased collision frequency' :
         'High pressure - very fast reactions'}
      </div>
    </section>
  );
};


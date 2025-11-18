import type React from 'react';
import { InfoBubble } from './common/InfoBubble';

interface CollisionInfoBubbleProps {
  temperature: number;
  themeClasses: any;
}

export const CollisionInfoBubble: React.FC<CollisionInfoBubbleProps> = ({
  temperature,
  themeClasses,
}) => {
  const temperatureC = Math.round(temperature - 273);
  
  return (
    <div className={`${themeClasses.card} border rounded-lg p-4 mb-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔥</span>
        <h3 className={`${themeClasses.text} text-sm font-semibold`}>
          Reaction Kinetics
        </h3>
        <InfoBubble
          term="Temperature Effects"
          explanation={`Temperature affects reaction rate by increasing molecular kinetic energy. Higher temperatures cause molecules to move faster, collide more frequently, and have more energy to overcome the activation energy barrier. As a rule of thumb, a 10°C increase can approximately double the reaction rate for many reactions.`}
          size="small"
        />
      </div>
      
      <div className={`${themeClasses.textSecondary} text-xs space-y-2`}>
        <div>
          <strong>Current Temperature:</strong> {temperatureC}°C ({temperature}K)
        </div>
        
        <div>
          <strong>Molecular Speed:</strong> Molecules move at ~{Math.round(Math.sqrt(temperature / 298) * 280)} m/s (real), {Math.round(Math.sqrt(temperature / 298) * 60)} m/s (visualization)
          <br />
          <span className="text-xs opacity-75">
            (scales with √temperature via Maxwell-Boltzmann distribution)
          </span>
        </div>
        
        <div>
          <strong>Collision Energy:</strong> Higher temperature → higher kinetic energy → more energy available to overcome activation barrier
        </div>
        
        <div className={`${themeClasses.card} border-l-4 border-blue-500 pl-3 py-2 mt-2`}>
          <div className="text-xs">
            <strong>💡 Tip:</strong> Increase temperature to see more reactions! Higher temperatures increase both collision frequency and energy, dramatically increasing reaction rate.
          </div>
        </div>
      </div>
    </div>
  );
};


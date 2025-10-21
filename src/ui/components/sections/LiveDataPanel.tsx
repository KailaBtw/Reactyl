import React from 'react';

interface LiveDataPanelProps {
  relativeVelocity: number;
  onRelativeVelocityChange: (value: number) => void;
  themeClasses: any;
}

export const LiveDataPanel: React.FC<LiveDataPanelProps> = ({
  relativeVelocity,
  onRelativeVelocityChange,
  themeClasses
}) => {
  return (
    <section className="p-5">
      <h3 className="text-base font-semibold mb-4 text-gray-800 flex items-center gap-2">
        REACTION PARAMETERS
      </h3>
      <div className="space-y-4">
        {/* Relative Velocity Slider */}
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-500">
            Relative Velocity: {relativeVelocity.toFixed(1)} m/s
          </label>
          <input 
            type="range"
            min="50"
            max="500"
            step="10"
            value={relativeVelocity}
            onChange={(e) => onRelativeVelocityChange(parseFloat(e.target.value))}
            className="slider w-full h-1"
          />
        </div>
      </div>
    </section>
  );
};

import React from 'react';

interface SimulationControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  themeClasses: any;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isPlaying,
  onPlay,
  onPause,
  onReset,
  themeClasses
}) => {
  return (
    <section className={`p-5 border-b ${themeClasses.card.includes('border-') ? themeClasses.card.split(' ').find(cls => cls.startsWith('border-')) : 'border-gray-100'}`}>
      <h3 className={`text-base font-semibold mb-3 flex items-center gap-2 ${themeClasses.text}`}>
        SIMULATION
      </h3>
      <div className="space-y-3">
        {/* Status Indicator */}
        <div className={`${themeClasses.card} border rounded p-3`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className={`text-sm font-medium ${themeClasses.text}`}>Reaction Ready</span>
          </div>
          <div className={`text-xs ${themeClasses.textSecondary} mt-1`}>
            Sufficient activation energy
          </div>
        </div>
        
        {/* Play/Pause and Reset Buttons */}
        <div className="flex gap-2">
          <button 
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer transition-all font-medium ${
              isPlaying 
                ? 'bg-red-500 text-white border-red-500 shadow-sm' 
                : 'bg-green-500 text-white border-green-500 shadow-sm'
            }`}
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button 
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer transition-all font-medium ${themeClasses.button}`}
            onClick={onReset}
          >
            <span>🔄</span>
            Reset
          </button>
        </div>
      </div>
    </section>
  );
};

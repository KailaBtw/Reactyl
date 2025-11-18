import type React from 'react';
import { ConcentrationCard } from './cards/ConcentrationCard';
import { ReactionMoleculesCard } from './cards/ReactionMoleculesCard';
import { SimulationControlsCard } from './cards/SimulationControlsCard';
import { TemperatureCard } from './cards/TemperatureCard';

// Container spacing
const containerClasses = 'space-y-4 p-4';

interface RateModeSidebarProps {
  currentReaction: string;
  substrate: string;
  nucleophile: string;
  temperature: number;
  concentration: number;
  isPlaying: boolean;
  timeScale: number;
  reactionProbability: number;
  onReactionChange: (reaction: string) => void;
  onSubstrateChange: (substrate: string) => void;
  onNucleophileChange: (nucleophile: string) => void;
  onTemperatureChange: (value: number) => void;
  onConcentrationChange: (value: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onTimeScaleChange: (value: number) => void;
  autoplay: boolean;
  onAutoplayChange: (enabled: boolean) => void;
  themeClasses: any;
}

export const RateModeSidebar: React.FC<RateModeSidebarProps> = ({
  currentReaction,
  substrate,
  nucleophile,
  temperature,
  concentration,
  isPlaying,
  timeScale,
  reactionProbability,
  onReactionChange,
  onSubstrateChange,
  onNucleophileChange,
  onTemperatureChange,
  onConcentrationChange,
  onPlay,
  onPause,
  onReset,
  onTimeScaleChange,
  autoplay,
  onAutoplayChange,
  themeClasses,
}) => {
  return (
    <div className={containerClasses}>
      {/* Reaction Type, Substrate, and Nucleophile Card */}
      <ReactionMoleculesCard
        currentReaction={currentReaction}
        substrate={substrate}
        nucleophile={nucleophile}
        onReactionChange={onReactionChange}
        onSubstrateChange={onSubstrateChange}
        onNucleophileChange={onNucleophileChange}
        themeClasses={themeClasses}
      />

      {/* Concentration Card */}
      <ConcentrationCard
        concentration={concentration}
        onConcentrationChange={onConcentrationChange}
        themeClasses={themeClasses}
      />

      {/* Temperature Card */}
      <TemperatureCard
        temperature={temperature}
        onTemperatureChange={onTemperatureChange}
        themeClasses={themeClasses}
      />

      {/* Simulation Controls */}
      <SimulationControlsCard
        isPlaying={isPlaying}
        timeScale={timeScale}
        reactionProbability={reactionProbability}
        simulationMode="rate"
        onPlay={onPlay}
        onPause={onPause}
        onReset={onReset}
        onTimeScaleChange={onTimeScaleChange}
        autoplay={autoplay}
        onAutoplayChange={onAutoplayChange}
        themeClasses={themeClasses}
      />
    </div>
  );
};



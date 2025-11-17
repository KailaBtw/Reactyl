import type React from 'react';
import { ApproachAngleCard } from './cards/ApproachAngleCard';
import { CollisionVelocityCard } from './cards/CollisionVelocityCard';
import { ReactionMoleculesCard } from './cards/ReactionMoleculesCard';
import { SimulationControlsCard } from './cards/SimulationControlsCard';

// Container spacing
const containerClasses = 'space-y-4 p-4';

interface SingleCollisionSidebarProps {
  currentReaction: string;
  substrate: string;
  nucleophile: string;
  attackAngle: number;
  relativeVelocity: number;
  temperature: number;
  isPlaying: boolean;
  timeScale: number;
  reactionProbability: number;
  activationEnergy: number;
  onReactionChange: (reaction: string) => void;
  onSubstrateChange: (substrate: string) => void;
  onNucleophileChange: (nucleophile: string) => void;
  onAttackAngleChange: (angle: number) => void;
  onRelativeVelocityChange: (value: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onTimeScaleChange: (value: number) => void;
  autoplay: boolean;
  onAutoplayChange: (enabled: boolean) => void;
  themeClasses: any;
}

export const SingleCollisionSidebar: React.FC<SingleCollisionSidebarProps> = ({
  currentReaction,
  substrate,
  nucleophile,
  attackAngle,
  relativeVelocity,
  temperature,
  isPlaying,
  timeScale,
  reactionProbability,
  activationEnergy,
  onReactionChange,
  onSubstrateChange,
  onNucleophileChange,
  onAttackAngleChange,
  onRelativeVelocityChange,
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

      {/* Approach Angle Card */}
      <ApproachAngleCard
        attackAngle={attackAngle}
        onAttackAngleChange={onAttackAngleChange}
        reactionType={currentReaction}
        themeClasses={themeClasses}
      />

      {/* Collision Velocity Card */}
      <CollisionVelocityCard
        relativeVelocity={relativeVelocity}
        onRelativeVelocityChange={onRelativeVelocityChange}
        reactionType={currentReaction}
        activationEnergy={activationEnergy}
        themeClasses={themeClasses}
      />

      {/* Simulation Controls with Reaction Probability */}
      <SimulationControlsCard
        isPlaying={isPlaying}
        timeScale={timeScale}
        reactionProbability={reactionProbability}
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


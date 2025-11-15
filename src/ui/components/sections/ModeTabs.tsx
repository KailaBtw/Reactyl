import type React from 'react';
import { InfoBubble } from '../common/InfoBubble';

// Tab styling constants
const tabContainerClasses = 'flex border-b-2 border-gray-200 dark:border-gray-700';
const tabButtonClasses = 'flex-1 px-4 py-2.5 text-sm font-semibold transition-all relative flex items-center justify-center gap-2';
const tabIndicatorClasses = 'absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t';

interface ModeTabsProps {
  simulationMode: 'molecule' | 'single' | 'rate';
  onSimulationModeChange: (mode: 'molecule' | 'single' | 'rate') => void;
  themeClasses: any;
}

export const ModeTabs: React.FC<ModeTabsProps> = ({
  simulationMode,
  onSimulationModeChange,
  themeClasses,
}) => {
  return (
    <div className={tabContainerClasses}>
      <button
        onClick={e => {
          // Don't switch tabs if clicking on InfoBubble
          if ((e.target as HTMLElement).closest('[data-infobubble]')) {
            return;
          }
          onSimulationModeChange('molecule');
        }}
        className={`${tabButtonClasses} ${
          simulationMode === 'molecule'
            ? themeClasses.text
            : `${themeClasses.textSecondary} hover:${themeClasses.text}`
        }`}
      >
        Single Molecule
        <span data-infobubble>
          <InfoBubble
            term="Single Molecule"
            explanation="Search for and visualize individual molecules. Use autocomplete to find molecules by name, CID, SMILES, or InChIKey. Perfect for exploring molecular structures and properties."
            size="small"
          />
        </span>
        {simulationMode === 'molecule' && <div className={tabIndicatorClasses} />}
      </button>
      <button
        onClick={e => {
          // Don't switch tabs if clicking on InfoBubble
          if ((e.target as HTMLElement).closest('[data-infobubble]')) {
            return;
          }
          onSimulationModeChange('single');
        }}
        className={`${tabButtonClasses} ${
          simulationMode === 'single'
            ? themeClasses.text
            : `${themeClasses.textSecondary} hover:${themeClasses.text}`
        }`}
      >
        Single Collision
        <span data-infobubble>
          <InfoBubble
            term="Single Collision"
            explanation="Simulate a single collision between two molecules. Control the approach angle, collision velocity, and temperature to see how these factors affect reaction probability. Perfect for understanding the fundamentals of reaction mechanisms."
            size="small"
          />
        </span>
        {simulationMode === 'single' && <div className={tabIndicatorClasses} />}
      </button>
      <button
        onClick={e => {
          // Don't switch tabs if clicking on InfoBubble
          if ((e.target as HTMLElement).closest('[data-infobubble]')) {
            return;
          }
          onSimulationModeChange('rate');
        }}
        className={`${tabButtonClasses} ${
          simulationMode === 'rate'
            ? themeClasses.text
            : `${themeClasses.textSecondary} hover:${themeClasses.text}`
        }`}
      >
        Reaction Rate
        <span data-infobubble>
          <InfoBubble
            term="Reaction Rate"
            explanation="Simulate multiple molecule pairs colliding randomly in a container. Adjust concentration and temperature to observe how these factors affect the overall reaction rate. This mode demonstrates real-world reaction kinetics and the Arrhenius equation."
            size="small"
          />
        </span>
        {simulationMode === 'rate' && <div className={tabIndicatorClasses} />}
      </button>
    </div>
  );
};


import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { getReactionMasses } from '../../utils/molecularMassLookup';
import { PlotlyEnergyProfile } from '../ScientificallyAccuratePlotlyEnergyProfile';

// Card styling constants - matching rate metrics cards style
// Card wraps graph content with padding, fits to content size
const energyCardClasses = [
  'rounded-lg',
  'border',
  'border-blue-500/20',
  'bg-gradient-to-br',
  'from-blue-50/50',
  'to-blue-100/30',
  'dark:from-blue-950/20',
  'dark:to-blue-900/10',
  'flex',
  'flex-col',
  'relative',
  'inline-block', // Card fits to content, not full width
].join(' ');

// Card sizing constants
const CARD_PADDING = 16; // Padding around graph inside card
const TITLE_HEIGHT = 32; // Approximate title height
const CARD_MARGIN = 20; // Margin around card in panel

interface BottomEnergyPanelProps {
  height?: number;
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
  kineticEnergy?: number; // Direct kinetic energy value (kJ/mol) - overrides velocity calculation
  substrate?: string;
  nucleophile?: string;
  substrateMass?: number;
  nucleophileMass?: number;
  attackAngle?: number;
  timeScale?: number; // Unused but part of interface
  reactionProbability?: number; // 0..100 percent, unused but part of interface
}

export const BottomEnergyPanel: React.FC<BottomEnergyPanelProps> = ({
  height = 250,
  thermodynamicData,
  isPlaying,
  themeClasses,
  reactionType = 'SN2',
  reactionProgress = 0,
  currentVelocity = 0,
  kineticEnergy,
  substrate = 'demo_Methyl_bromide',
  nucleophile = 'demo_Hydroxide_ion',
  substrateMass: propSubstrateMass,
  nucleophileMass: propNucleophileMass,
  attackAngle = 180,
  timeScale: _timeScale = 0.8,
  reactionProbability: _reactionProbability = 0,
}) => {
  // Use provided molecular masses or fallback to lookup
  const substrateMass =
    propSubstrateMass || getReactionMasses(substrate, nucleophile).substrateMass;
  const nucleophileMass =
    propNucleophileMass || getReactionMasses(substrate, nucleophile).nucleophileMass;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [graphDimensions, setGraphDimensions] = useState({ width: 600, height: 200 });
  
  // Calculate graph dimensions based on available panel space
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const panelWidth = rect.width;
        const panelHeight = rect.height;
        
        // Account for card padding, title, and margin when calculating available space
        const availableWidth = Math.max(300, panelWidth - (CARD_MARGIN * 2) - (CARD_PADDING * 2));
        const availableHeight = Math.max(100, panelHeight - TITLE_HEIGHT - (CARD_PADDING * 2) - (CARD_MARGIN * 2));
        
        // Maintain aspect ratio (2:1) but fit within available space
        const ASPECT_RATIO = 2;
        let graphWidth: number;
        let graphHeight: number;
        
        // Calculate dimensions that fit within available space while maintaining aspect ratio
        const widthFromHeight = availableHeight * ASPECT_RATIO;
        
        if (widthFromHeight <= availableWidth) {
          // Panel is wide enough, fit to height
          graphHeight = availableHeight;
          graphWidth = graphHeight * ASPECT_RATIO;
        } else {
          // Panel is narrow, fit to width
          graphWidth = availableWidth;
          graphHeight = graphWidth / ASPECT_RATIO;
        }
        
        setGraphDimensions({ width: graphWidth, height: graphHeight });
      }
    };
    
    // Initial calculation
    updateDimensions();
    
    // Use ResizeObserver to track panel size changes
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [height]);
  
  return (
    <div 
      ref={containerRef}
      className={`border-t ${themeClasses.card} flex items-center justify-center relative overflow-hidden`}
      style={{ height: `${height}px`, minHeight: '150px' }}
    >
      {/* Styled card wrapper - fits to content with padding, centered in panel */}
      <div 
        ref={cardRef}
        className={energyCardClasses}
        style={{
          padding: `${CARD_PADDING}px`,
        }}
      >
        {/* Title */}
        <div className="flex-shrink-0 mb-2">
          <h3 className={`text-sm font-semibold ${themeClasses.text} m-0`}>
            Activation Energy Profile
          </h3>
        </div>
        {/* Graph - resizes based on panel height, card wraps it with padding */}
        <div className="relative">
            <PlotlyEnergyProfile
              data={{
                reactantEnergy: thermodynamicData.reactantEnergy,
                activationEnergy: thermodynamicData.activationEnergy,
                enthalpyChange: thermodynamicData.enthalpyOfFormation,
                reactionProgress: reactionProgress,
                reactionType: reactionType,
                currentVelocity: currentVelocity,
                kineticEnergy: kineticEnergy,
                attackAngle: attackAngle,
                substrateMass: substrateMass,
                nucleophileMass: nucleophileMass,
              }}
              isAnimating={isPlaying}
            width={graphDimensions.width}
            height={graphDimensions.height}
            />
        </div>
      </div>
    </div>
  );
};

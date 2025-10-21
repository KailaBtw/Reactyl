import React from 'react';

interface EnergyData {
  activationEnergy: number;        // kJ/mol
  reactionEnthalpy: number;        // ΔH in kJ/mol
  reactionProgress: number;        // 0-100%
  transitionStateEnergy: number;   // kJ/mol
  currentEnergy: number;           // Current system energy
  phase: 'reactants' | 'transition' | 'products' | 'approaching';
}

interface EnergyProfileProps {
  energyData: EnergyData;
  reactionType: string;
  isAnimating: boolean;
}

export const EnergyProfile: React.FC<EnergyProfileProps> = ({ 
  energyData, 
  reactionType,
  isAnimating 
}) => {
  const { 
    activationEnergy, 
    reactionEnthalpy, 
    reactionProgress, 
    transitionStateEnergy,
    currentEnergy,
    phase 
  } = energyData;

  // Generate energy curve points for SVG path
  const generateEnergyCurve = () => {
    const width = 200;
    const height = 80;
    const padding = 10;
    
    // Normalize energies to fit in SVG height
    const maxEnergy = Math.max(activationEnergy, Math.abs(reactionEnthalpy)) + 20;
    const baselineY = height - padding;
    const reactantY = baselineY - (0 / maxEnergy) * (height - 2 * padding);
    const transitionY = baselineY - (activationEnergy / maxEnergy) * (height - 2 * padding);
    const productY = baselineY - (reactionEnthalpy / maxEnergy) * (height - 2 * padding);
    
    // Create smooth curve through key points
    const points = [
      [padding, reactantY],                    // Reactants
      [width * 0.25, reactantY],              // Approach
      [width * 0.5, transitionY],             // Transition state
      [width * 0.75, productY],               // Product formation
      [width - padding, productY],            // Products
    ];

    // Create smooth curve using quadratic Bézier curves
    let path = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i];
      const [prevX, prevY] = points[i - 1];
      const controlX = (prevX + x) / 2;
      path += ` Q ${controlX} ${prevY} ${x} ${y}`;
    }

    return { path, points, width, height };
  };

  // Get phase color based on current reaction phase
  const getPhaseColor = () => {
    switch (phase) {
      case 'reactants': return '#3b82f6';      // Blue
      case 'approaching': return '#f59e0b';    // Amber
      case 'transition': return '#ef4444';     // Red
      case 'products': return '#10b981';       // Green
      default: return '#6b7280';               // Gray
    }
  };

  // Get phase description
  const getPhaseDescription = () => {
    switch (phase) {
      case 'reactants': return 'Reactants separated';
      case 'approaching': return 'Molecules approaching';
      case 'transition': return 'Transition state';
      case 'products': return 'Products formed';
      default: return 'Unknown phase';
    }
  };

  // Calculate current position on energy curve
  const getCurrentPosition = () => {
    const { points, width } = generateEnergyCurve();
    const padding = 10; // Same as in generateEnergyCurve
    const progressX = padding + (reactionProgress / 100) * (width - 2 * padding);
    
    // Interpolate Y position based on progress
    let currentY;
    if (reactionProgress < 25) {
      // Between reactants and approach
      const t = reactionProgress / 25;
      currentY = points[0][1] + (points[1][1] - points[0][1]) * t;
    } else if (reactionProgress < 50) {
      // Between approach and transition
      const t = (reactionProgress - 25) / 25;
      currentY = points[1][1] + (points[2][1] - points[1][1]) * t;
    } else if (reactionProgress < 75) {
      // Between transition and product formation
      const t = (reactionProgress - 50) / 25;
      currentY = points[2][1] + (points[3][1] - points[2][1]) * t;
    } else {
      // Between product formation and products
      const t = (reactionProgress - 75) / 25;
      currentY = points[3][1] + (points[4][1] - points[3][1]) * t;
    }
    
    return { x: progressX, y: currentY };
  };

  const { path, width, height } = generateEnergyCurve();
  const currentPos = getCurrentPosition();
  const padding = 10;

  return (
    <section className="p-5 border-b border-gray-100">
      <h3 className="text-base font-semibold mb-4 text-gray-800 flex items-center gap-2">
        ⚡ ENERGY PROFILE
      </h3>
      
      {/* Energy Values */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Activation Energy:</span>
          <span className="font-mono font-semibold text-gray-800">
            {activationEnergy.toFixed(1)} kJ/mol
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Reaction Enthalpy:</span>
          <span className={`font-mono font-semibold ${
            reactionEnthalpy < 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {reactionEnthalpy > 0 ? '+' : ''}{reactionEnthalpy.toFixed(1)} kJ/mol
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Current Energy:</span>
          <span className="font-mono font-semibold text-gray-800">
            {currentEnergy.toFixed(1)} kJ/mol
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Reaction Progress:</span>
          <span className="font-mono font-semibold text-gray-800">
            {reactionProgress.toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Phase:</span>
          <span 
            className="font-semibold px-2 py-1 rounded text-xs"
            style={{ 
              backgroundColor: `${getPhaseColor()}20`,
              color: getPhaseColor()
            }}
          >
            {getPhaseDescription()}
          </span>
        </div>
      </div>

      {/* Energy Diagram */}
      <div className="bg-gray-50 rounded border relative overflow-hidden">
        <svg 
          width="100%" 
          height="100" 
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-24"
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Energy curve */}
          <path
            d={path}
            fill="none"
            stroke="#374151"
            strokeWidth="2"
            className="transition-all duration-300"
          />
          
          {/* Current position indicator */}
          {isAnimating && (
            <circle
              cx={currentPos.x}
              cy={currentPos.y}
              r="4"
              fill={getPhaseColor()}
              stroke="white"
              strokeWidth="2"
              className="animate-pulse"
            />
          )}
          
          {/* Key points */}
          <circle cx={padding} cy={height - padding - (0 / Math.max(activationEnergy, Math.abs(reactionEnthalpy)) + 20) * (height - 2 * padding)} r="3" fill="#3b82f6" />
          <circle cx={width - padding} cy={height - padding - (reactionEnthalpy / Math.max(activationEnergy, Math.abs(reactionEnthalpy)) + 20) * (height - 2 * padding)} r="3" fill="#10b981" />
          
          {/* Labels */}
          <text x={padding} y={height - 5} fontSize="10" fill="#6b7280" textAnchor="start">
            Reactants
          </text>
          <text x={width - padding} y={height - 5} fontSize="10" fill="#6b7280" textAnchor="end">
            Products
          </text>
          <text x={width / 2} y={15} fontSize="10" fill="#6b7280" textAnchor="middle">
            Transition State
          </text>
        </svg>
        
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${reactionProgress}%` }}
          />
        </div>
      </div>

      {/* Thermodynamic Summary */}
      <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
        <div className="text-xs font-medium text-blue-800 mb-1">
          {reactionType} Thermodynamics
        </div>
        <div className="text-xs text-blue-700 space-y-1">
          <div>Ea = {activationEnergy.toFixed(1)} kJ/mol</div>
          <div>ΔH = {reactionEnthalpy > 0 ? '+' : ''}{reactionEnthalpy.toFixed(1)} kJ/mol</div>
          <div className="text-blue-600">
            {reactionEnthalpy < 0 ? 'Exothermic' : 'Endothermic'} reaction
          </div>
        </div>
      </div>
    </section>
  );
};

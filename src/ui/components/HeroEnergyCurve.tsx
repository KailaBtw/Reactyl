import React, { useEffect, useRef } from 'react';

interface EnergyData {
  activationEnergy: number;      // kJ/mol
  reactionEnthalpy: number;      // ΔH in kJ/mol  
  currentEnergy: number;         // Current system energy
  reactionProgress: number;          // 0-100%
  enthalpyOfFormation: {
    reactants: number;
    products: number;
    transitionState: number;
  };
}

interface HeroEnergyCurveProps {
  energyData: EnergyData;
  isSimulating: boolean;
  currentVelocity: number;      // For prediction calculations
  impactParameter: number;
}

export const HeroEnergyCurve: React.FC<HeroEnergyCurveProps> = ({
  energyData,
  isSimulating,
  currentVelocity,
  impactParameter
}) => {
  const ballRef = useRef<SVGCircleElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  
  const { activationEnergy, reactionEnthalpy, currentEnergy, reactionProgress, enthalpyOfFormation } = energyData;

  // Calculate real energy curve based on thermodynamics
  const calculateEnergyProfile = (reactionCoordinate: number) => {
    const reactantEnergy = enthalpyOfFormation.reactants;
    const productEnergy = enthalpyOfFormation.products;
    const transitionStateEnergy = reactantEnergy + activationEnergy; // Peak = reactants + activation energy
    
    // Create realistic activation energy profile
    if (reactionCoordinate <= 0.5) {
      // Reactants to transition state - smooth rise to activation energy
      const t = reactionCoordinate * 2;
      return reactantEnergy + activationEnergy * (1 - Math.cos(t * Math.PI / 2));
    } else {
      // Transition state to products - smooth decay to final enthalpy
      const t = (reactionCoordinate - 0.5) * 2;
      return transitionStateEnergy - (transitionStateEnergy - productEnergy) * (1 - Math.cos(t * Math.PI / 2));
    }
  };

  // Generate SVG path for energy curve
  const generateCurvePath = () => {
    const width = 400;
    const height = 120;
    const padding = 40;
    
    // Calculate proper energy scaling for activation energy profile
    const reactantEnergy = enthalpyOfFormation.reactants;
    const productEnergy = enthalpyOfFormation.products;
    const transitionStateEnergy = reactantEnergy + activationEnergy;
    
    // Set energy range to show the full profile clearly
    const minEnergy = Math.min(reactantEnergy, productEnergy) - 5; // Small buffer below lowest point
    const maxEnergy = transitionStateEnergy + 5; // Small buffer above transition state
    const energyRange = maxEnergy - minEnergy;
    
    // Generate curve points with proper activation energy profile shape
    const points = Array.from({ length: 100 }, (_, i) => {
      const x = i / 99; // 0 to 1 (reaction coordinate)
      const energy = calculateEnergyProfile(x);
      const svgX = padding + x * (width - 2 * padding);
      const svgY = height - padding - ((energy - minEnergy) / energyRange) * (height - 2 * padding);
      return [svgX, svgY];
    });
    
    return {
      path: `M ${points.map(p => p.join(',')).join(' L ')}`,
      points,
      minEnergy,
      maxEnergy,
      energyRange,
      width,
      height,
      padding,
      reactantEnergy,
      productEnergy,
      transitionStateEnergy
    };
  };

  const { path, points, minEnergy, maxEnergy, energyRange, width, height, padding, reactantEnergy, productEnergy, transitionStateEnergy } = generateCurvePath();

  // Calculate ball position on curve
  const getBallPosition = () => {
    const progress = reactionProgress / 100;
    const pointIndex = Math.floor(progress * (points.length - 1));
    return points[pointIndex] || [padding, height - padding];
  };

  // Animate ball along curve during simulation
  useEffect(() => {
    if (!isSimulating || !ballRef.current) return;
    
    const [ballX, ballY] = getBallPosition();
    ballRef.current.setAttribute('cx', ballX.toString());
    ballRef.current.setAttribute('cy', ballY.toString());
    
    // Add glowing trail effect
    if (trailRef.current) {
      const trailPath = path.substring(0, path.length * (reactionProgress / 100));
      trailRef.current.setAttribute('d', trailPath);
    }
  }, [reactionProgress, isSimulating]);

  // Calculate if reaction will proceed (kinetic energy vs activation energy)
  const kineticEnergyKJ = 0.5 * 28.0 * Math.pow(currentVelocity, 2) * 6.022e23 / 1000; // Rough conversion
  const willReact = kineticEnergyKJ >= activationEnergy;
  const reactionProbability = Math.min(1, kineticEnergyKJ / activationEnergy);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Activation Energy Profile</h3>
        <div className="text-xs text-gray-500">
          Progress: {reactionProgress.toFixed(0)}%
        </div>
      </div>

      {/* Energy Curve Visualization */}
      <div className="p-4">
        <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
          {/* Background grid */}
          <defs>
            <pattern id="energyGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
            </pattern>
            <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8"/>
            </linearGradient>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#energyGrid)" opacity="0.3"/>
          
          {/* Main energy curve */}
          <path
            d={path}
            fill="none"
            stroke="url(#curveGradient)"
            strokeWidth="3"
            className="drop-shadow-sm"
          />
          
          {/* Reaction trail (lights up during simulation) */}
          <path
            ref={trailRef}
            d=""
            fill="none"
            stroke="#f59e0b"
            strokeWidth="4"
            opacity={isSimulating ? "0.8" : "0"}
            className="transition-opacity duration-300"
          />
          
          {/* Key points markers */}
          <g>
            {/* Reactants */}
            <circle 
              cx={padding} 
              cy={height - padding - ((reactantEnergy - minEnergy) / energyRange) * (height - 2 * padding)} 
              r="4" 
              fill="#3b82f6" 
            />
            <text 
              x={padding} 
              y={height - padding - ((reactantEnergy - minEnergy) / energyRange) * (height - 2 * padding) + 18}
              textAnchor="middle" 
              className="text-xs font-medium fill-blue-600"
            >
              Reactants
            </text>
            
            {/* Transition State */}
            <circle 
              cx={width / 2} 
              cy={height - padding - ((transitionStateEnergy - minEnergy) / energyRange) * (height - 2 * padding)} 
              r="4" 
              fill="#ef4444" 
            />
            <text 
              x={width / 2} 
              y={height - padding - ((transitionStateEnergy - minEnergy) / energyRange) * (height - 2 * padding) - 8}
              textAnchor="middle" 
              className="text-xs font-medium fill-red-600"
            >
              Transition State
            </text>
            
            {/* Products */}
            <circle 
              cx={width - padding} 
              cy={height - padding - ((productEnergy - minEnergy) / energyRange) * (height - 2 * padding)} 
              r="4" 
              fill="#10b981" 
            />
            <text 
              x={width - padding} 
              y={height - padding - ((productEnergy - minEnergy) / energyRange) * (height - 2 * padding) + 18}
              textAnchor="middle" 
              className="text-xs font-medium fill-green-600"
            >
              Products
            </text>
          </g>
          
          {/* Animated reaction ball */}
          <circle
            ref={ballRef}
            r="6"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="2"
            opacity={isSimulating ? "1" : "0"}
            className={`transition-opacity duration-300 ${isSimulating ? 'animate-pulse' : ''}`}
          />
          
          {/* Kinetic energy indicator line (shows if reaction will proceed) */}
          <line
            x1={padding}
            y1={height - padding - ((kineticEnergyKJ - minEnergy) / energyRange) * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - ((kineticEnergyKJ - minEnergy) / energyRange) * (height - 2 * padding)}
            stroke={willReact ? "#10b981" : "#ef4444"}
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* Live Statistics Bar */}
      <div className="grid grid-cols-4 border-t border-gray-100">
        {/* Activation Energy */}
        <div className="p-4 text-center border-r border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {activationEnergy.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Activation Energy (kJ/mol)
          </div>
        </div>
        
        {/* Reaction Enthalpy */}
        <div className="p-4 text-center border-r border-gray-100">
          <div className={`text-2xl font-bold ${reactionEnthalpy < 0 ? 'text-green-600' : 'text-orange-600'}`}>
            {reactionEnthalpy > 0 ? '+' : ''}{reactionEnthalpy.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Reaction Enthalpy (kJ/mol)
          </div>
        </div>
        
        {/* Current Energy */}
        <div className="p-4 text-center border-r border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {currentEnergy.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Current Energy (kJ/mol)
          </div>
        </div>
        
        {/* Reaction Progress */}
        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {reactionProgress.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Reaction Progress
          </div>
        </div>
      </div>

      {/* Prediction Indicator (when not simulating) */}
      {!isSimulating && (
        <div className={`px-4 py-2 text-center text-sm border-t ${willReact ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {willReact ? (
            <span>✅ Kinetic energy sufficient - Reaction will proceed (Probability: {(reactionProbability * 100).toFixed(0)}%)</span>
          ) : (
            <span>❌ Insufficient kinetic energy - Need {(activationEnergy - kineticEnergyKJ).toFixed(1)} kJ/mol more</span>
          )}
        </div>
      )}
    </div>
  );
};

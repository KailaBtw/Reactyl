import React, { useRef, useEffect } from 'react';

interface ThermodynamicData {
  reactantEnergy: number;      // kJ/mol
  productEnergy: number;       // kJ/mol  
  activationEnergy: number;    // kJ/mol (Ea)
  reactionProgress: number;    // 0-1 (current position along reaction coordinate)
  temperature: number;         // Kelvin
}

interface CleanEnergyCurveProps {
  data: ThermodynamicData;
  isAnimating: boolean;
  width?: number;
  height?: number;
}

export const CleanEnergyCurve: React.FC<CleanEnergyCurveProps> = ({
  data,
  isAnimating,
  width = 500,
  height = 160
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);

  const { reactantEnergy, productEnergy, activationEnergy, reactionProgress } = data;
  
  // Calculate transition state energy
  const transitionStateEnergy = reactantEnergy + activationEnergy;
  
  // Set up coordinate system with minimal margins
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  
  // Energy scale with minimal padding
  const minEnergy = Math.min(reactantEnergy, productEnergy) - 10;
  const maxEnergy = transitionStateEnergy + 10;
  const energyRange = maxEnergy - minEnergy;
  
  // Scale functions
  const xScale = (reactionCoord: number) => margin.left + reactionCoord * plotWidth;
  const yScale = (energy: number) => margin.top + plotHeight - ((energy - minEnergy) / energyRange) * plotHeight;

  // Generate clean activation energy curve
  const generateCleanCurve = () => {
    const points: [number, number][] = [];
    const numPoints = 100;
    
    for (let i = 0; i <= numPoints; i++) {
      const xi = i / numPoints;
      let energy: number;
      
      if (xi <= 0.5) {
        const t = xi * 2;
        energy = reactantEnergy + (transitionStateEnergy - reactantEnergy) * 
                 (1 - Math.exp(-3 * t)) * Math.exp(-0.8 * (1 - t));
      } else {
        const t = (xi - 0.5) * 2;
        energy = transitionStateEnergy - (transitionStateEnergy - productEnergy) * 
                 (1 - Math.exp(-3 * t)) * Math.exp(-0.8 * (1 - t));
      }
      
      points.push([xScale(xi), yScale(energy)]);
    }
    
    return points;
  };

  const curvePoints = generateCleanCurve();
  const pathData = `M ${curvePoints.map(p => p.join(',')).join(' L ')}`;

  // Key positions
  const reactantX = xScale(0);
  const reactantY = yScale(reactantEnergy);
  const transitionX = xScale(0.5);
  const transitionY = yScale(transitionStateEnergy);
  const productX = xScale(1);
  const productY = yScale(productEnergy);

  // Current ball position
  const getCurrentBallPosition = () => {
    const index = Math.floor(reactionProgress * (curvePoints.length - 1));
    return curvePoints[index] || [reactantX, reactantY];
  };

  useEffect(() => {
    if (isAnimating && ballRef.current) {
      const [x, y] = getCurrentBallPosition();
      ballRef.current.setAttribute('cx', x.toString());
      ballRef.current.setAttribute('cy', y.toString());
    }
  }, [reactionProgress, isAnimating]);

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} width={width} height={height} className="w-full h-full">
        {/* Subtle background grid */}
        <defs>
          <pattern id="subtleGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f9fafb" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#subtleGrid)" />
        
        {/* Clean axes */}
        <g className="axes">
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <line
            x1={margin.left}
            y1={margin.top + plotHeight}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="#d1d5db"
            strokeWidth="1"
          />
        </g>

        {/* Clean energy curve */}
        <path
          d={pathData}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          className="drop-shadow-sm"
        />

        {/* Minimal markers - no overlapping labels */}
        <g className="state-markers">
          <circle cx={reactantX} cy={reactantY} r="3" fill="#3b82f6" stroke="white" strokeWidth="1"/>
          <circle cx={transitionX} cy={transitionY} r="3" fill="#dc2626" stroke="white" strokeWidth="1"/>
          <circle cx={productX} cy={productY} r="3" fill="#059669" stroke="white" strokeWidth="1"/>
        </g>

        {/* Clean labels - no arrows, no clutter */}
        <g className="clean-labels">
          <text x={reactantX} y={reactantY + 15} textAnchor="middle" className="text-xs fill-blue-600 font-medium">R</text>
          <text x={transitionX} y={transitionY - 8} textAnchor="middle" className="text-xs fill-red-600 font-medium">TS‡</text>
          <text x={productX} y={productY + 15} textAnchor="middle" className="text-xs fill-green-600 font-medium">P</text>
        </g>

        {/* Animated reaction ball */}
        <circle
          ref={ballRef}
          r="3"
          fill="#f59e0b"
          stroke="#ffffff"
          strokeWidth="1.5"
          opacity={isAnimating ? "1" : "0"}
          className={`transition-opacity duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
        />

        {/* Minimal axis labels */}
        <g className="axis-labels">
          <text
            x={15}
            y={margin.top + plotHeight / 2}
            transform={`rotate(-90, 15, ${margin.top + plotHeight / 2})`}
            textAnchor="middle"
            className="text-xs font-medium fill-gray-500"
          >
            Energy (kJ/mol)
          </text>
          <text
            x={margin.left + plotWidth / 2}
            y={height - 5}
            textAnchor="middle"
            className="text-xs font-medium fill-gray-500"
          >
            Reaction Coordinate →
          </text>
        </g>
      </svg>
    </div>
  );
};

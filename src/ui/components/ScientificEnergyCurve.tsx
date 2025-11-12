import React, { useRef, useEffect } from 'react';

interface ThermodynamicData {
  reactantEnergy: number;      // kJ/mol
  productEnergy: number;       // kJ/mol  
  activationEnergy: number;    // kJ/mol (Ea)
  reactionProgress: number;    // 0-1 (current position along reaction coordinate)
  temperature: number;         // Kelvin
}

interface ScientificEnergyCurveProps {
  data: ThermodynamicData;
  isAnimating: boolean;
  width?: number;
  height?: number;
  showLabels?: boolean;
}

export const ScientificEnergyCurve: React.FC<ScientificEnergyCurveProps> = ({
  data,
  isAnimating,
  width = 500,
  height = 300,
  showLabels = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);

  const { reactantEnergy, productEnergy, activationEnergy, reactionProgress } = data;
  
  // Calculate transition state energy
  const transitionStateEnergy = reactantEnergy + activationEnergy;
  const deltaH = productEnergy - reactantEnergy;
  
  // Set up coordinate system with proper margins to prevent overlap
  const margin = { top: 30, right: 50, bottom: 50, left: 60 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  
  // Energy scale with 20% padding above and below
  const minEnergy = Math.min(reactantEnergy, productEnergy) - 20;
  const maxEnergy = transitionStateEnergy + 20;
  const energyRange = maxEnergy - minEnergy;
  
  // Scale functions
  const xScale = (reactionCoord: number) => margin.left + reactionCoord * plotWidth;
  const yScale = (energy: number) => margin.top + plotHeight - ((energy - minEnergy) / energyRange) * plotHeight;

  // Generate activation energy curve
  // Uses simplified parabolic curve for educational clarity
  const generateActivationCurve = () => {
    const points: [number, number][] = [];
    const numPoints = 200;
    
    for (let i = 0; i <= numPoints; i++) {
      const xi = i / numPoints; // reaction coordinate 0 to 1
      let energy: number;
      
      if (xi <= 0.5) {
        // Reactants to transition state - parabolic rise to barrier
        const t = xi * 2; // normalize to 0-1 for this segment
        // Simple parabola: peaks at t=0.5 (reactionCoordinate=0.5)
        const parabola = 4 * t * (1 - t); // 0 at t=0, 1 at t=0.5, 0 at t=1
        energy = reactantEnergy + (transitionStateEnergy - reactantEnergy) * parabola;
      } else {
        // Transition state to products - linear descent
        const t = (xi - 0.5) * 2; // normalize to 0-1 for this segment
        energy = transitionStateEnergy - (transitionStateEnergy - productEnergy) * t;
      }
      
      points.push([xScale(xi), yScale(energy)]);
    }
    
    return points;
  };

  const curvePoints = generateActivationCurve();
  const pathData = `M ${curvePoints.map(p => p.join(',')).join(' L ')}`;

  // Key coordinate positions
  const reactantX = xScale(0);
  const reactantY = yScale(reactantEnergy);
  const transitionX = xScale(0.5);
  const transitionY = yScale(transitionStateEnergy);
  const productX = xScale(1);
  const productY = yScale(productEnergy);

  // Current ball position for animation
  const getCurrentBallPosition = () => {
    const index = Math.floor(reactionProgress * (curvePoints.length - 1));
    return curvePoints[index] || [reactantX, reactantY];
  };

  // Update ball position during animation
  useEffect(() => {
    if (isAnimating && ballRef.current) {
      const [x, y] = getCurrentBallPosition();
      ballRef.current.setAttribute('cx', x.toString());
      ballRef.current.setAttribute('cy', y.toString());
    }
  }, [reactionProgress, isAnimating]);

  // Generate grid lines
  const generateGridLines = () => {
    const gridLines = [];
    
    // Horizontal grid lines (energy levels)
    const energyStep = 25; // kJ/mol
    for (let energy = Math.ceil(minEnergy / energyStep) * energyStep; energy <= maxEnergy; energy += energyStep) {
      const y = yScale(energy);
      gridLines.push(
        <line
          key={`h-${energy}`}
          x1={margin.left}
          y1={y}
          x2={margin.left + plotWidth}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      );
    }
    
    // Vertical grid lines (reaction coordinate)
    for (let i = 0; i <= 10; i++) {
      const x = xScale(i / 10);
      gridLines.push(
        <line
          key={`v-${i}`}
          x1={x}
          y1={margin.top}
          x2={x}
          y2={margin.top + plotHeight}
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      );
    }
    
    return gridLines;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <svg ref={svgRef} width={width} height={height} className="w-full">
        {/* Grid */}
        {generateGridLines()}
        
        {/* Axes */}
        <g className="axes">
          {/* Y-axis */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#374151"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          
          {/* X-axis */}
          <line
            x1={margin.left}
            y1={margin.top + plotHeight}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="#374151"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          
          {/* Arrow markers */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#374151" />
            </marker>
            <marker
              id="redarrow"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#ef4444" />
            </marker>
            <marker
              id="bluearrow"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#3b82f6" />
            </marker>
          </defs>
        </g>

        {/* Energy curve */}
        <path
          d={pathData}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          className="drop-shadow-sm"
        />

        {/* Key energy level lines */}
        <g className="energy-levels" strokeDasharray="3,3" opacity="0.7">
          {/* Reactant energy level */}
          <line x1={margin.left} y1={reactantY} x2={reactantX + 50} y2={reactantY} stroke="#3b82f6" strokeWidth="1.5"/>
          
          {/* Product energy level */}
          <line x1={productX - 50} y1={productY} x2={margin.left + plotWidth} y2={productY} stroke="#10b981" strokeWidth="1.5"/>
          
          {/* Transition state level */}
          <line x1={transitionX - 30} y1={transitionY} x2={transitionX + 30} y2={transitionY} stroke="#ef4444" strokeWidth="1.5"/>
        </g>

        {/* Activation Energy Arrow (Ea) */}
        <g className="activation-energy">
          <line
            x1={reactantX + 60}
            y1={reactantY}
            x2={reactantX + 60}
            y2={transitionY}
            stroke="#ef4444"
            strokeWidth="2"
            markerEnd="url(#redarrow)"
          />
          <text
            x={reactantX + 70}
            y={(reactantY + transitionY) / 2}
            className="text-xs font-semibold fill-red-600"
            textAnchor="start"
            dominantBaseline="middle"
          >
            Ea = {activationEnergy.toFixed(1)} kJ/mol
          </text>
        </g>

        {/* Enthalpy Change Arrow (ΔH) */}
        <g className="enthalpy-change">
          <line
            x1={productX - 60}
            y1={reactantY}
            x2={productX - 60}
            y2={productY}
            stroke={deltaH < 0 ? "#10b981" : "#f59e0b"}
            strokeWidth="2"
            markerEnd="url(#bluearrow)"
          />
          <text
            x={productX - 50}
            y={(reactantY + productY) / 2}
            className={`text-xs font-semibold ${deltaH < 0 ? 'fill-green-600' : 'fill-orange-600'}`}
            textAnchor="start"
            dominantBaseline="middle"
          >
            ΔH = {deltaH > 0 ? '+' : ''}{deltaH.toFixed(1)} kJ/mol
          </text>
        </g>

        {/* State markers */}
        <g className="state-markers">
          {/* Reactants */}
          <circle cx={reactantX} cy={reactantY} r="5" fill="#3b82f6" stroke="white" strokeWidth="2"/>
          <text x={reactantX} y={margin.top + plotHeight + 20} textAnchor="middle" className="text-sm font-medium fill-blue-600">
            Reactants
          </text>
          
          {/* Transition State */}
          <circle cx={transitionX} cy={transitionY} r="5" fill="#ef4444" stroke="white" strokeWidth="2"/>
          <text x={transitionX} y={transitionY - 15} textAnchor="middle" className="text-sm font-medium fill-red-600">
            Transition State‡
          </text>
          
          {/* Products */}
          <circle cx={productX} cy={productY} r="5" fill="#10b981" stroke="white" strokeWidth="2"/>
          <text x={productX} y={margin.top + plotHeight + 20} textAnchor="middle" className="text-sm font-medium fill-green-600">
            Products
          </text>
        </g>

        {/* Animated reaction ball */}
        <circle
          ref={ballRef}
          r="4"
          fill="#f59e0b"
          stroke="#ffffff"
          strokeWidth="2"
          opacity={isAnimating ? "1" : "0"}
          className={`transition-opacity duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
        />

        {/* Axis labels */}
        <g className="axis-labels">
          {/* Y-axis label */}
          <text
            x={20}
            y={margin.top + plotHeight / 2}
            transform={`rotate(-90, 20, ${margin.top + plotHeight / 2})`}
            textAnchor="middle"
            className="text-sm font-semibold fill-gray-700"
          >
            Energy (kJ/mol)
          </text>
        </g>

        {/* Energy scale ticks */}
        <g className="y-ticks">
          {Array.from({length: Math.floor(energyRange / 25) + 1}, (_, i) => {
            const energy = Math.ceil(minEnergy / 25) * 25 + i * 25;
            const y = yScale(energy);
            return (
              <g key={energy}>
                <line x1={margin.left - 5} y1={y} x2={margin.left} y2={y} stroke="#374151" strokeWidth="1"/>
                <text x={margin.left - 10} y={y} textAnchor="end" dominantBaseline="middle" className="text-xs fill-gray-600">
                  {energy}
                </text>
              </g>
            );
          })}
        </g>

        {/* Transition State label at bottom */}
        <g className="x-label">
          <text
            x={margin.left + plotWidth / 2}
            y={margin.top + plotHeight + 20}
            textAnchor="middle"
            className="text-sm font-medium fill-red-600"
          >
            Transition State
          </text>
        </g>

        {/* Thermodynamic classification */}
        <text
          x={width - 10}
          y={30}
          textAnchor="end"
          className={`text-sm font-semibold ${deltaH < 0 ? 'fill-green-600' : 'fill-orange-600'}`}
        >
          {deltaH < 0 ? 'Exothermic' : 'Endothermic'} Reaction
        </text>
      </svg>
    </div>
  );
};

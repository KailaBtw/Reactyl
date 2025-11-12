import Plotly from 'plotly.js-dist-min';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface EnergyProfileData {
  reactantEnergy: number; // Starting energy (typically 0)
  activationEnergy: number; // Ea - height above reactants
  enthalpyChange: number; // ΔH - final energy relative to reactants
  reactionProgress: number; // 0-1 for animation
  reactionType: string; // SN1, SN2, E2, etc.
  currentVelocity?: number; // For kinetic energy calculations
  temperature?: number; // For rate calculations
  distance?: number; // Current molecular distance
  timeToCollision?: number; // Time until collision
  reactionProbability?: number; // Probability of reaction
  substrateMass?: number; // Molecular mass of substrate (kg/mol)
  nucleophileMass?: number; // Molecular mass of nucleophile (kg/mol)
}

interface PlotlyActivationCurveProps {
  data: EnergyProfileData;
  isAnimating: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export const PlotlyActivationCurve: React.FC<PlotlyActivationCurveProps> = ({
  data,
  isAnimating,
  width = 600,
  height = 120,
  className = '',
}) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const plotlyInstanceRef = useRef<any>(null);
  const [isPlotReady, setIsPlotReady] = useState(false);

  const {
    reactantEnergy,
    activationEnergy,
    enthalpyChange,
    reactionProgress,
    reactionType,
    currentVelocity = 0,
    temperature = 298,
    distance = 0,
    timeToCollision = 0,
    reactionProbability = 0,
    substrateMass = 0.028,
    nucleophileMass = 0.017,
  } = data;

  // Calculate key thermodynamic points
  const transitionStateEnergy = reactantEnergy + activationEnergy;
  const productEnergy = reactantEnergy + enthalpyChange;

  // Generate scientifically accurate activation energy curve using Morse potential
  const generateActivationCurve = () => {
    const numPoints = 200;
    const x: number[] = [];
    const y: number[] = [];

    // Define key anchor points for continuity
    const anchorPoints = [
      { x: 0.0, y: reactantEnergy }, // Reactants
      { x: 0.1, y: reactantEnergy + 2 }, // Early approach
      { x: 0.3, y: reactantEnergy + 8 }, // Intermediate
      { x: 0.5, y: transitionStateEnergy }, // Transition state
      { x: 0.7, y: transitionStateEnergy - 8 }, // Post-TS
      { x: 0.9, y: productEnergy + 2 }, // Near products
      { x: 1.0, y: productEnergy }, // Products
    ];

    // Apply Hammond's postulate adjustments
    let hammondFactor = 1.0;
    if (reactionType.includes('SN1')) {
      hammondFactor = 0.7; // Late transition state - more reactant-like
    } else if (reactionType.includes('E2')) {
      hammondFactor = 1.3; // Early transition state - more product-like
    }

    // Adjust anchor points based on Hammond's postulate
    const adjustedPoints = anchorPoints.map((point, index) => {
      if (index === 2) {
        // Intermediate point
        return {
          x: point.x,
          y: point.y + (hammondFactor - 1) * 5,
        };
      }
      return point;
    });

    // Generate smooth curve using cubic interpolation between anchor points
    for (let i = 0; i <= numPoints; i++) {
      const xi = i / numPoints;
      let energy: number;

      // Find surrounding anchor points
      let leftPoint = adjustedPoints[0];
      let rightPoint = adjustedPoints[adjustedPoints.length - 1];
      let segmentIndex = 0;

      for (let j = 0; j < adjustedPoints.length - 1; j++) {
        if (xi >= adjustedPoints[j].x && xi <= adjustedPoints[j + 1].x) {
          leftPoint = adjustedPoints[j];
          rightPoint = adjustedPoints[j + 1];
          segmentIndex = j;
          break;
        }
      }

      // Cubic interpolation for smooth curve
      const t = (xi - leftPoint.x) / (rightPoint.x - leftPoint.x);
      const t2 = t * t;
      const t3 = t2 * t;

      // Hermite interpolation for smooth derivatives
      const h1 = 2 * t3 - 3 * t2 + 1;
      const h2 = -2 * t3 + 3 * t2;
      const h3 = t3 - 2 * t2 + t;
      const h4 = t3 - t2;

      // Calculate derivatives at anchor points for smoothness
      const leftDerivative =
        segmentIndex > 0
          ? (adjustedPoints[segmentIndex].y - adjustedPoints[segmentIndex - 1].y) /
            (adjustedPoints[segmentIndex].x - adjustedPoints[segmentIndex - 1].x)
          : 0;
      const rightDerivative =
        segmentIndex < adjustedPoints.length - 1
          ? (adjustedPoints[segmentIndex + 1].y - adjustedPoints[segmentIndex].y) /
            (adjustedPoints[segmentIndex + 1].x - adjustedPoints[segmentIndex].x)
          : 0;

      energy = h1 * leftPoint.y + h2 * rightPoint.y + h3 * leftDerivative + h4 * rightDerivative;

      x.push(xi);
      y.push(energy);
    }

    return { x, y };
  };

  // Calculate current ball position for animation
  const getBallPosition = () => {
    const { x: curveX, y: curveY } = generateActivationCurve();
    const index = Math.min(Math.floor(reactionProgress * (curveX.length - 1)), curveX.length - 1);
    return {
      x: curveX[index] || 0,
      y: curveY[index] || reactantEnergy,
    };
  };

  // Calculate kinetic energy for prediction
  const calculateKineticEnergy = () => {
    // Use reduced mass for collision energy calculation
    const reducedMass = (substrateMass * nucleophileMass) / (substrateMass + nucleophileMass);

    // Convert velocity (m/s) to kinetic energy (kJ/mol)
    const kineticEnergyJ = 0.5 * reducedMass * currentVelocity ** 2;
    return (kineticEnergyJ * 6.022e23) / 1000; // Convert to kJ/mol
  };

  const createPlot = useCallback(() => {
    if (!plotRef.current) return;

    const { x: curveX, y: curveY } = generateActivationCurve();
    const ballPos = getBallPosition();
    const kineticEnergy = calculateKineticEnergy();

    // Define plot traces
    const traces: any[] = [
      // Main energy curve
      {
        x: curveX,
        y: curveY,
        type: 'scatter',
        mode: 'lines',
        line: {
          color: '#2563eb',
          width: 3,
          shape: 'spline',
          smoothing: 0.3,
        },
        name: 'Energy Profile',
        hovertemplate: '<b>Energy:</b> %{y:.1f} kJ/mol<br><b>Progress:</b> %{x:.1%}<extra></extra>',
        showlegend: false,
      },

      // Key state markers
      {
        x: [0, 0.5, 1],
        y: [reactantEnergy, transitionStateEnergy, productEnergy],
        type: 'scatter',
        mode: 'markers+text',
        marker: {
          size: [10, 10, 10],
          color: ['#3b82f6', '#dc2626', '#059669'],
          line: { color: 'white', width: 2 },
          symbol: 'circle',
        },
        text: ['R', 'TS', 'P'],
        textposition: ['bottom center', 'top center', 'bottom center'],
        textfont: {
          size: 10,
          color: '#374151',
          family: 'Inter, system-ui, sans-serif',
        },
        name: 'Key States',
        hovertemplate: '<b>%{text}</b><br><b>Energy:</b> %{y:.1f} kJ/mol<extra></extra>',
        showlegend: false,
      },
    ];

    // Add kinetic energy threshold line if velocity is set
    if (currentVelocity > 0) {
      const thresholdEnergy = reactantEnergy + kineticEnergy;
      const willReact = kineticEnergy >= activationEnergy;

      traces.push({
        x: [0, 1],
        y: [thresholdEnergy, thresholdEnergy],
        type: 'scatter',
        mode: 'lines',
        line: {
          color: willReact ? '#059669' : '#dc2626',
          width: 2,
          dash: 'dash',
        },
        name: 'Kinetic Energy',
        hovertemplate: `<b>Kinetic Energy:</b> ${kineticEnergy.toFixed(1)} kJ/mol<br><b>Status:</b> ${willReact ? 'Sufficient' : 'Insufficient'}<br><b>Distance:</b> ${distance.toFixed(1)} Å<br><b>Time to Collision:</b> ${timeToCollision.toFixed(2)}s<br><b>Reaction Probability:</b> ${(reactionProbability * 100).toFixed(1)}%<extra></extra>`,
        showlegend: false,
      });
    }

    // Add animated reaction ball
    if (isAnimating && reactionProgress > 0) {
      traces.push({
        x: [ballPos.x],
        y: [ballPos.y],
        type: 'scatter',
        mode: 'markers',
        marker: {
          size: 12,
          color: '#f59e0b',
          line: { color: '#ffffff', width: 2 },
          symbol: 'circle',
        },
        name: 'Reaction Progress',
        hovertemplate: '<b>Current Position</b><br><b>Energy:</b> %{y:.1f} kJ/mol<extra></extra>',
        showlegend: false,
      });
    }

    // Layout configuration
    const layout = {
      width: width,
      height: height,
      margin: { l: 60, r: 20, t: 20, b: 30 },

      xaxis: {
        title: {
          text: 'Reaction Direction →',
          font: {
            size: 11,
            color: '#6b7280',
            family: 'Inter, system-ui, sans-serif',
          },
        },
        showgrid: true,
        gridcolor: '#f3f4f6',
        gridwidth: 1,
        showline: true,
        linecolor: '#d1d5db',
        linewidth: 1,
        tickmode: 'array' as const,
        tickvals: [0, 0.5, 1],
        ticktext: ['Reactants', 'Transition State', 'Products'],
        tickfont: {
          size: 8,
          color: '#6b7280',
          family: 'Inter, system-ui, sans-serif',
        },
        range: [-0.02, 1.02],
        zeroline: false,
      },

      yaxis: {
        title: {
          text: 'Energy (kJ/mol)',
          font: {
            size: 11,
            color: '#6b7280',
            family: 'Inter, system-ui, sans-serif',
          },
        },
        showgrid: true,
        gridcolor: '#f3f4f6',
        gridwidth: 1,
        showline: true,
        linecolor: '#d1d5db',
        linewidth: 1,
        tickfont: {
          size: 9,
          color: '#6b7280',
          family: 'Inter, system-ui, sans-serif',
        },
        range: [Math.min(reactantEnergy, productEnergy) - 15, transitionStateEnergy + 15],
        zeroline: false,
      },

      plot_bgcolor: 'white',
      paper_bgcolor: 'white',

      showlegend: false,

      // Scientific annotations
      annotations: [
        // Activation energy arrow and label
        {
          x: 0.2,
          y: (reactantEnergy + transitionStateEnergy) / 2,
          text: `<b>Ea = ${activationEnergy.toFixed(1)}</b>`,
          showarrow: true,
          arrowhead: 2,
          arrowcolor: '#dc2626',
          arrowwidth: 1.5,
          arrowsize: 0.8,
          ax: -25,
          ay: 0,
          font: {
            size: 10,
            color: '#dc2626',
            family: 'Inter, system-ui, sans-serif',
          },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#dc2626',
          borderwidth: 1,
          borderpad: 2,
        },

        // Enthalpy change arrow and label
        {
          x: 0.8,
          y: (reactantEnergy + productEnergy) / 2,
          text: `<b>ΔH = ${enthalpyChange > 0 ? '+' : ''}${enthalpyChange.toFixed(1)}</b>`,
          showarrow: true,
          arrowhead: 2,
          arrowcolor: enthalpyChange < 0 ? '#059669' : '#f59e0b',
          arrowwidth: 1.5,
          arrowsize: 0.8,
          ax: 25,
          ay: 0,
          font: {
            size: 10,
            color: enthalpyChange < 0 ? '#059669' : '#f59e0b',
            family: 'Inter, system-ui, sans-serif',
          },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: enthalpyChange < 0 ? '#059669' : '#f59e0b',
          borderwidth: 1,
          borderpad: 2,
        },
      ],
    };

    const config = {
      displayModeBar: false,
      responsive: true,
      staticPlot: false,
      scrollZoom: false,
      doubleClick: 'reset',
    };

    // Create or update plot
    if (plotlyInstanceRef.current) {
      Plotly.react(plotRef.current, traces, layout, config);
    } else {
      Plotly.newPlot(plotRef.current, traces, layout, config)
        .then((plot: any) => {
          plotlyInstanceRef.current = plot;
          setIsPlotReady(true);
        })
        .catch((error: any) => {
          console.error('Error creating Plotly plot:', error);
        });
    }
  }, [
    reactantEnergy,
    activationEnergy,
    enthalpyChange,
    reactionProgress,
    reactionType,
    currentVelocity,
    distance,
    timeToCollision,
    reactionProbability,
    substrateMass,
    nucleophileMass,
    isAnimating,
  ]);

  // Initialize and update plot
  useEffect(() => {
    createPlot();
  }, [createPlot, width, height]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (plotlyInstanceRef.current && plotRef.current) {
        Plotly.purge(plotRef.current);
        plotlyInstanceRef.current = null;
        setIsPlotReady(false);
      }
    };
  }, []);

  return (
    <div className={`w-full ${className}`}>
      <div ref={plotRef} className="w-full" style={{ minHeight: height }} />

      {!isPlotReady && (
        <div className="flex items-center justify-center h-24">
          <div className="text-gray-500 text-sm">Loading energy profile...</div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';

interface EnergyProfileData {
  reactantEnergy: number;      // Starting energy (typically 0)
  activationEnergy: number;    // Ea - height above reactants
  enthalpyChange: number;      // ΔH - final energy relative to reactants
  reactionProgress: number;    // 0-1 for animation
  reactionType: string;        // SN1, SN2, E2, etc.
  currentVelocity?: number;    // For kinetic energy calculations
  temperature?: number;        // For rate calculations
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
  className = ""
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
    temperature = 298
  } = data;

  // Calculate key thermodynamic points
  const transitionStateEnergy = reactantEnergy + activationEnergy;
  const productEnergy = reactantEnergy + enthalpyChange;

  // Generate scientifically accurate activation energy curve
  const generateActivationCurve = () => {
    const numPoints = 150;
    const x: number[] = [];
    const y: number[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const xi = i / numPoints; // reaction coordinate 0 to 1
      let energy: number;

      if (xi <= 0.5) {
        // Reactants to transition state
        const t = xi * 2; // normalize to 0-1
        
        // Apply Hammond's postulate for different reaction types
        let curvature = 2.0; // Default symmetric
        if (reactionType.includes('SN1')) {
          curvature = 1.5; // Late transition state
        } else if (reactionType.includes('E2')) {
          curvature = 2.5; // Early transition state
        }
        
        // Smooth exponential approach to barrier
        energy = reactantEnergy + (transitionStateEnergy - reactantEnergy) * 
                 Math.pow(1 - Math.exp(-curvature * t), 0.8);
      } else {
        // Transition state to products
        const t = (xi - 0.5) * 2; // normalize to 0-1
        
        let curvature = 2.0;
        if (reactionType.includes('SN1')) {
          curvature = 2.5; // Sharp drop after late TS
        } else if (reactionType.includes('E2')) {
          curvature = 1.5; // Gradual drop after early TS
        }
        
        energy = transitionStateEnergy - (transitionStateEnergy - productEnergy) * 
                 Math.pow(1 - Math.exp(-curvature * t), 0.8);
      }

      x.push(xi);
      y.push(energy);
    }

    return { x, y };
  };

  // Calculate current ball position for animation
  const getBallPosition = () => {
    const { x: curveX, y: curveY } = generateActivationCurve();
    const index = Math.min(
      Math.floor(reactionProgress * (curveX.length - 1)),
      curveX.length - 1
    );
    return {
      x: curveX[index] || 0,
      y: curveY[index] || reactantEnergy
    };
  };

  // Calculate kinetic energy for prediction
  const calculateKineticEnergy = () => {
    // Simplified kinetic energy calculation (kJ/mol)
    const REDUCED_MASS = 28.0; // Approximate for organic molecules
    const kineticEnergyJ = 0.5 * REDUCED_MASS * Math.pow(currentVelocity, 2);
    return (kineticEnergyJ * 6.022e23) / 1000; // Convert to kJ/mol
  };

  const createPlot = () => {
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
          smoothing: 0.3
        },
        name: 'Energy Profile',
        hovertemplate: '<b>Energy:</b> %{y:.1f} kJ/mol<br><b>Progress:</b> %{x:.1%}<extra></extra>',
        showlegend: false
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
          symbol: 'circle'
        },
        text: ['R', 'TS‡', 'P'],
        textposition: ['bottom center', 'top center', 'bottom center'],
        textfont: { 
          size: 10, 
          color: '#374151',
          family: 'Inter, system-ui, sans-serif'
        },
        name: 'Key States',
        hovertemplate: '<b>%{text}</b><br><b>Energy:</b> %{y:.1f} kJ/mol<extra></extra>',
        showlegend: false
      }
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
          dash: 'dash'
        },
        name: 'Kinetic Energy',
        hovertemplate: `<b>Kinetic Energy:</b> ${kineticEnergy.toFixed(1)} kJ/mol<br><b>Status:</b> ${willReact ? 'Sufficient' : 'Insufficient'}<extra></extra>`,
        showlegend: false
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
          symbol: 'circle'
        },
        name: 'Reaction Progress',
        hovertemplate: '<b>Current Position</b><br><b>Energy:</b> %{y:.1f} kJ/mol<extra></extra>',
        showlegend: false
      });
    }

    // Layout configuration
    const layout = {
      width: width,
      height: height,
      margin: { l: 50, r: 30, t: 20, b: 40 },
      
      xaxis: {
        title: {
          text: 'Reaction Coordinate →',
          font: { 
            size: 11, 
            color: '#6b7280',
            family: 'Inter, system-ui, sans-serif'
          }
        },
        showgrid: true,
        gridcolor: '#f3f4f6',
        gridwidth: 1,
        showline: true,
        linecolor: '#d1d5db',
        linewidth: 1,
        tickmode: 'array',
        tickvals: [0, 0.5, 1],
        ticktext: ['R', 'TS‡', 'P'],
        tickfont: { 
          size: 9, 
          color: '#6b7280',
          family: 'Inter, system-ui, sans-serif'
        },
        range: [-0.02, 1.02],
        zeroline: false
      },
      
      yaxis: {
        title: {
          text: 'Energy (kJ/mol)',
          font: { 
            size: 11, 
            color: '#6b7280',
            family: 'Inter, system-ui, sans-serif'
          }
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
          family: 'Inter, system-ui, sans-serif'
        },
        range: [
          Math.min(reactantEnergy, productEnergy) - 15,
          transitionStateEnergy + 15
        ],
        zeroline: false
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
            family: 'Inter, system-ui, sans-serif'
          },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#dc2626',
          borderwidth: 1,
          borderpad: 2
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
            family: 'Inter, system-ui, sans-serif'
          },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: enthalpyChange < 0 ? '#059669' : '#f59e0b',
          borderwidth: 1,
          borderpad: 2
        }
      ]
    };

    const config = {
      displayModeBar: false,
      responsive: true,
      staticPlot: false,
      scrollZoom: false,
      doubleClick: 'reset'
    };

    // Create or update plot
    if (plotlyInstanceRef.current) {
      Plotly.react(plotRef.current, traces, layout, config);
    } else {
      Plotly.newPlot(plotRef.current, traces, layout, config)
        .then((plot) => {
          plotlyInstanceRef.current = plot;
          setIsPlotReady(true);
        })
        .catch((error) => {
          console.error('Error creating Plotly plot:', error);
        });
    }
  };

  // Initialize and update plot
  useEffect(() => {
    createPlot();
  }, [data, isAnimating, width, height]);

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
      <div 
        ref={plotRef} 
        className="w-full"
        style={{ minHeight: height }}
      />
      
      {!isPlotReady && (
        <div className="flex items-center justify-center h-24">
          <div className="text-gray-500 text-sm">Loading energy profile...</div>
        </div>
      )}
    </div>
  );
};

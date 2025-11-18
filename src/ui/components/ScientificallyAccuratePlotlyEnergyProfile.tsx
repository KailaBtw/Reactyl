import Plotly from 'plotly.js-dist-min';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { calculateAngleProbability } from '../utils/angleProbability';

interface EnergyProfileData {
  reactantEnergy: number; // Starting energy (typically 0)
  activationEnergy: number; // Ea - FIXED barrier height (doesn't change with velocity/attack mode)
  enthalpyChange: number; // ΔH - final energy relative to reactants
  reactionProgress: number; // 0-1 for animation
  reactionType: string; // SN1, SN2, E2, etc.
  currentVelocity: number; // For kinetic energy calculations (m/s) - used only if kineticEnergy not provided
  attackAngle?: number; // 0-180 degrees (0=frontside, 180=backside)
  temperature?: number; // For rate calculations (K)
  distance?: number; // Current molecular distance
  substrateMass?: number; // Molecular mass of substrate (kg/mol)
  nucleophileMass?: number; // Molecular mass of nucleophile (kg/mol)
  kineticEnergy?: number; // Direct kinetic energy value (kJ/mol) - if provided, overrides velocity calculation
}

interface PlotlyEnergyProfileProps {
  data: EnergyProfileData;
  isAnimating: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export const PlotlyEnergyProfile: React.FC<PlotlyEnergyProfileProps> = ({
  data,
  isAnimating,
  width: propWidth,
  height: propHeight,
  className = '',
}) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const plotlyInstanceRef = useRef<any>(null);
  const [isPlotReady, setIsPlotReady] = useState(false);
  
  // Aspect ratio: 1.5:1 (width:height) for energy profile graphs
  const ASPECT_RATIO = 2;
  const MAX_WIDTH = 600;
  const MAX_HEIGHT = 400;
  const MIN_WIDTH = 300;
  const MIN_HEIGHT = 200;
  
  const [dimensions, setDimensions] = useState({ width: propWidth || 600, height: propHeight || 200 });

  const {
    reactantEnergy,
    activationEnergy,
    enthalpyChange,
    reactionProgress,
    reactionType,
    currentVelocity,
    attackAngle = 180, // Default to optimal backside attack
    substrateMass = 0.028,
    nucleophileMass = 0.017,
  } = data;

  // FIXED thermodynamic points - these don't change with velocity/attack mode
  const transitionStateEnergy = reactantEnergy + activationEnergy;
  const productEnergy = reactantEnergy + enthalpyChange;

  // Calculate orientation factor based on attack angle and reaction type
  // Get orientation factor using scientific angle probability calculation
  const getOrientationFactor = () => {
    const angleResult = calculateAngleProbability(attackAngle, reactionType);

    return {
      factor: angleResult.probability,
      description: angleResult.description,
      isOptimal: angleResult.isOptimal,
    };
  };

  // Generate activation energy curve with angle-dependent modifications
  const generateActivationCurve = () => {
    const numPoints = 200;
    const x: number[] = [];
    const y: number[] = [];

    // Get angle probability to modify the curve
    const orientation = getOrientationFactor();
    const angleFactor = orientation.factor;
    const isOptimal = orientation.isOptimal;

    for (let i = 0; i <= numPoints; i++) {
      const xi = i / numPoints; // reaction coordinate 0 to 1
      let energy: number;

      // Base activation energy curve with 5% flat regions
      if (xi <= 0.05) {
        // Flat reactants region (0-5%) - more realistic
        energy = reactantEnergy;
      } else if (xi <= 0.5) {
        // Quartic rise to transition state (5-50%)
        const t = (xi - 0.05) / 0.45;
        energy = reactantEnergy + activationEnergy * t * t * (3 - 2 * t);
      } else if (xi <= 0.95) {
        // Quartic descent from transition state (50-95%)
        const t = (xi - 0.5) / 0.45;
        energy =
          transitionStateEnergy * (1 - t * t * (3 - 2 * t)) + productEnergy * t * t * (3 - 2 * t);
      } else {
        // Flat products region (95-100%) - more realistic
        energy = productEnergy;
      }

      // DO NOT modify the curve based on approach angle
      // The activation energy curve is a FIXED thermodynamic property
      // Angle only affects reaction probability, not the curve shape

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

  // Calculate kinetic energy from velocity using reduced mass (kJ/mol)
  // OR use directly provided kineticEnergy if available (for demo-scaled values)
  const calculateKineticEnergy = () => {
    // Use directly provided kinetic energy if available (takes precedence)
    if (typeof data.kineticEnergy === 'number' && data.kineticEnergy >= 0) {
      return data.kineticEnergy;
    }
    
    // Fallback: calculate from velocity using standard physics
    if (currentVelocity <= 0) return 0;

    const DEFAULT_REDUCED_MASS = 0.028; // kg/mol, approximate for CH3Br collisions
    const substrateMass = data.substrateMass ?? DEFAULT_REDUCED_MASS;
    const nucleophileMass = data.nucleophileMass ?? DEFAULT_REDUCED_MASS;

    // Reduced mass for two-body collision
    const reducedMass = (substrateMass * nucleophileMass) / (substrateMass + nucleophileMass);

    // Convert velocity (m/s) to kinetic energy (kJ/mol)
    const kineticEnergyJPerMol = 0.5 * reducedMass * currentVelocity ** 2;
    return kineticEnergyJPerMol / 1000; // J/mol -> kJ/mol
  };

  // Calculate overall reaction probability - simplified and realistic
  const calculateReactionProbability = () => {
    const kineticEnergy = calculateKineticEnergy();
    const orientation = getOrientationFactor();

    // Arrhenius-like energy probability calculation with better scaling
    let energyProbability = 0;
    if (kineticEnergy >= activationEnergy) {
      energyProbability = 0.95; // High probability when sufficient energy
    } else if (kineticEnergy > 0) {
      const energyRatio = kineticEnergy / activationEnergy;
      // More gradual probability increase for better visualization
      if (energyRatio >= 0.9) {
        energyProbability = 0.7; // Very close to activation
      } else if (energyRatio >= 0.8) {
        energyProbability = 0.4; // Close to activation energy
      } else if (energyRatio >= 0.6) {
        energyProbability = 0.15; // Getting there
      } else if (energyRatio >= 0.4) {
        energyProbability = 0.05; // Moderate energy
      } else if (energyRatio >= 0.2) {
        energyProbability = 0.01; // Low energy
      } else {
        energyProbability = 0.001; // Very low energy
      }
    }

    const overallProbability = energyProbability * orientation.factor;

    // Debug logging to show the angle-dependent calculation
    console.log('Angle-Dependent Reaction Probability:', {
      reactionType,
      attackAngle: attackAngle + '°',
      currentVelocity,
      temperature: (data.temperature || 298) + 'K',
      kineticEnergy: kineticEnergy.toFixed(1) + ' kJ/mol',
      activationEnergy: activationEnergy + ' kJ/mol',
      energyRatio: (kineticEnergy / activationEnergy).toFixed(2),
      energyProbability: (energyProbability * 100).toFixed(1) + '%',
      angleProbability: (orientation.factor * 100).toFixed(1) + '%',
      angleDescription: orientation.description,
      isOptimalAngle: orientation.isOptimal,
      overallProbability: (overallProbability * 100).toFixed(1) + '%',
    });

    // Debug the color logic
    console.log('Color Debug:', {
      isOptimal: orientation.isOptimal,
      factor: orientation.factor,
      shouldBeRed: !orientation.isOptimal,
      shouldBeGreen: orientation.isOptimal,
    });

    return {
      kineticEnergy,
      hasEnoughEnergy: kineticEnergy >= activationEnergy,
      attackViable: orientation.factor > 0,
      overallProbability: Math.min(1.0, overallProbability),
    };
  };

  const createPlot = useCallback(() => {
    if (!plotRef.current) return;

    const { x: curveX, y: curveY } = generateActivationCurve();
    const reactionData = calculateReactionProbability();

    // Define plot traces
    const traces: any[] = [
      // Main activation energy curve - FIXED shape
      {
        x: curveX,
        y: curveY,
        type: 'scatter',
        mode: 'lines',
        line: {
          color: '#2563eb',
          width: 3,
        },
        name: 'Activation Energy Barrier',
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
        text: ['R', 'TS‡', 'P'],
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

    // Add kinetic energy line - shows available energy from velocity
    if (currentVelocity > 0) {
      const availableEnergy = reactantEnergy + reactionData.kineticEnergy;
      // Color based on both energy and angle - more dramatic visual feedback
      const hasEnoughEnergy = reactionData.hasEnoughEnergy;
      const hasGoodAngle = reactionData.attackViable;
      let lineColor = '#dc2626'; // Default red

      if (hasEnoughEnergy && hasGoodAngle) {
        lineColor = '#059669'; // Green - good energy and angle
      } else if (hasEnoughEnergy && !hasGoodAngle) {
        lineColor = '#f59e0b'; // Orange - good energy but bad angle
      } else if (!hasEnoughEnergy && hasGoodAngle) {
        lineColor = '#3b82f6'; // Blue - good angle but not enough energy
      }

      // Kinetic energy dashed line
      traces.push({
        x: [0, 1],
        y: [availableEnergy, availableEnergy],
        type: 'scatter',
        mode: 'lines',
        line: {
          color: lineColor,
          width: 2,
          dash: 'dash',
        },
        name: 'Available Kinetic Energy',
        hovertemplate: `<b>Kinetic Energy:</b> ${reactionData.kineticEnergy.toFixed(1)} kJ/mol<br><b>Will React:</b> ${reactionData.hasEnoughEnergy && reactionData.attackViable ? 'Yes' : 'No'}<br><b>Probability:</b> ${(reactionData.overallProbability * 100).toFixed(1)}%<extra></extra>`,
        showlegend: false,
      });

      // Add integrated angle compatibility indicator in bottom left (below text box)
      const orientation = getOrientationFactor();
      const barY = -12; // Position below the text box
      const barWidth = 0.3; // Width of the bar (0 to 180 degrees)
      const barHeight = 4;

      // Background bar (full 0-180 range)
      traces.push({
        x: [0.05, 0.05 + barWidth],
        y: [barY, barY],
        type: 'scatter',
        mode: 'lines',
        line: {
          color: '#e5e7eb',
          width: barHeight,
          dash: 'solid',
        },
        name: 'Angle Range Background',
        hoverinfo: 'skip',
        showlegend: false,
      });

      // Calculate position based on actual angle (0-180 degrees)
      const anglePosition = attackAngle / 180; // Normalize to 0-1
      const positionX = 0.05 + barWidth * anglePosition;

      // Color based on compatibility
      const fillColor =
        orientation.factor > 0.8 ? '#059669' : orientation.factor > 0.4 ? '#f59e0b' : '#dc2626';

      // Filled portion from 0 to current angle
      traces.push({
        x: [0.05, positionX],
        y: [barY, barY],
        type: 'scatter',
        mode: 'lines',
        line: {
          color: fillColor,
          width: barHeight,
          dash: 'solid',
        },
        name: 'Angle Progress',
        hovertemplate: `<b>Current Angle: ${attackAngle}°</b><br><b>Compatibility: ${(orientation.factor * 100).toFixed(1)}%</b><br><b>Status: ${orientation.description}</b><extra></extra>`,
        showlegend: false,
      });

      // Add angle indicator arrow at current position
      traces.push({
        x: [positionX, positionX],
        y: [barY - 1, barY + 1],
        type: 'scatter',
        mode: 'lines',
        line: {
          color: fillColor,
          width: 2,
        },
        name: 'Current Angle Position',
        hoverinfo: 'skip',
        showlegend: false,
      });

      // Add scale markers (0°, 90°, 180°)
      traces.push({
        x: [0.05, 0.05 + barWidth / 2, 0.05 + barWidth],
        y: [barY - 2, barY - 2, barY - 2],
        type: 'scatter',
        mode: 'markers+text',
        marker: {
          size: 3,
          color: '#666666',
        },
        text: ['0°', '90°', '180°'],
        textposition: 'top',
        textfont: {
          size: 8,
          color: '#666666',
        },
        name: 'Angle Scale',
        hoverinfo: 'skip',
        showlegend: false,
      });

      // Create the filled area under curve up to kinetic energy line
      if (reactionData.kineticEnergy > 0) {
        const fillOpacity = reactionData.hasEnoughEnergy ? 0.25 : 0.15;
        const fillColor = reactionData.hasEnoughEnergy ? '5, 150, 105' : '220, 38, 38';

        // Find the transition state index (x = 0.5)
        const transitionIndex = Math.floor(curveX.length * 0.5);

        // Create polygon points for the fill area
        const fillX: number[] = [];
        const fillY: number[] = [];

        // Follow the curve from reactants to transition state
        for (let i = 0; i <= transitionIndex; i++) {
          fillX.push(curveX[i]);
          // Cap the curve at the kinetic energy level, but show the dramatic angle effects
          const curveEnergy = curveY[i];
          const cappedEnergy = Math.min(curveEnergy, availableEnergy);
          fillY.push(cappedEnergy);
        }

        // Add the kinetic energy line back from transition state to reactants
        fillX.push(0.5); // Transition state x
        fillY.push(Math.min(availableEnergy, reactantEnergy)); // Bottom of kinetic energy

        fillX.push(0); // Back to reactants x
        fillY.push(reactantEnergy); // Reactants energy level

        traces.push({
          x: fillX,
          y: fillY,
          type: 'scatter',
          mode: 'lines',
          fill: 'toself',
          fillcolor: `rgba(${fillColor}, ${fillOpacity})`,
          line: { width: 0 },
          name: 'Energy Available for Reaction',
          hoverinfo: 'skip',
          showlegend: false,
        });
      }
    }

    // Add animated reaction ball - FIXED ball position calculation
    if (isAnimating && reactionProgress > 0) {
      const ballPos = getBallPosition();

      traces.push({
        x: [ballPos.x],
        y: [ballPos.y],
        type: 'scatter',
        mode: 'markers',
        marker: {
          size: 14,
          color: '#f59e0b',
          line: { color: '#ffffff', width: 3 },
          symbol: 'circle',
        },
        name: 'Reaction Progress',
        hovertemplate:
          '<b>Current Position</b><br><b>Energy:</b> %{y:.1f} kJ/mol<br><b>Progress:</b> %{x:.1%}<extra></extra>',
        showlegend: false,
      });

      // Add a subtle trail effect
      if (reactionProgress > 0.05) {
        const trailLength = Math.min(10, Math.floor(reactionProgress * curveX.length));
        const trailStartIndex = Math.max(
          0,
          Math.floor(reactionProgress * (curveX.length - 1)) - trailLength
        );
        const trailEndIndex = Math.floor(reactionProgress * (curveX.length - 1));

        traces.push({
          x: curveX.slice(trailStartIndex, trailEndIndex + 1),
          y: curveY.slice(trailStartIndex, trailEndIndex + 1),
          type: 'scatter',
          mode: 'lines',
          line: {
            color: '#f59e0b',
            width: 4,
            shape: 'spline',
          },
          opacity: 0.6,
          name: 'Reaction Trail',
          hoverinfo: 'skip',
          showlegend: false,
        });
      }
    }

    // Layout configuration
    const layout = {
      width: dimensions.width,
      height: dimensions.height,
      margin: { l: 60, r: 50, t: 20, b: 30 },

      xaxis: {
        title: {
          text: 'Reaction Coordinate →',
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
        range: [Math.min(reactantEnergy, productEnergy) - 10, transitionStateEnergy + 15],
        zeroline: false,
      },

      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      showlegend: false,

      // Scientific annotations - only show the fixed barrier measurements
      annotations: [
        // Activation energy arrow and label
        {
          x: 0.1,
          y: (reactantEnergy + transitionStateEnergy) / 2 + 2,
          text: `<b>Ea = ${activationEnergy.toFixed(1)}<br>kJ/mol</b>`,
          showarrow: false,
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
          x: 0.9, // move left of the descending product-side curve
          y: (reactantEnergy + productEnergy) / 2 + 4,
          text: `<b>ΔH = ${enthalpyChange > 0 ? '+' : ''}${enthalpyChange.toFixed(1)}<br>kJ/mol</b>`,
          showarrow: false,
          xanchor: 'left' as const,
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

        // Angle effect annotation - bottom left corner (moved up)
        {
          x: 0.1,
          y: -15,
          text: `<b>${reactionType.toUpperCase()}</b><br>Angle: ${attackAngle}°`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'top' as const,
          font: {
            size: 10,
            color: getOrientationFactor().isOptimal ? '#059669' : '#dc2626',
            family: 'Inter, system-ui, sans-serif',
          },
          bgcolor: getOrientationFactor().isOptimal
            ? 'rgba(5, 150, 105, 0.15)'
            : 'rgba(220, 38, 38, 0.15)',
          bordercolor: getOrientationFactor().isOptimal ? '#059669' : '#dc2626',
          borderwidth: 1,
          borderpad: 3,
        },
      ],
    };

    const config = {
      displayModeBar: false,
      responsive: true,
      staticPlot: false,
      scrollZoom: false,
      doubleClick: 'reset' as const,
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
    attackAngle,
    substrateMass,
    nucleophileMass,
    isAnimating,
    dimensions.width,
    dimensions.height,
  ]);

  // Measure container size and update dimensions with aspect ratio lock
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const containerWidth = rect.width; // No padding subtraction - padding handled by parent
        const containerHeight = rect.height; // No padding subtraction - padding handled by parent
        
        let newWidth: number;
        let newHeight: number;
        
        if (propWidth && propHeight) {
          // Use provided dimensions if both are specified
          newWidth = propWidth;
          newHeight = propHeight;
        } else if (propWidth) {
          // If only width provided, calculate height from aspect ratio
          newWidth = propWidth;
          newHeight = propWidth / ASPECT_RATIO;
        } else if (propHeight) {
          // If only height provided, calculate width from aspect ratio
          newHeight = propHeight;
          newWidth = propHeight * ASPECT_RATIO;
        } else {
          // Calculate dimensions based on container, maintaining aspect ratio
          // Try to fit within container while maintaining aspect ratio
          const widthFromHeight = containerHeight * ASPECT_RATIO;
          const heightFromWidth = containerWidth / ASPECT_RATIO;
          
          if (widthFromHeight <= containerWidth) {
            // Container is wider than needed, fit to height
            newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, containerHeight));
            newWidth = newHeight * ASPECT_RATIO;
          } else {
            // Container is taller than needed, fit to width
            newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, containerWidth));
            newHeight = newWidth / ASPECT_RATIO;
          }
          
          // Ensure we don't exceed max dimensions
          if (newWidth > MAX_WIDTH) {
            newWidth = MAX_WIDTH;
            newHeight = MAX_WIDTH / ASPECT_RATIO;
          }
          if (newHeight > MAX_HEIGHT) {
            newHeight = MAX_HEIGHT;
            newWidth = MAX_HEIGHT * ASPECT_RATIO;
          }
          
          // Ensure we meet min dimensions
          if (newWidth < MIN_WIDTH) {
            newWidth = MIN_WIDTH;
            newHeight = MIN_WIDTH / ASPECT_RATIO;
          }
          if (newHeight < MIN_HEIGHT) {
            newHeight = MIN_HEIGHT;
            newWidth = MIN_HEIGHT * ASPECT_RATIO;
          }
        }
        
        setDimensions(prev => {
          // Only update if dimensions actually changed
          if (prev.width !== newWidth || prev.height !== newHeight) {
            return { width: newWidth, height: newHeight };
          }
          return prev;
        });
      }
    };

    // Initial measurement
    updateDimensions();

    // Use ResizeObserver for efficient size tracking
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);

    // Fallback to window resize
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [propWidth, propHeight]);

  // Resize plot when dimensions change
  useEffect(() => {
    if (plotlyInstanceRef.current && plotRef.current && isPlotReady) {
      // Use Plotly's resize method for smooth updates
      try {
        Plotly.Plots.resize(plotRef.current);
      } catch (error: any) {
        console.warn('Plotly resize error:', error);
      }
    }
  }, [dimensions.width, dimensions.height, isPlotReady]);

  // Initialize and update plot
  useEffect(() => {
    createPlot();
  }, [createPlot]);

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
    <div ref={containerRef} className={`w-full h-full flex items-center justify-center ${className}`} style={{ padding: 0 }}>
      <div 
        ref={plotRef} 
        className="w-full h-full" 
        style={{ 
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '100%',
          maxHeight: '100%'
        }} 
      />

      {!isPlotReady && (
        <div className="flex items-center justify-center h-24">
          <div className="text-gray-500 text-sm">Loading energy profile...</div>
        </div>
      )}
    </div>
  );
};

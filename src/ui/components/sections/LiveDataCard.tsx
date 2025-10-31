import React from 'react';

interface LiveDataCardProps {
  label: string;
  value: string | number;
  unit?: string;
  valueColor?: string;
  className?: string;
}

/**
 * Reusable card component for displaying live data metrics
 */
export const LiveDataCard: React.FC<LiveDataCardProps> = ({
  label,
  value,
  unit,
  valueColor = 'text-gray-800',
  className = ''
}) => {
  const formattedValue = typeof value === 'number' 
    ? value.toFixed(value % 1 === 0 ? 0 : 1)
    : value;

  // If unit is a single symbol like "°", "x", or "%", append it to the value
  const displayValue = unit && (unit === '°' || unit === 'x' || unit === '%') 
    ? `${formattedValue}${unit}`
    : formattedValue;

  return (
    <div className={`bg-white border border-gray-200 rounded p-3 h-full ${className}`}>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-mono font-bold ${valueColor}`}>
        {displayValue}
      </div>
      {unit && unit !== '°' && unit !== 'x' && unit !== '%' && (
        <div className="text-sm text-gray-400 mt-1">{unit}</div>
      )}
    </div>
  );
};


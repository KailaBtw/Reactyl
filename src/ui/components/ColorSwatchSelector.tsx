import React from 'react';

interface ColorOption {
  id: string;
  name: string;
  color: string;
}

interface ColorSwatchSelectorProps {
  title: string;
  options: ColorOption[];
  selectedId: string;
  onSelectionChange: (id: string) => void;
  className?: string;
  themeColor?: string;
}

export const ColorSwatchSelector: React.FC<ColorSwatchSelectorProps> = ({
  title,
  options,
  selectedId,
  onSelectionChange,
  className = '',
  themeColor = '#3b82f6'
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {title}
      </label>
      <div className="flex gap-2">
        {options.map((option) => (
          <label key={option.id} className="relative cursor-pointer group">
            <input
              type="radio"
              name={title.toLowerCase().replace(/\s+/g, '-')}
              value={option.id}
              checked={selectedId === option.id}
              onChange={(e) => onSelectionChange(e.target.value)}
              className="sr-only"
            />
            <div className="flex flex-col items-center gap-1">
              {/* Color Swatch */}
              <div 
                className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 ${
                  selectedId === option.id 
                    ? 'shadow-md scale-110' 
                    : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                }`} 
                style={{ 
                  backgroundColor: option.color,
                  borderColor: selectedId === option.id ? themeColor : undefined
                }}
              >
              </div>
              {/* Label */}
              <span 
                className={`text-xs font-medium transition-colors ${
                  selectedId === option.id 
                    ? '' 
                    : 'text-gray-600 group-hover:text-gray-800'
                }`}
                style={{
                  color: selectedId === option.id ? themeColor : undefined
                }}
              >
                {option.name}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

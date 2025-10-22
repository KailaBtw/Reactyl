import React from 'react';

interface IdealButtonProps {
  isActive: boolean;
  onClick: () => void;
  activeText?: string;
  inactiveText?: string;
  className?: string;
  themeClasses?: any;
}

export const IdealButton: React.FC<IdealButtonProps> = ({
  isActive,
  onClick,
  activeText = "Ideal",
  inactiveText = "Ideal",
  className = "",
  themeClasses
}) => {
  // Simple theme-appropriate colors
  const getThemeColors = () => {
    if (!themeClasses) {
      // Fallback colors if no theme
      return {
        active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-500 shadow-emerald-200',
        inactive: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 hover:from-gray-200 hover:to-gray-300 hover:border-gray-400'
      };
    }

    // Extract theme colors from themeClasses
    const buttonClasses = themeClasses.button || '';
    
    // Determine active colors based on theme
    if (buttonClasses.includes('blue')) {
      return {
        active: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-blue-200',
        inactive: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 hover:from-gray-200 hover:to-gray-300 hover:border-gray-400'
      };
    } else if (buttonClasses.includes('emerald')) {
      return {
        active: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-500 shadow-emerald-200',
        inactive: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 hover:from-gray-200 hover:to-gray-300 hover:border-gray-400'
      };
    } else if (buttonClasses.includes('violet')) {
      return {
        active: 'bg-gradient-to-r from-violet-500 to-violet-600 text-white border-violet-500 shadow-violet-200',
        inactive: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 hover:from-gray-200 hover:to-gray-300 hover:border-gray-400'
      };
    } else if (buttonClasses.includes('gray-700')) {
      return {
        active: 'bg-gradient-to-r from-gray-600 to-gray-700 text-white border-gray-600 shadow-gray-200',
        inactive: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 hover:from-gray-200 hover:to-gray-300 hover:border-gray-400'
      };
    } else {
      // Default light theme
      return {
        active: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-400 shadow-gray-200',
        inactive: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 hover:from-gray-200 hover:to-gray-300 hover:border-gray-400'
      };
    }
  };

  const colors = getThemeColors();

  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 
        transform hover:scale-105 active:scale-95 shadow-sm
        ${isActive ? colors.active : colors.inactive}
        ${className}
      `}
    >
      <span className="flex items-center gap-1">
        {isActive && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {isActive ? activeText : inactiveText}
      </span>
    </button>
  );
};

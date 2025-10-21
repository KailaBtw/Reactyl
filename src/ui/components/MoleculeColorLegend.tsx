import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ATOM_CONFIGS } from '../../config/atomConfig';

interface MoleculeColorLegendProps {
  className?: string;
  theme?: string;
  themeClasses?: any;
}

export const MoleculeColorLegend: React.FC<MoleculeColorLegendProps> = ({ className = '', theme = 'blue', themeClasses }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get molecule colors from config
  const getMoleculeColors = () => {
    return [
      { element: 'H', color: `#${ATOM_CONFIGS.H.color.toString(16).padStart(6, '0')}`, name: 'Hydrogen' },
      { element: 'C', color: `#${ATOM_CONFIGS.C.color.toString(16).padStart(6, '0')}`, name: 'Carbon' },
      { element: 'O', color: `#${ATOM_CONFIGS.O.color.toString(16).padStart(6, '0')}`, name: 'Oxygen' },
      { element: 'N', color: `#${ATOM_CONFIGS.N.color.toString(16).padStart(6, '0')}`, name: 'Nitrogen' },
      { element: 'Br', color: `#${ATOM_CONFIGS.Br.color.toString(16).padStart(6, '0')}`, name: 'Bromine' },
      { element: 'I', color: `#${ATOM_CONFIGS.I.color.toString(16).padStart(6, '0')}`, name: 'Iodine' },
    ];
  };

  const moleculeColors = getMoleculeColors();

  // Get theme-based background color (lighter version)
  const getThemeBackground = () => {
    switch (theme) {
      case 'blue':
        return 'bg-blue-100/90';
      case 'green':
        return 'bg-green-50/90';
      case 'purple':
        return 'bg-purple-50/90';
      case 'dark':
        return 'bg-gray-800/90';
      case 'light':
      default:
        return 'bg-white/90';
    }
  };

  // Get theme-based hover color (darker version)
  const getThemeHover = () => {
    switch (theme) {
      case 'blue':
        return 'hover:bg-blue-200/90';
      case 'green':
        return 'hover:bg-green-100/90';
      case 'purple':
        return 'hover:bg-purple-100/90';
      case 'dark':
        return 'hover:bg-gray-700/90';
      case 'light':
      default:
        return 'hover:bg-gray-50/90';
    }
  };

  return (
    <div className={`absolute top-4 right-4 z-10 ${className}`}>
      <motion.div
        className={`${getThemeBackground()} backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg overflow-hidden`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Compact View - Vertical Layout */}
        <motion.div
          className={`p-2 cursor-pointer ${getThemeHover()} transition-colors`}
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex flex-col gap-1">
            {moleculeColors.slice(0, 3).map(({ element, color, name }) => (
              <div key={element} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className={`text-xs font-bold ${themeClasses?.text || 'text-gray-700'}`}>
                  {isExpanded ? name : element}
                </span>
              </div>
            ))}
            {!isExpanded && (
              <div className="flex items-center gap-2 mt-1">
                <motion.svg 
                  className={`w-3 h-3 ${themeClasses?.textSecondary || 'text-gray-500'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
                <span className={`text-xs ${themeClasses?.textSecondary || 'text-gray-500'}`}>More</span>
              </div>
            )}
            {isExpanded && (
              <>
                {moleculeColors.slice(3).map(({ element, color, name }) => (
                  <div key={element} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className={`text-xs font-bold ${themeClasses?.text || 'text-gray-700'}`}>{name}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

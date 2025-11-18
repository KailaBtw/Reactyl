import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useState } from 'react';
import { ColorPicker } from './ColorPicker';
import { ColorSwatchSelector } from './ColorSwatchSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  uiTheme: string;
  onUIThemeChange: (theme: string) => void;
  uiColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  onUIColorChange: (colorType: string, color: string) => void;
  showAxes: boolean;
  onShowAxesChange: (show: boolean) => void;
  showStats: boolean;
  onShowStatsChange: (show: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  backgroundColor,
  onBackgroundColorChange,
  uiTheme,
  onUIThemeChange,
  uiColors,
  onUIColorChange,
  showAxes,
  onShowAxesChange,
  showStats,
  onShowStatsChange,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showUIColorPicker, setShowUIColorPicker] = useState<string | null>(null);

  // Background color options
  const backgroundOptions = [
    { id: 'light', name: 'Light', color: '#f8fafc' },
    { id: 'light-blue', name: 'Light Blue', color: '#e6f2ff' },
    { id: 'dark', name: 'Dark', color: '#1a1a1a' },
    { id: 'deep-blue', name: 'Blue', color: '#1e3a8a' },
  ];

  // Theme options
  const themeOptions = [
    { id: 'light', name: 'Light', color: '#f8fafc' },
    { id: 'dark', name: 'Dark', color: '#1f2937' },
    { id: 'blue', name: 'Blue', color: '#dbeafe' },
    { id: 'green', name: 'Green', color: '#dcfce7' },
    { id: 'purple', name: 'Purple', color: '#f3e8ff' },
  ];

  // Theme color mapping for selection indicators
  const getThemeColor = (themeId: string) => {
    const colorMap: { [key: string]: string } = {
      light: '#6b7280', // gray
      dark: '#374151', // dark gray
      blue: '#3b82f6', // blue
      green: '#10b981', // emerald
      purple: '#8b5cf6', // violet
    };
    return colorMap[themeId] || '#3b82f6';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Animated backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Animated Modal */}
          <motion.div
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200"
            initial={{
              opacity: 0,
              scale: 0.8,
              y: 50,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              y: 50,
            }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              duration: 0.3,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                Settings
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Visual Settings */}
              <section>
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                  Visual Settings
                </h3>
                <div className="space-y-4">
                  <ColorSwatchSelector
                    title="3D Scene Background"
                    options={backgroundOptions}
                    selectedId={
                      backgroundColor === '#f0f0f0' || backgroundColor === '#f8fafc'
                        ? 'light'
                        : backgroundColor === '#e6f2ff'
                          ? 'light-blue'
                          : backgroundColor === '#1a1a1a'
                            ? 'dark'
                            : backgroundColor === '#0f172a' || backgroundColor === '#1e3a8a'
                              ? 'deep-blue'
                              : 'light'
                    }
                    onSelectionChange={id => {
                      const colorMap: { [key: string]: string } = {
                        light: '#f8fafc',
                        'light-blue': '#e6f2ff',
                        dark: '#1a1a1a',
                        'deep-blue': '#1e3a8a',
                      };
                      onBackgroundColorChange(colorMap[id] || '#f8fafc');
                    }}
                    themeColor="#3b82f6"
                  />

                  <ColorSwatchSelector
                    title="Theme"
                    options={themeOptions}
                    selectedId={uiTheme}
                    onSelectionChange={onUIThemeChange}
                    themeColor={getThemeColor(uiTheme)}
                  />
                </div>
              </section>

              {/* Display Settings */}
              <section>
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                  Display Options
                </h3>
                <div className="space-y-4">
                  {/* Show Axes */}
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={showAxes}
                      onChange={e => onShowAxesChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Show Coordinate Axes</div>
                      <div className="text-sm text-gray-600">
                        Display X, Y, Z axes in the 3D scene
                      </div>
                    </div>
                  </label>

                  {/* Show Stats */}
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={showStats}
                      onChange={e => onShowStatsChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Show Performance Stats</div>
                      <div className="text-sm text-gray-600">
                        Display FPS and timing information
                      </div>
                    </div>
                  </label>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

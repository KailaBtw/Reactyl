import React, { useState } from 'react';
import { ColorPicker } from './ColorPicker';

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

  if (!isOpen) return null;

  const themes = [
    { id: 'light', name: 'Light', description: 'Clean white interface' },
    { id: 'dark', name: 'Dark', description: 'Modern dark interface' },
    { id: 'blue', name: 'Blue', description: 'Professional blue theme' },
    { id: 'green', name: 'Green', description: 'Nature-inspired green' },
    { id: 'purple', name: 'Purple', description: 'Creative purple theme' },
  ];

  const getThemeColor = (themeId: string): string => {
    switch (themeId) {
      case 'light': return '#ffffff';
      case 'dark': return '#1f2937';
      case 'blue': return '#3b82f6';
      case 'green': return '#10b981';
      case 'purple': return '#8b5cf6';
      default: return '#ffffff';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Invisible backdrop for click-to-close */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            ⚙️ Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Visual Settings */}
          <section>
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              🎨 Visual Settings
            </h3>
            <div className="space-y-4">
              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  3D Scene Background
                </label>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition-colors"
                    style={{ backgroundColor: backgroundColor }}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  />
                  <div className="flex gap-2">
                    <button 
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      onClick={() => onBackgroundColorChange('#1a1a1a')}
                    >
                      Dark
                    </button>
                    <button 
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      onClick={() => onBackgroundColorChange('#f0f0f0')}
                    >
                      Light
                    </button>
                    <button 
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      onClick={() => onBackgroundColorChange('#0f172a')}
                    >
                      Deep Blue
                    </button>
                  </div>
                </div>
                {showColorPicker && (
                  <div className="mt-3">
                    <ColorPicker 
                      color={backgroundColor}
                      onChange={onBackgroundColorChange}
                      onClose={() => setShowColorPicker(false)}
                    />
                  </div>
                )}
              </div>

              {/* UI Theme Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UI Theme
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {themes.map((theme) => (
                    <label key={theme.id} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="uiTheme"
                        value={theme.id}
                        checked={uiTheme === theme.id}
                        onChange={(e) => onUIThemeChange(e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-16 h-16 rounded-lg border-2 transition-all ${
                        uiTheme === theme.id 
                          ? 'border-blue-500 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`} style={{ backgroundColor: getThemeColor(theme.id) }}>
                        {uiTheme === theme.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-center mt-2">
                        <div className="text-xs font-medium text-gray-700">{theme.name}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* Display Settings */}
          <section>
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              📊 Display Options
            </h3>
            <div className="space-y-4">
              {/* Show Axes */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={showAxes}
                  onChange={(e) => onShowAxesChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-800">Show Coordinate Axes</div>
                  <div className="text-sm text-gray-600">Display X, Y, Z axes in the 3D scene</div>
                </div>
              </label>

              {/* Show Stats */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={showStats}
                  onChange={(e) => onShowStatsChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-800">Show Performance Stats</div>
                  <div className="text-sm text-gray-600">Display FPS and timing information</div>
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
      </div>
    </div>
  );
};

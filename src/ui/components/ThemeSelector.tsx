import React from 'react';

interface ThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
  className = ''
}) => {
  const themes = [
    { id: 'light', name: 'Light', color: '#f8fafc' },
    { id: 'dark', name: 'Dark', color: '#1f2937' },
    { id: 'blue', name: 'Blue', color: '#dbeafe' },
    { id: 'green', name: 'Green', color: '#dcfce7' },
    { id: 'purple', name: 'Purple', color: '#f3e8ff' },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Theme
      </label>
      <div className="flex gap-2">
        {themes.map((theme) => (
          <label key={theme.id} className="relative cursor-pointer group">
            <input
              type="radio"
              name="theme"
              value={theme.id}
              checked={currentTheme === theme.id}
              onChange={(e) => onThemeChange(e.target.value)}
              className="sr-only"
            />
            <div className="flex flex-col items-center gap-1">
              {/* Theme Cube */}
              <div 
                className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 ${
                  currentTheme === theme.id 
                    ? 'border-blue-500 shadow-md scale-110' 
                    : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                }`} 
                style={{ backgroundColor: theme.color }}
              >
                {currentTheme === theme.id && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
              {/* Theme Label */}
              <span className={`text-xs font-medium transition-colors ${
                currentTheme === theme.id 
                  ? 'text-blue-600' 
                  : 'text-gray-600 group-hover:text-gray-800'
              }`}>
                {theme.name}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

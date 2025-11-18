import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onClose }) => {
  const [currentColor, setCurrentColor] = useState(color);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Preset colors optimized for molecular visualization
  const presetColors = [
    // Dark themes (good for bright molecules)
    '#000000',
    '#1a1a1a',
    '#2c2c2c',
    '#1e1e2e',
    '#0f172a',
    '#1e293b',
    '#374151',
    '#111827',

    // Light themes (good for dark molecules)
    '#ffffff',
    '#f8f9fa',
    '#f1f3f4',
    '#e9ecef',
    '#f0f0f0',
    '#f5f5f5',
    '#fafafa',
    '#ffffff',

    // Professional colors
    '#2c3e50',
    '#34495e',
    '#3498db',
    '#2980b9',
    '#27ae60',
    '#16a085',
    '#8e44ad',
    '#9b59b6',

    // Laboratory themes
    '#f4f4f4',
    '#e8e8e8',
    '#d4d4d4',
    '#a0a0a0',
    '#505050',
    '#404040',
    '#303030',
    '#202020',
  ];

  // Convert hex to HSL for color manipulation
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
      s = 0,
      l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  };

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number) => {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Handle preset color selection
  const handlePresetColor = (presetColor: string) => {
    setCurrentColor(presetColor);
    onChange(presetColor);
  };

  // Handle custom color input
  const handleCustomColor = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = event.target.value;
    setCurrentColor(newColor);
    onChange(newColor);
  };

  // Handle color variation (lighter/darker)
  const handleColorVariation = (variation: 'lighter' | 'darker') => {
    const [h, s, l] = hexToHsl(currentColor);
    const newL = variation === 'lighter' ? Math.min(95, l + 10) : Math.max(5, l - 10);
    const newColor = hslToHex(h, s, newL);
    setCurrentColor(newColor);
    onChange(newColor);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 animate-in"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800">Background Color</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Current Color Display */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-8 border border-gray-300 rounded"
            style={{ backgroundColor: currentColor }}
          />
          <div className="flex-1">
            <input
              type="text"
              value={currentColor}
              onChange={handleCustomColor}
              className="w-full text-xs px-2 py-1 border border-gray-300 rounded font-mono"
              placeholder="#000000"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => handleColorVariation('lighter')}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Lighter
          </button>
          <button
            onClick={() => handleColorVariation('darker')}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Darker
          </button>
        </div>
      </div>

      {/* Preset Colors Grid */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-600 mb-2">Preset Colors</h5>
        <div className="grid grid-cols-8 gap-1">
          {presetColors.map((presetColor, index) => (
            <button
              key={index}
              onClick={() => handlePresetColor(presetColor)}
              className={`w-6 h-6 rounded border-2 transition-all ${
                currentColor === presetColor
                  ? 'border-blue-500 scale-110'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: presetColor }}
              title={presetColor}
            />
          ))}
        </div>
      </div>

      {/* Color Categories */}
      <div className="space-y-3">
        <div>
          <h5 className="text-xs font-medium text-gray-600 mb-2">Dark Themes</h5>
          <div className="flex gap-1">
            {presetColors.slice(0, 8).map((color, index) => (
              <button
                key={index}
                onClick={() => handlePresetColor(color)}
                className={`w-8 h-6 rounded border ${
                  currentColor === color ? 'border-blue-500' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div>
          <h5 className="text-xs font-medium text-gray-600 mb-2">Light Themes</h5>
          <div className="flex gap-1">
            {presetColors.slice(8, 16).map((color, index) => (
              <button
                key={index}
                onClick={() => handlePresetColor(color)}
                className={`w-8 h-6 rounded border ${
                  currentColor === color ? 'border-blue-500' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div>
          <h5 className="text-xs font-medium text-gray-600 mb-2">Professional</h5>
          <div className="flex gap-1">
            {presetColors.slice(16, 24).map((color, index) => (
              <button
                key={index}
                onClick={() => handlePresetColor(color)}
                className={`w-8 h-6 rounded border ${
                  currentColor === color ? 'border-blue-500' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => {
            setCurrentColor('#1a1a1a');
            onChange('#1a1a1a');
          }}
          className="flex-1 text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium"
        >
          Reset to Dark
        </button>
        <button
          onClick={() => {
            setCurrentColor('#ffffff');
            onChange('#ffffff');
          }}
          className="flex-1 text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium"
        >
          Reset to Light
        </button>
      </div>
    </div>
  );
};

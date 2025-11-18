import type React from 'react';
import { AVAILABLE_MOLECULES } from '../../../constants/availableMolecules';

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold mb-3';
const labelClasses = 'block text-xs font-medium mb-1.5';
const selectClasses = 'w-full text-xs px-2.5 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all';

// Color theme configurations
const controlCardThemes = {
  green: {
    border: 'border-green-500/20',
    gradient: 'bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10',
    accent: 'text-green-600 dark:text-green-400',
  },
  purple: {
    border: 'border-purple-500/20',
    gradient: 'bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10',
    accent: 'text-purple-600 dark:text-purple-400',
  },
} as const;

interface MoleculeSelectionCardProps {
  type: 'substrate' | 'nucleophile';
  value: string;
  onChange: (value: string) => void;
  themeClasses: any;
}

export const MoleculeSelectionCard: React.FC<MoleculeSelectionCardProps> = ({
  type,
  value,
  onChange,
  themeClasses,
}) => {
  // Filter molecules based on type
  const moleculeOptions =
    type === 'substrate'
      ? AVAILABLE_MOLECULES.filter(
          mol =>
            mol.includes('Methyl') ||
            mol.includes('Ethyl') ||
            mol.includes('Isopropyl') ||
            mol.includes('Tert') ||
            mol.includes('butyl')
        )
      : AVAILABLE_MOLECULES.filter(
          mol =>
            mol.includes('Hydroxide') ||
            mol.includes('Cyanide') ||
            mol.includes('Methoxide') ||
            mol.includes('Methanol') ||
            mol.includes('Water')
        );

  const theme = type === 'substrate' ? controlCardThemes.green : controlCardThemes.purple;
  const title = type === 'substrate' ? 'Substrate' : 'Nucleophile';

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      <label className={`${cardTitleClasses} ${themeClasses.text}`}>{title}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${selectClasses} ${themeClasses.input}`}
      >
        <option value="">Select {title.toLowerCase()}...</option>
        {moleculeOptions.map(mol => (
          <option key={mol} value={mol}>
            {mol.replace('demo_', '').replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
};


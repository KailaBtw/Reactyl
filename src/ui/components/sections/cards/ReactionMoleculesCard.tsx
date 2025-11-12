import type React from 'react';
import { AVAILABLE_MOLECULES } from '../../../constants/availableMolecules';

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold mb-3';
const labelClasses = 'block text-xs font-medium mb-1.5';
const selectClasses = 'w-full text-sm px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all';

// Color theme configuration
const controlCardThemes = {
  blue: {
    border: 'border-blue-500/20',
    gradient: 'bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10',
    accent: 'text-blue-600 dark:text-blue-400',
  },
} as const;

interface ReactionMoleculesCardProps {
  currentReaction: string;
  substrate: string;
  nucleophile: string;
  onReactionChange: (reaction: string) => void;
  onSubstrateChange: (substrate: string) => void;
  onNucleophileChange: (nucleophile: string) => void;
  themeClasses: any;
}

export const ReactionMoleculesCard: React.FC<ReactionMoleculesCardProps> = ({
  currentReaction,
  substrate,
  nucleophile,
  onReactionChange,
  onSubstrateChange,
  onNucleophileChange,
  themeClasses,
}) => {
  // Filter molecules based on type
  const substrateOptions = AVAILABLE_MOLECULES.filter(
    mol =>
      mol.includes('Methyl') ||
      mol.includes('Ethyl') ||
      mol.includes('Isopropyl') ||
      mol.includes('Tert') ||
      mol.includes('butyl')
  );

  const nucleophileOptions = AVAILABLE_MOLECULES.filter(
    mol =>
      mol.includes('Hydroxide') ||
      mol.includes('Cyanide') ||
      mol.includes('Methoxide') ||
      mol.includes('Methanol') ||
      mol.includes('Water')
  );

  const theme = controlCardThemes.blue;

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      {/* Reaction Type */}
      <label className={`${cardTitleClasses} ${themeClasses.text}`}>Reaction Type</label>
      <select
        value={currentReaction}
        onChange={e => onReactionChange(e.target.value)}
        className={`${selectClasses} ${themeClasses.input} mb-4`}
      >
        <option value="sn2">SN2 - Bimolecular Substitution</option>
        <option value="sn1" disabled>
          SN1 - Unimolecular Substitution (Coming Soon)
        </option>
        <option value="e2" disabled>
          E2 - Bimolecular Elimination (Coming Soon)
        </option>
        <option value="e1" disabled>
          E1 - Unimolecular Elimination (Coming Soon)
        </option>
      </select>

      {/* Molecule Selection - Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`${labelClasses} ${themeClasses.textSecondary}`}>Substrate</label>
          <select
            value={substrate}
            onChange={e => onSubstrateChange(e.target.value)}
            className={`${selectClasses} ${themeClasses.input} text-xs`}
          >
            <option value="">Select substrate...</option>
            {substrateOptions.map(mol => (
              <option key={mol} value={mol}>
                {mol.replace('demo_', '').replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={`${labelClasses} ${themeClasses.textSecondary}`}>Nucleophile</label>
          <select
            value={nucleophile}
            onChange={e => onNucleophileChange(e.target.value)}
            className={`${selectClasses} ${themeClasses.input} text-xs`}
          >
            <option value="">Select nucleophile...</option>
            {nucleophileOptions.map(mol => (
              <option key={mol} value={mol}>
                {mol.replace('demo_', '').replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};


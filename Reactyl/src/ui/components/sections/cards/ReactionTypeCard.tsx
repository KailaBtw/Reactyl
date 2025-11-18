import React from 'react';

// Shared card classes
const controlCardClasses = 'p-4 rounded-lg border flex flex-col';
const cardTitleClasses = 'text-sm font-semibold mb-3';

// Color theme configuration
const controlCardThemes = {
  blue: {
    border: 'border-blue-500/20',
    gradient: 'bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10',
    accent: 'text-blue-600 dark:text-blue-400',
  },
} as const;

interface ReactionTypeCardProps {
  currentReaction: string;
  onReactionChange: (reaction: string) => void;
  themeClasses: any;
}

export const ReactionTypeCard: React.FC<ReactionTypeCardProps> = ({
  currentReaction,
  onReactionChange,
  themeClasses,
}) => {
  const theme = controlCardThemes.blue;

  return (
    <div
      className={`${controlCardClasses} ${themeClasses.card} ${theme.border} ${theme.gradient}`}
    >
      <label className={`${cardTitleClasses} ${themeClasses.text}`}>Reaction Type</label>
      <select
        value={currentReaction}
        onChange={e => onReactionChange(e.target.value)}
        className={`w-full text-sm px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${themeClasses.input}`}
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
    </div>
  );
};


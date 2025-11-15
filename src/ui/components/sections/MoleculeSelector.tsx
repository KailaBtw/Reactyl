import type React from 'react';
import type { ReactionType } from '../common/InfoBubbleContent';
import { SmartInfoBubble } from '../common/SmartInfoBubble';

interface MoleculeSelectorProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  reactionType: string;
  term: 'substrate' | 'nucleophile' | 'base';
  placeholder?: string;
}

/**
 * Reusable molecule selector dropdown component
 */
export const MoleculeSelector: React.FC<MoleculeSelectorProps> = ({
  label,
  value,
  options,
  onChange,
  reactionType,
  term,
  placeholder = `Select ${label.toLowerCase()}...`,
}) => {
  return (
    <div className="form-group" style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <label className="form-label" style={{ margin: 0, fontSize: '12px' }}>
          {label}
        </label>
        <SmartInfoBubble term={term} reactionType={reactionType as ReactionType} size="small" />
      </div>
      <select value={value} onChange={e => onChange(e.target.value)} className="form-select">
        <option value="">{placeholder}</option>
        {options.map(mol => (
          <option key={mol} value={mol}>
            {mol.replace('demo_', '').replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
};


import type React from 'react';
import { useState } from 'react';
import { useUIState } from '../context/UIStateContext';
import { CollisionParameters } from './sections/CollisionParameters';
import { DebugControls } from './sections/DebugControls';
import { LiveStats } from './sections/LiveStats';
import { MoleculeSelection } from './sections/MoleculeSelection';
import { ReactionControls } from './sections/ReactionControls';
import { ReactionProducts } from './sections/ReactionProducts';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="sidebar-section">
      <div className="section-header" onClick={() => setIsOpen(!isOpen)}>
        {title}
        <span>{isOpen ? '▼' : '▶'}</span>
      </div>
      <div className={`section-content ${!isOpen ? 'collapsed' : ''}`}>{children}</div>
    </div>
  );
};

export const RightSidebar: React.FC = () => {
  const { uiState, updateUIState } = useUIState();

  return (
    <div className="right-sidebar">
      <CollapsibleSection title="💥 Collision Parameters" defaultOpen={true}>
        <CollisionParameters />
      </CollapsibleSection>

      <CollapsibleSection title="🧬 Molecules" defaultOpen={true}>
        <MoleculeSelection />
      </CollapsibleSection>

      <CollapsibleSection title="🎮 Reaction Controls" defaultOpen={true}>
        <ReactionControls />
      </CollapsibleSection>

      <CollapsibleSection title="📊 Live Stats" defaultOpen={false}>
        <LiveStats />
      </CollapsibleSection>

      <CollapsibleSection title="📦 Reaction Products" defaultOpen={false}>
        <ReactionProducts />
      </CollapsibleSection>

      <CollapsibleSection title="🔧 Debug" defaultOpen={false}>
        <DebugControls />
      </CollapsibleSection>
    </div>
  );
};

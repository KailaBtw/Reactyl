import type React from 'react';
import { useState } from 'react';
import { useUIState } from '../context/UIStateContext';
import { DebugControls } from './sections/DebugControls';
import { LiveStats } from './sections/LiveStats';
import { MoleculeSearch } from './sections/MoleculeSearch';
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
      <MoleculeSearch />

      <CollapsibleSection title="Molecules" defaultOpen={true}>
        <MoleculeSelection />
      </CollapsibleSection>

      {!uiState.userTestMode && (
        <CollapsibleSection title="Reaction Controls" defaultOpen={true}>
          <ReactionControls />
        </CollapsibleSection>
      )}

      {!uiState.userTestMode && (
        <CollapsibleSection title="📊 Live Stats" defaultOpen={false}>
          <LiveStats />
        </CollapsibleSection>
      )}

      {!uiState.userTestMode && (
        <CollapsibleSection title="📦 Reaction Products" defaultOpen={false}>
          <ReactionProducts />
        </CollapsibleSection>
      )}

      {!uiState.userTestMode && (
        <CollapsibleSection title="🔧 Debug" defaultOpen={false}>
          <DebugControls />
        </CollapsibleSection>
      )}
    </div>
  );
};

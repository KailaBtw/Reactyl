import type React from 'react';
import { TabbedSearch } from './sections/TabbedSearch';

export const RightSidebar: React.FC = () => {
  return (
    <div className="right-sidebar">
      <TabbedSearch />
    </div>
  );
};

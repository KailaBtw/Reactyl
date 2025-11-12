import type React from 'react';

interface SidebarCardProps {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}

export const SidebarCard: React.FC<SidebarCardProps> = ({ title, children, right }) => {
  return (
    <div className="sidebar-card">
      {title && (
        <div className="sidebar-card__header">
          <div className="sidebar-card__title">{title}</div>
          {right && <div className="sidebar-card__right">{right}</div>}
        </div>
      )}
      <div className="sidebar-card__content">{children}</div>
    </div>
  );
};

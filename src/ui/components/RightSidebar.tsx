import type React from 'react';
import { useState } from 'react';
import { TabbedSearch } from './sections/TabbedSearch';

type TabId = 'reactions' | 'molecules' | 'debug';

export const RightSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('reactions');

  return (
    <div className={`modern-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Control Panel Header Card */}
      <div className="cp-header">
        <div className="cp-left">
          <div className="cp-emblem">⚛️</div>
          <div className="cp-title-wrap">
            <div className="cp-title">Control Panel</div>
            <div className="cp-subtitle">Configure simulation and reactions</div>
          </div>
        </div>
        <div className="cp-actions">
          <button 
            className="collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '◀' : '▶'}
          </button>
        </div>
      </div>

      {/* Integrated Tabs */}
      {!isCollapsed && (
        <div className="cp-tabs">
          {(
            [
              { id: 'reactions', label: 'Reactions', icon: '⚗️' },
              { id: 'molecules', label: 'Molecules', icon: '🧪' },
            ] as Array<{ id: TabId; label: string; icon: string }>
          ).map(tab => (
            <button
              key={tab.id}
              className={`cp-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="cp-tab-icon">{tab.icon}</span>
              <span className="cp-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {!isCollapsed && (
        <div className="tab-content cp-content">
          <TabbedSearch externalActiveTab={activeTab} onExternalTabChange={(t: TabId) => setActiveTab(t)} />
        </div>
      )}
    </div>
  );
};

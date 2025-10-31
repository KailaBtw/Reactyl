import React from 'react';

interface ViewportMoveHintProps {
  visible: boolean;
  className?: string;
}

export const ViewportMoveHint: React.FC<ViewportMoveHintProps> = ({ visible, className = '' }) => {
  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none select-none absolute bottom-3 left-3 z-10 opacity-80 ${className}`}
      aria-hidden
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 8,
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Simple 4-way arrows icon */}
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="3" fill="white" fillOpacity="0.9" />
          <path d="M18 2 L21 7 H15 L18 2 Z" fill="white" fillOpacity="0.9"/>
          <path d="M18 34 L21 29 H15 L18 34 Z" fill="white" fillOpacity="0.9"/>
          <path d="M2 18 L7 15 V21 L2 18 Z" fill="white" fillOpacity="0.9"/>
          <path d="M34 18 L29 15 V21 L34 18 Z" fill="white" fillOpacity="0.9"/>
        </svg>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 6, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
        Drag to move/rotate
      </div>
    </div>
  );
};



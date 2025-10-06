import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface InfoBubbleProps {
  term?: string;
  explanation?: string;
  content?: { term: string; explanation: string } | null;
  size?: 'small' | 'medium';
}

export const InfoBubble: React.FC<InfoBubbleProps> = ({ 
  term, 
  explanation, 
  content,
  size = 'small' 
}) => {
  // Use dynamic content if provided, otherwise fall back to direct props
  const displayContent = content || (term && explanation ? { term, explanation } : null);
  
  // Don't render if no content is available
  if (!displayContent) {
    return null;
  }
  const [isVisible, setIsVisible] = useState(false);
  const [isClickedOpen, setIsClickedOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        if (isClickedOpen) {
          setIsClickedOpen(false);
          setIsVisible(false);
        }
      }
    };

    if (isClickedOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isClickedOpen]);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    }
  };

  const handleMouseEnter = () => {
    if (!isClickedOpen) {
      console.log('InfoBubble hover - showing tooltip for:', displayContent.term);
      updatePosition();
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isClickedOpen) {
      console.log('InfoBubble leave - hiding tooltip for:', displayContent.term);
      setIsVisible(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('InfoBubble click - toggling tooltip for:', displayContent.term);
    updatePosition();
    
    if (isClickedOpen) {
      // If already clicked open, close it
      setIsClickedOpen(false);
      setIsVisible(false);
    } else {
      // Open it and keep it open
      setIsClickedOpen(true);
      setIsVisible(true);
    }
  };

  const bubbleSize = size === 'small' ? '14px' : '16px';
  const fontSize = size === 'small' ? '10px' : '11px';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        ref={buttonRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{
          width: bubbleSize,
          height: bubbleSize,
          borderRadius: '50%',
          backgroundColor: isClickedOpen ? 'rgba(74, 144, 226, 0.9)' : 'rgba(74, 144, 226, 0.7)',
          border: isClickedOpen ? '2px solid rgba(74, 144, 226, 1)' : '1px solid rgba(74, 144, 226, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'help',
          fontSize: fontSize,
          fontWeight: 'bold',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transition: 'all 0.2s ease',
          boxShadow: isClickedOpen ? '0 0 8px rgba(74, 144, 226, 0.5)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
          marginLeft: '6px',
          transform: isClickedOpen ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        i
      </div>

      {isVisible && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ 
              opacity: 0, 
              scale: 0.8, 
              y: 10
            }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8, 
              y: 10
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              mass: 0.8
            }}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              transform: 'translateX(-50%) translateY(-100%)',
              zIndex: 9999,
              minWidth: '200px',
              maxWidth: '280px',
              pointerEvents: 'none',
            }}
          >
            {/* Arrow pointing down */}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid rgba(30, 30, 30, 0.95)',
                zIndex: 10000,
              }}
            />
            
            {/* Tooltip content */}
            <div
              style={{
                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(74, 144, 226, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(74, 144, 226, 0.1)',
                color: '#ffffff',
                fontSize: '12px',
                lineHeight: '1.4',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              <div style={{ 
                fontWeight: '600', 
                color: '#4a90e2', 
                marginBottom: '6px',
                fontSize: '13px'
              }}>
                {displayContent.term}
              </div>
              <div style={{ color: '#e0e0e0' }}>
                {displayContent.explanation}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

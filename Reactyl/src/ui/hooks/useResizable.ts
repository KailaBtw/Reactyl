import { useEffect, useRef, useState } from 'react';

interface UseResizableOptions {
  orientation: 'horizontal' | 'vertical';
  initialSize: number;
  minSize: number;
  maxSize: number | (() => number);
  storageKey: string;
}

export const useResizable = ({
  orientation,
  initialSize,
  minSize,
  maxSize,
  storageKey,
}: UseResizableOptions) => {
  // Load initial size from localStorage or use provided default
  const [size, setSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : initialSize;
    }
    return initialSize;
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPosRef = useRef<number>(0);
  const resizeStartSizeRef = useRef<number>(initialSize);
  const prevStorageKeyRef = useRef<string>(storageKey);

  // Reload from localStorage when storageKey changes (e.g., when switching modes)
  useEffect(() => {
    if (storageKey !== prevStorageKeyRef.current && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      const newSize = saved ? parseInt(saved, 10) : initialSize;
      setSize(newSize);
      resizeStartSizeRef.current = newSize;
      prevStorageKeyRef.current = storageKey;
    }
  }, [storageKey, initialSize]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    // Store starting position (X for horizontal, Y for vertical)
    resizeStartPosRef.current = orientation === 'horizontal' ? e.clientX : e.clientY;
    resizeStartSizeRef.current = size;
  };

  useEffect(() => {
    if (!isResizing) return;

    let rafId: number | null = null;
    let pendingSize: number | null = null;

    const updateSize = () => {
      if (pendingSize !== null) {
        setSize(pendingSize);
        pendingSize = null;
      }
      rafId = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate delta based on orientation
      const currentPos = orientation === 'horizontal' ? e.clientX : e.clientY;
      const delta = orientation === 'horizontal'
        ? resizeStartPosRef.current - currentPos // Horizontal: drag left = wider
        : resizeStartPosRef.current - currentPos; // Vertical: drag UP = taller (handle at top, moving up increases size)

      // Calculate max size (can be function for dynamic max)
      const maxSizeValue = typeof maxSize === 'function' ? maxSize() : maxSize;
      const newSize = Math.max(minSize, Math.min(maxSizeValue, resizeStartSizeRef.current + delta));

      // Throttle updates using requestAnimationFrame to prevent flashing
      pendingSize = newSize;
      if (rafId === null) {
        rafId = requestAnimationFrame(updateSize);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (pendingSize !== null) {
        setSize(pendingSize);
        localStorage.setItem(storageKey, pendingSize.toString());
      } else {
        localStorage.setItem(storageKey, size.toString());
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isResizing, size, orientation, minSize, maxSize, storageKey]);

  return {
    size,
    isResizing,
    handleResizeStart,
  };
};


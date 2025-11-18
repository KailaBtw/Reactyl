import React, { forwardRef, useEffect, useRef } from 'react';
import type { UIState } from '../App';
import { threeJSBridge } from '../bridge/ThreeJSBridge';
import { useUIState } from '../context/UIStateContext';

type SceneContainerProps = {};

export const SceneContainer = forwardRef<HTMLDivElement, SceneContainerProps>((_props, ref) => {
  const { uiState } = useUIState();
  const animationIdRef = useRef<number | null>(null);
  const isInitialized = useRef(false);
  const previousUIStateRef = useRef<UIState | null>(null);

  useEffect(() => {
    if (!ref || typeof ref === 'function') return;

    const container = ref.current;
    if (!container) return;

    // Only initialize if not already done (preserve user's work on hot reload)
    if (!isInitialized.current) {
      threeJSBridge.initializeScene(container);
      isInitialized.current = true;
    }

    // Optimized animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      threeJSBridge.render();
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const renderer = threeJSBridge.getRenderer();
      const camera = threeJSBridge.getCamera();

      if (!container || !camera || !renderer) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener('resize', handleResize);

      const renderer = threeJSBridge.getRenderer();
      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [ref]);

  // Update scene when UI state changes
  useEffect(() => {
    threeJSBridge.updateFromUIState(uiState, previousUIStateRef.current);
    previousUIStateRef.current = uiState;
  }, [uiState]);

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="camera-info">
        <div>
          <strong>Mouse:</strong> Left drag to rotate, Right drag to pan
        </div>
        <div>
          <strong>Wheel:</strong> Zoom in/out
        </div>
        <div>
          <strong>Touch:</strong> One finger rotate, Two finger pan/zoom
        </div>
      </div>
    </div>
  );
});

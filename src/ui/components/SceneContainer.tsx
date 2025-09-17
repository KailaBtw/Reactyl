import React, { forwardRef, useEffect, useRef } from 'react';
import { useUIState } from '../context/UIStateContext';
import { threeJSBridge } from '../bridge/ThreeJSBridge';

interface SceneContainerProps {
  // Props will be added as needed
}

export const SceneContainer = forwardRef<HTMLDivElement, SceneContainerProps>((props, ref) => {
  const { uiState } = useUIState();
  const animationIdRef = useRef<number | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!ref || typeof ref === 'function') return;

    const container = ref.current;
    if (!container || isInitialized.current) return;

    // Initialize Three.js scene through bridge
    threeJSBridge.initializeScene(container);
    isInitialized.current = true;

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
    threeJSBridge.updateFromUIState(uiState);
  }, [uiState]);

  return (
    <div 
      ref={ref}
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div className="camera-info">
        <div><strong>Mouse:</strong> Left drag to rotate, Right drag to pan</div>
        <div><strong>Wheel:</strong> Zoom in/out</div>
        <div><strong>Touch:</strong> One finger rotate, Two finger pan/zoom</div>
      </div>
    </div>
  );
});

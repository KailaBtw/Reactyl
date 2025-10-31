import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { threeJSBridge } from '../bridge/ThreeJSBridge';

interface MiniAxisOverlayProps {
  size?: number; // square size in px
  className?: string;
}

/**
 * Renders a tiny 3D axis in the UI, synced to the main camera orientation.
 * Self-contained with its own renderer and RAF.
 */
export const MiniAxisOverlay: React.FC<MiniAxisOverlayProps> = ({ size = 92, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
    camera.position.set(0, 0, 3);

    const axisRoot = new THREE.Object3D();
    scene.add(axisRoot);

    const axes = new THREE.AxesHelper(1.2);
    axisRoot.add(axes);

    const renderLoop = () => {
      // Get fresh camera reference each frame to sync orientation
      const mainCamera = threeJSBridge.getCamera();
      if (mainCamera) {
        // Update camera matrix to ensure quaternion is current
        mainCamera.updateMatrixWorld(true);
        // Copy camera's world quaternion directly - this represents camera orientation
        // For mini compass, we want axes to rotate opposite to camera (showing world-space orientation)
        axisRoot.quaternion.copy(mainCamera.quaternion).invert();
      }
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(renderLoop);
    };
    rafRef.current = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      renderer.setSize(size, size);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [size]);

  return (
    <div
      className={`pointer-events-none select-none absolute bottom-3 right-3 z-10 ${className}`}
      aria-hidden
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />
    </div>
  );
};



import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Smooth camera animation utility
 * Provides smooth, ease-in-out camera transitions for any camera movement
 */
export class CameraAnimator {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private animation: {
    active: boolean;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    targetTarget: THREE.Vector3;
    progress: number;
    duration: number;
  } | null = null;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
  }

  /**
   * Animate camera to a new position and target
   * @param targetPos - Target camera position
   * @param targetTarget - Target look-at point (defaults to origin)
   * @param duration - Animation duration in seconds (default: 1.5)
   */
  animateTo(
    targetPos: THREE.Vector3,
    targetTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    duration: number = 1.5
  ): void {
    // Start from current position
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();

    // Set up animation
    this.animation = {
      active: true,
      startPos,
      targetPos,
      startTarget,
      targetTarget,
      progress: 0,
      duration
    };
  }

  /**
   * Animate camera using spherical coordinates (easier for rotations)
   * @param distance - Distance from target
   * @param azimuth - Horizontal angle in radians (0 = forward, -π/2 = left, π/2 = right)
   * @param elevation - Vertical angle in radians (0 = horizontal, positive = up, negative = down)
   * @param target - Target look-at point (defaults to origin)
   * @param duration - Animation duration in seconds (default: 1.5)
   */
  animateToSpherical(
    distance: number,
    azimuth: number,
    elevation: number,
    target: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    duration: number = 1.5
  ): void {
    // Calculate position using spherical coordinates relative to target
    const targetPos = new THREE.Vector3(
      distance * Math.cos(elevation) * Math.sin(azimuth),  // X
      distance * Math.sin(elevation),                       // Y
      distance * Math.cos(elevation) * Math.cos(azimuth)    // Z
    );

    // Position is relative to target (add target to get world position)
    targetPos.add(target);

    this.animateTo(targetPos, target, duration);
  }

  /**
   * Update animation (call this in your render loop)
   * @param deltaTime - Time since last frame in seconds
   */
  update(deltaTime: number): void {
    if (!this.animation || !this.animation.active) {
      return;
    }

    this.animation.progress += deltaTime / this.animation.duration;
    
    // Debug log every 10 frames
    if (Math.floor(this.animation.progress * 60) % 10 === 0) {
      console.log('CameraAnimator.update:', {
        progress: this.animation.progress,
        deltaTime,
        cameraPos: this.camera.position.toArray()
      });
    }

    if (this.animation.progress >= 1.0) {
      // Animation complete
      this.camera.position.copy(this.animation.targetPos);
      this.controls.target.copy(this.animation.targetTarget);
      this.animation.active = false;
      this.animation = null;
    } else {
      // Smooth interpolation (ease-in-out cubic)
      const t = this.animation.progress;
      const easeT = t < 0.5 
        ? 2 * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2; // Ease-in-out cubic
      
      this.camera.position.lerpVectors(
        this.animation.startPos,
        this.animation.targetPos,
        easeT
      );
      this.controls.target.lerpVectors(
        this.animation.startTarget,
        this.animation.targetTarget,
        easeT
      );
    }
  }

  /**
   * Check if animation is currently active
   */
  isAnimating(): boolean {
    return this.animation !== null && this.animation.active;
  }

  /**
   * Stop current animation immediately
   */
  stop(): void {
    if (this.animation) {
      this.animation.active = false;
      this.animation = null;
    }
  }
}


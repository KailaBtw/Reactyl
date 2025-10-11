/**
 * Animation Utilities
 * Common animation functions and easing curves
 */

export interface AnimationOptions {
  duration: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

/**
 * Standard easing functions
 */
export const EasingFunctions = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 2),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInCubic: (t: number) => t * t * t,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeInQuart: (t: number) => t * t * t * t,
  easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeInOutExpo: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  }
};

/**
 * Generic animation runner
 */
export class AnimationRunner {
  private animationId: number | null = null;
  private isRunning = false;

  /**
   * Run an animation with the given options
   */
  run(options: AnimationOptions): void {
    if (this.isRunning) {
      this.stop();
    }

    this.isRunning = true;
    const startTime = Date.now();
    const easing = options.easing || EasingFunctions.easeOutCubic;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / options.duration, 1);
      const easedProgress = easing(progress);

      // Call update callback
      if (options.onUpdate) {
        options.onUpdate(easedProgress);
      }

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isRunning = false;
        this.animationId = null;
        
        // Call completion callback
        if (options.onComplete) {
          options.onComplete();
        }
      }
    };

    animate();
  }

  /**
   * Stop the current animation
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isRunning = false;
  }

  /**
   * Check if animation is currently running
   */
  get running(): boolean {
    return this.isRunning;
  }
}

/**
 * Utility function to run a simple animation
 */
export function runAnimation(options: AnimationOptions): AnimationRunner {
  const runner = new AnimationRunner();
  runner.run(options);
  return runner;
}

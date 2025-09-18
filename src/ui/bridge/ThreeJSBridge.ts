import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ReactionDemo } from '../../components/reactionDemo';
import { physicsEngine } from '../../physics/cannonPhysicsEngine';
import { collisionEventSystem } from '../../physics/collisionEventSystem';
import { createMoleculeManager } from '../../services/moleculeManager';
import type { UIState } from '../App';

export class ThreeJSBridge {
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private moleculeManager: ReturnType<typeof createMoleculeManager> | null = null;
  private reactionDemo: ReactionDemo | null = null;

  constructor() {
    console.log('ThreeJSBridge initialized');
  }

  initializeScene(container: HTMLElement): THREE.Scene {
    // Only create new scene if one doesn't exist (preserve user's work)
    if (!this.scene) {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x000000);
    }

    // Only create camera if one doesn't exist
    if (!this.camera) {
      this.camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
      );
      this.camera.position.set(15, 10, 20); // Offset for better 3D perspective
    }

    // Only create renderer if one doesn't exist
    if (!this.renderer) {
      try {
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          preserveDrawingBuffer: true, // Helps with context recovery
          powerPreference: 'high-performance',
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Check if WebGL is working
        if (
          !this.renderer.domElement.getContext('webgl') &&
          !this.renderer.domElement.getContext('webgl2')
        ) {
          throw new Error('WebGL not supported');
        }
      } catch (error) {
        console.error('Failed to create WebGL renderer:', error);
        // Fallback to basic renderer
        this.renderer = new THREE.WebGLRenderer({
          antialias: false,
          preserveDrawingBuffer: true,
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
      }

      // Handle WebGL context loss and recovery
      this.renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        console.warn('WebGL context lost - will attempt to restore');
        // Show user-friendly message
        this.showContextLostMessage();
      });

      this.renderer.domElement.addEventListener('webglcontextrestored', () => {
        console.log('WebGL context restored');
        this.hideContextLostMessage();
        // Force reinitialize everything
        this.forceReinitialize(container);
      });

      container.appendChild(this.renderer.domElement);
    }

    // Only add lighting if scene is empty (preserve existing lighting)
    if (this.scene.children.length === 0) {
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      directionalLight.castShadow = true;
      this.scene.add(directionalLight);

      // Add axes helper
      const axesHelper = new THREE.AxesHelper(10); // Larger size for better visibility
      axesHelper.name = 'axesHelper';
      this.scene.add(axesHelper);
    }

    // Only create controls if they don't exist
    if (!this.controls) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.1; // Increased for more responsive feel
      this.controls.enableZoom = true;
      this.controls.enablePan = true;
      this.controls.enableRotate = true;
      this.controls.autoRotate = false;
      this.controls.autoRotateSpeed = 0.604; // 5% faster (0.575 * 1.05)
      this.controls.minDistance = 2;
      this.controls.maxDistance = 50;
      this.controls.maxPolarAngle = Math.PI;
      this.controls.rotateSpeed = 1.0; // Faster rotation
      this.controls.zoomSpeed = 1.0; // Faster zoom
      this.controls.panSpeed = 1.0; // Faster pan
    }

    // Initialize molecule manager and reaction demo
    if (!this.moleculeManager) {
      this.moleculeManager = createMoleculeManager();
    }

    if (!this.reactionDemo) {
      this.reactionDemo = new ReactionDemo(this.scene);

      // Load demo molecules
      this.reactionDemo.loadDemoMolecules(this.moleculeManager, this.scene, status => {
        console.log(`Demo Status: ${status}`);
      });
    }

    // Start health check for black screen detection
    // this.startHealthCheck(); // Commented out for now

    console.log('Three.js scene initialized with orbit controls');
    return this.scene;
  }

  updateFromUIState(uiState: UIState) {
    if (!this.scene) return;

    // Update physics engine time scale
    physicsEngine.setTimeScale(uiState.timeScale);

    // Handle play/pause
    if (uiState.isPlaying) {
      physicsEngine.resume();
    } else {
      physicsEngine.pause();
    }

    // Update testing mode in collision event system
    collisionEventSystem.setTestingMode(uiState.testingMode);

    // Update axes helper visibility
    const axesHelper = this.scene.getObjectByName('axesHelper');
    if (uiState.showAxes) {
      if (!axesHelper) {
        const newAxesHelper = new THREE.AxesHelper(10); // Match the initial size
        newAxesHelper.name = 'axesHelper';
        this.scene.add(newAxesHelper);
      }
    } else {
      if (axesHelper) {
        this.scene.remove(axesHelper);
      }
    }
  }

  render() {
    if (this.scene && this.camera && this.renderer) {
      // Update controls if they exist
      if (this.controls) {
        this.controls.update();
      }

      // Step the physics engine
      physicsEngine.step(1 / 60); // 60 FPS

      this.renderer.render(this.scene, this.camera);
    }
  }

  getScene(): THREE.Scene | null {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  getControls(): OrbitControls | null {
    return this.controls;
  }

  // Reaction demo methods
  async setupCollision(): Promise<void> {
    if (!this.reactionDemo || !this.moleculeManager) {
      console.error('Reaction demo or molecule manager not initialized');
      return;
    }

    console.log('Setting up collision...');
    // The setup is handled in runDemo, but we can add specific setup logic here if needed
  }

  async startReactionAnimation(): Promise<void> {
    if (!this.reactionDemo || !this.moleculeManager) {
      console.error('Reaction demo or molecule manager not initialized');
      return;
    }

    console.log('Starting reaction animation...');

    // Clear any existing trajectory visualizations
    const reactionDemo = this.reactionDemo as any;
    if (reactionDemo.trajectoryController) {
      reactionDemo.trajectoryController.clearTrajectoryVisualization();
    }

    // Start physics engine
    physicsEngine.resume();

    // Create mock time controls and reaction params
    const timeControls = {
      isPlaying: true,
      timeScale: 1.0,
    };

    const reactionParams = {
      substrateMolecule: '',
      nucleophileMolecule: '',
      reactionType: 'sn2',
      temperature: 1200,
      approachAngle: 180,
      impactParameter: 0.0,
      relativeVelocity: 20.0,
    };

    await this.reactionDemo.runDemo(this.moleculeManager, timeControls, reactionParams);
  }

  async stopReaction(): Promise<void> {
    if (!this.reactionDemo) {
      console.error('Reaction demo not initialized');
      return;
    }

    console.log('Stopping reaction...');
    // Pause physics engine
    physicsEngine.pause();

    // Clear any trajectory visualizations
    const reactionDemo = this.reactionDemo as any;
    if (reactionDemo.trajectoryController) {
      reactionDemo.trajectoryController.clearTrajectoryVisualization();
    }
  }

  getMoleculeManager() {
    return this.moleculeManager;
  }

  getReactionDemo() {
    return this.reactionDemo;
  }

  private showContextLostMessage() {
    // Create or show context lost message
    let messageEl = document.getElementById('webgl-context-lost-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'webgl-context-lost-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        text-align: center;
        font-family: Arial, sans-serif;
      `;
      messageEl.innerHTML = `
        <h3>🔄 WebGL Context Lost</h3>
        <p>Attempting to restore 3D view...</p>
        <p>If this persists, please refresh the page.</p>
      `;
      document.body.appendChild(messageEl);
    }
    messageEl.style.display = 'block';
  }

  private hideContextLostMessage() {
    const messageEl = document.getElementById('webgl-context-lost-message');
    if (messageEl) {
      messageEl.style.display = 'none';
    }
  }

  private forceReinitialize(container: HTMLElement) {
    console.log('Force reinitializing Three.js scene...');

    // Clean up everything
    this.dispose();

    // Wait a frame then reinitialize
    requestAnimationFrame(() => {
      this.initializeScene(container);
    });
  }

  private startHealthCheck() {
    // Check every 5 seconds if the renderer is still working
    setInterval(() => {
      if (this.renderer && this.renderer.domElement) {
        const canvas = this.renderer.domElement;
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');

        if (!gl || gl.isContextLost()) {
          console.warn('WebGL context lost detected by health check');
          this.showContextLostMessage();

          // Try to recover
          setTimeout(() => {
            const container = canvas.parentElement;
            if (container) {
              this.forceReinitialize(container);
            }
          }, 1000);
        }
      }
    }, 5000);
  }

  dispose() {
    // Dispose controls
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    // Dispose renderer and clear WebGL context
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }

    // Clear scene
    if (this.scene) {
      this.scene.clear();
      this.scene = null;
    }

    // Clear camera
    this.camera = null;

    console.log('ThreeJSBridge disposed and cleaned up');
  }
}

// Global instance
export const threeJSBridge = new ThreeJSBridge();

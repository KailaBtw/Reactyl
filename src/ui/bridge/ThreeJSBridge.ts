import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ReactionOrchestrator } from '../../systems/ReactionOrchestrator';
import { UnifiedSimulation } from '../../systems/UnifiedSimulation';
import { ReactionRateSimulator } from '../../systems/ReactionRateSimulator';
import { physicsEngine } from '../../physics/cannonPhysicsEngine';
import { collisionEventSystem } from '../../physics/collisionEventSystem';
import { createMoleculeManager } from '../../services/moleculeManager';
import { sceneBridge } from '../../services/SceneBridge';
import { applyLighting } from '../../components/lightingControls';
import { addObjectDebug, DEBUG_MODE, initFpsDebug } from '../../utils/debug';
import type { UIState } from '../App';

// Demo functions are now handled by the chemistry reaction system

export class ThreeJSBridge {
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private moleculeManager: ReturnType<typeof createMoleculeManager> | null = null;
  // Unified system only - no legacy ReactionDemo
  private reactionOrchestrator: ReactionOrchestrator | null = null;
  private unifiedSimulation: UnifiedSimulation | null = null;
  private reactionRateSimulator: ReactionRateSimulator | null = null;

  constructor() {
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

    // Initialize molecule manager
    if (!this.moleculeManager) {
      this.moleculeManager = createMoleculeManager();
    }

    // Initialize unified reaction system
    if (!this.reactionOrchestrator) {
      try {
        this.reactionOrchestrator = new ReactionOrchestrator(this.scene, this.moleculeManager);
        this.unifiedSimulation = new UnifiedSimulation(
          this.reactionOrchestrator,
          this.scene,
          this.camera,
          this.renderer
        );
        
        // Expose to window for debugging and control
        (window as any).unifiedSimulation = this.unifiedSimulation;
      } catch (error) {
        console.warn('Unified reaction system failed to initialize:', error);
      }
    }

    // Initialize reaction rate simulator
    if (!this.reactionRateSimulator) {
      try {
        this.reactionRateSimulator = new ReactionRateSimulator(
          this.scene,
          physicsEngine,
          this.moleculeManager
        );
        
        // Expose to window for debugging
        (window as any).reactionRateSimulator = this.reactionRateSimulator;
      } catch (error) {
        console.warn('Reaction rate simulator failed to initialize:', error);
      }
    }

    // Start health check for black screen detection
    // this.startHealthCheck(); // Commented out for now

    // Apply lighting to the scene
    applyLighting(this.scene);

    // Add debug objects if DEBUG_MODE is enabled
    if (DEBUG_MODE) {
      addObjectDebug(this.scene);
      initFpsDebug();
    }

    // Position and orient the camera (slightly closer for better default zoom)
    this.camera.position.set(8, 8, 12);
    this.camera.lookAt(0, 0, 0);

    // Initialize the scene bridge for React components
    sceneBridge.initialize(this.scene, this.moleculeManager);

    // Expose objects globally for testing and StructureEngine access
    (window as any).scene = this.scene;
    (window as any).camera = this.camera;
    (window as any).renderer = this.renderer;
    (window as any).moleculeManager = this.moleculeManager;
    (window as any).threeJSBridge = this;
    
    // (removed legacy quick test exposure)

    // Unified system: no chemistry mode toggles

    
    // Log available test functions
    // (trimmed test function enumeration for production)
    
    return this.scene;
  }

  updateFromUIState(uiState: UIState, previousState?: UIState) {
    if (!this.scene) return;

    // Only update physics time scale if it actually changed
    if (!previousState || previousState.timeScale !== uiState.timeScale) {
      console.log('Updating physics time scale:', uiState.timeScale);
      physicsEngine.setTimeScale(uiState.timeScale);
    }

    // Only handle play/pause if the playing state actually changed
    if (!previousState || previousState.isPlaying !== uiState.isPlaying) {
      console.log('Updating play/pause state:', uiState.isPlaying);
      if (uiState.isPlaying) {
        physicsEngine.resume();
      } else {
        physicsEngine.pause();
      }
    }

    // Only update testing mode if it actually changed
    if (!previousState || previousState.testingMode !== uiState.testingMode) {
      console.log('Updating testing mode:', uiState.testingMode);
      collisionEventSystem.setTestingMode(uiState.testingMode);
    }

    // Only update axes helper visibility if it actually changed
    if (!previousState || previousState.showAxes !== uiState.showAxes) {
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

    // Only update stats display visibility if it actually changed
    if (!previousState || previousState.showStats !== uiState.showStats) {
      const fpsContainer = document.getElementById('fps-meter');
      if (uiState.showStats) {
        if (!fpsContainer) {
          // Import and initialize FPS debug
          import('../../utils/debug').then(({ initFpsDebug }) => {
            initFpsDebug();
          });
        } else {
          fpsContainer.style.display = 'block';
        }
      } else {
        if (fpsContainer) {
          fpsContainer.style.display = 'none';
        }
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
      const deltaTime = 1 / 60; // 60 FPS
      physicsEngine.step(deltaTime);

      // Update rate simulation if active (handles boundary collisions)
      if (this.reactionRateSimulator) {
        // Check if we're in rate mode by checking UI state
        const uiState = (window as any).uiState;
        if (uiState && uiState.simulationMode === 'rate' && uiState.isPlaying) {
          this.updateRateSimulation(deltaTime);
        }
      }

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

  // Unified system handles molecule loading and collision setup internally

  async startReactionAnimation(): Promise<void> {
    if (!this.reactionOrchestrator || !this.moleculeManager) {
      console.error('Reaction orchestrator or molecule manager not initialized');
      return;
    }

    // Get current UI state for reaction parameters
    const uiState = (window as any).uiState || {
      approachAngle: 180,
      impactParameter: 0.0,
      relativeVelocity: 15.0,
      temperature: 1200,
      substrateMolecule: 'demo_Methyl_bromide',
      nucleophileMolecule: 'demo_Hydroxide_ion',
      reactionType: 'sn2'
    };

    // (removed verbose UI state debug log)

    // Map UI molecule selections to actual molecule data
    const moleculeMapping: { [key: string]: { cid: string; name: string } } = {
      'demo_Methyl_bromide': { cid: '6323', name: 'Methyl bromide' },
      'demo_Hydroxide_ion': { cid: '961', name: 'Hydroxide ion' },
      'demo_Methanol': { cid: '887', name: 'Methanol' },
      'demo_Water': { cid: '962', name: 'Water' }
    };

    const substrateMolecule = moleculeMapping[uiState.substrateMolecule] || { cid: '6323', name: 'Methyl bromide' };
    const nucleophileMolecule = moleculeMapping[uiState.nucleophileMolecule] || { cid: '961', name: 'Hydroxide ion' };

    // (removed verbose mapped molecules debug log)

    const reactionParams = {
      substrateMolecule,
      nucleophileMolecule,
      reactionType: uiState.reactionType || 'sn2',
      temperature: uiState.temperature,
      approachAngle: uiState.approachAngle,
      impactParameter: uiState.impactParameter,
      relativeVelocity: uiState.relativeVelocity,
    };

    if (!this.scene) {
      console.error('Scene not initialized');
      return;
    }

    // Use unified reaction system
    try {
      await this.reactionOrchestrator.runReaction(reactionParams);
      
      // Start unified simulation
      if (this.unifiedSimulation) {
        this.unifiedSimulation.start();
      }
    } catch (error) {
      console.error('Unified reaction failed:', error);
    }
  }

  pauseReactionAnimation(): void {
    if (this.reactionOrchestrator) {
      this.reactionOrchestrator.stopReaction();
    }
  }

  async stopReaction(): Promise<void> {
    // Pause physics engine and orchestrator
    physicsEngine.pause();
    this.reactionOrchestrator?.stopReaction();
  }

  getMoleculeManager() {
    return this.moleculeManager;
  }

  getReactionOrchestrator() {
    return this.reactionOrchestrator;
  }

  getUnifiedSimulation() {
    return this.unifiedSimulation;
  }

  getReactionRateSimulator() {
    return this.reactionRateSimulator;
  }

  async startRateSimulation(
    particleCount: number,
    temperature: number,
    reactionType: string,
    substrateData: any,
    nucleophileData: any
  ): Promise<void> {
    console.log(`Starting rate simulation: ${particleCount} pairs at ${temperature}K`);
    
    if (!this.reactionRateSimulator) {
      console.error('Reaction rate simulator not initialized');
      return;
    }

    try {
      // Ensure physics engine is running
      physicsEngine.resume();
      
      await this.reactionRateSimulator.initializeSimulation(
        substrateData,
        nucleophileData,
        particleCount,
        temperature,
        reactionType
      );
      
      console.log('Rate simulation started');
    } catch (error) {
      console.error('Failed to start rate simulation:', error);
    }
  }

  updateRateSimulation(deltaTime: number): void {
    if (this.reactionRateSimulator) {
      this.reactionRateSimulator.update(deltaTime);
    }
  }

  getRateMetrics(): any {
    if (this.reactionRateSimulator) {
      return this.reactionRateSimulator.getMetrics();
    }
    return {
      reactionRate: 0,
      remainingReactants: 100,
      productsFormed: 0,
      collisionCount: 0,
      elapsedTime: 0
    };
  }

  stopRateSimulation(): void {
    if (this.reactionRateSimulator) {
      this.reactionRateSimulator.clear();
    }
  }

  isUsingUnifiedSystem(): boolean {
    return this.reactionOrchestrator !== null && this.unifiedSimulation !== null;
  }

  // No enhanced demo toggles in unified system

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

    // Clean up everything
    this.dispose();

    // Wait a frame then reinitialize
    requestAnimationFrame(() => {
      this.initializeScene(container);
    });
  }


  /**
   * Clear all molecules and reset the scene without disposing the entire bridge
   */
  clear(): void {
    // Clear all molecules from molecule manager
    if (this.moleculeManager) {
      this.moleculeManager.clearAllMolecules();
    }
    
    // Clear all physics bodies
    if (physicsEngine) {
      physicsEngine.clearAllBodies();
    }
    
    // Clear scene of all objects (but keep lighting and camera)
    if (this.scene) {
      // Remove all children except lighting and camera helpers
      const childrenToRemove = this.scene.children.filter(child => 
        child.type !== 'DirectionalLight' && 
        child.type !== 'AmbientLight' && 
        child.type !== 'HemisphereLight' &&
        child.type !== 'GridHelper' &&
        child.type !== 'AxesHelper'
      );
      
      childrenToRemove.forEach(child => {
        this.scene!.remove(child);
        // Dispose of geometries and materials if it's a mesh
        if (child.type === 'Group' || child.type === 'Mesh') {
          child.traverse((obj: any) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach((mat: any) => mat.dispose());
              } else {
                obj.material.dispose();
              }
            }
          });
        }
      });
      
    }
    
    // Ensure orchestrator flags are reset so a new run can start
    if (this.reactionOrchestrator) {
      try {
        this.reactionOrchestrator.stopReaction();
      } catch (_e) {
        // no-op, best-effort
      }
    }
    
    // Stop unified simulation
    if (this.unifiedSimulation) {
      this.unifiedSimulation.stop();
    }
    
    // Reset collision system state
    if (collisionEventSystem) {
      collisionEventSystem.resetReactionState();
    }
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

  }

  setBackgroundColor(color: string): void {
    if (this.scene) {
      this.scene.background = new THREE.Color(color);
    }
  }
}

// Global instance
export const threeJSBridge = new ThreeJSBridge();

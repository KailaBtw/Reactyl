import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { UIState } from '../App';

export class ThreeJSBridge {
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;

  constructor() {
    console.log('ThreeJSBridge initialized');
  }


  initializeScene(container: HTMLElement): THREE.Scene {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 10, 20); // Offset for better 3D perspective

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Add basic lighting
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

    // Add orbit controls for camera interaction
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1; // Increased for more responsive feel
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.enableRotate = true;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.rotateSpeed = 1.0; // Faster rotation
    this.controls.zoomSpeed = 1.0; // Faster zoom
    this.controls.panSpeed = 1.0; // Faster pan

    console.log('Three.js scene initialized with orbit controls');
    return this.scene;
  }

  updateFromUIState(uiState: UIState) {
    if (!this.scene) return;

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

  dispose() {
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

// Global instance
export const threeJSBridge = new ThreeJSBridge();

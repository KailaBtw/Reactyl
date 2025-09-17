/**
 * Main TypeScript file for Mol Mod - A 3D Molecular Visualization Application
 * ----------------------------------------------------------------------
 * Mol Mod is a web-based application built using Three.js for visualizing and
 * interacting with 3D molecular structures. It allows users to load, display,
 * and manipulate molecules in a 3D environment.
 */

// Package Imports
import * as THREE from 'three'; // Import the Three.js library.
import '../node_modules/awesomplete/awesomplete.css'; // Import CSS for autocompletion (if used). // TODO: Check if used
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Import OrbitControls for interactive camera movement.

// import { generateUUID } from "three/src/math/MathUtils.js"; // Import for generating unique IDs (not currently used).

import { set_up_gui } from './components/guiControls'; // Import functions for setting up the graphical user interface.
import {
  applyLighting,
  updateSkyLightPosition,
  updateSpotlightPosition,
} from './components/lightingControls'; // Import functions for managing scene lighting.
import { drawMolecule } from './components/moleculeDrawer'; // Import functions for fetching and drawing molecules.
// Legacy spatial grid imports removed - now using physics engine
import { physicsEngine } from './physics/cannonPhysicsEngine'; // Import Cannon.js physics engine
import { visualizeHulls } from './physics/convexHullCollision'; // Import hull visualization
// My Imports - Application-Specific Modules
import { createMoleculeManager } from './services/moleculeManager'; // Import the MoleculeManager factory.
import { addObjectDebug, DEBUG_MODE, initFpsDebug, log, updateFpsDebug } from './utils/debug'; // Import debugging utilities.
// import { findCenter } from "./utils/findCenter"; // Import for finding molecule center (not currently used).

import type { MoleculeManager } from './types';

// ===============================
//  Module-Level Variables
// ===============================

/**
 * Creates and manages molecule objects. The MoleculeManager handles the creation,
 * storage, and retrieval of molecule data. It is instantiated once for the
 * entire application.
 */
const moleculeManager: MoleculeManager = createMoleculeManager();

/**
 * A Three.js Clock object used to track time elapsed between frames. This is
 * used for animation and physics calculations (e.g., updating molecule positions
 * based on velocity).
 */
const clock: THREE.Clock = new THREE.Clock();

/**
 * Stores the time elapsed since the last frame. Updated in the `animate` function.
 */
let deltaTime: number = 0;

/**
 * Stores the total time the application has been running. Updated in the `animate` function.
 */
let _totalTime: number = 0;

// Performance optimization variables
let _frameCount: number = 0;

// Animation frame handle (must be declared before first animate() call)
let animationId: number | null = null;

// ===============================
//  Scene Setup
// ===============================

/**
 * The main Three.js scene where all 3D objects (molecules, lights, etc.) are rendered.
 */
const scene: THREE.Scene = new THREE.Scene();

/**
 * The camera used to view the scene. A PerspectiveCamera provides a 3D perspective.
 */
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  75, // Field of view
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near clipping plane
  1000 // Far clipping plane
);
camera.position.z = 5; // Initial camera position.

// ===============================
//  Renderer Setup
// ===============================

/**
 * The WebGL renderer responsible for drawing the scene onto the canvas.
 */
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0); // Set background color to transparent.
renderer.setSize(window.innerWidth, window.innerHeight); // Set renderer size to window dimensions.
renderer.shadowMap.enabled = true; // Enable shadow mapping for realistic lighting.
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows.
document.body.appendChild(renderer.domElement); // Add the renderer's canvas to the DOM.

// ===============================
//  Controls Setup
// ===============================

/**
 * OrbitControls allow the user to rotate and pan the scene using the mouse.
 */
const controls: OrbitControls = new OrbitControls(camera, renderer.domElement);
log('Scene and renderer initialized.');

// ===============================
//  Initialization and Animation
// ===============================

/**
 * The default Chemical Structure ID (CSID) to load on initial startup.
 */
const defaultCSID: number = 2424;

// Initialize the application.
init(defaultCSID);

// Global functions for demo control
(window as any).pauseDemo = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
    physicsEngine.pause();
    log('Demo animation paused');
  }
};

(window as any).resumeDemo = () => {
  if (!animationId) {
    animate();
    physicsEngine.resume();
    log('Demo animation resumed');
  }
};

// Start the animation loop.
animate();

// Auto-reload for demo purposes (every 1.5 minutes)
setInterval(() => {
  console.log('[DEMO]: Auto-reloading simulation...');
  location.reload();
}, 90000); // 90 seconds = 1.5 minutes

// ===============================
//  Event Listeners
// ===============================

/**
 * Handles file input for loading molecule data from a .mol file.
 * This event listener is attached to the file input element.
 */
const moleculeFileInput = document.getElementById('fileInput') as HTMLInputElement;
if (moleculeFileInput) {
  moleculeFileInput.addEventListener('change', (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0]; // Get the selected file.
    if (file) {
      const reader = new FileReader(); // Create a FileReader to read the file content.
      reader.onload = () => {
        const molFile = reader.result as string; // Get the file content as text.
        drawMolecule(molFile, moleculeManager, scene, { x: 0, y: 0, z: 0 }, 'test'); // Draw the molecule. // TODO: Fix position.
      };
      reader.readAsText(file); // Read the file as text.
    }
  });
}

/**
 * Handles window resize events. Updates the camera aspect ratio and renderer size
 * to match the new window dimensions.
 */
function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect.
  camera.updateProjectionMatrix(); // Update the projection matrix.
  renderer.setSize(window.innerWidth, window.innerHeight); // Update renderer size.
}

// Initial resize call.
onWindowResize();

// Event listener for window resize.
window.addEventListener('resize', onWindowResize, false);

// ===============================
//  Helper Functions
// ===============================

/**
 * The main animation loop. This function is called repeatedly by the browser's
 * requestAnimationFrame() function, resulting in a continuous animation.
 */
function animate(): void {
  animationId = requestAnimationFrame(animate); // Request the next animation frame.

  deltaTime = clock.getDelta(); // Get the time elapsed since the last frame.
  _totalTime += deltaTime; // Update the total time.
  _frameCount++; // Increment frame counter for performance optimization

  // Update FPS overlay in debug mode
  if (DEBUG_MODE) {
    updateFpsDebug(deltaTime);
  }

  // Check if physics simulation is paused
  const isPhysicsPaused = physicsEngine.isSimulationPaused();

  // PHYSICS ENGINE STEP - Replaces custom collision detection
  physicsEngine.step(deltaTime);

  // Get all molecules for additional processing
  const allMolecules = moleculeManager.getAllMolecules();

  // Update rotation controllers for ALL molecules
  // Only update if simulation is not paused
  if (!isPhysicsPaused) {
    for (const moleculeObject of allMolecules) {
      const group = moleculeObject.getGroup();

      // Apply rotation for all molecules with rotation controllers
      if ((moleculeObject as unknown as { rotationController?: unknown }).rotationController) {
        const rotationController = (moleculeObject as unknown as { rotationController: unknown })
          .rotationController;
        rotationController.update(deltaTime);
        rotationController.applyToObject3D(group);
      }
    }
  }

  // Hull visualization is now properly cached and only updates positions
  // Only update hulls if simulation is not paused
  if (!isPhysicsPaused) {
    visualizeHulls(scene, allMolecules);
  }

  // Update the positions of the spotlight and skylight based on the camera.
  updateSpotlightPosition(camera);
  updateSkyLightPosition(camera);

  renderer.render(scene, camera); // Render the scene.
  controls.update(); // Update the OrbitControls.
}

/**
 * Initializes the MolMod scene. This function is called when the page is loaded
 * or when the scene needs to be reset. It sets up the initial molecule,
 * lighting, and GUI.
 *
 * @param CSID - The Chemical Structure ID (CSID) of the molecule to load initially.
 */
function init(CSID: number): void {
  log(`Initializing scene with molecule CSID: ${CSID}`);

  // Initialize physics engine (already initialized globally)
  log('Physics engine ready for collision detection and response');

  // Clear the scene:
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
  log('Scene cleared.');

  // Add a Three.js AxesHelper for debugging if DEBUG_MODE is enabled.
  if (DEBUG_MODE) {
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    initFpsDebug();
  }

  // Load and draw the initial molecules.
  // Commented out for clean reaction system testing
  // getMolecule(CSID.toString(), moleculeManager, scene, "a");
  // getMolecule("682", moleculeManager, scene, "b");
  // getMolecule(CSID.toString(), moleculeManager, scene, "c");
  // getMolecule("682", moleculeManager, scene, "d");
  // getMolecule(CSID.toString(), moleculeManager, scene, "e");
  // getMolecule("682", moleculeManager, scene, "f");
  // getMolecule(CSID.toString(), moleculeManager, scene, "g");

  //log(moleculeManager.getAllMolecules());

  // Set up the GUI controls.
  set_up_gui(moleculeManager, scene);

  // Apply lighting to the scene.
  applyLighting(scene);

  // Add debug objects to the scene if DEBUG_MODE is enabled.
  addObjectDebug(scene);

  // Position and orient the camera.
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);
  log('Camera positioned and oriented.');
}

import * as THREE from 'three';

/**
 * Global flag to enable or disable debug log messages.
 * Set to false to prevent log messages from being printed to the console.
 */
export const DEBUG_MODE: boolean = true;

/**
 * Global flag to enable or disable lighting debug helpers.
 * Set to true to show visual aids for lights (e.g., spot light cones, directional light directions).
 */
export const LIGHTING_DEBUG: boolean = false;

/**
 * Global flag to enable or disable object debug.
 */
const OBJECT_DEBUG: boolean = false;

/**
 * A point light used for shadow debugging. It's created here but only used
 * if SHADOW_DEBUG is enabled within the `addLightingDebug` function.
 */
const light: THREE.PointLight = new THREE.PointLight(0xffffff, 1, 100); // White light, intensity 1, range 100

/**
 * Logs information about the program to the console.
 *
 * This function takes any number of arguments and prints them to the console,
 * prefixed with "[DEBUG]: ". It only prints if the `DEBUG_MODE` flag is true.
 *
 * @param messages - Any number of values to be logged to the console.
 * These can be strings, numbers, objects, etc.
 */
export function log(...messages: any[]): void {
  if (!DEBUG_MODE) return; // If DEBUG_MODE is false, do nothing.

  console.log('[DEBUG]: ', ...messages); // Log the messages to the console.
}

/**
 * Adds debugging objects to the scene, such as a ground plane and a cube.
 *
 * This function adds visual aids to the scene to help with debugging. The specific
 * objects added are controlled by internal flags (`GROUND_DEBUG`, `SHAPE_DEBUG`).
 *
 * @param scene - The Three.js scene to add the debug objects to.
 */
export function addObjectDebug(scene: THREE.Scene): void {
  const GROUND_DEBUG: boolean = false; // Flag to enable/disable ground plane debug.
  const SHAPE_DEBUG: boolean = false; // Flag to enable/disable shape (cube) debug.

  if (!OBJECT_DEBUG) return; // If OBJECT_DEBUG is false, do nothing.

  if (GROUND_DEBUG) {
    const groundGeometry = new THREE.PlaneGeometry(500, 500); // Large plane.
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555, // Dark gray.
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal.
    ground.position.y = -1; // Position slightly below the origin.
    ground.receiveShadow = true; // Ground can receive shadows.
    scene.add(ground); // Add to the scene.
  }

  // Create a basic shape (cube)
  if (SHAPE_DEBUG) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green.
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true; // Cube casts shadows.
    scene.add(cube); // Add to the scene.
  }
}

// ==================================
// FPS Debug Overlay (lightweight)
// ==================================

let fpsContainer: HTMLDivElement | null = null;
let fpsFramesSinceUpdate = 0;
let fpsAccumulatedTimeMs = 0;

/**
 * Initializes a simple FPS overlay in the top-left corner when DEBUG_MODE is on.
 */
export function initFpsDebug(): void {
  if (!DEBUG_MODE) return;
  if (typeof document === 'undefined') return;
  if (fpsContainer) return; // already initialized

  const div = document.createElement('div');
  div.id = 'fps-meter';
  div.style.position = 'fixed';
  div.style.left = '6px';
  div.style.top = '6px';
  div.style.padding = '4px 6px';
  div.style.background = 'rgba(0,0,0,0.45)';
  div.style.color = '#0f0';
  div.style.fontFamily = 'monospace';
  div.style.fontSize = '12px';
  div.style.lineHeight = '14px';
  div.style.zIndex = '10000';
  div.textContent = 'FPS: -- | ms: --';
  document.body.appendChild(div);
  fpsContainer = div;
}

/**
 * Updates the FPS overlay. Call once per frame with delta time in seconds.
 */
export function updateFpsDebug(deltaSeconds: number): void {
  if (!DEBUG_MODE || !fpsContainer) return;

  fpsFramesSinceUpdate += 1;
  fpsAccumulatedTimeMs += deltaSeconds * 1000;

  // Update more frequently for better responsiveness
  if (fpsAccumulatedTimeMs >= 250) {
    // Update 4 times per second instead of 2
    const fps = (fpsFramesSinceUpdate * 1000) / fpsAccumulatedTimeMs;
    const ms = fpsAccumulatedTimeMs / fpsFramesSinceUpdate;

    // Add some validation to prevent NaN or infinite values
    const validFps = Number.isFinite(fps) ? fps : 0;
    const validMs = Number.isFinite(ms) ? ms : 0;

    fpsContainer.textContent = `FPS: ${validFps.toFixed(1)} | ms: ${validMs.toFixed(1)}`;
    fpsFramesSinceUpdate = 0;
    fpsAccumulatedTimeMs = 0;
  }
}

/**
 * Removes the FPS overlay (optional cleanup).
 */
export function disposeFpsDebug(): void {
  if (fpsContainer?.parentElement) {
    fpsContainer.parentElement.removeChild(fpsContainer);
  }
  fpsContainer = null;
  fpsFramesSinceUpdate = 0;
  fpsAccumulatedTimeMs = 0;
}

/**
 * Adds lighting debug helpers to the scene.
 *
 * This function adds visual aids to help visualize the position and direction
 * of lights in the scene. The specific helpers added are controlled by internal
 * flags (`SHADOW_DEBUG`, `SPOTLIGHT_DEBUG`, `DIRECTIONAL_LIGHT_DEBUG`).
 *
 * @param scene - The Three.js scene to add the helpers to.
 * @param spotLightHelper - The helper for the spot light.
 * @param directionalLightHelper - The helper for the directional light.
 */
export function addLightingDebug(
  scene: THREE.Scene,
  spotLightHelper: THREE.SpotLightHelper,
  directionalLightHelper: THREE.DirectionalLightHelper
): void {
  const SHADOW_DEBUG: boolean = false; // Flag to enable/disable shadow debugging.
  const SPOTLIGHT_DEBUG: boolean = true; // Flag to enable/disable spot light helper.
  const DIRECTIONAL_LIGHT_DEBUG: boolean = false; // Flag for directional light

  if (!LIGHTING_DEBUG) return; // If LIGHTING_DEBUG is false, do nothing.

  if (SHADOW_DEBUG) {
    const shadowHelper = new THREE.CameraHelper(light.shadow.camera); // 'this' is undefined here, potential error.
    scene.add(shadowHelper);

    // Add a point light with shadows
    light.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 100;
    scene.add(light);
  }

  if (SPOTLIGHT_DEBUG) {
    scene.add(spotLightHelper); // Add the spot light helper to the scene.
  }

  if (DIRECTIONAL_LIGHT_DEBUG) {
    // Add a DirectionalLightHelper to visualize the light's direction
    scene.add(directionalLightHelper);
  }
}

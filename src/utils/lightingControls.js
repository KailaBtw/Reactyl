import * as THREE from "three";
import { log, addLightingDebug, LIGHTING_DEBUG } from "./debug.js"; // Import debugging utilities.

// ===============================
//  Lighting Setup
// ===============================

/**
 * Ambient light that provides a base level of illumination to the entire scene.
 * This light shines from all directions equally.
 * @type {THREE.AmbientLight}
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // White, 40% intensity

/**
 * Spot light that casts a focused beam of light, simulating a spotlight.
 * @type {THREE.SpotLight}
 */
const spotLight = new THREE.SpotLight(0xffffff, 50); // White, high intensity

/**
 * Helper for visualizing the spot light's position, direction, and cone.  Only used for debugging.
 * @type {THREE.SpotLightHelper}
 */
const spotLightHelper = new THREE.SpotLightHelper(spotLight);

/**
 * Directional light that simulates sunlight, shining from a specific direction.
 * @type {THREE.DirectionalLight}
 */
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // White, slightly less intense

/**
 * Helper for visualizing the directional light's direction.  Only used for debugging.
 * @type {THREE.DirectionalLightHelper}
 */
const directionalLightHelper = new THREE.DirectionalLightHelper(
  directionalLight,
  10 // Size of the helper
);

/**
 * Offset for the spotlight relative to the camera position.  This makes the
 * spotlight follow the camera but with a specific offset.
 * @type {THREE.Vector3}
 */
const spotlightOffset = new THREE.Vector3(2, 4, -4); // Right, Up, Behind (relative to camera's forward)

// ===============================
//  Functions
// ===============================

/**
 * Initializes and adds the lighting to the scene.  This function should be called
 * when setting up a new scene to ensure proper lighting.
 *
 * @param {THREE.Scene} scene - The Three.js scene to add the lights to.
 */
export function applyLighting(scene) {
  addAmbientLight(scene);       // Add ambient light.
  addSpotLight(scene);         // Add spot light.
  addDirectionalLight(scene);   // Add directional light.

  // Add lighting debug helpers if LIGHTING_DEBUG is enabled.
  addLightingDebug(scene, spotLightHelper, directionalLightHelper);

  log("Finished Initializing Lighting"); // Log a message indicating lighting setup is complete.
}

/**
 * Updates the position and target of the spotlight to follow the camera with an offset.
 * This function should be called in the animation loop to ensure the spotlight
 * moves with the camera.
 *
 * @param {THREE.Camera} camera - The Three.js camera in the scene.  The spotlight's
 * position and direction are based on the camera.
 */
export function updateSpotlightPosition(camera) {
  const cameraWorldPosition = new THREE.Vector3();
  cameraWorldPosition.copy(camera.position); // Get the camera's current world position.

  const cameraRotation = new THREE.Quaternion();
  cameraRotation.copy(camera.quaternion); // Get the camera's current rotation as a quaternion.

  // Calculate the offset in world space based on the camera's rotation.
  const localOffset = spotlightOffset.clone(); // Clone to avoid modifying the original.
  const worldOffset = localOffset.applyQuaternion(cameraRotation); // Apply the camera's rotation.

  // Calculate the final world position of the spotlight.
  const spotlightWorldPosition = new THREE.Vector3();
  spotlightWorldPosition.addVectors(cameraWorldPosition, worldOffset); // Add the camera position and the offset.
  spotLight.position.copy(spotlightWorldPosition); // Set the spotlight's position.

  // Calculate the target point in front of the camera
  const targetPosition = new THREE.Vector3();
  camera.getWorldDirection(targetPosition); // Get the direction the camera is facing
  targetPosition.normalize(); // Ensure it's a unit vector

  const lookAtDistance = 10; // Adjust this value
  targetPosition.multiplyScalar(lookAtDistance);

  const lookAtWorldPosition = new THREE.Vector3();
  lookAtWorldPosition.addVectors(cameraWorldPosition, targetPosition);

  // Make the spotlight look at this calculated point
  spotLight.lookAt(lookAtWorldPosition); // set spotlight to look at target

  if (LIGHTING_DEBUG) {
    spotLightHelper.update(); // Update the helper to reflect the spotlight's state.
  }
}

// fix this to allow the spotlight to focus on a point in front of the camera instead of scene center
// // Calculate the target point in front of the camera
// const targetPosition = new THREE.Vector3();
// camera.getWorldDirection(targetPosition); // Get the direction the camera is facing
// targetPosition.normalize(); // Ensure it's a unit vector

// const lookAtDistance = 10; // Adjust this value
// targetPosition.multiplyScalar(lookAtDistance);

// const lookAtWorldPosition = new THREE.Vector3();
// lookAtWorldPosition.addVectors(cameraWorldPosition, targetPosition);

// // Make the spotlight look at this calculated point
// console.log("lookAtWorldPosition:", lookAtWorldPosition);
// spotLight.lookAt(lookAtWorldPosition); // set spotlight to look at target
// spotLight.updateWorldMatrix(true, false); // Ensure world matrix is updated
// const targetWorldPosition = new THREE.Vector3();
// spotLight.target.getWorldPosition(targetWorldPosition);
// console.log("spotLight.target.worldPosition:", targetWorldPosition);

/**
 * Updates the position and target of the directional light (simulating sunlight)
 * to be relative to the camera.  This function should be called in the animation
 * loop to keep the "sun" positioned consistently relative to the viewer.
 *
 * @param {THREE.Camera} camera - The Three.js camera in the scene.  The directional
 * light's position is based on the camera.
 */
export function updateSkyLightPosition(camera) {
  const skyLightFixedYOffset = 30; // Fixed vertical offset above the camera.

  // Set the directional light's position.
  directionalLight.position.set(
    camera.position.x,
    camera.position.y + skyLightFixedYOffset, // Fixed height above the camera.
    camera.position.z
  );

  // The direction of a DirectionalLight is determined by its target.
  // To simulate the sun shining down, we need to set the target to a point below it.
  const targetPosition = new THREE.Vector3(
    camera.position.x,
    camera.position.y, // Target the camera's Y level.
    camera.position.z
  );
  directionalLight.target.position.copy(targetPosition); // Set the target's position.
  directionalLight.target.updateWorldMatrix(); // Important: Update the target's matrix.

  if (directionalLightHelper) {
    directionalLightHelper.update(); // Update the helper.
  }
}

/**
 * Adds ambient light to the scene.  This function is called by `applyLighting`.
 *
 * @param {THREE.Scene} scene - The Three.js scene to add the light to.
 */
function addAmbientLight(scene) {
  scene.add(ambientLight); // Add the ambient light to the scene.
  log("AmbientLight added to the Scene");
}

/**
 * Adds a spot light to the scene.  This function is called by `applyLighting`.
 *
 * @param {THREE.Scene} scene - The Three.js scene to add the light to.
 */
function addSpotLight(scene) {
  // Configure the spot light.
  spotLight.position.set(3, 8, 3); // Initial position.
  spotLight.castShadow = true;     // Enable shadow casting.
  spotLight.shadow.mapSize.width = 1024;  // Shadow map resolution.
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 500;    // Shadow camera near plane.  TODO: Adjust these values
  spotLight.shadow.camera.far = 4000;     // Shadow camera far plane.   based on scene
  spotLight.shadow.camera.fov = 30;      // Shadow camera field of view.
  spotLight.penumbra = 1;          // Softness of the shadow edge (0 to 1).

  scene.add(spotLight);           // Add the spot light to the scene.
  spotLightHelper.update();
  log("SpotLight added to the Scene");
}

/**
 * Adds a directional light to the scene.  This function is called by
 * `applyLighting`.
 *
 * @param {THREE.Scene} scene - The Three.js scene to add the light to.
 */
function addDirectionalLight(scene) {
  // Configure the directional light.
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 300; // Adjust based on your scene size

  // Adjust shadow camera bounds to encompass your scene
  const shadowMapSize = 100;
  directionalLight.shadow.camera.left = -shadowMapSize;
  directionalLight.shadow.camera.right = shadowMapSize;
  directionalLight.shadow.camera.top = shadowMapSize;
  directionalLight.shadow.camera.bottom = -shadowMapSize;

  scene.add(directionalLight);
  log("DirectionalLight added to the Scene");
}

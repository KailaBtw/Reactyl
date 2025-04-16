import * as THREE from "three";
import { log, addLightingDebug } from "./debug.js";

const LIGHTING_DEBUG = true; // Set to false to disable lighting debug

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
const spotLight = new THREE.SpotLight(0xffffff, 50);
const spotLightHelper = new THREE.SpotLightHelper(spotLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // White light, slightly less intense
const directionalLightHelper = new THREE.DirectionalLightHelper(
  directionalLight,
  10
);

// Define the offset from the spotlight
const spotlightOffset = new THREE.Vector3(2, 4, -4); // Right, Up, Behind (relative to camera's forward)

/**
 * Call this when initializing a new scene
 *
 * @param {THREE.scene} scene
 */
export function applyLighting(scene) {
  if (LIGHTING_DEBUG) {
    addLightingDebug(scene, spotLightHelper, directionalLightHelper);
  }
  addAmbientLight(scene);
  addSpotLight(scene);
  addDirectionalLight(scene);
  log("Finished Initializing Lighting");
}

/**
 * Call this each animation frame to update the spotlight position
 *
 * @param {*} camera
 * @param {*} scene
 */
export function updateSpotlightPosition(camera) {
  const cameraWorldPosition = new THREE.Vector3();
  cameraWorldPosition.copy(camera.position);

  const cameraRotation = new THREE.Quaternion();
  cameraRotation.copy(camera.quaternion);

  const localOffset = spotlightOffset.clone();
  const worldOffset = localOffset.applyQuaternion(cameraRotation);
  const spotlightWorldPosition = new THREE.Vector3();
  spotlightWorldPosition.addVectors(cameraWorldPosition, worldOffset);
  spotLight.position.copy(spotlightWorldPosition); // set spotlight position

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

  if (LIGHTING_DEBUG) {
    spotLightHelper.update();
  }
}

export function updateSkyLightPosition(camera) {
  // Define the offset for the "sky" light above the camera
  const skyLightFixedYOffset = 30; 
  // Set the directional light's position based on the camera's x and z,
  // but with a fixed y-coordinate.
  directionalLight.position.set(
    camera.position.x,
    camera.position.y + skyLightFixedYOffset, // Keep it a fixed height above the camera's Y
    camera.position.z
  );

  // The direction of a DirectionalLight is determined by its target.
  // To simulate the sun shining down, we need to set the target to a point below it.
  const targetPosition = new THREE.Vector3(
    camera.position.x,
    camera.position.y, // Target the camera's Y level (or slightly below)
    camera.position.z
  );
  directionalLight.target.position.copy(targetPosition);
  directionalLight.target.updateWorldMatrix(); // Important: Update the target's matrix

  // If you were using the helper:
  if (directionalLightHelper) {
    directionalLightHelper.update();
  }
}

function addAmbientLight(scene) {
  scene.add(ambientLight);
  log("AmbientLight added to the Scene");
}

function addSpotLight(scene) {
  // create the spotlight
  spotLight.position.set(3, 8, 3);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 500;
  spotLight.shadow.camera.far = 4000;
  spotLight.shadow.camera.fov = 30;
  spotLight.penumbra = 1; // very soft penumbral edge (0, 1)

  scene.add(spotLight);

  // move to new spot light position
  spotLightHelper.update();
  log("SpotLight added to the Scene");
}

function addDirectionalLight(scene) {
  // Create the directional light (for the "sun" effect)
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

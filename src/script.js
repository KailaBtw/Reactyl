/**
 * Main Javascript class for Mol Mod
 */

// Package Imports
import * as THREE from "three";
import "../node_modules/awesomplete/awesomplete.css";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { generateUUID } from "three/src/math/MathUtils.js";

// My Imports
import { createMoleculeManager } from "./utils/moleculeManager.js";
import {
  applyLighting,
  updateSpotlightPosition,
  updateSkyLightPosition,
} from "./utils/lightingControls.js";
import { log, DEBUG_MODE, addObjectDebug } from "./utils/debug.js";
import { set_up_gui, autoRotate } from "./utils/guiControls.js";
import { getMolecule, drawMolecule } from "./utils/moleculeDrawer.js";
// import { findCenter } from "./utils/findCenter.js";

// make new molecule manager from factory
const moleculeManager = createMoleculeManager();

// track execution time
const clock = new THREE.Clock();
let deltaTime = 0;
let totalTime = 0;

// Create the scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

/**
 * MAIN
 */

// Handle Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
document.body.appendChild(renderer.domElement);

// rotation controls
const controls = new OrbitControls(camera, renderer.domElement);
log("Scene and renderer initialized.");

// initialize the program
const defaultCSID = 2424;
init(defaultCSID);
// start animation loop
animate();

/**
 * ADD EVENT LISTENERS HERE
 */

// Initialize file input
const moleculeFileInput = document.getElementById("fileInput");
moleculeFileInput.addEventListener("change", function (e) {
  const file = moleculeFileInput.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const path = reader.result;
    drawMolecule(molFile, moleculeManager, scene, { x: 0, y: 0, z: 0 }, "test"); // change position later
  };
  reader.readAsText(file);
});

// Initial resize call and event listener for window resizes
onWindowResize();
window.addEventListener("resize", onWindowResize, false);

// Set up my objects

// HELPER FUNCTIONS
/**
 * animate - called each time the scene is updated
 */
function animate() {
  requestAnimationFrame(animate);

  deltaTime = clock.getDelta();
  totalTime += deltaTime;

  // auto-rotate all molecules
  moleculeManager.getAllMolecules().forEach((molecule) => {
    if (autoRotate.x.switch) {
      molecule.group.rotation.x -= 0.5 * deltaTime;
    }
    if (autoRotate.y.switch) {
      molecule.group.rotation.y -= 0.5 * deltaTime;
    }
    if (autoRotate.z.switch) {
      molecule.group.rotation.z -= 0.5 * deltaTime;
    }
  });
  // only one object is moving at a time
  // move all the molecules based on their velocities
  for (const moleculeObject of moleculeManager.getAllMolecules()) {
    // log(moleculeManager.getAllMolecules());
    // get the THREE.Group object
    const group = moleculeObject.getGroup();
    const randomForceStrength = 5;

    // Apply a small random force (change in velocity)
    const randomForce = new THREE.Vector3(
      Math.random() * randomForceStrength,
      Math.random() * randomForceStrength,
      Math.random() * randomForceStrength
    );
    moleculeObject.velocity.addScaledVector(randomForce, deltaTime);

    // Apply some damping to prevent infinite speed increase (optional)
    moleculeObject.velocity.multiplyScalar(0.99);

    // update position
    group.position.addScaledVector(moleculeObject.velocity, deltaTime);
  }

  updateSpotlightPosition(camera);
  updateSkyLightPosition(camera);

  renderer.render(scene, camera);
  // You can now manipulate the entire waterMolecule through its group property
  // waterMolecule.group.rotation.y = Math.PI / 4;
  // waterMolecule.group.position.y = 1;

  controls.update();
}

/**
 * Initialize the MolMod scene when page is opened
 */
function init(CSID) {
  log(`Initializing scene with molecule CSID: ${CSID}`);
  // Clear the scene when the init function is called:
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
  log("Scene cleared.");

  if (DEBUG_MODE) {
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
  }

  getMolecule(CSID, moleculeManager, scene);
  getMolecule(682, moleculeManager, scene);
  getMolecule(CSID, moleculeManager, scene);
  getMolecule(682, moleculeManager, scene);
  getMolecule(CSID, moleculeManager, scene);

  log(moleculeManager.getAllMolecules());

  set_up_gui(moleculeManager, scene);
  applyLighting(scene);
  addObjectDebug(scene);

  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);
  log("Camera positioned and oriented.");
}

// Handle window resizing
function onWindowResize() {
  // TODO: clean up how quick this updates?
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

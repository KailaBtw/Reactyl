/**
 * Main Javascript class for Mol Mod
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { molFileToJSON } from "./utils/molFileToJSON.js";
import { findCenter } from "./utils/findCenter.js";

const DEBUG_MODE = true; // Set to false to disable debug logs

// define variables
const moleculeGeometries = {
  C: new THREE.SphereGeometry(0.8, 32, 32),
  H: new THREE.SphereGeometry(0.3, 32, 32),
  O: new THREE.SphereGeometry(0.5, 32, 32),
  N: new THREE.SphereGeometry(0.6, 32, 32),
  S: new THREE.SphereGeometry(0.8, 32, 32),
  P: new THREE.SphereGeometry(0.9, 32, 32),
  F: new THREE.SphereGeometry(0.4, 32, 32),
  Cl: new THREE.SphereGeometry(0.5, 32, 32),
  Br: new THREE.SphereGeometry(0.6, 32, 32),
  I: new THREE.SphereGeometry(0.7, 32, 32),
};
const moleculeMaterials = {
  C: new THREE.MeshStandardMaterial({ color: 0x333333 }),
  H: new THREE.MeshStandardMaterial({ color: 0xffffff }),
  O: new THREE.MeshStandardMaterial({ color: 0xff0000 }),
  N: new THREE.MeshStandardMaterial({ color: 0x0000ff }),
  S: new THREE.MeshStandardMaterial({ color: 0xffff00 }),
  P: new THREE.MeshStandardMaterial({ color: 0xff00ff }),
  F: new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
  Cl: new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
  Br: new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
};

// create canvas element
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

// Create the scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

const center = {
  x: 0,
  y: 0,
  z: 0,
};


// Handle Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
document.body.appendChild(renderer.domElement);

// rotation controls
const controls = new OrbitControls( camera, renderer.domElement );

log("Scene and renderer initialized.");

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

  // Display axis
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);



  // fetch("molecules/" + CSID + ".mol")
  //   .then((response) => response.text())
  //   .then((molFile) => {
  //     drawMolecule(molFile);
  //   });

    // Create a basic shape (cube)
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green material
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true; // Cube casts shadows
  scene.add(cube);

  applyLighting();

  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);
  log("Camera positioned and oriented.");
}

/**
 * animate - called each time the scene is updated
 */
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);

  controls.update();
}

/**
 * "main" execution
 */
// initialize the program
const defaultCSID = 2424;
init(2424);
// start animation loop
animate();

// Handle window resizing
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

let moleculeGroup = new THREE.Group();

// Define helper functions

function drawMolecule(molFile) {
  const molObject = molFileToJSON(molFile);
  log("Atoms before centering:", molObject.atoms);

  const center = findCenter(molObject);
  log("Computed Center:", center);
  this.center = center;

  for (let item of molObject.atoms) {
    // Verify a valid atom type
    if (!moleculeGeometries[item.type] || !moleculeMaterials[item.type]) {
      console.warn(`Unknown atom type: ${item.type}`);
      continue;
    }

    const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 }); // Gray
    const material = moleculeMaterials[item.type] || defaultMaterial;

    const sphere = new THREE.Mesh(moleculeGeometries[item.type], material);

    sphere.castShadow = true;
    sphere.receiveShadow = true;

    const x = parseFloat(item.position.x || 0) - (center?.x || 0);
    const y = parseFloat(item.position.y || 0) - (center?.y || 0);
    const z = parseFloat(item.position.z || 0) - (center?.z || 0);

    sphere.position.set(x, y, z);
    moleculeGroup.add( sphere );
  }
  scene.add( moleculeGroup );
}

function applyLighting() {

// Add a point light with shadows
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(center.x, center.y, center.z + 10);
light.castShadow = true; // Light casts shadows
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 100;
scene.add(light);

  const groundGeometry = new THREE.PlaneGeometry(500, 500);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -10;
  ground.receiveShadow = true;

  ground.position.y = -1;

  scene.add(ground);

  

  if(DEBUG_MODE) {
  const shadowHelper = new THREE.CameraHelper(light.shadow.camera);
  ///const spotLightHelper = new THREE.SpotLightHelper(spotLight);
  scene.add(shadowHelper);
  // scene.add(spotLightHelper);
  }

// Add an ambient light for softer overall lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

}

function log(...messages) {
  if (DEBUG_MODE) {
    console.log("[DEBUG]", ...messages);
  }
}

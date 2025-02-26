/**
 * Main Javascript class for Mol Mod
 */
import * as THREE from "three";
import { OrbitControls } from "OrbitControls";
import { molFileToJSON } from "molFileToJSON";
import { findCenter } from "findCenter";

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

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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

  applyLighting();

  fetch("molecules/" + CSID + ".mol")
    .then((response) => response.text())
    .then((molFile) => {
      drawMolecule(molFile);
    });

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

let moleculeGroup = new THREE.Group();


// Define helper functions

function drawMolecule(molFile) {
  const molObject = molFileToJSON(molFile);
  log("Atoms before centering:", molObject.atoms);

  const center = findCenter(molObject);
  log("Computed Center:", center);
  

  for (let item of molObject.atoms) {
    // Verify a valid atom type
    if (!moleculeGeometries[item.type] || !moleculeMaterials[item.type]) {
      console.warn(`Unknown atom type: ${item.type}`);
      continue;
    }

    const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 }); // Gray
    const material = moleculeMaterials[item.type] || defaultMaterial;

    const sphere = new THREE.Mesh(moleculeGeometries[item.type], material);

    const x = parseFloat(item.position.x || 0) - (center?.x || 0);
    const y = parseFloat(item.position.y || 0) - (center?.y || 0);
    const z = parseFloat(item.position.z || 0) - (center?.z || 0);

    sphere.position.set(x, y, z);
    moleculeGroup.add( sphere );
  }
  scene.add( moleculeGroup );
}

function applyLighting() {
  const spotLight = new THREE.SpotLight(0xffffff); // White light, intensity 2
  spotLight.position.set(50, 200, 50); // Closer and more practical position
  //spotLight.map = new THREE.TextureLoader().load( url );

  // Softer shadows and smoother edges
  spotLight.angle = Math.PI / 6; // 30-degree spread
  spotLight.penumbra = 0.5; // Soft edges for realism

  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;

  spotLight.shadow.camera.near = 500;
  spotLight.shadow.camera.far = 4000;
  spotLight.shadow.camera.fov = 30;

  scene.add(spotLight);
}

function log(...messages) {
  if (DEBUG_MODE) {
    console.log("[DEBUG]", ...messages);
  }
}

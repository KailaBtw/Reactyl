/**
 * Main Javascript class for Mol Mod
 */
import * as THREE from "three";
import * as dat from 'dat.gui';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { molFileToJSON } from "./utils/molFileToJSON.js";
import { findCenter } from "./utils/findCenter.js";
import { generateUUID } from "three/src/math/MathUtils.js";

const DEBUG_MODE = true; // Set to false to disable debug logs
const LIGHTING_DEBUG = false; // Set to false to disable lighting debug

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

// add group to class
let moleculeGroup = new THREE.Group();

// Create the scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

let center = {
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
const controls = new OrbitControls(camera, renderer.domElement);

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

  if (DEBUG_MODE) {
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
  }

  getMolecule(CSID);
  set_up_gui();

  if (LIGHTING_DEBUG) {
    // Create a basic shape (cube)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green material
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true; // Cube casts shadows
    scene.add(cube);
  }

  applyLighting();

  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);
  log("Camera positioned and oriented.");
}

function set_up_gui() {
  // set up gui
  const gui = new dat.GUI();

  const moleculePosition = gui.addFolder("Position");
  moleculePosition.add(moleculeGroup.position, "x", -10, 10);
  moleculePosition.add(moleculeGroup.position, "y", -10, 10);
  moleculePosition.add(moleculeGroup.position, "z", -10, 10);

  const moleculeRotation = gui.addFolder("Rotation");
  moleculeRotation.add(moleculeGroup.rotation, "x", -Math.PI, Math.PI);
  moleculeRotation.add(moleculeGroup.rotation, "y", -Math.PI, Math.PI);
  moleculeRotation.add(moleculeGroup.rotation, "z", -Math.PI, Math.PI);

  const moleculeScale = gui.addFolder("Scale");
  const scaleX = moleculeScale
    .add(moleculeGroup.scale, "x", 0.1, 1.5)
    .name("Scaling Factor");
  scaleX.onChange(function (value) {
    moleculeGroup.scale.y = value;
    moleculeGroup.scale.z = value;
  });
  // gui.add(autoRotate, "switch").name("Auto Rotate");
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

// Define helper functions

function getMolecule(CSID) {
  fetch("molecules/" + CSID + ".mol")
    .then((response) => response.text())
    .then((molFile) => {
      drawMolecule(molFile);
    });
}


function drawMolecule(molFile) {

  while (moleculeGroup.children.length > 0) {
    moleculeGroup.remove(moleculeGroup.children[0]);
  }
  const molObject = molFileToJSON(molFile);

  let firstPoint = new THREE.Vector3(
    molObject.atoms[0].position.x,
    molObject.atoms[0].position.y,
    molObject.atoms[0].position.z
  );

  let limits = {
    x: {
      min: firstPoint.x,
      max: firstPoint.x,
    },
    y: {
      min: firstPoint.y,
      max: firstPoint.y,
    },
    z: {
      min: firstPoint.z,
      max: firstPoint.z,
    },
  };

  for (let item of molObject.atoms) {
    let point = new THREE.Vector3(
      item.position.x,
      item.position.y,
      item.position.z
    );
    if (Number(point.x) < Number(limits.x.min)) {
      limits.x.min = point.x;
    }
    if (Number(point.x) > Number(limits.x.max)) {
      limits.x.max = point.x;
    }
    if (Number(point.y) < Number(limits.y.min)) {
      limits.y.min = point.y;
    }
    if (Number(point.y) > Number(limits.y.max)) {
      limits.y.max = point.y;
    }
    if (Number(point.z) < Number(limits.z.min)) {
      limits.z.min = point.z;
    }
    if (Number(point.z) > Number(limits.z.max)) {
      limits.z.max = point.z;
    }
  }

  let moleculeCenter = new THREE.Vector3(
    (Number(limits.x.min) + Number(limits.x.max)) / 2,
    (Number(limits.y.min) + Number(limits.y.max)) / 2,
    (Number(limits.z.min) + Number(limits.z.max)) / 2
  );

  for (let item of molObject.atoms) {
    const sphere = new THREE.Mesh(
      moleculeGeometries[item.type],
      moleculeMaterials[item.type]
    );
    sphere.position.x = item.position.x - moleculeCenter.x;
    sphere.position.y = item.position.y - moleculeCenter.y;
    sphere.position.z = item.position.z - moleculeCenter.z;
    moleculeGroup.add(sphere);
  }
  // log("Group position:" + moleculeGroup.position); TODO FIX THIS

  scene.add(moleculeGroup);
}

function applyLighting() {
  // Add a point light with shadows
  if (LIGHTING_DEBUG) {
    const light = new THREE.PointLight(0xffffff, 10, 100);
    light.position.set(center.x, center.y + 5, center.z);
    light.castShadow = true; // Light casts shadows
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 100;
    scene.add(light);

    const shadowHelper = new THREE.CameraHelper(light.shadow.camera);
    scene.add(shadowHelper);
  }

  const spotLight = new THREE.SpotLight(0xffffff, 30);
  spotLight.position.set(3, 5, 3);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 500;
  spotLight.shadow.camera.far = 4000;
  spotLight.shadow.camera.fov = 30;
  scene.add(spotLight);

  // Add an ambient light for softer overall lighting
  const light = new THREE.AmbientLight(0xffffff, 0.2); // soft white light
  scene.add(light);

  if (LIGHTING_DEBUG) {
    // create generic objects for testing
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -10;
    ground.receiveShadow = true;
    ground.position.y = -1;
    scene.add(ground);
  }

  if (LIGHTING_DEBUG) {
    const spotLightHelper = new THREE.SpotLightHelper(spotLight);
    scene.add(spotLightHelper);
  }
}

function log(...messages) {
  if (DEBUG_MODE) {
    console.log("[DEBUG]: ", ...messages);
  }
}

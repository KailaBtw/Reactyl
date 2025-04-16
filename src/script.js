/**
 * Main Javascript class for Mol Mod
 */

// Package Imports
import * as THREE from "three";
import "../node_modules/awesomplete/awesomplete.css";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { generateUUID } from "three/src/math/MathUtils.js";

// My Imports
import { molFileToJSON } from "./utils/molFileToJSON.js";
import { MoleculeManager } from "./utils/moleculeManager.js";
import {
  applyLighting,
  updateSpotlightPosition,
  updateSkyLightPosition,
} from "./utils/lightingControls.js";
import { log, DEBUG_MODE, addObjectDebug } from "./utils/debug.js";
import { set_up_gui, autoRotate } from "./utils/guiControls.js";
// import { findCenter } from "./utils/findCenter.js";

// VARIABLES

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
const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

// add group to class
const moleculeManager = new MoleculeManager();

// track execution time
const clock = new THREE.Clock();
let deltaTime = 0;
let totalTime = 0;
let centerOffset = 0;

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

// issue, cant have multiple of same moleculel?

// draw a second molecule
getMolecule(682, { x: 8, y: 0, z: 4 });

/**
 * ADD EVENT LISTENERS HERE
 */

// Initialize file input
const moleculeFileInput = document.getElementById("fileInput");
moleculeFileInput.addEventListener("change", function (e) {
  const file = moleculeFileInput.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = reader.result;
    drawMolecule(text);
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

  getMolecule(CSID);
  set_up_gui();
  applyLighting(scene);
  addObjectDebug(scene);

  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);
  log("Camera positioned and oriented.");
}

// Draw a new molecule with this CSID
function getMolecule(CSID, position = { x: 0, y: 0, z: 0 }) {
  fetch("molecules/" + CSID + ".mol")
    .then((response) => response.text())
    .then((molFile) => {
      drawMolecule(molFile, position);
    });
}

function drawMolecule(molFile, position = { x: 0, y: 0, z: 0 }) {
  // clear any old atoms, shouldnt be needed now (we create new one)
  // while (moleculeGroup.children.length > 0) {
  //   moleculeGroup.remove(moleculeGroup.children[0]);
  // }

  // JSON of the molecule itself
  const molObject = molFileToJSON(molFile);

  // lets look at it
  //console.log(molObject);

  // make our new molecule group
  const molecule = moleculeManager.newMolecule("test", position);

  // Center it (for now) TODO: this is where the user last clicked (with a flag there)
  let firstPoint = new THREE.Vector3(
    molObject.atoms[0].position.x,
    molObject.atoms[0].position.y,
    molObject.atoms[0].position.z
  );
  // for centering
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
  // set up the molecule geometry
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

  // center the geometry of the molecule
  let moleculeCenter = new THREE.Vector3(
    (Number(limits.x.min) + Number(limits.x.max)) / 2,
    (Number(limits.y.min) + Number(limits.y.max)) / 2,
    (Number(limits.z.min) + Number(limits.z.max)) / 2
  );
  //
  for (let item of molObject.atoms) {
    const sphere = new THREE.Mesh(
      moleculeGeometries[item.type],
      moleculeMaterials[item.type]
    );
    sphere.position.x = item.position.x - moleculeCenter.x;
    sphere.position.y = item.position.y - moleculeCenter.y;
    sphere.position.z = item.position.z - moleculeCenter.z;
    molecule.add(sphere);
  }

  // Add bond geometry
  for (let bond of molObject.bonds) {
    let index1 = Number(bond[0]) - 1;
    let index2 = Number(bond[1]) - 1;

    let atom1 = molObject.atoms[index1];
    let atom2 = molObject.atoms[index2];

    let point1 = new THREE.Vector3(
      atom1.position.x - moleculeCenter.x,
      atom1.position.y - moleculeCenter.y,
      atom1.position.z - moleculeCenter.z
    );
    let point2 = new THREE.Vector3(
      atom2.position.x - moleculeCenter.x,
      atom2.position.y - moleculeCenter.y,
      atom2.position.z - moleculeCenter.z
    );

    let distance = point1.distanceTo(point2);

    let cylinderRadius = bond[2] == 1 ? 0.05 : 0.15;

    const cylinderGeometry = new THREE.CylinderGeometry(
      cylinderRadius,
      cylinderRadius,
      distance,
      8
    );
    cylinderGeometry.translate(0, distance / 2, 0);
    cylinderGeometry.rotateX(Math.PI / 2);

    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.x = atom1.position.x - moleculeCenter.x;
    cylinder.position.y = atom1.position.y - moleculeCenter.y;
    cylinder.position.z = atom1.position.z - moleculeCenter.z;
    cylinder.lookAt(point2);

    molecule.add(cylinder);
  }

  molecule.position.z = centerOffset;
  // set the molecules group position (using three group)
  molecule.group.position.copy(
    new THREE.Vector3(position.x, position.y, position.z)
  );

  scene.add(molecule.group);
}

// Handle window resizing
function onWindowResize() {
  // TODO: clean up how quick this updates?
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

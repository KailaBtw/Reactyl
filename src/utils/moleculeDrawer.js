import * as THREE from "three";

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

let centerOffset = 0;

// Draw a new molecule with this CSID
import { molFileToJSON } from "./molFileToJSON.js";

export function getMolecule(CSID, moleculeManager, scene, position) {
  // Set default position to a random value between -50 and 50 if not provided
  const defaultPosition = {
    x: Math.floor(Math.random() * 51) - 25, // Random integer between -50 and 50
    y: Math.floor(Math.random() * 51) - 25,
    z: Math.floor(Math.random() * 51) - 25,
  };

  const finalPosition = position === undefined ? defaultPosition : position;

    fetch("molecules/" + CSID + ".mol")
      .then((response) => response.text())
      .then((molFile) => {
        drawMolecule(molFile, moleculeManager, scene, finalPosition, "replace with csid name enum");
      });
  }
  
  export function drawMolecule(molFile, moleculeManager, scene, position = { x: 0, y: 0, z: 0 }, name = "unknown") {
    // clear any old atoms, shouldnt be needed now (we create new one)
    // while (moleculeGroup.children.length > 0) {
    //   moleculeGroup.remove(moleculeGroup.children[0]);
    // }
  
    // JSON of the molecule itself
    const molObject = molFileToJSON(molFile);
  
    // lets look at it
    //console.log(molObject);
  
    // make our new molecule group
    const molecule = moleculeManager.newMolecule({name}, { x: 10, y: 0, z: 0 });
    //const molecule2 = moleculeManager.newMolecule("Methane", { x: -10, y: 0, z: 0 });
    
    //drawMolecule(molecule1);
  
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
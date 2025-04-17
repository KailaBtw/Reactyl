
import * as dat from "dat.gui";
import * as THREE from "three";
import Awesomplete from "awesomplete";

import { Molecules } from "../assets/molecules_enum.js";
import { getMolecule } from "./moleculeDrawer.js";
import { log } from "./debug.js";
import { createMoleculeManager } from "./moleculeManager.js";

const center = new THREE.Vector3(); // Initialize your center

// Set up auto-rotation switches
export const autoRotate = { x: false, y: false, z: false}

// .mol file selector
const loadMoleculeFile = {
  loadFile: function () {
    document.getElementById("fileInput").click();
  },
};

export function set_up_gui(moleculeManager, scene) {
  // set up gui
  const gui = new dat.GUI();

  const loadMolecule = gui.addFolder("Load .mol file");
  loadMolecule.add(loadMoleculeFile, "loadFile").name("Load file from device");
  loadMolecule.open();

  // Molecule selector
  addMoleculeSelector(gui, moleculeManager, scene);

  // Molecule Search
  addMoleculeSearch(gui, moleculeManager, scene);

  // Position Options
  // TODO add user flow (select molecule then change position/rot/scale

  // const moleculePosition = gui.addFolder("Position");
  // moleculePosition.add(moleculeGroup.position, "x", -10, 10);
  // moleculePosition.add(moleculeGroup.position, "y", -10, 10);
  // moleculePosition.add(moleculeGroup.position, "z", -10, 10);

  // Rotation options
  const moleculeRotation = gui.addFolder("Rotation");
  // moleculeRotation.add(moleculeGroup.rotation, "x", -Math.PI, Math.PI);
  // moleculeRotation.add(moleculeGroup.rotation, "y", -Math.PI, Math.PI);
  // moleculeRotation.add(moleculeGroup.rotation, "z", -Math.PI, Math.PI);
  // moleculeRotation.add(autoRotate.x, "switch").name("Auto Rotate X");
  // moleculeRotation.add(autoRotate.y, "switch").name("Auto Rotate Y");
  // moleculeRotation.add(autoRotate.z, "switch").name("Auto Rotate Z");

  // Scale options
  // const moleculeScale = gui.addFolder("Scale");
  // const scaleX = moleculeScale
  //   .add(moleculeGroup.scale, "x", 0.1, 1.5)
  //   .name("Scaling Factor");
  // scaleX.onChange(function (value) {
  //   moleculeGroup.scale.y = value;
  //   moleculeGroup.scale.z = value;
  // });
}

// Shared event handler
function handleMoleculeSelection(selectedMolecule, Molecules, moleculeManager, scene) {
  const moleculeKey = Object.keys(Molecules).find(
    (key) => Molecules[key].name === selectedMolecule
  );

  if (moleculeKey) {
    if (Molecules[moleculeKey].CSID) {
      log("CSID: " + Molecules[moleculeKey].CSID);
      getMolecule(Molecules[moleculeKey].CSID, moleculeManager, scene);
    } else {
      log("CSID not found for " + selectedMolecule);
      log(Molecules[moleculeKey]);
    }
  } else {
    log("Molecule not found: " + selectedMolecule);
  }
}

function addMoleculeSelector(gui, moleculeManager, scene) {
  const moleculeSelect = gui.addFolder("Molecule Selector");

  // Create dropdown (select) element
  const moleculeDropdown = document.createElement("select");
  moleculeDropdown.id = "moleculeDropdown";

  // Populate dropdown options
  Object.values(Molecules).forEach((molecule) => {
    const option = document.createElement("option");
    option.value = molecule.name;
    option.text = molecule.name;
    moleculeDropdown.appendChild(option);
  });

  // Append dropdown to dat.GUI folder
  moleculeSelect.domElement.appendChild(moleculeDropdown);

  // Event listener for dropdown selection
  moleculeDropdown.addEventListener("change", (event) => {
    const selectedMolecule = event.target.value;
    handleMoleculeSelection(selectedMolecule, Molecules, moleculeManager, scene);
    //moleculeSearch.value = ""; // Clear the textbox
  });

  moleculeSelect.open();
}

function addMoleculeSearch(gui, moleculeManager, scene) {
  const moleculeSearch = gui.addFolder("Molecule Search");

  // Create input element
  const searchInput = document.createElement("input");
  searchInput.id = "moleculeSearch";
  searchInput.type = "text";
  searchInput.placeholder = "Search Molecule...";

  // Append input to dat.GUI folder
  moleculeSearch.domElement.appendChild(searchInput);

  // keep in this is required (ignore unused ref warning!!)
  const awesomplete = new Awesomplete(searchInput, {
    list: Object.values(Molecules).map((molecule) => molecule.name), // Use molecule names
  });

  // Event listener for awesomplete selection
  searchInput.addEventListener("awesomplete-selectcomplete", (event) => {
    const selectedMolecule = event.text.value;
    handleMoleculeSelection(selectedMolecule, Molecules, moleculeManager, scene);
    moleculeDropdown.value = selectedMolecule; // Change dropdown selection
  });

  // moleculeSearch.open();
}

import * as dat from "dat.gui";
import * as THREE from "three";
import Awesomplete from "awesomplete"; // Import the Awesomplete library.
import { Molecules } from "../assets/molecules_enum.js"; // Import the Molecules enum.
import { getMolecule } from "./moleculeDrawer.js"; // Import the getMolecule function.
import { log } from "./debug.js"; // Import the log function.
import { createMoleculeManager } from "./moleculeManager.js"; // Import the createMoleculeManager.js
import { 
  getSpatialGridStats, 
  resetSpatialGridStats, 
  debugVisualizeSpatialGrid 
} from "./vectorHelper.js"; // Import spatial grid functions

/**
 * Main Javascript class for setting up GUI
 */

/**
  * Global variable for the center point of the scene.
  */
const center = new THREE.Vector3(); // Initialize your center

/**
 * Object to hold auto-rotation switch states for X, Y, and Z axes.
 * These are used to control automatic rotation of molecules in the scene.
 */
export const autoRotate = { x: false, y: false, z: false };

/**
 * Defines an object used to trigger file input for loading molecule files.
 */
const loadMoleculeFile = {
  loadFile: function () {
    document.getElementById("fileInput").click(); // Simulate a click on the hidden file input element.
  },
};

/**
 * Sets up the dat.GUI interface for controlling various aspects of the scene,
 * including loading molecules, selecting molecules, and adjusting their properties.
 *
 * @param {object} moleculeManager - The molecule manager object.
 * @param {THREE.Scene} scene - The Three.js scene object.
 */
export function set_up_gui(moleculeManager, scene) {
  // Create a new dat.GUI instance.
  const gui = new dat.GUI();

  // --- Load Molecule Folder ---
  const loadMolecule = gui.addFolder("Load .mol file"); // Create a folder in the GUI.
  loadMolecule.add(loadMoleculeFile, "loadFile").name("Load file from device"); // Add a button to trigger file loading.
  loadMolecule.open(); // Open the folder by default.

  // --- Molecule Selector ---
  addMoleculeSelector(gui, moleculeManager, scene); // Add the molecule selector dropdown.

  // --- Molecule Search ---
  addMoleculeSearch(gui, moleculeManager, scene); // Add the molecule search input.

  // --- Position Options (Commented Out) ---
  // TODO add user flow (select molecule then change position/rot/scale
  // const moleculePosition = gui.addFolder("Position");
  // moleculePosition.add(moleculeGroup.position, "x", -10, 10);
  // moleculePosition.add(moleculeGroup.position, "y", -10, 10);
  // moleculePosition.add(moleculeGroup.position, "z", -10, 10);

  // --- Rotation Options  (Commented Out) ---
  //const moleculeRotation = gui.addFolder("Rotation"); // Create a folder for rotation controls.
  // moleculeRotation.add(moleculeGroup.rotation, "x", -Math.PI, Math.PI);
  // moleculeRotation.add(moleculeGroup.rotation, "y", -Math.PI, Math.PI);
  // moleculeRotation.add(moleculeGroup.rotation, "z", -Math.PI, Math.PI);
  // moleculeRotation.add(autoRotate.x, "switch").name("Auto Rotate X"); // Add a checkbox for auto-rotating on the X-axis.
  // moleculeRotation.add(autoRotate.y, "switch").name("Auto Rotate Y"); // Add a checkbox for auto-rotating on the Y-axis.
  // moleculeRotation.add(autoRotate.z, "switch").name("Auto Rotate Z"); // Add a checkbox for auto-rotating on the Z-axis.

  // --- Scale Options (Commented Out) ---
  // const moleculeScale = gui.addFolder("Scale");
  // const scaleX = moleculeScale
  //   .add(moleculeGroup.scale, "x", 0.1, 1.5)
  //   .name("Scaling Factor");
  // scaleX.onChange(function (value) {
  //   moleculeGroup.scale.y = value;
  //   moleculeGroup.scale.z = value;
  // });

  // --- Spatial Grid Debug Controls ---
  addSpatialGridControls(gui, scene);
}

/**
 * Handles the selection of a molecule, either from the dropdown or the search input.
 * This function retrieves the molecule's CSID and uses it to fetch and display
 * the molecule in the scene.
 *
 * @param {string} selectedMolecule - The name of the selected molecule.
 * @param {object} Molecules - The Molecules enum containing molecule data.
 * @param {object} moleculeManager - The molecule manager object.
 * @param {THREE.Scene} scene - The Three.js scene object.
 */
function handleMoleculeSelection(selectedMolecule, Molecules, moleculeManager, scene) {
  const moleculeKey = Object.keys(Molecules).find(
    (key) => Molecules[key].name === selectedMolecule // Find the key in the Molecules enum that matches the selected name.
  );

  if (moleculeKey) {
    // If the molecule is found in the enum.
    if (Molecules[moleculeKey].CSID) {
      // If the molecule has a CSID.
      log("CSID: " + Molecules[moleculeKey].CSID); // Log the CSID.
      getMolecule(Molecules[moleculeKey].CSID, moleculeManager, scene); // Fetch and display the molecule.
    } else {
      // If the molecule doesn't have a CSID.
      log("CSID not found for " + selectedMolecule); // Log an error message.
      log(Molecules[moleculeKey]); // Log the molecule data.
    }
  } else {
    // If the molecule is not found in the enum.
    log("Molecule not found: " + selectedMolecule); // Log an error message.
  }
}

/**
 * Adds a dropdown (select) element to the GUI for selecting molecules.
 *
 * @param {object} gui - The dat.GUI instance.
 * @param {object} moleculeManager - The molecule manager object.
 * @param {THREE.Scene} scene - The Three.js scene object.
 */
function addMoleculeSelector(gui, moleculeManager, scene) {
  const moleculeSelect = gui.addFolder("Molecule Selector"); // Create a folder in the GUI for the dropdown.

  // Create the dropdown element.
  const moleculeDropdown = document.createElement("select");
  moleculeDropdown.id = "moleculeDropdown";

  // Populate the dropdown with options from the Molecules enum.
  Object.values(Molecules).forEach((molecule) => {
    const option = document.createElement("option"); // Create an option element for each molecule.
    option.value = molecule.name; // Set the option value to the molecule name.
    option.text = molecule.name; // Set the option text to the molecule name.
    moleculeDropdown.appendChild(option); // Add the option to the dropdown.
  });

  // Append the dropdown to the GUI folder.
  moleculeSelect.domElement.appendChild(moleculeDropdown);

  // Add an event listener to the dropdown to handle molecule selection.
  moleculeDropdown.addEventListener("change", (event) => {
    const selectedMolecule = event.target.value; // Get the selected molecule name.
    handleMoleculeSelection(selectedMolecule, Molecules, moleculeManager, scene); // Handle the selection.
    //moleculeSearch.value = ""; // Clear the textbox
  });

  moleculeSelect.open(); // Open the folder by default
}

/**
 * Adds a search input field to the GUI for searching for molecules.  Uses the
 * Awesomplete library for autocompletion.
 *
 * @param {object} gui - The dat.GUI instance.
 * @param {object} moleculeManager - The molecule manager object.
 * @param {THREE.Scene} scene - The Three.js scene object.
 */
function addMoleculeSearch(gui, moleculeManager, scene) {
  const moleculeSearch = gui.addFolder("Molecule Search"); // Create a folder in the GUI for the search input.

  // Create the search input element.
  const searchInput = document.createElement("input");
  searchInput.id = "moleculeSearch";
  searchInput.type = "text";
  searchInput.placeholder = "Search Molecule..."; // Set a placeholder text.

  // Append the search input to the GUI folder.
  moleculeSearch.domElement.appendChild(searchInput);

  // Initialize Awesomplete with the molecule names from the Molecules enum.
  const awesomplete = new Awesomplete(searchInput, {
    list: Object.values(Molecules).map((molecule) => molecule.name), // Use molecule names for the autocomplete list.
  });

  // Add an event listener to the search input to handle molecule selection.
  searchInput.addEventListener("awesomplete-selectcomplete", (event) => {
    const selectedMolecule = event.text.value; // Get the selected molecule name.
    handleMoleculeSelection(selectedMolecule, Molecules, moleculeManager, scene); // Handle the selection.
    moleculeDropdown.value = selectedMolecule; // Change dropdown selection
  });

  // moleculeSearch.open();
}

/**
 * Adds spatial grid debug controls to the GUI
 * @param {object} gui - The dat.GUI instance
 * @param {THREE.Scene} scene - The Three.js scene object
 */
function addSpatialGridControls(gui, scene) {
  const spatialGridFolder = gui.addFolder("Spatial Grid Debug");
  
  // Performance stats display
  const statsDisplay = {
    totalCells: 0,
    moleculesInGrid: 0,
    totalChecks: 0,
    actualCollisions: 0
  };

  // Add stats display (read-only)
  spatialGridFolder.add(statsDisplay, "totalCells").name("Total Cells").listen();
  spatialGridFolder.add(statsDisplay, "moleculesInGrid").name("Molecules in Grid").listen();
  spatialGridFolder.add(statsDisplay, "totalChecks").name("Total Checks (Cumulative)").listen();
  spatialGridFolder.add(statsDisplay, "actualCollisions").name("Actual Collisions (Cumulative)").listen();

  // Add average molecules per cell as a separate display
  const avgDisplay = { value: "0.00" };
  spatialGridFolder.add(avgDisplay, "value").name("Avg Molecules/Cell").listen();

  // Update stats every frame
  function updateStats() {
    const stats = getSpatialGridStats();
    if (stats) {
      statsDisplay.totalCells = stats.totalCells;
      statsDisplay.moleculesInGrid = stats.moleculesInGrid;
      avgDisplay.value = stats.averageMoleculesPerCell.toFixed(2);
      statsDisplay.totalChecks = stats.totalChecks;
      statsDisplay.actualCollisions = stats.actualCollisions;
    }
    requestAnimationFrame(updateStats);
  }
  updateStats();

  // Reset stats button
  spatialGridFolder.add({
    resetStats: function() {
      resetSpatialGridStats();
      log("Spatial grid statistics reset");
    }
  }, "resetStats").name("Reset Stats");

  // Toggle grid visualization
  let showGrid = false;
  spatialGridFolder.add({
    toggleGrid: function() {
      showGrid = !showGrid;
      if (showGrid) {
        log("Spatial grid visualization enabled");
      } else {
        // Remove grid visualization objects
        const gridObjects = scene.children.filter(child => child.userData.isGridDebug);
        gridObjects.forEach(obj => scene.remove(obj));
        log("Spatial grid visualization disabled");
      }
    }
  }, "toggleGrid").name("Show Grid");

  // Update grid visualization each frame when enabled
  function updateGridVisualization() {
    if (showGrid) {
      debugVisualizeSpatialGrid(scene);
    }
    requestAnimationFrame(updateGridVisualization);
  }
  updateGridVisualization();

  spatialGridFolder.open();
}

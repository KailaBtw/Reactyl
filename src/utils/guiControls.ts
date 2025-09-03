import * as dat from "dat.gui";
import * as THREE from "three";
import Awesomplete from "awesomplete"; // Import the Awesomplete library.
import { Molecules } from "../assets/molecules_enum"; // Import the Molecules enum.
import { getMolecule } from "./moleculeDrawer"; // Import the getMolecule function.
import { log } from "./debug"; // Import the log function.
import { 
  getSpatialGridStats, 
  resetSpatialGridStats, 
  debugVisualizeSpatialGrid 
} from "./vectorHelper"; // Import spatial grid functions
import { 
  setHullVisualization, 
  getHullVisualization, 
  visualizeHulls 
} from "./convexHullCollision"; // Import hull visualization functions
import { collisionEventSystem } from "./collisionEventSystem";
import { getCacheStats } from "./transformCache";
import { reactionCollisionInterface } from "./reactionCollisionInterface";
import { RotationController } from "./rotationController";
 // Import hull visualization
import { 
  MoleculeManager, 
  Molecule, 
  StatsDisplay, 
  ValueDisplay,
  LoadMoleculeFile,
  AutoRotate
} from "../types";

/**
 * Main TypeScript class for setting up GUI
 */



/**
 * Object to hold auto-rotation switch states for X, Y, and Z axes.
 * These are used to control automatic rotation of molecules in the scene.
 */
export const autoRotate: AutoRotate = { x: { switch: false }, y: { switch: false }, z: { switch: false } };

/**
 * Defines an object used to trigger file input for loading molecule files.
 */
const loadMoleculeFile: LoadMoleculeFile = {
  loadFile: function (): void {
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
      fileInput.click(); // Simulate a click on the hidden file input element.
    }
  },
};

/**
 * Sets up the dat.GUI interface for controlling various aspects of the scene,
 * including loading molecules, selecting molecules, and adjusting their properties.
 *
 * @param moleculeManager - The molecule manager object.
 * @param scene - The Three.js scene object.
 */
export function set_up_gui(moleculeManager: MoleculeManager, scene: THREE.Scene): void {
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
  addSpatialGridControls(gui, scene, moleculeManager);

  // --- Hull Visualization Controls ---
  addHullVisualizationControls(gui, scene, moleculeManager);

  // --- Collision System Debug Controls ---
  addCollisionSystemControls(gui, scene, moleculeManager);

  // --- Molecule Rotation Controls ---
  addMoleculeRotationControls(gui, scene, moleculeManager);
}

/**
 * Handles the selection of a molecule, either from the dropdown or the search input.
 * This function retrieves the molecule's CSID and uses it to fetch and display
 * the molecule in the scene.
 *
 * @param selectedMolecule - The name of the selected molecule.
 * @param Molecules - The Molecules enum containing molecule data.
 * @param moleculeManager - The molecule manager object.
 * @param scene - The Three.js scene object.
 */
function handleMoleculeSelection(
  selectedMolecule: string, 
  Molecules: any, 
  moleculeManager: MoleculeManager, 
  scene: THREE.Scene
): void {
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
 * @param gui - The dat.GUI instance.
 * @param moleculeManager - The molecule manager object.
 * @param scene - The Three.js scene object.
 */
function addMoleculeSelector(gui: dat.GUI, moleculeManager: MoleculeManager, scene: THREE.Scene): void {
  const moleculeSelect = gui.addFolder("Molecule Selector"); // Create a folder in the GUI for the dropdown.

  // Create the dropdown element.
  const moleculeDropdown = document.createElement("select") as HTMLSelectElement;
  moleculeDropdown.id = "moleculeDropdown";

  // Populate the dropdown with options from the Molecules enum.
  Object.values(Molecules).forEach((molecule: Molecule) => {
    const option = document.createElement("option"); // Create an option element for each molecule.
    option.value = molecule.name; // Set the option value to the molecule name.
    option.text = molecule.name; // Set the option text to the molecule name.
    moleculeDropdown.appendChild(option); // Add the option to the dropdown.
  });

  // Append the dropdown to the GUI folder.
  moleculeSelect.domElement.appendChild(moleculeDropdown);

  // Add an event listener to the dropdown to handle molecule selection.
  moleculeDropdown.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const selectedMolecule = target.value; // Get the selected molecule name.
    handleMoleculeSelection(selectedMolecule, Molecules, moleculeManager, scene); // Handle the selection.
    //moleculeSearch.value = ""; // Clear the textbox
  });

  moleculeSelect.open(); // Open the folder by default
}

/**
 * Adds a search input field to the GUI for searching for molecules. Uses the
 * Awesomplete library for autocompletion.
 *
 * @param gui - The dat.GUI instance.
 * @param moleculeManager - The molecule manager object.
 * @param scene - The Three.js scene object.
 */
function addMoleculeSearch(gui: dat.GUI, moleculeManager: MoleculeManager, scene: THREE.Scene): void {
  const moleculeSearch = gui.addFolder("Molecule Search"); // Create a folder in the GUI for the search input.

  // Create the search input element.
  const searchInput = document.createElement("input") as HTMLInputElement;
  searchInput.id = "moleculeSearch";
  searchInput.type = "text";
  searchInput.placeholder = "Search Molecule..."; // Set a placeholder text.

  // Append the search input to the GUI folder.
  moleculeSearch.domElement.appendChild(searchInput);

  // Initialize Awesomplete with the molecule names from the Molecules enum.
  new Awesomplete(searchInput, {
    list: Object.values(Molecules).map((molecule: Molecule) => molecule.name), // Use molecule names for the autocomplete list.
  });

  // Add an event listener to the search input to handle molecule selection.
  searchInput.addEventListener("awesomplete-selectcomplete", (event: any) => {
    const selectedMolecule = event.text.value; // Get the selected molecule name.
    handleMoleculeSelection(selectedMolecule, Molecules, moleculeManager, scene); // Handle the selection.
    const moleculeDropdown = document.getElementById("moleculeDropdown") as HTMLSelectElement;
    if (moleculeDropdown) {
      moleculeDropdown.value = selectedMolecule; // Change dropdown selection
    }
  });

  // moleculeSearch.open();
}

/**
 * Adds spatial grid debug controls to the GUI
 * @param gui - The dat.GUI instance
 * @param scene - The Three.js scene object
 * @param moleculeManager - The molecule manager instance
 */
function addSpatialGridControls(gui: dat.GUI, scene: THREE.Scene, moleculeManager: MoleculeManager): void {
  const spatialGridFolder = gui.addFolder("Spatial Grid Debug");
  
  // Performance stats display
  const statsDisplay: StatsDisplay = {
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
  const avgDisplay: ValueDisplay = { value: "0.00" };
  spatialGridFolder.add(avgDisplay, "value").name("Avg Molecules/Cell").listen();

  // Add efficiency ratio display
  const efficiencyDisplay: ValueDisplay = { value: "0.00" };
  spatialGridFolder.add(efficiencyDisplay, "value").name("Collision Efficiency %").listen();

  // Update stats every frame
  function updateStats(): void {
    const stats = getSpatialGridStats();
    if (stats) {
      statsDisplay.totalCells = stats.totalCells;
      statsDisplay.moleculesInGrid = stats.moleculesInGrid;
      avgDisplay.value = stats.averageMoleculesPerCell.toFixed(2);
      statsDisplay.totalChecks = stats.totalChecks;
      statsDisplay.actualCollisions = stats.actualCollisions;
      
      // Calculate efficiency (lower is better - fewer unnecessary checks)
      if (stats.totalChecks > 0) {
        const efficiency = ((stats.actualCollisions / stats.totalChecks) * 100).toFixed(1);
        efficiencyDisplay.value = efficiency;
      }
    }
    requestAnimationFrame(updateStats);
  }
  updateStats();

  // Reset stats button
  spatialGridFolder.add({
    resetStats: function(): void {
      resetSpatialGridStats();
      log("Spatial grid statistics reset");
    }
  }, "resetStats").name("Reset Stats");

  // Toggle grid visualization
  let showGrid = false;
  spatialGridFolder.add({
    toggleGrid: function(): void {
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
  function updateGridVisualization(): void {
    if (showGrid) {
      debugVisualizeSpatialGrid(scene);
    }
    requestAnimationFrame(updateGridVisualization);
  }
  updateGridVisualization();

  spatialGridFolder.open();
}

/**
 * Adds hull visualization controls to the GUI
 * @param gui - The dat.GUI instance
 * @param scene - Three.js scene object
 * @param moleculeManager - The molecule manager instance
 */
function addHullVisualizationControls(gui: dat.GUI, scene: THREE.Scene, moleculeManager: MoleculeManager): void {
  const hullFolder = gui.addFolder("Hull Visualization");
  
  // Toggle hull visualization
  hullFolder.add({
    toggleHulls: function(): void {
      const currentState = getHullVisualization();
      const newState = !currentState;
      setHullVisualization(newState);
      if (newState) {
        console.log("Hull visualization enabled");
      } else {
        console.log("Hull visualization disabled");
      }
    }
  }, "toggleHulls").name("Show Hulls");

  // Hull visualization is now handled in the main animation loop
  // No need for separate update function here

  hullFolder.open();
}

/**
 * Adds collision system debug controls to the GUI
 * @param gui - The dat.GUI instance
 * @param scene - Three.js scene object
 * @param moleculeManager - The molecule manager instance
 */
function addCollisionSystemControls(gui: dat.GUI, scene: THREE.Scene, moleculeManager: MoleculeManager): void {
  const collisionFolder = gui.addFolder("Collision System");
  
  // Transform cache stats
  const cacheStatsDisplay: ValueDisplay = { value: "0 cached, 0 dirty" };
  collisionFolder.add(cacheStatsDisplay, "value").name("Transform Cache").listen();
  
  // Collision event stats
  const eventStatsDisplay: ValueDisplay = { value: "0 handlers, 0 history" };
  collisionFolder.add(eventStatsDisplay, "value").name("Event System").listen();
  
  // Reaction interface stats
  const reactionStatsDisplay: ValueDisplay = { value: "0 reactions, enabled" };
  collisionFolder.add(reactionStatsDisplay, "value").name("Reaction Interface").listen();
  
  // Update stats every frame
  function updateCollisionStats(): void {
    const cacheStats = getCacheStats();
    const eventStats = collisionEventSystem.getStats();
    const reactionStats = reactionCollisionInterface.getStats();
    
    cacheStatsDisplay.value = `${cacheStats.totalCached} cached, ${cacheStats.dirtyCount} dirty`;
    eventStatsDisplay.value = `${eventStats.totalHandlers} handlers, ${eventStats.historySize} history`;
    reactionStatsDisplay.value = `${reactionStats.totalReactions} reactions, ${reactionStats.enabled ? 'enabled' : 'disabled'}`;
    
    requestAnimationFrame(updateCollisionStats);
  }
  updateCollisionStats();
  
  // Clear caches button
  collisionFolder.add({
    clearCaches: function(): void {
      // Clear all caches
      import("./transformCache").then(({ clearAllTransformCaches }) => {
        clearAllTransformCaches();
        log("All transform caches cleared");
      });
      
      // Clear collision history
      collisionEventSystem.clearHistory();
      log("Collision history cleared");
    }
  }, "clearCaches").name("Clear All Caches");
  
  // Toggle reaction processing
  collisionFolder.add({
    toggleReactions: function(): void {
      const currentState = reactionCollisionInterface.getStats().enabled;
      reactionCollisionInterface.setEnabled(!currentState);
      log(`Reaction processing ${!currentState ? 'enabled' : 'disabled'}`);
    }
  }, "toggleReactions").name("Enable Reactions");
  
  collisionFolder.open();
}

/**
 * Adds molecule rotation controls to the GUI
 * @param gui - The dat.GUI instance
 * @param scene - Three.js scene object
 * @param moleculeManager - The molecule manager instance
 */
function addMoleculeRotationControls(gui: dat.GUI, scene: THREE.Scene, moleculeManager: MoleculeManager): void {
  const rotationFolder = gui.addFolder("Molecule Rotation");
  
  // Advanced rotation settings
  const rotationSettings = {
    mode: 'realistic' as 'realistic' | 'demo' | 'manual',
    temperature: 300,
    speedMultiplier: 1.0,
    dampingFactor: 0.98,
    enableThermalNoise: true,
    naturalRotation: true,
    rotationSpeed: 2.0,
    
    resetRotations: function(): void {
      const allMolecules = moleculeManager.getAllMolecules();
      allMolecules.forEach(mol => {
        mol.group.rotation.set(0, 0, 0);
        // Add new random rotation
        mol.group.rotation.x = (Math.random() - 0.5) * Math.PI;
        mol.group.rotation.z = (Math.random() - 0.5) * Math.PI;
        
        // Reset physics-based rotation if available
        if ((mol as any).rotationController) {
          (mol as any).rotationController.reset();
        }
      });
      log("All molecule rotations reset with new random orientations");
    },
    
    applyToAll: function(): void {
      const allMolecules = moleculeManager.getAllMolecules();
      allMolecules.forEach(mol => {
        if ((mol as any).rotationController) {
          const controller = (mol as any).rotationController;
          controller.setMode(rotationSettings.mode);
          controller.setTemperature(rotationSettings.temperature);
          controller.setSpeedMultiplier(rotationSettings.speedMultiplier);
          controller['config'].dampingFactor = rotationSettings.dampingFactor;
          controller['config'].enableThermalNoise = rotationSettings.enableThermalNoise;
        }
      });
      log(`Applied rotation settings to all molecules: mode=${rotationSettings.mode}, temp=${rotationSettings.temperature}K`);
    }
  };
  
  // Mode selection
  const modeController = rotationFolder.add(rotationSettings, "mode", ['realistic', 'demo', 'manual']).name("Rotation Mode");
  modeController.onChange(() => rotationSettings.applyToAll());
  
  // Temperature control (affects realistic mode)
  const tempController = rotationFolder.add(rotationSettings, "temperature", 50, 1000).name("Temperature (K)");
  tempController.onChange(() => rotationSettings.applyToAll());
  
  // Speed multiplier
  const speedController = rotationFolder.add(rotationSettings, "speedMultiplier", 0.1, 5.0).name("Speed Multiplier");
  speedController.onChange(() => rotationSettings.applyToAll());
  
  // Damping factor
  const dampingController = rotationFolder.add(rotationSettings, "dampingFactor", 0.9, 0.999).name("Damping Factor");
  dampingController.onChange(() => rotationSettings.applyToAll());
  
  // Thermal noise toggle
  const noiseController = rotationFolder.add(rotationSettings, "enableThermalNoise").name("Thermal Noise");
  noiseController.onChange(() => rotationSettings.applyToAll());
  
  // Legacy controls
  rotationFolder.add(rotationSettings, "naturalRotation").name("Enable Natural Rotation");
  rotationFolder.add(rotationSettings, "rotationSpeed", 0.1, 5.0).name("Rotation Speed");
  
  // Action buttons
  rotationFolder.add(rotationSettings, "resetRotations").name("Reset All Rotations");
  rotationFolder.add(rotationSettings, "applyToAll").name("Apply to All Molecules");
  
  rotationFolder.open();
}
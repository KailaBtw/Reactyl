/**
 * Clean GUI Controls for Reaction System
 * Focused on reaction mechanics with minimal debug clutter
 */

import * as THREE from "three";
import * as dat from "dat.gui";
import { MoleculeManager } from "../types";
import { log } from "./debug";
import { physicsEngine } from "./cannonPhysicsEngine";
import { getReactionType } from "./reactionDatabase";
import { CollisionTrajectoryController } from "./collisionTrajectoryController";
import { ChemicalDataService } from "./chemicalDataService";
import { drawMolecule } from "./moleculeDrawer";
import { simpleCacheService } from "./simpleCacheService";

/**
 * Sets up the main GUI for the reaction system
 */
export function set_up_gui(moleculeManager: MoleculeManager, scene: THREE.Scene): void {
  const gui = new dat.GUI({ width: 300 });
  
  // --- Molecule Loading Controls ---
  addMoleculeLoadingControls(gui, scene, moleculeManager);

  // --- Reaction System Controls ---
  addReactionSystemControls(gui, scene, moleculeManager);

  // --- Essential Debug Controls (minimal) ---
  addEssentialDebugControls(gui, scene, moleculeManager);
}

/**
 * Molecule loading controls
 */
function addMoleculeLoadingControls(gui: dat.GUI, scene: THREE.Scene, moleculeManager: MoleculeManager): void {
  const loadingFolder = gui.addFolder('🧬 Load Molecules');
  
  // Initialize chemical data service
  const chemicalService = new ChemicalDataService();
  
  // Loading parameters
  const loadingParams = {
    pubchemCID: '222', // Water as default
    moleculeName: '',
    loadingStatus: 'Ready',
    searchQuery: '', // For autocomplete
    searchResults: [] as Array<{cid: string, name: string, formula: string}>,
    selectedResult: null as {cid: string, name: string, formula: string} | null
  };
  
  // PubChem CID loading
  const pubchemFolder = loadingFolder.addFolder('📡 PubChem (by CID)');
  pubchemFolder.add(loadingParams, 'pubchemCID').name('CID');
  pubchemFolder.add(loadingParams, 'loadingStatus').name('Status').listen();
  
  pubchemFolder.add({
    loadFromPubChem: async () => {
      try {
        loadingParams.loadingStatus = 'Loading...';
        log(`Loading molecule with CID: ${loadingParams.pubchemCID}`);
        
        const molecularData = await chemicalService.fetchMoleculeByCID(loadingParams.pubchemCID);
        
        // Draw the molecule
        const moleculeName = `mol_${loadingParams.pubchemCID}`;
        drawMolecule(molecularData.mol3d || '', moleculeManager, scene, { x: 0, y: 0, z: 0 }, moleculeName);
        
        loadingParams.loadingStatus = `Loaded: ${molecularData.formula}`;
        log(`Successfully loaded ${molecularData.formula} (CID: ${molecularData.cid})`);
        
        // Update reaction system dropdowns
        updateMoleculeDropdowns(moleculeManager);
        
      } catch (error) {
        loadingParams.loadingStatus = `Error: ${error}`;
        log(`Failed to load molecule: ${error}`);
      }
    }
  }, 'loadFromPubChem').name('Load from PubChem');
  
  // Quick load common molecules
  const quickLoadFolder = loadingFolder.addFolder('⚡ Quick Load');
  
  quickLoadFolder.add({
    loadWater: async () => {
      try {
        loadingParams.loadingStatus = 'Loading Water...';
        log('Loading Water (CID: 962)');
        
        const molecularData = await chemicalService.fetchMoleculeByCID('962');
        const moleculeName = 'mol_water';
        drawMolecule(molecularData.mol3d || '', moleculeManager, scene, { x: 0, y: 0, z: 0 }, moleculeName);
        
        loadingParams.loadingStatus = 'Loaded: Water';
        log('Successfully loaded Water');
        
        // Update reaction system dropdowns
        updateMoleculeDropdowns(moleculeManager);
        
      } catch (error) {
        loadingParams.loadingStatus = `Error loading Water: ${error}`;
        log(`Failed to load Water: ${error}`);
      }
    }
  }, 'loadWater').name('Load Water');
  
  // Search functionality with dropdown
  const searchFolder = loadingFolder.addFolder('🔍 Search by Name');
  searchFolder.open();
  
  // Create search input with dropdown
  const searchContainer = document.createElement('div');
  searchContainer.style.position = 'relative';
  searchContainer.style.width = '100%';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search for molecules...';
  searchInput.style.width = '100%';
  searchInput.style.padding = '5px';
  searchInput.style.marginBottom = '10px';
  
  const dropdown = document.createElement('div');
  dropdown.style.position = 'absolute';
  dropdown.style.top = '100%';
  dropdown.style.left = '0';
  dropdown.style.right = '0';
  dropdown.style.backgroundColor = '#2a2a2a';
  dropdown.style.border = '1px solid #555';
  dropdown.style.borderTop = 'none';
  dropdown.style.maxHeight = '200px';
  dropdown.style.overflowY = 'auto';
  dropdown.style.zIndex = '1000';
  dropdown.style.display = 'none';
  
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(dropdown);
  
  // Add search input to GUI
  const searchController = searchFolder.add(loadingParams, 'searchQuery').name('Search');
  searchController.domElement.parentElement.appendChild(searchContainer);
  searchController.domElement.style.display = 'none'; // Hide the original input
  
  // Sync search input with GUI parameter
  searchInput.addEventListener('input', (e) => {
    loadingParams.searchQuery = (e.target as HTMLInputElement).value;
    
    // Debounce search
    clearTimeout((loadingParams as any).searchTimeout);
    (loadingParams as any).searchTimeout = setTimeout(async () => {
      const query = loadingParams.searchQuery;
      if (query && query.length >= 2) {
        loadingParams.loadingStatus = 'Searching...';
        log(`Searching for: ${query}`);
        try {
          const results = await chemicalService.searchMolecules(query, 8);
          loadingParams.searchResults = results;
          loadingParams.loadingStatus = `Found ${results.length} results`;
          log(`Found ${results.length} results for: ${query}`);
          
          // Update dropdown
          updateDropdown(results);
          
          // Update cache stats
          cacheStats.refreshStats();
        } catch (error) {
          loadingParams.loadingStatus = `Search failed: ${error}`;
          log(`Search failed: ${error}`);
          loadingParams.searchResults = [];
          dropdown.style.display = 'none';
        }
      } else {
        loadingParams.searchResults = [];
        loadingParams.loadingStatus = 'Ready';
        dropdown.style.display = 'none';
      }
    }, 500);
  });
  
  // Update dropdown with results
  const updateDropdown = (results: Array<{cid: string, name: string, formula: string}>) => {
    dropdown.innerHTML = '';
    
    if (results.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    
    results.forEach((result, index) => {
      const item = document.createElement('div');
      item.style.padding = '8px 12px';
      item.style.cursor = 'pointer';
      item.style.borderBottom = '1px solid #444';
      item.innerHTML = `<strong>${result.name}</strong> (${result.formula})`;
      
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#444';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });
      
      item.addEventListener('click', () => {
        loadingParams.selectedResult = result;
        loadingParams.pubchemCID = result.cid;
        searchInput.value = result.name;
        loadingParams.searchQuery = result.name;
        dropdown.style.display = 'none';
        
        log(`Selected: ${result.name} (${result.formula}) - CID: ${result.cid}`);
        
        // Auto-load the selected molecule
        try {
          loadingParams.loadingStatus = 'Loading...';
          log(`Loading selected molecule: ${result.name} (CID: ${result.cid})`);
          
          chemicalService.fetchMoleculeByCID(result.cid).then(molecularData => {
            const moleculeName = `mol_${result.cid}`;
            drawMolecule(molecularData.mol3d || '', moleculeManager, scene, { x: 0, y: 0, z: 0 }, moleculeName);
            
            loadingParams.loadingStatus = `Loaded: ${molecularData.formula}`;
            log(`Successfully loaded molecule: ${molecularData.formula}`);
            
            // Update reaction system dropdowns
            updateMoleculeDropdowns(moleculeManager);
            
            // Update cache stats
            cacheStats.refreshStats();
          }).catch(error => {
            loadingParams.loadingStatus = `Error: ${error}`;
            log(`Failed to load molecule: ${error}`);
          });
        } catch (error) {
          loadingParams.loadingStatus = `Error: ${error}`;
          log(`Failed to load molecule: ${error}`);
        }
      });
      
      dropdown.appendChild(item);
    });
    
    dropdown.style.display = 'block';
  };
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target as Node)) {
      dropdown.style.display = 'none';
    }
  });
  
  // Cache stats
  const cacheFolder = loadingFolder.addFolder('💾 Cache Stats');
  const cacheStats = {
    molecules: 0,
    searches: 0,
    lastUpdated: '',
    refreshStats: () => {
      const stats = simpleCacheService.getStats();
      cacheStats.molecules = stats.molecules;
      cacheStats.searches = stats.searches;
      cacheStats.lastUpdated = stats.lastUpdated;
    },
    clearCache: () => {
      simpleCacheService.clearCache();
      cacheStats.refreshStats();
      log('Cache cleared');
    }
  };
  
  cacheFolder.add(cacheStats, 'molecules').name('Molecules').listen();
  cacheFolder.add(cacheStats, 'searches').name('Searches').listen();
  cacheFolder.add(cacheStats, 'lastUpdated').name('Last Updated').listen();
  cacheFolder.add(cacheStats, 'refreshStats').name('Refresh Stats');
  cacheFolder.add(cacheStats, 'clearCache').name('Clear Cache');
  
  // Initial stats
  cacheStats.refreshStats();
  
  // File loading
  const fileFolder = loadingFolder.addFolder('📁 Load .mol File');
  fileFolder.add({
    loadFile: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.mol';
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const molContent = e.target?.result as string;
            const moleculeName = `mol_${file.name.replace('.mol', '')}`;
            drawMolecule(molContent, moleculeManager, scene, { x: 0, y: 0, z: 0 }, moleculeName);
            log(`Loaded molecule from file: ${file.name}`);
            updateMoleculeDropdowns(moleculeManager);
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  }, 'loadFile').name('Choose .mol File');
  
  // Test molecule (simple water molecule)
  fileFolder.add({
    loadTestMolecule: () => {
      try {
        loadingParams.loadingStatus = 'Loading test molecule...';
        
        // Simple water molecule in MOL format
        const waterMol = `water
Generated by test
  3  2  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    0.9572    0.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.2393    0.9265    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  3  1  0  0  0  0
M  END`;
        
        const moleculeName = 'test_water';
        drawMolecule(waterMol, moleculeManager, scene, { x: 0, y: 0, z: 0 }, moleculeName);
        
        loadingParams.loadingStatus = 'Loaded: Test Water';
        log(`Successfully loaded test water molecule`);
        updateMoleculeDropdowns(moleculeManager);
        
      } catch (error) {
        loadingParams.loadingStatus = `Error: ${error}`;
        log(`Failed to load test molecule: ${error}`);
      }
    }
  }, 'loadTestMolecule').name('Load Test Water');
  
  loadingFolder.open();
  pubchemFolder.open();
  quickLoadFolder.open();
  fileFolder.open();
  
  log('Molecule loading controls added to GUI');
}

// Global reference to refresh function (will be set by reaction system)
let globalRefreshMoleculeDropdowns: (() => void) | null = null;

/**
 * Update molecule dropdowns in reaction system
 */
function updateMoleculeDropdowns(_moleculeManager: MoleculeManager): void {
  if (globalRefreshMoleculeDropdowns) {
    globalRefreshMoleculeDropdowns();
  } else {
    log('Molecule dropdowns updated - click "Refresh Dropdowns" to see new molecules');
  }
}

/**
 * Main reaction system controls
 */
function addReactionSystemControls(gui: dat.GUI, scene: THREE.Scene, moleculeManager: MoleculeManager): void {
  const reactionFolder = gui.addFolder('🧪 Reaction System');
  
  // Initialize reaction system components
  const trajectoryController = new CollisionTrajectoryController(scene);
  
  // Get available molecules (will be updated dynamically)
  let availableMolecules = moleculeManager.getAllMolecules().map(mol => mol.name);
  
  // Reaction parameters
  const reactionParams = {
    reactionType: 'SN2_REACTION',
    temperature: 298,
    approachAngle: 180,
    impactParameter: 0.0,
    relativeVelocity: 5.0,
    substrateMolecule: availableMolecules[0] || '',
    nucleophileMolecule: availableMolecules[1] || ''
  };
  
  // Time controls (at the top)
  const timeControls = {
    isPlaying: false,
    timeScale: 1.0,
    play: () => {
      timeControls.isPlaying = true;
      physicsEngine.resume();
      log('Reaction simulation started');
    },
    pause: () => {
      timeControls.isPlaying = false;
      physicsEngine.pause();
      log('Reaction simulation paused');
    },
    reset: () => {
      timeControls.isPlaying = false;
      physicsEngine.pause();
      trajectoryController.reset();
      log('Reaction simulation reset');
    }
  };

  const timeFolder = reactionFolder.addFolder('⏱️ Time Controls');
  
  const timeScaleController = timeFolder.add(timeControls, 'timeScale', 0.1, 3.0).name('Time Scale');
  timeScaleController.onChange((value: number) => {
    physicsEngine.setTimeScale(value);
  });
  
  timeFolder.add(timeControls, 'play').name('▶️ Play');
  timeFolder.add(timeControls, 'pause').name('⏸️ Pause');
  timeFolder.add(timeControls, 'reset').name('⏹️ Reset');

  // Environment parameters
  const envFolder = reactionFolder.addFolder('🌡️ Environment');
  const tempController = envFolder.add(reactionParams, 'temperature', 100, 600).name('Temperature (K)');
  
  // Connect temperature to all rotation controllers
  tempController.onChange((value: number) => {
    // Update all molecule rotation controllers with new temperature
    const allMolecules = moleculeManager.getAllMolecules();
    allMolecules.forEach(molecule => {
      const rotationController = (molecule as any).rotationController;
      if (rotationController) {
        rotationController.setTemperature(value);
      }
    });
    log(`Temperature updated to ${value}K for all molecules`);
  });
  
  // Collision parameters
  const collisionFolder = reactionFolder.addFolder('💥 Collision Parameters');
  collisionFolder.add(reactionParams, 'approachAngle', 0, 360).name('Approach Angle (°)');
  collisionFolder.add(reactionParams, 'impactParameter', 0, 5).name('Impact Parameter');
  collisionFolder.add(reactionParams, 'relativeVelocity', 1, 20).name('Relative Velocity');
  
  // Molecule selection
  const moleculeFolder = reactionFolder.addFolder('🧬 Molecules');
  const substrateController = moleculeFolder.add(reactionParams, 'substrateMolecule', availableMolecules).name('Substrate');
  const nucleophileController = moleculeFolder.add(reactionParams, 'nucleophileMolecule', availableMolecules).name('Nucleophile');
  
  // Function to refresh molecule dropdowns
  const refreshMoleculeDropdowns = () => {
    const newMolecules = moleculeManager.getAllMolecules().map(mol => mol.name);
    if (newMolecules.length > 0) {
      substrateController.options(newMolecules);
      nucleophileController.options(newMolecules);
      
      // Set default selections if current ones are empty
      if (!reactionParams.substrateMolecule && newMolecules[0]) {
        reactionParams.substrateMolecule = newMolecules[0];
      }
      if (!reactionParams.nucleophileMolecule && newMolecules[1]) {
        reactionParams.nucleophileMolecule = newMolecules[1];
      }
      
      log(`Updated molecule dropdowns: ${newMolecules.join(', ')}`);
    }
  };
  
  // Add refresh button
  moleculeFolder.add({
    refreshDropdowns: () => {
      refreshMoleculeDropdowns();
    }
  }, 'refreshDropdowns').name('🔄 Refresh Dropdowns');
  
  // Reaction control buttons
  const controlFolder = reactionFolder.addFolder('🎮 Controls');
  
  controlFolder.add({
    setupCollision: () => {
      const substrate = moleculeManager.getMolecule(reactionParams.substrateMolecule);
      const nucleophile = moleculeManager.getMolecule(reactionParams.nucleophileMolecule);
      
      if (!substrate || !nucleophile) {
        log('Please select both substrate and nucleophile molecules');
        return;
      }
      
      const reactionType = getReactionType(reactionParams.reactionType);
      if (!reactionType) {
        log('Invalid reaction type');
        return;
      }
      
      // Setup collision
      trajectoryController.setupCollision({
        substrate,
        nucleophile,
        approachAngle: reactionParams.approachAngle,
        impactParameter: reactionParams.impactParameter,
        relativeVelocity: reactionParams.relativeVelocity,
        temperature: reactionParams.temperature
      });
      
      // Set reaction type for detection (placeholder)
      log(`Reaction type set: ${reactionType.name}`);
      
      // Auto-pause after setup
      timeControls.isPlaying = false;
      
      log(`Collision setup: ${substrate.name} + ${nucleophile.name} (${reactionType.name})`);
      log('Ready to play - click ▶️ Play to start simulation');
    }
  }, 'setupCollision').name('Setup Collision');
  
  controlFolder.add({
    startReaction: () => {
      const substrate = moleculeManager.getMolecule(reactionParams.substrateMolecule);
      const nucleophile = moleculeManager.getMolecule(reactionParams.nucleophileMolecule);
      
      if (!substrate || !nucleophile) {
        log('Please select both substrate and nucleophile molecules first');
        return;
      }
      
      // Placeholder for reaction animation
      log('Starting reaction animation...');
      timeControls.isPlaying = true;
      log('Reaction animation started');
    }
  }, 'startReaction').name('Start Reaction Animation');
  
  controlFolder.add({
    stopReaction: () => {
      trajectoryController.reset();
      timeControls.isPlaying = false;
      log('Reaction stopped');
    }
  }, 'stopReaction').name('Stop Reaction');
  
  // Real-time stats
  const statsDisplay = {
    distance: 0,
    relativeVelocity: 0,
    timeToCollision: 0,
    reactionProbability: 0
  };
  
  const statsFolder = reactionFolder.addFolder('📊 Live Stats');
  statsFolder.add(statsDisplay, 'distance').name('Distance').listen();
  statsFolder.add(statsDisplay, 'relativeVelocity').name('Relative Velocity').listen();
  statsFolder.add(statsDisplay, 'timeToCollision').name('Time to Collision').listen();
  statsFolder.add(statsDisplay, 'reactionProbability').name('Reaction Probability (%)').listen();
  
  // Update stats periodically
  setInterval(() => {
    const setup = trajectoryController.getCurrentSetup();
    if (setup) {
      const substrate = moleculeManager.getMolecule(reactionParams.substrateMolecule);
      const nucleophile = moleculeManager.getMolecule(reactionParams.nucleophileMolecule);
      
      if (substrate && nucleophile) {
        const distance = new THREE.Vector3().copy(substrate.position).distanceTo(new THREE.Vector3().copy(nucleophile.position));
        const velocity = (substrate as any).userData?.velocity?.length() || 0;
        const timeToCollision = distance / (velocity || 1);
        
        statsDisplay.distance = distance;
        statsDisplay.relativeVelocity = velocity;
        statsDisplay.timeToCollision = timeToCollision;
        
        // Calculate reaction probability (placeholder)
        statsDisplay.reactionProbability = Math.random() * 100; // Placeholder calculation
      }
    }
  }, 100);
  
  // Open folders (reaction system first, then time controls)
  reactionFolder.open();
  timeFolder.open();
  envFolder.open();
  collisionFolder.open();
  moleculeFolder.open();
  controlFolder.open();
  statsFolder.open();
  
  log('Reaction system controls added to GUI');
}

/**
 * Essential debug controls - minimal set for reaction system
 */
function addEssentialDebugControls(gui: dat.GUI, scene: THREE.Scene, moleculeManager: MoleculeManager): void {
  const debugFolder = gui.addFolder('🔧 Essential Debug');
  
  // Basic scene controls
  const sceneControls = {
    showAxes: true,
    showStats: true,
    clearScene: () => {
      // Remove all molecules
      const molecules = moleculeManager.getAllMolecules();
      molecules.forEach(mol => {
        scene.remove(mol as any);
        moleculeManager.removeMolecule(mol.name);
      });
      log('Scene cleared');
    }
  };
  
  debugFolder.add(sceneControls, 'showAxes').name('Show Axes').onChange((value: boolean) => {
    const axes = scene.getObjectByName('axesHelper');
    if (axes) axes.visible = value;
  });
  
  debugFolder.add(sceneControls, 'showStats').name('Show Stats').onChange((value: boolean) => {
    const stats = document.getElementById('stats');
    if (stats) stats.style.display = value ? 'block' : 'none';
  });
  
  debugFolder.add(sceneControls, 'clearScene').name('🗑️ Clear All Molecules');
  
  // Physics engine stats (minimal)
  const physicsStats = {
    getStats: () => {
      const stats = physicsEngine.getStats();
      log(`Physics: ${(stats as any).activeBodies || 0} bodies, ${(stats as any).contacts || 0} contacts`);
    }
  };
  
  debugFolder.add(physicsStats, 'getStats').name('📊 Physics Stats');
  
  debugFolder.open();
  log('Essential debug controls added to GUI');
}

// Legacy function removed - all molecules now use physics-based rotation

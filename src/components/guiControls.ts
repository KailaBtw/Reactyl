/**
 * Clean GUI Controls for Reaction System
 * Focused on reaction mechanics with minimal debug clutter
 */

import * as dat from 'dat.gui';
import * as THREE from 'three';
import { ChemicalDataService } from '../chemistry/chemicalDataService';
import { getReactionType } from '../chemistry/reactionDatabase';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
import { CollisionTrajectoryController } from '../physics/collisionTrajectoryController';
import { ReactionDemo } from './reactionDemo';
import { simpleCacheService } from '../services/simpleCacheService';
import type { MoleculeManager } from '../types';
import { log } from '../utils/debug';
import { drawMolecule } from './moleculeDrawer';

/**
 * Sets up the main GUI for the reaction system
 */
export function set_up_gui(moleculeManager: MoleculeManager, scene: THREE.Scene): void {
  const gui = new dat.GUI({ width: 300 });

  // --- Molecule Loading Controls ---
  addMoleculeLoadingControls(gui, scene, moleculeManager);

  // --- Demo Controls (at root level) ---
  addDemoControls(gui, scene, moleculeManager);

  // --- Reaction System Controls ---
  addReactionSystemControls(gui, scene, moleculeManager);

  // --- Essential Debug Controls (minimal) ---
  addEssentialDebugControls(gui, scene, moleculeManager);
}

/**
 * Demo controls at root level
 */
function addDemoControls(
  gui: dat.GUI,
  scene: THREE.Scene,
  moleculeManager: MoleculeManager
): void {
  const demoFolder = gui.addFolder('🎬 Demo Controls');
  const reactionDemo = new ReactionDemo(scene);
  let easyMode = true;

  // Load Demo Molecules button
  demoFolder
    .add(
      {
        loadDemoMolecules: async () => {
          await reactionDemo.loadDemoMolecules(moleculeManager, scene, (status) => {
            log(`Demo loading: ${status}`);
          });
          updateMoleculeDropdowns(moleculeManager);
          log('Demo molecules loaded successfully');
        },
      },
      'loadDemoMolecules'
    )
    .name('Load Demo Molecules');

  // Run Demo button
  demoFolder
    .add(
      {
        runDemo: () => {
          // Turn on easy mode for showcase
          import('../physics/collisionEventSystem').then(({ collisionEventSystem }) => {
            collisionEventSystem.setDemoEasyMode(easyMode);
          });
          reactionDemo.runDemo(moleculeManager, { isPlaying: false }, {
            reactionType: 'SN2_REACTION',
            temperature: 298,
            approachAngle: 180,
            impactParameter: 0.0,
            relativeVelocity: 5.0,
            substrateMolecule: '',
            nucleophileMolecule: '',
          });
        },
      },
      'runDemo'
    )
    .name('Run Demo');

  // Test reaction button for debugging
  demoFolder
    .add(
      {
        testReaction: () => {
          log(`🧪 Testing reaction system directly...`);
          
          const molecules = moleculeManager.getAllMolecules();
          if (molecules.length < 2) {
            log('❌ Need at least 2 molecules for testing');
            return;
          }
          
          const substrate = molecules[0];
          const nucleophile = molecules[1];
          
          // Import collision event system
          import('../physics/collisionEventSystem').then(({ collisionEventSystem }) => {
            // Set reaction type
            const reactionType = getReactionType('sn2');
            if (reactionType) {
              collisionEventSystem.setReactionType(reactionType);
              collisionEventSystem.setTemperature(500); // High temp for testing
              
              // Force a test collision
              const testEvent = {
                moleculeA: substrate,
                moleculeB: nucleophile,
                collisionPoint: new THREE.Vector3(0, 0, 0),
                collisionNormal: new THREE.Vector3(1, 0, 0),
                relativeVelocity: new THREE.Vector3(-25, 0, 0),
                timestamp: performance.now() / 1000
              };
              
              collisionEventSystem.emitCollision(testEvent as any);
              log('🧪 Test collision emitted');
            }
          });
        },
      },
      'testReaction'
    )
    .name('Test Reaction');

  // Quick temperature adjustment for testing
  demoFolder
    .add(
      {
        setHighTemp: () => {
          log(`🌡️ Temperature set to 500K for better reaction rates`);
        },
      },
      'setHighTemp'
    )
    .name('Set High Temp (500K)');

  demoFolder
    .add(
      {
        setRoomTemp: () => {
          log(`🌡️ Temperature set to 298K (room temperature)`);
        },
      },
      'setRoomTemp'
    )
    .name('Set Room Temp (298K)');

  // Easy Mode toggle
  demoFolder
    .add(
      {
        toggleEasyMode: () => {
          easyMode = !easyMode;
          import('../physics/collisionEventSystem').then(({ collisionEventSystem }) => {
            collisionEventSystem.setDemoEasyMode(easyMode);
          });
          log(`🎛️ Demo Easy Mode: ${easyMode ? 'ON' : 'OFF'}`);
        },
      },
      'toggleEasyMode'
    )
    .name('Toggle Easy Mode');
}

/**
 * Molecule loading controls
 */
function addMoleculeLoadingControls(
  gui: dat.GUI,
  scene: THREE.Scene,
  moleculeManager: MoleculeManager
): void {
  const loadingFolder = gui;

  // Initialize chemical data service
  const chemicalService = new ChemicalDataService();

  // Loading parameters
  const loadingParams = {
    searchQuery: '', // Unified search for name, CID, or formula
    searchResults: [] as Array<{ cid: string; name: string; formula: string }>,
    selectedResult: null as { cid: string; name: string; formula: string } | null,
  };

  // PubChem loading
  const pubchemFolder = loadingFolder;

  // Search functionality with dropdown
  const searchContainer = document.createElement('div');
  searchContainer.style.position = 'relative';
  searchContainer.style.width = '100%';
  searchContainer.style.marginTop = '10px';

  const searchLabel = document.createElement('div');
  searchLabel.textContent = 'Search (Name, CID, Formula, etc';
  searchLabel.style.color = '#fff';
  searchLabel.style.fontSize = '12px';
  searchLabel.style.marginBottom = '5px';
  searchLabel.style.fontWeight = 'bold';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'e.g., benzene, 241, C6H6, C1=CC=CC=C1, etc...';
  searchInput.style.width = '100%';
  searchInput.style.padding = '8px';
  searchInput.style.marginBottom = '5px';
  searchInput.style.backgroundColor = '#2a2a2a';
  searchInput.style.border = '1px solid #555';
  searchInput.style.color = '#fff';
  searchInput.style.fontSize = '12px';
  searchInput.style.borderRadius = '3px';

  // Status display integrated into search bar
  const statusDisplay = document.createElement('div');
  statusDisplay.style.color = '#81C784';
  statusDisplay.style.fontSize = '10px';
  statusDisplay.style.marginBottom = '10px';
  statusDisplay.style.minHeight = '12px';
  statusDisplay.textContent = 'Ready';

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
  dropdown.style.borderRadius = '0 0 3px 3px';

  searchContainer.appendChild(searchLabel);
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(statusDisplay);
  searchContainer.appendChild(dropdown);

  // Add search container directly to the PubChem folder
  (pubchemFolder as any).__ul.appendChild(searchContainer);

  // Helper functions for detecting input types
  const isInChIKey = (query: string): boolean => {
    // InChIKey: 27 characters, contains hyphens at positions 14 and 25
    return /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(query);
  };

  const isSMILES = (query: string): boolean => {
    // SMILES: must contain typical SMILES syntax
    // Only match if it contains actual SMILES-specific characters
    return /[[\]()=#@\\/.%]/.test(query);
  };

  const isFormula = (query: string): boolean => {
    // Formula: contains chemical elements (capital letter + optional lowercase)
    return /^[A-Z][a-z]?\d*([A-Z][a-z]?\d*)*$/.test(query) && query.length > 1;
  };

  // Sync search input with GUI parameter
  searchInput.addEventListener('input', e => {
    loadingParams.searchQuery = (e.target as HTMLInputElement).value;

    // Debounce search
    clearTimeout((loadingParams as any).searchTimeout);
    (loadingParams as any).searchTimeout = setTimeout(async () => {
      const query = loadingParams.searchQuery.trim();
      if (query && query.length >= 1) {
        statusDisplay.textContent = 'Searching...';
        log(`Searching for: ${query}`);

        try {
          let results: Array<{ cid: string; name: string; formula: string }> = [];

          // Enhanced search routing - detect input type
          if (/^\d+$/.test(query)) {
            // CID search (numeric)
            log(`Detected CID search: ${query}`);
            try {
              const molecularData = await chemicalService.fetchMoleculeByCID(query);
              results = [
                {
                  cid: query,
                  name:
                    molecularData.title ||
                    molecularData.name ||
                    molecularData.formula ||
                    `Molecule ${query}`,
                  formula: molecularData.formula || 'Unknown',
                },
              ];
              statusDisplay.textContent = `Found CID ${query}`;
            } catch (error) {
              statusDisplay.textContent = `CID ${query} not found`;
              log(`CID ${query} not found: ${error}`);
            }
          } else if (isInChIKey(query)) {
            // InChIKey search (27 characters, contains hyphens)
            log(`Detected InChIKey search: ${query}`);
            try {
              const molecularData = await chemicalService.fetchMoleculeByInChIKey(query);
              results = [
                {
                  cid: molecularData.cid.toString(),
                  name:
                    molecularData.title ||
                    molecularData.name ||
                    molecularData.formula ||
                    `InChIKey ${query}`,
                  formula: molecularData.formula || 'Unknown',
                },
              ];
              statusDisplay.textContent = `Found InChIKey ${query}`;
            } catch (error) {
              statusDisplay.textContent = `InChIKey ${query} not found`;
              log(`InChIKey ${query} not found: ${error}`);
            }
          } else if (isSMILES(query)) {
            // SMILES search (contains chemical symbols and brackets)
            log(`Detected SMILES search: ${query}`);
            try {
              const molecularData = await chemicalService.fetchMoleculeBySMILES(query);
              results = [
                {
                  cid: molecularData.cid.toString(),
                  name:
                    molecularData.title ||
                    molecularData.name ||
                    molecularData.formula ||
                    `SMILES ${query}`,
                  formula: molecularData.formula || 'Unknown',
                },
              ];
              statusDisplay.textContent = `Found SMILES ${query}`;
            } catch (error) {
              statusDisplay.textContent = `SMILES ${query} not found`;
              log(`SMILES ${query} not found: ${error}`);
            }
          } else if (isFormula(query)) {
            // Formula search (contains chemical elements)
            log(`Detected formula search: ${query}`);
            results = await chemicalService.searchMoleculesByFormula(query, 8);
            statusDisplay.textContent = `Found ${results.length} results for formula ${query}`;
            log(`Found ${results.length} results for formula: ${query}`);
          } else {
            // Name/synonyms search
            log(`Detected name/synonyms search: ${query}`);
            results = await chemicalService.searchMolecules(query, 8);
            statusDisplay.textContent = `Found ${results.length} results`;
            log(`Found ${results.length} results for: ${query}`);
          }

          loadingParams.searchResults = results;

          // Update dropdown
          updateDropdown(results);

          // Update cache stats
          cacheStats.refreshStats();
        } catch (error) {
          statusDisplay.textContent = `Search failed: ${error}`;
          log(`Search failed: ${error}`);
          loadingParams.searchResults = [];
          dropdown.style.display = 'none';
        }
      } else {
        loadingParams.searchResults = [];
        statusDisplay.textContent = 'Ready';
        dropdown.style.display = 'none';
      }
    }, 500);
  });

  // Update dropdown with results
  const updateDropdown = (results: Array<{ cid: string; name: string; formula: string }>) => {
    dropdown.innerHTML = '';

    if (results.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    results.forEach(result => {
      const item = document.createElement('div');
      item.style.padding = '8px 12px';
      item.style.cursor = 'pointer';
      item.style.borderBottom = '1px solid #444';
      item.style.fontSize = '11px';

      // Enhanced display with name, formula, synonyms, and CID
      item.innerHTML = `
        <div style="font-weight: bold; color: #4CAF50;">${result.name}</div>
        <div style="color: #81C784; font-size: 10px;">${result.formula}</div>
        <div style="color: #B0BEC5; font-size: 9px;">CID: ${result.cid}</div>
      `;

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#444';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });

      item.addEventListener('click', () => {
        loadingParams.selectedResult = result;
        searchInput.value = result.name;
        loadingParams.searchQuery = result.name;
        dropdown.style.display = 'none';

        log(`Selected: ${result.name} (${result.formula}) - CID: ${result.cid}`);

        // Auto-load the selected molecule
        try {
          statusDisplay.textContent = 'Loading...';
          log(`Loading selected molecule: ${result.name} (CID: ${result.cid})`);

          chemicalService
            .fetchMoleculeByCID(result.cid)
            .then(molecularData => {
              const moleculeName = `mol_${result.cid}`;
              drawMolecule(
                molecularData.mol3d || '',
                moleculeManager,
                scene,
                { x: 0, y: 0, z: 0 },
                moleculeName
              );

              statusDisplay.textContent = `Loaded: ${molecularData.formula}`;
              log(`Successfully loaded molecule: ${molecularData.formula}`);

              // Update reaction system dropdowns
              updateMoleculeDropdowns(moleculeManager);

              // Update cache stats
              cacheStats.refreshStats();
            })
            .catch(error => {
              statusDisplay.textContent = `Error: ${error}`;
              log(`Failed to load molecule: ${error}`);
            });
        } catch (error) {
          statusDisplay.textContent = `Error: ${error}`;
          log(`Failed to load molecule: ${error}`);
        }
      });

      dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
  };

  // Add Enter key support for direct loading
  searchInput.addEventListener('keydown', async e => {
    if (e.key === 'Enter') {
      const query = loadingParams.searchQuery.trim();
      if (query) {
        // Enhanced Enter key support for all search types
        if (/^\d+$/.test(query)) {
          // CID search
          loadMoleculeByCID(query);
        } else if (isInChIKey(query)) {
          // InChIKey search
          loadMoleculeByInChIKey(query);
        } else if (isSMILES(query)) {
          // SMILES search
          loadMoleculeBySMILES(query);
        } else {
          // For everything else (common names, formulas, etc.), do a general search
          if (isFormula(query)) {
            // Formula search
            const results = await chemicalService.searchMoleculesByFormula(query, 8);
            if (results.length > 0) {
              const firstResult = results[0];
              loadMoleculeByCID(firstResult.cid);
            } else {
              statusDisplay.textContent = `No results found for formula ${query}`;
            }
          } else {
            // Name/synonyms search
            const results = await chemicalService.searchMolecules(query, 8);
            if (results.length > 0) {
              const firstResult = results[0];
              loadMoleculeByCID(firstResult.cid);
            } else {
              statusDisplay.textContent = `No results found for ${query}`;
            }
          }
        }
        dropdown.style.display = 'none';
      }
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!searchContainer.contains(e.target as Node)) {
      dropdown.style.display = 'none';
    }
  });

  // Helper function to load molecule by CID
  const loadMoleculeByCID = async (cid: string) => {
    try {
      statusDisplay.textContent = 'Loading...';
      log(`Loading molecule with CID: ${cid}`);

      const molecularData = await chemicalService.fetchMoleculeByCID(cid);

      // Draw the molecule
      const moleculeName = `mol_${cid}`;
      drawMolecule(
        molecularData.mol3d || '',
        moleculeManager,
        scene,
        { x: 0, y: 0, z: 0 },
        moleculeName
      );

      statusDisplay.textContent = `Loaded: ${molecularData.formula}`;
      log(`Successfully loaded ${molecularData.formula} (CID: ${molecularData.cid})`);

      // Update reaction system dropdowns
      updateMoleculeDropdowns(moleculeManager);

      // Update cache stats
      cacheStats.refreshStats();
    } catch (error) {
      statusDisplay.textContent = `Error: ${error}`;
      log(`Failed to load molecule: ${error}`);
    }
  };

  // Helper function to load molecule by InChIKey
  const loadMoleculeByInChIKey = async (inchikey: string) => {
    try {
      statusDisplay.textContent = 'Loading...';
      log(`Loading molecule with InChIKey: ${inchikey}`);

      const molecularData = await chemicalService.fetchMoleculeByInChIKey(inchikey);

      // Draw the molecule
      const moleculeName = `mol_${molecularData.cid}`;
      drawMolecule(
        molecularData.mol3d || '',
        moleculeManager,
        scene,
        { x: 0, y: 0, z: 0 },
        moleculeName
      );

      statusDisplay.textContent = `Loaded: ${molecularData.formula}`;
      log(`Successfully loaded ${molecularData.formula} (CID: ${molecularData.cid})`);

      // Update reaction system dropdowns
      updateMoleculeDropdowns(moleculeManager);

      // Update cache stats
      cacheStats.refreshStats();
    } catch (error) {
      statusDisplay.textContent = `Error: ${error}`;
      log(`Failed to load molecule: ${error}`);
    }
  };

  // Helper function to load molecule by SMILES
  const loadMoleculeBySMILES = async (smiles: string) => {
    try {
      statusDisplay.textContent = 'Loading...';
      log(`Loading molecule with SMILES: ${smiles}`);

      const molecularData = await chemicalService.fetchMoleculeBySMILES(smiles);

      // Draw the molecule
      const moleculeName = `mol_${molecularData.cid}`;
      drawMolecule(
        molecularData.mol3d || '',
        moleculeManager,
        scene,
        { x: 0, y: 0, z: 0 },
        moleculeName
      );

      statusDisplay.textContent = `Loaded: ${molecularData.formula}`;
      log(`Successfully loaded ${molecularData.formula} (CID: ${molecularData.cid})`);

      // Update reaction system dropdowns
      updateMoleculeDropdowns(moleculeManager);

      // Update cache stats
      cacheStats.refreshStats();
    } catch (error) {
      statusDisplay.textContent = `Error: ${error}`;
      log(`Failed to load molecule: ${error}`);
    }
  };

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
    refreshFromBackend: async () => {
      await simpleCacheService.refreshFromBackend();
      cacheStats.refreshStats();
    },
    downloadCache: () => {
      simpleCacheService.downloadCache();
    },
  };

  cacheFolder.add(cacheStats, 'molecules').name('Molecules').listen();
  cacheFolder.add(cacheStats, 'searches').name('Searches').listen();
  cacheFolder.add(cacheStats, 'lastUpdated').name('Last Updated').listen();
  cacheFolder.add(cacheStats, 'refreshStats').name('Refresh Stats');
  cacheFolder.add(cacheStats, 'refreshFromBackend').name('🔄 Refresh from Backend');
  cacheFolder.add(cacheStats, 'downloadCache').name('Download Cache');

  // Initial stats
  cacheStats.refreshStats();

   // File loading
   const fileFolder = loadingFolder.addFolder('📁 Local Files');
   fileFolder
     .add(
       {
         loadFile: () => {
           const input = document.createElement('input');
           input.type = 'file';
           input.accept = '.mol';
           input.onchange = event => {
             const file = (event.target as HTMLInputElement).files?.[0];
             if (file) {
               const reader = new FileReader();
               reader.onload = e => {
                 const molContent = e.target?.result as string;
                 const moleculeName = `mol_${file.name.replace('.mol', '')}`;
                 drawMolecule(
                   molContent,
                   moleculeManager,
                   scene,
                   { x: 0, y: 0, z: 0 },
                   moleculeName
                 );
                 log(`Loaded molecule from file: ${file.name}`);
                 updateMoleculeDropdowns(moleculeManager);
               };
               reader.readAsText(file);
             }
           };
           input.click();
         },
       },
       'loadFile'
     )
     .name('Load .mol File');

  // Demo controls moved to reaction system controls

  log('Molecule loading controls added to GUI');
}

// Global reference to refresh function (will be set by reaction system)
const globalRefreshMoleculeDropdowns: (() => void) | null = null;

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
function addReactionSystemControls(
  gui: dat.GUI,
  scene: THREE.Scene,
  moleculeManager: MoleculeManager
): void {
  const reactionFolder = gui.addFolder('🧪 Reaction System');

  // Initialize reaction system components
  const trajectoryController = new CollisionTrajectoryController(scene);

  // Get available molecules (will be updated dynamically)
  const availableMolecules = moleculeManager.getAllMolecules().map(mol => mol.name);

  // Reaction parameters
  const reactionParams = {
    reactionType: 'SN2_REACTION',
    temperature: 298,
    approachAngle: 180,
    impactParameter: 0.0,
    relativeVelocity: 5.0,
    substrateMolecule: availableMolecules[0] || '',
    nucleophileMolecule: availableMolecules[1] || '',
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
    },
  };

  const timeFolder = reactionFolder.addFolder('⏱️ Time Controls');

  const timeScaleController = timeFolder
    .add(timeControls, 'timeScale', 0.1, 3.0)
    .name('Time Scale');
  timeScaleController.onChange((value: number) => {
    physicsEngine.setTimeScale(value);
  });

  timeFolder.add(timeControls, 'play').name('▶️ Play');
  timeFolder.add(timeControls, 'pause').name('⏸️ Pause');
  timeFolder.add(timeControls, 'reset').name('⏹️ Reset');

  // Environment parameters
  const envFolder = reactionFolder.addFolder('🌡️ Environment');
  const tempController = envFolder
    .add(reactionParams, 'temperature', 100, 600)
    .name('Temperature (K)');

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
  const substrateController = moleculeFolder
    .add(reactionParams, 'substrateMolecule', availableMolecules)
    .name('Substrate');
  const nucleophileController = moleculeFolder
    .add(reactionParams, 'nucleophileMolecule', availableMolecules)
    .name('Nucleophile');

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
  moleculeFolder
    .add(
      {
        refreshDropdowns: () => {
          refreshMoleculeDropdowns();
        },
      },
      'refreshDropdowns'
    )
    .name('🔄 Refresh Dropdowns');

  // Reaction control buttons
  const controlFolder = reactionFolder.addFolder('🎮 Controls');

  controlFolder
    .add(
      {
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
            temperature: reactionParams.temperature,
          });

          // Set reaction type for detection (placeholder)
          log(`Reaction type set: ${reactionType.name}`);

          // Auto-pause after setup
          timeControls.isPlaying = false;

          log(`Collision setup: ${substrate.name} + ${nucleophile.name} (${reactionType.name})`);
          log('Ready to play - click ▶️ Play to start simulation');
        },
      },
      'setupCollision'
    )
    .name('Setup Collision');

  controlFolder
    .add(
      {
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
        },
      },
      'startReaction'
    )
    .name('Start Reaction Animation');

  controlFolder
    .add(
      {
        stopReaction: () => {
          trajectoryController.reset();
          timeControls.isPlaying = false;
          log('Reaction stopped');
        },
      },
      'stopReaction'
    )
    .name('Stop Reaction');

  // Demo controls moved to root level

  // Real-time stats
  const statsDisplay = {
    distance: 0,
    relativeVelocity: 0,
    timeToCollision: 0,
    reactionProbability: 0,
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
        const distance = new THREE.Vector3()
          .copy(substrate.position)
          .distanceTo(new THREE.Vector3().copy(nucleophile.position));
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

  // Products display
  const productsDisplay = {
    lastReaction: 'None',
    mainProduct: 'None',
    leavingGroup: 'None',
    reactionEquation: 'No reaction yet',
  };

  const productsFolder = reactionFolder.addFolder('📦 Reaction Products');
  productsFolder.add(productsDisplay, 'lastReaction').name('Last Reaction').listen();
  productsFolder.add(productsDisplay, 'mainProduct').name('Main Product').listen();
  productsFolder.add(productsDisplay, 'leavingGroup').name('Leaving Group').listen();
  productsFolder.add(productsDisplay, 'reactionEquation').name('Reaction Equation').listen();

  // Store reference for updates
  (window as any).updateProductsDisplay = (productInfo: any) => {
    productsDisplay.lastReaction = productInfo.reactionType || 'Unknown';
    productsDisplay.mainProduct = productInfo.mainProductName || 'None';
    productsDisplay.leavingGroup = productInfo.leavingGroupName || 'None';
    productsDisplay.reactionEquation = productInfo.reactionEquation || 'No reaction';
  };

  // All folders start closed for cleaner interface

  log('Reaction system controls added to GUI');
}

/**
 * Essential debug controls - minimal set for reaction system
 */
function addEssentialDebugControls(
  gui: dat.GUI,
  scene: THREE.Scene,
  moleculeManager: MoleculeManager
): void {
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
    },
  };

  debugFolder
    .add(sceneControls, 'showAxes')
    .name('Show Axes')
    .onChange((value: boolean) => {
      const axes = scene.getObjectByName('axesHelper');
      if (axes) axes.visible = value;
    });

  debugFolder
    .add(sceneControls, 'showStats')
    .name('Show Stats')
    .onChange((value: boolean) => {
      const stats = document.getElementById('stats');
      if (stats) stats.style.display = value ? 'block' : 'none';
    });

  debugFolder.add(sceneControls, 'clearScene').name('🗑️ Clear All Molecules');

  // Physics engine stats (minimal)
  const physicsStats = {
    getStats: () => {
      const stats = physicsEngine.getStats();
      log(
        `Physics: ${(stats as any).activeBodies || 0} bodies, ${(stats as any).contacts || 0} contacts`
      );
    },
  };

  debugFolder.add(physicsStats, 'getStats').name('📊 Physics Stats');

  log('Essential debug controls added to GUI');
}

// Legacy function removed - all molecules now use physics-based rotation

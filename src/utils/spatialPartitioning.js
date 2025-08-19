import * as THREE from "three";
import { log } from "./debug.js";

/**
 * Spatial Hash Grid for efficient collision detection
 * 
 * This class implements a spatial partitioning system that divides 3D space
 * into uniform grid cells. Molecules are assigned to cells based on their
 * position, allowing for efficient collision detection by only checking
 * molecules in nearby cells.
 * 
 * Performance: Reduces collision checks from O(n²) to O(n) average case
 */
export class SpatialHashGrid {
  /**
   * Creates a new spatial hash grid
   * @param {number} cellSize - Size of each grid cell (should be >= 2 * max molecule radius)
   * @param {number} maxMolecules - Maximum number of molecules to track
   */
  constructor(cellSize = 6, maxMolecules = 1000) {
    this.cellSize = cellSize;
    this.maxMolecules = maxMolecules;
    this.grid = new Map(); // cellKey -> Set of molecules
    this.moleculeToCells = new Map(); // molecule -> Set of cell keys
    this.stats = {
      totalChecks: 0,
      actualCollisions: 0,
      cellsChecked: 0,
      moleculesInGrid: 0
    };
  }

  /**
   * Generates a unique key for a grid cell based on its coordinates
   * @param {number} x - X coordinate of cell
   * @param {number} y - Y coordinate of cell  
   * @param {number} z - Z coordinate of cell
   * @returns {string} Unique cell key
   */
  _getCellKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  /**
   * Converts world position to grid cell coordinates
   * @param {THREE.Vector3} position - World position
   * @returns {object} Grid cell coordinates {x, y, z}
   */
  _worldToGrid(position) {
    return {
      x: Math.floor(position.x / this.cellSize),
      y: Math.floor(position.y / this.cellSize),
      z: Math.floor(position.z / this.cellSize)
    };
  }

  /**
   * Gets all grid cells that a molecule might occupy based on its position and radius
   * @param {object} molecule - Molecule object with position and radius
   * @returns {Set} Set of cell keys
   */
  _getMoleculeCells(molecule) {
    const cells = new Set();
    const pos = molecule.group.position;
    const radius = molecule.radius || 3;
    
    // Calculate grid bounds for molecule's radius
    const minX = Math.floor((pos.x - radius) / this.cellSize);
    const maxX = Math.floor((pos.x + radius) / this.cellSize);
    const minY = Math.floor((pos.y - radius) / this.cellSize);
    const maxY = Math.floor((pos.y + radius) / this.cellSize);
    const minZ = Math.floor((pos.z - radius) / this.cellSize);
    const maxZ = Math.floor((pos.z + radius) / this.cellSize);

    // Add all cells that the molecule might occupy
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          cells.add(this._getCellKey(x, y, z));
        }
      }
    }

    return cells;
  }

  /**
   * Inserts a molecule into the spatial grid
   * @param {object} molecule - Molecule object to insert
   */
  insert(molecule) {
    if (!molecule || !molecule.group) {
      log("Warning: Attempted to insert invalid molecule into spatial grid");
      return;
    }

    const cells = this._getMoleculeCells(molecule);
    
    // Add molecule to each cell it occupies
    for (const cellKey of cells) {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, new Set());
      }
      this.grid.get(cellKey).add(molecule);
    }

    // Track which cells this molecule occupies
    this.moleculeToCells.set(molecule, cells);
    this.stats.moleculesInGrid++;
  }

  /**
   * Removes a molecule from the spatial grid
   * @param {object} molecule - Molecule object to remove
   */
  remove(molecule) {
    const cells = this.moleculeToCells.get(molecule);
    if (!cells) return;

    // Remove molecule from all cells it occupies
    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey);
      if (cell) {
        cell.delete(molecule);
        if (cell.size === 0) {
          this.grid.delete(cellKey);
        }
      }
    }

    this.moleculeToCells.delete(molecule);
    this.stats.moleculesInGrid--;
  }

  /**
   * Updates a molecule's position in the spatial grid
   * @param {object} molecule - Molecule object to update
   */
  update(molecule) {
    const oldCells = this.moleculeToCells.get(molecule);
    const newCells = this._getMoleculeCells(molecule);

    // If cells haven't changed, no update needed
    if (oldCells && this._setsEqual(oldCells, newCells)) {
      return;
    }

    // Remove from old cells
    if (oldCells) {
      for (const cellKey of oldCells) {
        const cell = this.grid.get(cellKey);
        if (cell) {
          cell.delete(molecule);
          if (cell.size === 0) {
            this.grid.delete(cellKey);
          }
        }
      }
    }

    // Add to new cells
    for (const cellKey of newCells) {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, new Set());
      }
      this.grid.get(cellKey).add(molecule);
    }

    this.moleculeToCells.set(molecule, newCells);
  }

  /**
   * Gets all molecules that could potentially collide with the given molecule
   * @param {object} molecule - Molecule to check for potential collisions
   * @returns {Set} Set of molecules to check for collisions
   */
  getNearby(molecule) {
    const nearby = new Set();
    const cells = this._getMoleculeCells(molecule);

    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey);
      if (cell) {
        for (const otherMolecule of cell) {
          if (otherMolecule !== molecule) {
            nearby.add(otherMolecule);
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Updates all molecules in the grid (call this each frame)
   * @param {Array} molecules - Array of all molecules to update
   */
  updateAll(molecules) {
    // Clear old data
    this.grid.clear();
    this.moleculeToCells.clear();
    this.stats.moleculesInGrid = 0;

    // Re-insert all molecules
    for (const molecule of molecules) {
      this.insert(molecule);
    }
  }

  /**
   * Compares two Sets for equality
   * @param {Set} set1 - First set
   * @param {Set} set2 - Second set
   * @returns {boolean} True if sets are equal
   */
  _setsEqual(set1, set2) {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }

  /**
   * Gets performance statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      totalCells: this.grid.size,
      averageMoleculesPerCell: this.stats.moleculesInGrid / Math.max(this.grid.size, 1)
    };
  }

  /**
   * Resets performance statistics
   */
  resetStats() {
    this.stats = {
      totalChecks: 0,
      actualCollisions: 0,
      cellsChecked: 0,
      moleculesInGrid: 0
    };
  }

  /**
   * Debug: Visualizes the spatial grid (for development only)
   * @param {THREE.Scene} scene - Three.js scene to add debug objects
   */
  debugVisualize(scene) {
    // Remove existing debug objects
    const existingDebug = scene.children.filter(child => child.userData.isGridDebug);
    existingDebug.forEach(obj => scene.remove(obj));

    // Track which cells we've already visualized to avoid duplicates
    const visualizedCells = new Set();

    // Add new debug visualization
    for (const [cellKey, molecules] of this.grid) {
      if (molecules.size > 0 && !visualizedCells.has(cellKey)) {
        visualizedCells.add(cellKey);
        
        const [x, y, z] = cellKey.split(',').map(Number);
        const center = new THREE.Vector3(
          (x + 0.5) * this.cellSize,
          (y + 0.5) * this.cellSize,
          (z + 0.5) * this.cellSize
        );

        // Create wireframe box for cell with better visibility
        const geometry = new THREE.BoxGeometry(this.cellSize, this.cellSize, this.cellSize);
        const material = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          wireframe: true,
          transparent: true,
          opacity: 0.5,
          linewidth: 2
        });
        const box = new THREE.Mesh(geometry, material);
        box.position.copy(center);
        box.userData.isGridDebug = true;
        scene.add(box);

        // Add indicator for cells with multiple molecules
        if (molecules.size > 1) {
          // Use a red sphere to indicate multiple molecules
          const sphereGeometry = new THREE.SphereGeometry(0.4, 8, 8);
          const sphereMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.7
          });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.copy(center);
          sphere.userData.isGridDebug = true;
          sphere.userData.moleculeCount = molecules.size;
          scene.add(sphere);
        }
      }
    }
  }
} 
import * as THREE from 'three';
import type { MoleculeManager } from '../types';
import { drawMolecule } from '../components/moleculeDrawer';
import { ChemicalDataService } from '../chemistry/chemicalDataService';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
import { log } from '../utils/debug';

export interface SpawnOptions {
  /** Initial position for the molecule */
  position?: { x: number; y: number; z: number };
  /** Whether to apply random rotation */
  applyRandomRotation?: boolean;
  /** Initial velocity vector */
  velocity?: { x: number; y: number; z: number };
  /** Temperature for velocity calculation (if velocity not provided) */
  temperature?: number;
  /** Base speed multiplier for temperature-based velocities */
  baseSpeed?: number;
}

export interface ContainerBounds {
  /** Size of the container (cubic volume) */
  size: number;
  /** Center position of the container */
  center?: { x: number; y: number; z: number };
  /** Padding factor (0-1) to keep molecules away from edges */
  padding?: number;
}

/**
 * Molecule Spawner Service
 * 
 * Abstracts molecule spawning logic for reuse across different systems.
 * Handles:
 * - Loading molecules from CID
 * - Positioning molecules (specific or random within container)
 * - Setting initial velocities
 * - Physics body creation
 */
export class MoleculeSpawner {
  private chemicalDataService: ChemicalDataService;
  private moleculeManager: MoleculeManager;
  private scene: THREE.Scene;

  constructor(
    scene: THREE.Scene,
    moleculeManager: MoleculeManager
  ) {
    this.scene = scene;
    this.moleculeManager = moleculeManager;
    this.chemicalDataService = new ChemicalDataService();
  }

  /**
   * Spawn a molecule at a specific position
   */
  async spawnMolecule(
    cid: string,
    name: string,
    options: SpawnOptions = {}
  ): Promise<any> {
    try {
      // Fetch molecule data
      const molecularData = await this.chemicalDataService.fetchMoleculeByCID(cid);
      
      if (!molecularData || !molecularData.mol3d) {
        throw new Error(`No MOL data available for ${name} (CID: ${cid})`);
      }

      // Determine position
      const position = options.position || { x: 0, y: 0, z: 0 };
      const applyRandomRotation = options.applyRandomRotation ?? true;

      // Draw the molecule first (creates molecule and physics body with molecular properties)
      drawMolecule(
        molecularData.mol3d,
        this.moleculeManager,
        this.scene,
        position,
        name,
        applyRandomRotation
      );

      // Get the created molecule
      const molecule = this.moleculeManager.getMolecule(name);
      if (!molecule) {
        throw new Error(`Failed to load molecule ${name} (CID: ${cid})`);
      }

      // Get molecular mass from properties (if available)
      const molecularMassAmu = (molecule as any).molecularProperties?.totalMass;

      // Calculate velocity AFTER drawing so we can use molecular mass
      let velocity: THREE.Vector3;
      if (options.velocity) {
        velocity = new THREE.Vector3(
          options.velocity.x,
          options.velocity.y,
          options.velocity.z
        );
      } else if (options.temperature !== undefined) {
        velocity = this.calculateTemperatureVelocity(
          options.temperature,
          molecularMassAmu,
          options.baseSpeed
        );
      } else {
        velocity = new THREE.Vector3(0, 0, 0);
      }

      // Set velocity on molecule object (source of truth)
      molecule.velocity.copy(velocity);
      
      // CRITICAL: drawMolecule creates physics body synchronously and addMolecule stores it on molecule.physicsBody
      // Set velocity directly on the physics body
      const setVelocityOnBody = () => {
        // Use molecule.physicsBody directly (set by addMolecule in cannonPhysicsEngine)
        const body = (molecule as any).physicsBody;
        
        if (body) {
          // Set velocity directly on Cannon.js body
          body.velocity.set(velocity.x, velocity.y, velocity.z);
          
          // NO DAMPING - Newton's laws: objects in motion stay in motion
          body.linearDamping = 0.0;
          body.angularDamping = 0.0;
          
          // CRITICAL: Force body to stay awake and moving
          body.wakeUp();
          body.sleepSpeedLimit = 0.0001; // Very low threshold
          body.sleepTimeLimit = 10.0; // Long time before sleeping
          body.allowSleep = false; // Disable sleeping entirely for moving molecules
          
        } else if (molecule.hasPhysics) {
          // Physics body should exist but reference not set, try lookup
          const body = physicsEngine.getPhysicsBody(molecule);
          if (body) {
            (molecule as any).physicsBody = body;
            body.velocity.set(velocity.x, velocity.y, velocity.z);
            
            // NO DAMPING - Newton's laws: objects in motion stay in motion
            body.linearDamping = 0.0;
            body.angularDamping = 0.0;
            
            body.wakeUp();
            body.sleepSpeedLimit = 0.001;
            body.sleepTimeLimit = 2.0;
          } else {
            // Retry if body not found
            setTimeout(setVelocityOnBody, 10);
          }
        } else {
          // Physics body not created yet, wait
          setTimeout(setVelocityOnBody, 10);
        }
      };
      
      // Try immediately (drawMolecule should have created it synchronously)
      setVelocityOnBody();

      // Reduced logging - only log occasionally to avoid spam when spawning many molecules
      if (Math.random() < 0.05) { // Log ~5% of spawns
        log(`✅ Spawned molecule ${name} at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
      }
      
      return molecule;
    } catch (error) {
      log(`Failed to spawn molecule ${name}: ${error}`);
      throw error;
    }
  }

  /**
   * Spawn a molecule at a random position within container bounds
   */
  async spawnMoleculeInContainer(
    cid: string,
    name: string,
    bounds: ContainerBounds,
    options: Omit<SpawnOptions, 'position'> = {}
  ): Promise<any> {
    const position = this.getRandomPositionInContainer(bounds);
    return this.spawnMolecule(cid, name, {
      ...options,
      position
    });
  }

  /**
   * Spawn multiple molecules of the same type within container bounds
   */
  async spawnMultipleMolecules(
    cid: string,
    namePrefix: string,
    count: number,
    bounds: ContainerBounds,
    options: Omit<SpawnOptions, 'position'> = {}
  ): Promise<any[]> {
    const molecules: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const name = `${namePrefix}_${i}`;
      try {
        const molecule = await this.spawnMoleculeInContainer(
          cid,
          name,
          bounds,
          options
        );
        molecules.push(molecule);
      } catch (error) {
        log(`Failed to spawn molecule ${name}: ${error}`);
        // Continue spawning other molecules even if one fails
      }
    }
    
    // Only log summary, not every spawn
    if (molecules.length > 0) {
      log(`✅ Spawned ${molecules.length}/${count} molecules of type ${namePrefix}`);
    }
    return molecules;
  }

  /**
   * Calculate number of molecules needed for a given concentration
   * 
   * @param concentration - Concentration in mol/L
   * @param containerVolume - Volume of container in L
   * @returns Number of molecules to spawn
   */
  calculateMoleculeCount(
    concentration: number,
    containerVolume: number
  ): number {
    // Using Avogadro's number: N = C * V * N_A
    const avogadroNumber = 6.022e23;
    const moleculeCount = concentration * containerVolume * avogadroNumber;
    
    // For visualization, we'll scale this down significantly
    // Real molecules are too many to visualize, so we use a representative sample
    // Scale factor: 1e-20 (1 molecule per 1e20 real molecules)
    const scaleFactor = 1e-20;
    return Math.max(1, Math.floor(moleculeCount * scaleFactor));
  }

  /**
   * Spawn molecules to match a target concentration
   * 
   * @param cid - Chemical ID
   * @param namePrefix - Prefix for molecule names
   * @param concentration - Target concentration in mol/L
   * @param bounds - Container bounds
   * @param options - Additional spawn options
   */
  async spawnForConcentration(
    cid: string,
    namePrefix: string,
    concentration: number,
    bounds: ContainerBounds,
    options: Omit<SpawnOptions, 'position'> = {}
  ): Promise<any[]> {
    // Calculate container volume (assuming cubic container)
    const containerVolume = Math.pow(bounds.size / 100, 3); // Convert to liters (assuming units are cm)
    
    // Calculate how many molecules we need
    const targetCount = this.calculateMoleculeCount(concentration, containerVolume);
    
    log(`📊 Target concentration: ${concentration} mol/L`);
    log(`📊 Container volume: ${containerVolume.toExponential(2)} L`);
    log(`📊 Spawning ${targetCount} molecules`);
    
    return this.spawnMultipleMolecules(cid, namePrefix, targetCount, bounds, options);
  }

  /**
   * Get a random position within container bounds
   */
  private getRandomPositionInContainer(bounds: ContainerBounds): { x: number; y: number; z: number } {
    const center = bounds.center || { x: 0, y: 0, z: 0 };
    const padding = bounds.padding ?? 0.1; // 10% padding by default
    const halfSize = (bounds.size / 2) * (1 - padding);
    
    return {
      x: center.x + (Math.random() - 0.5) * bounds.size * (1 - padding),
      y: center.y + (Math.random() - 0.5) * bounds.size * (1 - padding),
      z: center.z + (Math.random() - 0.5) * bounds.size * (1 - padding)
    };
  }

  /**
   * Calculate velocity based on temperature using REAL Maxwell-Boltzmann distribution
   * v_rms = sqrt(3kT/m)
   * Where:
   * - k = Boltzmann constant = 1.380649 × 10^-23 J/K
   * - T = temperature in Kelvin
   * - m = molecular mass in kg (converted from atomic mass units)
   * 
   * For visualization, we scale the result to reasonable speeds while maintaining
   * the correct temperature dependence
   */
  private calculateTemperatureVelocity(
    temperature: number,
    molecularMassAmu?: number, // Molecular mass in atomic mass units
    baseSpeed?: number // Optional override for base speed
  ): THREE.Vector3 {
    // Constants
    const BOLTZMANN_CONSTANT = 1.380649e-23; // J/K
    const AMU_TO_KG = 1.660539e-27; // kg per atomic mass unit
    
    // Use provided mass or default (average molecular mass ~50 amu for organic molecules)
    const massAmu = molecularMassAmu || 50.0;
    const massKg = massAmu * AMU_TO_KG;
    
    // REAL Maxwell-Boltzmann: v_rms = sqrt(3kT/m)
    // This gives velocity in m/s (typically 100-1000 m/s for molecules)
    const v_rms = Math.sqrt((3 * BOLTZMANN_CONSTANT * temperature) / massKg);
    
    // Reference values for scaling
    const referenceTemp = 298; // Room temperature
    const referenceVrms = Math.sqrt((3 * BOLTZMANN_CONSTANT * referenceTemp) / massKg);
    
    // Use baseSpeed as the reference visualization speed at room temperature
    // Then scale proportionally based on the ratio of v_rms values
    const referenceBaseSpeed = baseSpeed || 3.0; // Default 3 m/s at room temp
    const speedRatio = v_rms / referenceVrms; // How much faster/slower than room temp
    
    // Final speed: scale baseSpeed by the temperature ratio
    // This ensures: higher T → higher v_rms → higher speed (CORRECT!)
    const finalSpeed = referenceBaseSpeed * speedRatio;
    
    // Random direction for realistic molecular motion
    const direction = new THREE.Vector3(
      (Math.random() - 0.5),
      (Math.random() - 0.5),
      (Math.random() - 0.5)
    ).normalize();
    
    return direction.multiplyScalar(finalSpeed);
  }

  /**
   * Remove molecules by name prefix (for concentration changes)
   */
  removeMoleculesByPrefix(prefix: string): number {
    const allMolecules = this.moleculeManager.getAllMolecules();
    let removed = 0;
    
    for (const molecule of allMolecules) {
      if (molecule.name.startsWith(prefix)) {
        this.moleculeManager.removeMolecule(molecule.name);
        removed++;
      }
    }
    
    log(`🗑️ Removed ${removed} molecules with prefix ${prefix}`);
    return removed;
  }

  /**
   * Adjust concentration by adding or removing molecules
   */
  async adjustConcentration(
    cid: string,
    namePrefix: string,
    currentConcentration: number,
    targetConcentration: number,
    bounds: ContainerBounds,
    options: Omit<SpawnOptions, 'position'> = {}
  ): Promise<any[]> {
    // Calculate container volume
    const containerVolume = Math.pow(bounds.size / 100, 3);
    
    // Calculate current and target molecule counts
    const currentCount = this.calculateMoleculeCount(currentConcentration, containerVolume);
    const targetCount = this.calculateMoleculeCount(targetConcentration, containerVolume);
    
    const difference = targetCount - currentCount;
    
    if (difference > 0) {
      // Need to add molecules
      log(`➕ Adding ${difference} molecules to increase concentration`);
      return this.spawnMultipleMolecules(cid, namePrefix, difference, bounds, options);
    } else if (difference < 0) {
      // Need to remove molecules
      const toRemove = Math.abs(difference);
      log(`➖ Removing ${toRemove} molecules to decrease concentration`);
      
      // Get all molecules with this prefix
      const allMolecules = this.moleculeManager.getAllMolecules()
        .filter(m => m.name.startsWith(namePrefix));
      
      // Remove random molecules
      const shuffled = allMolecules.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(toRemove, shuffled.length); i++) {
        this.moleculeManager.removeMolecule(shuffled[i].name);
      }
      
      return [];
    } else {
      log(`✓ Concentration already at target`);
      return [];
    }
  }
}


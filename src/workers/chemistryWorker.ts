/**
 * Chemistry Worker
 * Handles chemistry calculations in a web worker
 * Runs reaction detection, molecular property calculations, and Maxwell-Boltzmann calculations off the main thread
 */

import type {
  ChemistryWorkerMessage,
  ChemistryWorkerResponse,
  SerializableCollisionData,
  SerializableMolecularProperties,
  SerializableMoleculeData,
  SerializableReactionResult,
  SerializableReactionType,
} from './types';

// Worker context - no window, use self
declare const self: DedicatedWorkerGlobalScope;

class ChemistryWorker {
  private readonly R = 8.314; // J/(mol·K) - Gas constant
  private readonly N_A = 6.022e23; // Avogadro's number

  constructor() {
    this.setupMessageHandler();
  }

  /**
   * Setup message handler for worker
   */
  private setupMessageHandler(): void {
    self.onmessage = (event: MessageEvent<ChemistryWorkerMessage>) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handle incoming messages from main thread
   */
  private async handleMessage(message: ChemistryWorkerMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'detectReaction':
          if (message.collisionData && message.reactionType && message.temperature !== undefined) {
            const result = this.detectReaction(
              message.collisionData,
              message.reactionType,
              message.temperature
            );
            this.sendResponse({
              type: 'reactionResult',
              id: message.id,
              reactionResult: result,
            });
          }
          break;

        case 'calculateProperties':
          if (message.moleculeData) {
            const properties = this.calculateMolecularProperties(message.moleculeData);
            this.sendResponse({
              type: 'propertiesResult',
              id: message.id,
              properties,
            });
          }
          break;

        case 'calculateMaxwellBoltzmann':
          if (
            message.molecularMass !== undefined &&
            message.temperature !== undefined &&
            message.baseSpeed !== undefined
          ) {
            const velocity = this.calculateMaxwellBoltzmannVelocity(
              message.temperature,
              message.molecularMass,
              message.baseSpeed
            );
            this.sendResponse({
              type: 'velocityResult',
              id: message.id,
              velocity,
            });
          }
          break;

        case 'batch':
          if (message.requests) {
            const results = await Promise.all(
              message.requests.map(req => this.processRequest(req))
            );
            this.sendResponse({
              type: 'batchResult',
              id: message.id,
              results,
            });
          }
          break;

        default:
          this.sendError(`Unknown message type: ${(message as any).type}`, message.id);
      }
    } catch (error) {
      this.sendError(error instanceof Error ? error.message : 'Unknown error', message.id);
    }
  }

  /**
   * Process a single request (for batch processing)
   */
  private async processRequest(message: ChemistryWorkerMessage): Promise<ChemistryWorkerResponse> {
    switch (message.type) {
      case 'detectReaction':
        if (message.collisionData && message.reactionType && message.temperature !== undefined) {
          const result = this.detectReaction(
            message.collisionData,
            message.reactionType,
            message.temperature
          );
          return {
            type: 'reactionResult',
            id: message.id,
            reactionResult: result,
          };
        }
        break;

      case 'calculateProperties':
        if (message.moleculeData) {
          const properties = this.calculateMolecularProperties(message.moleculeData);
          return {
            type: 'propertiesResult',
            id: message.id,
            properties,
          };
        }
        break;

      case 'calculateMaxwellBoltzmann':
        if (
          message.molecularMass !== undefined &&
          message.temperature !== undefined &&
          message.baseSpeed !== undefined
        ) {
          const velocity = this.calculateMaxwellBoltzmannVelocity(
            message.temperature,
            message.molecularMass,
            message.baseSpeed
          );
          return {
            type: 'velocityResult',
            id: message.id,
            velocity,
          };
        }
        break;
    }

    return {
      type: 'error',
      id: message.id,
      error: 'Invalid request',
    };
  }

  /**
   * Detect if a reaction occurs based on collision data and reaction type
   */
  private detectReaction(
    collision: SerializableCollisionData,
    reaction: SerializableReactionType,
    temperature: number
  ): SerializableReactionResult {
    // CRITICAL: Hard threshold - if collision energy < activation energy, NO reaction ever
    if (collision.collisionEnergy < reaction.activationEnergy) {
      return {
        occurs: false,
        probability: 0,
        reactionType: reaction,
        collisionData: collision,
      };
    }

    // 1. Check energy factor
    const energyFactor = this.calculateEnergyFactor(
      collision.collisionEnergy,
      reaction.activationEnergy
    );

    // 2. Check orientation factor
    const orientationFactor = this.calculateOrientationFactor(
      collision.approachAngle,
      reaction.optimalAngle
    );

    // 3. Combined probability (energy, orientation)
    // NOTE: Temperature is already accounted for in collision energy via velocity scaling (Maxwell-Boltzmann)
    // So we don't need a separate temperature factor - it would double-count temperature effects
    const probability = energyFactor * orientationFactor;

    // 6. Stochastic determination
    const occurs = Math.random() < probability;

    return {
      occurs,
      probability,
      reactionType: reaction,
      collisionData: collision,
    };
  }

  /**
   * Calculate energy factor based on collision energy vs activation energy
   */
  private calculateEnergyFactor(collisionE: number, activationE: number): number {
    if (collisionE < activationE) {
      return 0;
    }

    const excess = collisionE - activationE;
    return Math.min(1, 1 - Math.exp(-excess / activationE));
  }

  /**
   * Calculate orientation factor based on approach angle
   */
  private calculateOrientationFactor(actual: number, optimal: number): number {
    if (optimal === 0) {
      return 1.0;
    }

    const deviation = Math.abs(actual - optimal);
    const sigma = 30; // degrees tolerance
    return Math.exp(-(deviation ** 2) / (2 * sigma ** 2));
  }

  /**
   * Calculate temperature factor using Arrhenius equation
   */
  private calculateTemperatureFactor(
    reaction: SerializableReactionType,
    temperature: number
  ): number {
    // Simplified Arrhenius: k = A * exp(-Ea / RT)
    // Probability factor scales with temperature
    const activationEnergy_J_per_mol = reaction.activationEnergy * 1000; // Convert kJ/mol to J/mol
    const exponent = -activationEnergy_J_per_mol / (this.R * temperature);
    return Math.exp(exponent);
  }

  /**
   * Calculate molecular properties from molecule data
   * Simplified version - full implementation would require Three.js geometry calculations
   */
  private calculateMolecularProperties(
    moleculeData: SerializableMoleculeData
  ): SerializableMolecularProperties {
    if (!moleculeData.atoms || moleculeData.atoms.length === 0) {
      throw new Error('No atoms provided for molecular properties calculation');
    }

    const atoms = moleculeData.atoms;

    // Calculate center of mass
    let totalMass = 0;
    let comX = 0;
    let comY = 0;
    let comZ = 0;

    for (const atom of atoms) {
      totalMass += atom.mass;
      comX += atom.position.x * atom.mass;
      comY += atom.position.y * atom.mass;
      comZ += atom.position.z * atom.mass;
    }

    const centerOfMass = {
      x: comX / totalMass,
      y: comY / totalMass,
      z: comZ / totalMass,
    };

    // Calculate bounding box
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    for (const atom of atoms) {
      minX = Math.min(minX, atom.position.x);
      minY = Math.min(minY, atom.position.y);
      minZ = Math.min(minZ, atom.position.z);
      maxX = Math.max(maxX, atom.position.x);
      maxY = Math.max(maxY, atom.position.y);
      maxZ = Math.max(maxZ, atom.position.z);
    }

    // Calculate bounding radius
    let maxDist = 0;
    for (const atom of atoms) {
      const dx = atom.position.x - centerOfMass.x;
      const dy = atom.position.y - centerOfMass.y;
      const dz = atom.position.z - centerOfMass.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      maxDist = Math.max(maxDist, dist);
    }

    // Calculate moments of inertia (simplified)
    let Ixx = 0;
    let Iyy = 0;
    let Izz = 0;

    for (const atom of atoms) {
      const dx = atom.position.x - centerOfMass.x;
      const dy = atom.position.y - centerOfMass.y;
      const dz = atom.position.z - centerOfMass.z;
      const r2 = dx * dx + dy * dy + dz * dz;

      Ixx += atom.mass * (dy * dy + dz * dz);
      Iyy += atom.mass * (dx * dx + dz * dz);
      Izz += atom.mass * (dx * dx + dy * dy);
    }

    // Calculate net charge
    const netCharge = atoms.reduce((sum, atom) => sum + atom.charge, 0);

    // Generate molecular formula
    const elementCounts = new Map<string, number>();
    for (const atom of atoms) {
      elementCounts.set(atom.element, (elementCounts.get(atom.element) || 0) + 1);
    }
    const formulaParts: string[] = [];
    for (const [element, count] of elementCounts.entries()) {
      formulaParts.push(`${element}${count > 1 ? count : ''}`);
    }
    const molecularFormula = formulaParts.join('');

    // Simplified geometry (full analysis would require Three.js)
    const geometry = {
      type: 'asymmetric',
      symmetryFactor: 1.0,
      principalAxes: [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
      ],
    };

    return {
      centerOfMass,
      momentOfInertia: { x: Ixx, y: Iyy, z: Izz },
      totalMass,
      boundingRadius: maxDist,
      boundingBox: {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
      },
      netCharge,
      geometry,
      rotationalDegreesOfFreedom: 3,
      molecularFormula,
    };
  }

  /**
   * Calculate velocity using REAL Maxwell-Boltzmann distribution
   * v_rms = sqrt(3kT/m)
   */
  private calculateMaxwellBoltzmannVelocity(
    temperature: number,
    molecularMassAmu: number,
    baseSpeed: number
  ): number {
    const BOLTZMANN_CONSTANT = 1.380649e-23; // J/K
    const AMU_TO_KG = 1.660539e-27; // kg per atomic mass unit

    const massKg = molecularMassAmu * AMU_TO_KG;

    // REAL Maxwell-Boltzmann: v_rms = sqrt(3kT/m)
    const v_rms = Math.sqrt((3 * BOLTZMANN_CONSTANT * temperature) / massKg);

    // Reference values for scaling
    const referenceTemp = 298; // Room temperature
    const referenceVrms = Math.sqrt((3 * BOLTZMANN_CONSTANT * referenceTemp) / massKg);

    // Use baseSpeed as the reference visualization speed at room temperature
    const speedRatio = v_rms / referenceVrms;

    // Final speed: scale baseSpeed by the temperature ratio
    return baseSpeed * speedRatio;
  }

  /**
   * Send response to main thread
   */
  private sendResponse(response: ChemistryWorkerResponse): void {
    self.postMessage(response);
  }

  /**
   * Send error response
   */
  private sendError(message: string, id?: string): void {
    self.postMessage({
      type: 'error',
      id,
      error: message,
    });
  }
}

// Initialize worker
new ChemistryWorker();

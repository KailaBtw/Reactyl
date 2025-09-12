import * as THREE from 'three';
import type { ReactionFeatures } from '../types';

// Enhanced types
export interface Atom {
  element: string;
  position: THREE.Vector3;
  mass: number;
  charge: number;
  index: number; // 1-based index from MOL file
  stereochemistry?: number; // chirality info
  isotopeMassDiff?: number;
}

export interface Bond {
  atom1Index: number; // 1-based indices
  atom2Index: number;
  bondType: number; // 1=single, 2=double, 3=triple, 4=aromatic
  stereo?: number; // 1=wedge, 6=dash
}

export interface MolecularGeometry {
  type: 'linear' | 'planar' | 'tetrahedral' | 'octahedral' | 'asymmetric';
  symmetryFactor: number; // affects rotational degrees of freedom
  principalAxes: THREE.Vector3[]; // ordered by moment magnitude
}

export interface MolecularProperties {
  centerOfMass: THREE.Vector3;
  momentOfInertia: THREE.Vector3; // Ix, Iy, Iz
  totalMass: number;
  boundingRadius: number;
  boundingBox: THREE.Box3;
  netCharge: number;
  geometry: MolecularGeometry;
  rotationalDegreesOfFreedom: number; // 2 for linear, 3 for others
  atoms: Atom[];
  bonds: Bond[];
  molecularFormula: string;
  reactionFeatures?: ReactionFeatures; // Reaction compatibility features
  // Cached expensive calculations
  _cached?: {
    inertiaTensor?: THREE.Matrix3;
    principalMoments?: THREE.Vector3;
    principalAxes?: THREE.Vector3[];
  };
}

class EnhancedMolecularPropertiesCalculator {
  private static readonly ATOMIC_MASSES: Record<string, number> = {
    H: 1.008,
    He: 4.003,
    Li: 6.941,
    Be: 9.012,
    B: 10.811,
    C: 12.011,
    N: 14.007,
    O: 15.999,
    F: 18.998,
    Ne: 20.18,
    Na: 22.99,
    Mg: 24.305,
    Al: 26.982,
    Si: 28.086,
    P: 30.974,
    S: 32.066,
    Cl: 35.453,
    Ar: 39.948,
    K: 39.098,
    Ca: 40.078,
    Br: 79.904,
    I: 126.9,
  };

  // Cache for expensive calculations
  private static readonly calculationCache = new Map<string, MolecularProperties>();

  // Public: parse entire MOL file content to properties
  static parseMolFile(molFileContent: string): MolecularProperties {
    const cacheKey = EnhancedMolecularPropertiesCalculator.generateCacheKey(molFileContent);
    if (EnhancedMolecularPropertiesCalculator.calculationCache.has(cacheKey)) {
      return EnhancedMolecularPropertiesCalculator.calculationCache.get(cacheKey)!;
    }

    const lines = molFileContent.split('\n');
    const header = EnhancedMolecularPropertiesCalculator.parseHeader(lines.slice(0, 3));
    const counts = EnhancedMolecularPropertiesCalculator.parseCountsLine(lines[3]);
    if (!counts) throw new Error('Invalid MOL file: cannot parse counts line');
    const atomLines = lines.slice(4, 4 + counts.atomCount);
    const atoms = EnhancedMolecularPropertiesCalculator.parseAtoms(atomLines);
    const bondLines = lines.slice(4 + counts.atomCount, 4 + counts.atomCount + counts.bondCount);
    const bonds = EnhancedMolecularPropertiesCalculator.parseBonds(bondLines);
    const propertiesLines = lines.slice(4 + counts.atomCount + counts.bondCount);
    EnhancedMolecularPropertiesCalculator.parsePropertiesBlock(propertiesLines, atoms);

    const properties = EnhancedMolecularPropertiesCalculator.calculateAllProperties(
      atoms,
      bonds,
      header.name || 'Unknown'
    );
    EnhancedMolecularPropertiesCalculator.calculationCache.set(cacheKey, properties);
    return properties;
  }

  // Public: compute from our existing parsed MOL JSON (adapter)
  static calculateFromMolObject(molObject: {
    atoms: Array<{ position: { x: string; y: string; z: string }; type: string }>;
    bonds: Array<[string, string, string?]> | Array<[string, string]>;
    header?: { name?: string } | any;
  }): MolecularProperties {
    const cacheKey = EnhancedMolecularPropertiesCalculator.generateMolObjectCacheKey(molObject);
    if (EnhancedMolecularPropertiesCalculator.calculationCache.has(cacheKey)) {
      return EnhancedMolecularPropertiesCalculator.calculationCache.get(cacheKey)!;
    }

    // Map atoms
    const atoms: Atom[] = molObject.atoms.map((a, idx) => {
      const x = parseFloat(a.position.x);
      const y = parseFloat(a.position.y);
      const z = parseFloat(a.position.z);
      const element = a.type;
      const baseMass = EnhancedMolecularPropertiesCalculator.ATOMIC_MASSES[element] || 12.0;
      return {
        element,
        position: new THREE.Vector3(x, y, z),
        mass: baseMass,
        charge: 0,
        index: idx + 1,
      };
    });
    // Map bonds (mol parser stores type at index 2 optionally)
    const bonds: Bond[] = (molObject.bonds as any[]).map((b: any) => {
      const atom1Index = parseInt(b[0], 10);
      const atom2Index = parseInt(b[1], 10);
      const bondType = b[2] ? parseInt(b[2], 10) : 1;
      return { atom1Index, atom2Index, bondType };
    });

    const properties = EnhancedMolecularPropertiesCalculator.calculateAllProperties(
      atoms,
      bonds,
      molObject.header?.name || 'Unknown'
    );
    EnhancedMolecularPropertiesCalculator.calculationCache.set(cacheKey, properties);
    return properties;
  }

  // Cache key generation
  private static generateCacheKey(content: string): string {
    // Simple hash of content for caching
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `mol_${hash}`;
  }

  private static generateMolObjectCacheKey(molObject: any): string {
    // Create cache key from atom positions and types
    const atomData = molObject.atoms
      .map(
        (a: any) =>
          `${a.type}_${parseFloat(a.position.x).toFixed(3)}_${parseFloat(a.position.y).toFixed(3)}_${parseFloat(a.position.z).toFixed(3)}`
      )
      .join('|');
    const bondData = molObject.bonds.map((b: any) => `${b[0]}-${b[1]}-${b[2] || '1'}`).join('|');
    return `obj_${atomData}_${bondData}`;
  }

  // Clear cache (useful for memory management)
  static clearCache(): void {
    EnhancedMolecularPropertiesCalculator.calculationCache.clear();
  }

  // Get cache stats
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: EnhancedMolecularPropertiesCalculator.calculationCache.size,
      keys: Array.from(EnhancedMolecularPropertiesCalculator.calculationCache.keys()),
    };
  }

  private static parseHeader(headerLines: string[]): {
    name?: string;
    program?: string;
    comment?: string;
  } {
    return {
      name: headerLines[0]?.trim(),
      program: headerLines[1]?.trim(),
      comment: headerLines[2]?.trim(),
    };
  }
  private static parseCountsLine(line: string): { atomCount: number; bondCount: number } | null {
    if (!line || line.length < 6) return null;
    const atomCount = parseInt(line.substring(0, 3).trim(), 10);
    const bondCount = parseInt(line.substring(3, 6).trim(), 10);
    if (Number.isNaN(atomCount) || Number.isNaN(bondCount)) return null;
    return { atomCount, bondCount };
  }
  private static parseAtoms(atomLines: string[]): Atom[] {
    return atomLines.map((line, index) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) throw new Error(`Invalid atom line ${index + 1}: insufficient data`);
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      const z = parseFloat(parts[2]);
      const element = parts[3];
      if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z))
        throw new Error(`Invalid coordinates in atom line ${index + 1}`);
      let charge = 0;
      let stereochemistry: number | undefined;
      let isotopeMassDiff: number | undefined;
      if (line.length >= 39) {
        const chargeField = parseInt(line.substring(36, 39).trim(), 10);
        const chargeMap: Record<number, number> = { 1: 3, 2: 2, 3: 1, 5: -1, 6: -2, 7: -3 };
        if (!Number.isNaN(chargeField)) charge = chargeMap[chargeField] || 0;
      }
      if (line.length >= 36) {
        const massDiff = parseInt(line.substring(34, 36).trim(), 10);
        if (!Number.isNaN(massDiff) && massDiff !== 0) isotopeMassDiff = massDiff;
      }
      const baseMass = EnhancedMolecularPropertiesCalculator.ATOMIC_MASSES[element] || 12.0;
      const actualMass = baseMass + (isotopeMassDiff || 0);
      return {
        element,
        position: new THREE.Vector3(x, y, z),
        mass: actualMass,
        charge,
        index: index + 1,
        stereochemistry,
        isotopeMassDiff,
      };
    });
  }
  private static parseBonds(bondLines: string[]): Bond[] {
    return bondLines.map((line, index) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) throw new Error(`Invalid bond line ${index + 1}: insufficient data`);
      const atom1Index = parseInt(parts[0], 10);
      const atom2Index = parseInt(parts[1], 10);
      const bondType = parseInt(parts[2], 10);
      let stereo: number | undefined;
      if (parts.length >= 4) {
        const stereoField = parseInt(parts[3], 10);
        if (!Number.isNaN(stereoField) && stereoField !== 0) stereo = stereoField;
      }
      return { atom1Index, atom2Index, bondType, stereo };
    });
  }
  private static parsePropertiesBlock(propertiesLines: string[], atoms: Atom[]): void {
    for (const line of propertiesLines) {
      if (line.startsWith('M  CHG')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          const chargeCount = parseInt(parts[3], 10);
          for (let i = 0; i < chargeCount && 4 + i * 2 + 1 < parts.length; i++) {
            const atomIndex = parseInt(parts[4 + i * 2], 10) - 1;
            const charge = parseInt(parts[4 + i * 2 + 1], 10);
            if (atomIndex >= 0 && atomIndex < atoms.length) atoms[atomIndex].charge = charge;
          }
        }
      }
    }
  }

  private static calculateAllProperties(
    atoms: Atom[],
    bonds: Bond[],
    _moleculeName: string
  ): MolecularProperties {
    if (atoms.length === 0) throw new Error('No atoms provided');

    // Initialize cache
    const properties: MolecularProperties = {
      centerOfMass: new THREE.Vector3(),
      momentOfInertia: new THREE.Vector3(),
      totalMass: 0,
      boundingRadius: 0,
      boundingBox: new THREE.Box3(),
      netCharge: 0,
      geometry: { type: 'asymmetric', symmetryFactor: 1.0, principalAxes: [] },
      rotationalDegreesOfFreedom: 3,
      atoms,
      bonds,
      molecularFormula: '',
      _cached: {},
    };

    // Calculate basic properties (fast)
    properties.totalMass = atoms.reduce((sum, atom) => sum + atom.mass, 0);
    properties.netCharge = atoms.reduce((sum, atom) => sum + atom.charge, 0);
    properties.molecularFormula =
      EnhancedMolecularPropertiesCalculator.generateMolecularFormula(atoms);

    // Calculate center of mass (fast)
    properties.centerOfMass = EnhancedMolecularPropertiesCalculator.calculateCenterOfMass(atoms);

    // Calculate bounding box (fast)
    properties.boundingBox = EnhancedMolecularPropertiesCalculator.calculateBoundingBox(atoms);

    // Calculate bounding radius (fast)
    properties.boundingRadius = EnhancedMolecularPropertiesCalculator.calculateBoundingRadius(
      atoms,
      properties.centerOfMass
    );

    // Calculate moments of inertia (fast)
    properties.momentOfInertia = EnhancedMolecularPropertiesCalculator.calculateMomentsOfInertia(
      atoms,
      properties.centerOfMass
    );

    // Analyze molecular geometry (expensive - cache this)
    properties.geometry = EnhancedMolecularPropertiesCalculator.analyzeMolecularGeometry(
      atoms,
      bonds,
      properties.centerOfMass
    );
    properties.rotationalDegreesOfFreedom = properties.geometry.type === 'linear' ? 2 : 3;

    // Calculate reaction features
    properties.reactionFeatures = EnhancedMolecularPropertiesCalculator.calculateReactionFeatures(
      atoms,
      bonds
    );

    return properties;
  }

  private static analyzeMolecularGeometry(
    atoms: Atom[],
    bonds: Bond[],
    centerOfMass: THREE.Vector3
  ): MolecularGeometry {
    // Early exit for simple cases
    if (atoms.length <= 2) {
      return {
        type: 'linear',
        symmetryFactor: 1.0,
        principalAxes: [
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 1),
        ],
      };
    }

    // Check for linearity (expensive - only do if needed)
    const isLinear = EnhancedMolecularPropertiesCalculator.checkLinearity(atoms, centerOfMass);
    if (isLinear) {
      return {
        type: 'linear',
        symmetryFactor: 2.0,
        principalAxes: EnhancedMolecularPropertiesCalculator.calculatePrincipalAxes(
          atoms,
          centerOfMass
        ),
      };
    }

    // Check for planarity (expensive - only do if needed)
    const isPlanar = EnhancedMolecularPropertiesCalculator.checkPlanarity(atoms, centerOfMass);

    let type: MolecularGeometry['type'] = 'asymmetric';
    let symmetryFactor = 1.0;

    if (isPlanar) {
      type = 'planar';
      symmetryFactor = EnhancedMolecularPropertiesCalculator.calculateSymmetryFactor(atoms, bonds);
    }

    return {
      type,
      symmetryFactor,
      principalAxes: EnhancedMolecularPropertiesCalculator.calculatePrincipalAxes(
        atoms,
        centerOfMass
      ),
    };
  }

  private static checkLinearity(
    atoms: Atom[],
    centerOfMass: THREE.Vector3,
    threshold = 0.1
  ): boolean {
    if (atoms.length <= 2) return true;

    // Find the longest distance between any two atoms to define the axis
    let maxDist = 0;
    let axis = new THREE.Vector3();

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const dist = atoms[i].position.distanceTo(atoms[j].position);
        if (dist > maxDist) {
          maxDist = dist;
          axis = atoms[j].position.clone().sub(atoms[i].position).normalize();
        }
      }
    }

    // Check if all atoms lie close to this axis
    for (const atom of atoms) {
      const relPos = atom.position.clone().sub(centerOfMass);
      const projectionLength = relPos.dot(axis);
      const projection = axis.clone().multiplyScalar(projectionLength);
      const perpendicular = relPos.clone().sub(projection);

      if (perpendicular.length() > threshold) {
        return false;
      }
    }

    return true;
  }

  private static checkPlanarity(
    atoms: Atom[],
    _centerOfMass: THREE.Vector3,
    threshold = 0.1
  ): boolean {
    if (atoms.length <= 3) return true;

    // Use first three non-collinear atoms to define plane
    let normal = new THREE.Vector3();
    let found = false;

    for (let i = 0; i < atoms.length - 2 && !found; i++) {
      for (let j = i + 1; j < atoms.length - 1 && !found; j++) {
        for (let k = j + 1; k < atoms.length && !found; k++) {
          const v1 = atoms[j].position.clone().sub(atoms[i].position);
          const v2 = atoms[k].position.clone().sub(atoms[i].position);
          const cross = v1.clone().cross(v2);

          if (cross.length() > 0.01) {
            // Non-collinear
            normal = cross.normalize();
            found = true;
          }
        }
      }
    }

    if (!found) return true; // All atoms are collinear

    // Check if all atoms lie close to this plane
    const planePoint = atoms[0].position;
    for (const atom of atoms) {
      const toPoint = atom.position.clone().sub(planePoint);
      const distToPlane = Math.abs(toPoint.dot(normal));

      if (distToPlane > threshold) {
        return false;
      }
    }

    return true;
  }

  private static calculateSymmetryFactor(atoms: Atom[], _bonds: Bond[]): number {
    // Simplified symmetry analysis - could be much more sophisticated
    // For now, just check for some common symmetric cases

    // Count identical atoms at equivalent positions
    const elementCounts = atoms.reduce(
      (counts, atom) => {
        counts[atom.element] = (counts[atom.element] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );

    // Simple heuristic: if we have many identical atoms, likely some symmetry
    const maxCount = Math.max(...Object.values(elementCounts));
    if (maxCount >= 4) return 2.0; // High symmetry molecules
    if (maxCount >= 2) return 1.5; // Some symmetry

    return 1.0; // Asymmetric
  }

  private static calculatePrincipalAxes(
    _atoms: Atom[],
    _centerOfMass: THREE.Vector3
  ): THREE.Vector3[] {
    // Placeholder axes (full eigen decomposition can be added later)
    return [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  }

  private static generateMolecularFormula(atoms: Atom[]): string {
    const elementCounts = atoms.reduce(
      (counts, atom) => {
        counts[atom.element] = (counts[atom.element] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );

    // Standard order: C, H, then alphabetical
    const orderedElements = Object.keys(elementCounts).sort((a, b) => {
      if (a === 'C') return -1;
      if (b === 'C') return 1;
      if (a === 'H') return -1;
      if (b === 'H') return 1;
      return a.localeCompare(b);
    });

    return orderedElements
      .map(element => {
        const count = elementCounts[element];
        return count === 1 ? element : `${element}${count}`;
      })
      .join('');
  }

  private static calculateCenterOfMass(atoms: Atom[]): THREE.Vector3 {
    const totalMass = atoms.reduce((sum, atom) => sum + atom.mass, 0);
    const com = new THREE.Vector3();

    for (const atom of atoms) {
      const weightedPosition = atom.position.clone().multiplyScalar(atom.mass);
      com.add(weightedPosition);
    }

    return com.divideScalar(totalMass);
  }

  private static calculateMomentsOfInertia(atoms: Atom[], com: THREE.Vector3): THREE.Vector3 {
    let Ix = 0,
      Iy = 0,
      Iz = 0;

    for (const atom of atoms) {
      const relativePos = atom.position.clone().sub(com);
      const { x, y, z } = relativePos;

      Ix += atom.mass * (y * y + z * z);
      Iy += atom.mass * (x * x + z * z);
      Iz += atom.mass * (x * x + y * y);
    }

    return new THREE.Vector3(Ix, Iy, Iz);
  }

  private static calculateBoundingRadius(atoms: Atom[], com: THREE.Vector3): number {
    let maxRadius = 0;
    for (const atom of atoms) {
      const radius = atom.position.distanceTo(com);
      maxRadius = Math.max(maxRadius, radius);
    }
    return maxRadius;
  }

  private static calculateBoundingBox(atoms: Atom[]): THREE.Box3 {
    const box = new THREE.Box3();
    for (const atom of atoms) {
      box.expandByPoint(atom.position);
    }
    return box;
  }

  /**
   * Calculate reaction features for molecular compatibility
   */
  static calculateReactionFeatures(atoms: Atom[], bonds: Bond[]): ReactionFeatures {
    const features: ReactionFeatures = {
      leavingGroups: [],
      nucleophiles: [],
      electrophiles: [],
    };

    atoms.forEach((atom, index) => {
      const atomType = atom.element;

      // Identify leaving groups (halides, sulfonates, etc.)
      if (['Cl', 'Br', 'I', 'F'].includes(atomType)) {
        features.leavingGroups.push({
          atomIndex: index,
          atomType,
          strength: EnhancedMolecularPropertiesCalculator.getLeavingGroupStrength(atomType),
        });
      }

      // Identify nucleophiles (anions, lone pairs)
      if (atomType === 'O' && atom.charge < 0) {
        features.nucleophiles.push({
          atomIndex: index,
          atomType: 'O-',
          strength: 8,
        });
      } else if (atomType === 'N' && atom.charge <= 0) {
        features.nucleophiles.push({
          atomIndex: index,
          atomType: 'N',
          strength: 6,
        });
      } else if (atomType === 'S' && atom.charge < 0) {
        features.nucleophiles.push({
          atomIndex: index,
          atomType: 'S-',
          strength: 7,
        });
      }

      // Identify electrophiles (cations, electron-deficient centers)
      if (atom.charge > 0) {
        features.electrophiles.push({
          atomIndex: index,
          atomType: `${atomType}+`,
          strength: Math.abs(atom.charge) * 5,
        });
      } else if (
        atomType === 'C' &&
        EnhancedMolecularPropertiesCalculator.isElectronDeficientCarbon(atom, bonds)
      ) {
        features.electrophiles.push({
          atomIndex: index,
          atomType: 'C*',
          strength: 4,
        });
      }
    });

    return features;
  }

  private static getLeavingGroupStrength(atomType: string): number {
    const strengths = {
      I: 9,
      Br: 7,
      Cl: 5,
      F: 1,
      OTs: 8,
      OMs: 7,
      OTf: 9, // Sulfonates
    };
    return strengths[atomType] || 0;
  }

  private static isElectronDeficientCarbon(atom: Atom, bonds: Bond[]): boolean {
    // Check if carbon is bonded to electronegative atoms
    const carbonBonds = bonds.filter(
      bond => bond.atom1Index === atom.index || bond.atom2Index === atom.index
    );

    // Simple heuristic: if bonded to multiple halides or oxygen
    const _bondedAtoms = carbonBonds.map(bond =>
      bond.atom1Index === atom.index ? bond.atom2Index : bond.atom1Index
    );

    // This is a simplified check - in practice, you'd analyze the full structure
    return carbonBonds.length >= 3; // Assume electron-deficient if highly substituted
  }
}

// Export the calculator class
export { EnhancedMolecularPropertiesCalculator as MolecularPropertiesCalculator };

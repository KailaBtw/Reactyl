import * as THREE from 'three';

export interface Atom {
  element: string;
  position: THREE.Vector3;
  mass: number;
}

export interface MolecularProperties {
  centerOfMass: THREE.Vector3;
  momentOfInertia: THREE.Vector3; // Ix, Iy, Iz
  totalMass: number;
  boundingRadius: number;
  boundingBox: THREE.Box3;
}

export class MolecularPropertiesCalculator {
  private static readonly ATOMIC_MASSES: Record<string, number> = {
    'H': 1.008, 'C': 12.011, 'N': 14.007, 'O': 15.999,
    'F': 18.998, 'P': 30.974, 'S': 32.066, 'Cl': 35.453,
    'Br': 79.904, 'I': 126.90
  };

  static parseAtomFromMolLine(line: string): Atom | null {
    // MOL format: x y z element charge...
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) return null;

    const element = parts[3];
    const mass = this.ATOMIC_MASSES[element] || 12.0; // default to carbon

    return {
      element,
      mass,
      position: new THREE.Vector3(
        parseFloat(parts[0]),
        parseFloat(parts[1]),
        parseFloat(parts[2])
      )
    };
  }

  static calculateProperties(atoms: Atom[]): MolecularProperties {
    if (atoms.length === 0) {
      throw new Error("No atoms provided");
    }

    // Calculate center of mass using Three.js Vector3
    const centerOfMass = this.calculateCenterOfMass(atoms);
    
    // Calculate moments of inertia around center of mass
    const momentOfInertia = this.calculateMomentsOfInertia(atoms, centerOfMass);
    
    // Calculate total mass
    const totalMass = atoms.reduce((sum, atom) => sum + atom.mass, 0);
    
    // Calculate bounding sphere and box using Three.js
    const boundingRadius = this.calculateBoundingRadius(atoms, centerOfMass);
    const boundingBox = this.calculateBoundingBox(atoms);

    return {
      centerOfMass,
      momentOfInertia,
      totalMass,
      boundingRadius,
      boundingBox
    };
  }

  private static calculateCenterOfMass(atoms: Atom[]): THREE.Vector3 {
    const totalMass = atoms.reduce((sum, atom) => sum + atom.mass, 0);
    const com = new THREE.Vector3();
    
    // Use Three.js vector operations
    for (const atom of atoms) {
      const weightedPosition = atom.position.clone().multiplyScalar(atom.mass);
      com.add(weightedPosition);
    }
    
    return com.divideScalar(totalMass);
  }

  private static calculateMomentsOfInertia(atoms: Atom[], com: THREE.Vector3): THREE.Vector3 {
    let Ix = 0, Iy = 0, Iz = 0;

    for (const atom of atoms) {
      // Position relative to center of mass using Three.js
      const relativePos = atom.position.clone().sub(com);
      const { x: dx, y: dy, z: dz } = relativePos;

      // Moments of inertia (diagonal components only)
      Ix += atom.mass * (dy * dy + dz * dz);
      Iy += atom.mass * (dx * dx + dz * dz);
      Iz += atom.mass * (dx * dx + dy * dy);
    }

    return new THREE.Vector3(Ix, Iy, Iz);
  }

  private static calculateBoundingRadius(atoms: Atom[], com: THREE.Vector3): number {
    let maxRadius = 0;

    for (const atom of atoms) {
      // Use Three.js distance calculation
      const radius = atom.position.distanceTo(com);
      maxRadius = Math.max(maxRadius, radius);
    }

    return maxRadius;
  }

  private static calculateBoundingBox(atoms: Atom[]): THREE.Box3 {
    const box = new THREE.Box3();
    
    // Three.js automatically calculates bounding box
    for (const atom of atoms) {
      box.expandByPoint(atom.position);
    }
    
    return box;
  }

  // Helper method to create Three.js geometry from atoms (bonus!)
  static createAtomGeometry(atoms: Atom[]): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];
    
    // Common atom colors
    const atomColors: Record<string, THREE.Color> = {
      'H': new THREE.Color(0xffffff), // white
      'C': new THREE.Color(0x404040), // dark gray
      'N': new THREE.Color(0x3050f8), // blue
      'O': new THREE.Color(0xff0d0d), // red
      'S': new THREE.Color(0xffff30), // yellow
      'P': new THREE.Color(0xff8000), // orange
    };

    for (const atom of atoms) {
      positions.push(atom.position.x, atom.position.y, atom.position.z);
      
      const color = atomColors[atom.element] || new THREE.Color(0x888888);
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    return geometry;
  }
}

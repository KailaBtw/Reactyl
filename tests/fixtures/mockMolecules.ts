import * as THREE from 'three';
import { vi } from 'vitest';
import { MOLECULE_PROPERTIES } from './molFiles';

export interface MockMolecule {
  name: string;
  group: THREE.Group;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  physicsBody: { quaternion: THREE.Quaternion };
  molecularProperties: {
    totalMass: number;
    boundingRadius: number;
    atomCount: number;
    bondCount: number;
  };
  hasPhysics: boolean;
}

export function createMockMolecule(
  name: string,
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  properties?: Partial<MockMolecule['molecularProperties']>
): MockMolecule {
  const group = new THREE.Group();
  group.position.copy(position);

  const defaultProps = MOLECULE_PROPERTIES[name.toUpperCase().replace(/\s+/g, '_')] || {
    totalMass: 50,
    boundingRadius: 1.5,
    atomCount: 3,
    bondCount: 2,
  };

  const molecule = {
    name,
    group,
    velocity: velocity.clone(),
    rotation: new THREE.Euler(),
    physicsBody: { quaternion: new THREE.Quaternion() },
    molecularProperties: {
      ...defaultProps,
      ...properties,
    },
    hasPhysics: false, // Start with no physics so drawMolecule will add it
    // Add the add method that moleculeDrawer expects
    add: vi.fn((child: any) => {
      group.add(child);
    }),
  };

  return molecule;
}

export function createMockAtom(
  element: string,
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
): any {
  return {
    userData: { element, atomIndex: 0 },
    position: position.clone(),
    getWorldPosition: vi.fn((target: THREE.Vector3) => {
      return target.copy(position);
    }),
    localToWorld: vi.fn((vector: THREE.Vector3) => {
      return vector.clone().add(position);
    }),
    worldToLocal: vi.fn((vector: THREE.Vector3) => {
      return vector.clone().sub(position);
    }),
  };
}

export function createMockMoleculeManager() {
  const molecules: Record<string, MockMolecule> = {};

  return {
    addMolecule: vi.fn((name: string, mol: MockMolecule) => {
      molecules[name] = mol;
    }),
    getAllMolecules: vi.fn().mockReturnValue(Object.values(molecules)),
    getMolecule: vi.fn((name: string) => molecules[name]),
    clearAllMolecules: vi.fn(() => {
      Object.keys(molecules).forEach(k => delete molecules[k]);
    }),
    newMolecule: vi.fn((name: string) => createMockMolecule(name)),
    setMoleculeVelocity: vi.fn(),
    molecules, // Expose for direct access in tests
  };
}

export function createMockPhysicsEngine() {
  return {
    addMolecule: vi.fn().mockReturnValue(true),
    getPhysicsBody: vi.fn().mockReturnValue({ quaternion: new THREE.Quaternion() }),
    setVelocity: vi.fn(),
    step: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isSimulationPaused: vi.fn().mockReturnValue(false),
    removeMolecule: vi.fn(),
    clear: vi.fn(),
  };
}

export function createMockScene() {
  return new THREE.Scene();
}

// Common test molecules
export const TEST_MOLECULES = {
  METHYL_BROMIDE: () => createMockMolecule('Methyl bromide', new THREE.Vector3(0, 0, 7.5)),
  HYDROXIDE_ION: () => createMockMolecule('Hydroxide ion', new THREE.Vector3(0, 0, -7.5)),
  METHYL_CHLORIDE: () => createMockMolecule('Methyl chloride', new THREE.Vector3(0, 0, 7.5)),
  WATER: () => createMockMolecule('Water', new THREE.Vector3(0, 0, 0)),
  AMMONIA: () => createMockMolecule('Ammonia', new THREE.Vector3(0, 0, 0)),
};

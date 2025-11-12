import * as THREE from 'three';

/**
 * Centralized configuration for all atom types
 * This replaces scattered atom configurations across the codebase
 */
export interface AtomConfig {
  element: string;
  radius: number;
  color: number;
  geometry: THREE.SphereGeometry;
  material: THREE.MeshStandardMaterial;
}

/**
 * Centralized atom configuration
 * All atom types with their visual properties
 */
export const ATOM_CONFIGS: Record<string, AtomConfig> = {
  H: {
    element: 'H',
    radius: 0.3,
    color: 0xffffff,
    geometry: new THREE.SphereGeometry(0.3, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0xffffff }),
  },
  C: {
    element: 'C',
    radius: 0.8,
    color: 0x333333,
    geometry: new THREE.SphereGeometry(0.8, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0x333333 }),
  },
  O: {
    element: 'O',
    radius: 0.5,
    color: 0xff0000,
    geometry: new THREE.SphereGeometry(0.5, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0xff0000 }),
  },
  N: {
    element: 'N',
    radius: 0.6,
    color: 0x0000ff,
    geometry: new THREE.SphereGeometry(0.6, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0x0000ff }),
  },
  S: {
    element: 'S',
    radius: 0.8,
    color: 0xffff00,
    geometry: new THREE.SphereGeometry(0.8, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0xffff00 }),
  },
  P: {
    element: 'P',
    radius: 0.9,
    color: 0xff00ff,
    geometry: new THREE.SphereGeometry(0.9, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0xff00ff }),
  },
  F: {
    element: 'F',
    radius: 0.4,
    color: 0x00ff00,
    geometry: new THREE.SphereGeometry(0.4, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
  },
  Cl: {
    element: 'Cl',
    radius: 0.5,
    color: 0x00ff00,
    geometry: new THREE.SphereGeometry(0.5, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
  },
  Br: {
    element: 'Br',
    radius: 0.6,
    color: 0x8a2be2,
    geometry: new THREE.SphereGeometry(0.6, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0x8a2be2 }),
  },
  I: {
    element: 'I',
    radius: 0.7,
    color: 0x800080,
    geometry: new THREE.SphereGeometry(0.7, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0x800080 }),
  },
  Li: {
    element: 'Li',
    radius: 0.7,
    color: 0xcc80ff,
    geometry: new THREE.SphereGeometry(0.7, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0xcc80ff }),
  },
  Na: {
    element: 'Na',
    radius: 0.9,
    color: 0xab5cf2,
    geometry: new THREE.SphereGeometry(0.9, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0xab5cf2 }),
  },
  K: {
    element: 'K',
    radius: 1.0,
    color: 0x8f40d4,
    geometry: new THREE.SphereGeometry(1.0, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0x8f40d4 }),
  },
  Mg: {
    element: 'Mg',
    radius: 0.9,
    color: 0x8aff00,
    geometry: new THREE.SphereGeometry(0.9, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0x8aff00 }),
  },
  Ca: {
    element: 'Ca',
    radius: 1.0,
    color: 0x3dff00,
    geometry: new THREE.SphereGeometry(1.0, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0x3dff00 }),
  },
  Si: {
    element: 'Si',
    radius: 1.1,
    color: 0xdaa520,
    geometry: new THREE.SphereGeometry(1.1, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0xdaa520 }),
  },
  B: {
    element: 'B',
    radius: 0.7,
    color: 0x00ff80,
    geometry: new THREE.SphereGeometry(0.7, 32, 32),
    material: new THREE.MeshStandardMaterial({ color: 0x00ff80 }),
  },
};

/**
 * Bond configuration
 */
export interface BondConfig {
  radius: number;
  color: number;
  material: THREE.MeshBasicMaterial;
}

export const BOND_CONFIG: BondConfig = {
  radius: 0.05,
  color: 0xffffff,
  material: new THREE.MeshBasicMaterial({ color: 0xffffff }),
};

/**
 * Get atom configuration by element type
 */
export function getAtomConfig(element: string): AtomConfig {
  return ATOM_CONFIGS[element] || ATOM_CONFIGS.C; // Default to Carbon
}

/**
 * Get bond configuration
 */
export function getBondConfig(): BondConfig {
  return BOND_CONFIG;
}

/**
 * Create a new atom mesh using the centralized configuration
 */
export function createAtomMesh(element: string, position: THREE.Vector3): THREE.Mesh {
  const config = getAtomConfig(element);

  // Clone the geometry and material to avoid sharing references
  const geometry = config.geometry.clone();
  const material = config.material.clone();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);

  return mesh;
}

/**
 * Create a new bond mesh using the centralized configuration
 */
export function createBondMesh(
  startPosition: THREE.Vector3,
  endPosition: THREE.Vector3,
  bondOrder: number = 1
): THREE.Mesh {
  const config = getBondConfig();

  // Calculate bond length and direction
  const direction = endPosition.clone().sub(startPosition);
  const length = direction.length();
  const center = startPosition.clone().add(endPosition).multiplyScalar(0.5);

  // Create cylinder geometry
  const radius = bondOrder === 1 ? config.radius : config.radius * 1.5;
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);

  // Position and orient the cylinder
  geometry.translate(0, length / 2, 0);
  geometry.rotateX(Math.PI / 2);

  const material = config.material.clone();
  const mesh = new THREE.Mesh(geometry, material);

  // Position the mesh
  mesh.position.copy(center);
  mesh.lookAt(endPosition);
  mesh.rotateX(Math.PI / 2);

  return mesh;
}

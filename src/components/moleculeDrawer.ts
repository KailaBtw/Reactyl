import * as THREE from 'three';
import { molFileToJSON } from '../services/data/molFileToJSON';
import { MolToPhysicsConverter } from '../services/data/molToPhysics';
import { physicsEngine } from '../physics/cannonPhysicsEngine';
import type { MoleculeManager, Position } from '../types';
import { log } from '../utils/debug';
// RotationController removed - using physics engine for rotation

interface MolObject {
  atoms: Array<{
    position: { x: string; y: string; z: string };
    type: string;
  }>;
  bonds: Array<[string, string, string?]>;
}

interface Limits {
  x: { min: number; max: number };
  y: { min: number; max: number };
  z: { min: number; max: number };
}

// ===============================
//  Global Variables
// ===============================

/**
 * Predefined geometries for different atom types. Using constants for performance
 * and to avoid re-creating geometries unnecessarily. These are used to create
 * spheres representing atoms in the molecule.
 */
const moleculeGeometries: Record<string, THREE.SphereGeometry> = {
  C: new THREE.SphereGeometry(0.8, 32, 32), // Carbon
  H: new THREE.SphereGeometry(0.3, 32, 32), // Hydrogen
  O: new THREE.SphereGeometry(0.5, 32, 32), // Oxygen
  N: new THREE.SphereGeometry(0.6, 32, 32), // Nitrogen
  S: new THREE.SphereGeometry(0.8, 32, 32), // Sulfur
  P: new THREE.SphereGeometry(0.9, 32, 32), // Phosphorus
  F: new THREE.SphereGeometry(0.4, 32, 32), // Fluorine
  Cl: new THREE.SphereGeometry(0.5, 32, 32), // Chlorine
  Br: new THREE.SphereGeometry(0.6, 32, 32), // Bromine
  I: new THREE.SphereGeometry(0.7, 32, 32), // Iodine
};

/**
 * Predefined materials for different atom types. Similar to geometries,
 * these are constants for efficiency. Using MeshStandardMaterial for
 * realistic lighting.
 */
const moleculeMaterials: Record<string, THREE.MeshStandardMaterial> = {
  C: new THREE.MeshStandardMaterial({ color: 0x333333 }), // Dark Gray
  H: new THREE.MeshStandardMaterial({ color: 0xffffff }), // White
  O: new THREE.MeshStandardMaterial({ color: 0xff0000 }), // Red
  N: new THREE.MeshStandardMaterial({ color: 0x0000ff }), // Blue
  S: new THREE.MeshStandardMaterial({ color: 0xffff00 }), // Yellow
  P: new THREE.MeshStandardMaterial({ color: 0xff00ff }), // Magenta
  F: new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Green
  Cl: new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Green
  Br: new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Green
  I: new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Green
};

/**
 * Material for the bonds (cylinders) connecting the atoms. Using MeshBasicMaterial
 * for simplicity and performance.
 */
const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White

const centerOffset = 0; // Global offset for molecule positioning (currently unused)
let _moleculeCount = 0; // Global counter for the number of molecules drawn

// ===============================
//  Functions
// ===============================

/**
 * Fetches a molecule's .mol file, parses it, and draws the molecule in the scene.
 * This function orchestrates the process of loading and visualizing a molecule
 * from its file representation.
 *
 * @param CSID - The Chemical Structure ID (CSID) of the molecule. Used to
 * construct the file path (e.g., "molecules/CSID.mol").
 * @param moleculeManager - The MoleculeManager instance responsible for
 * managing the molecules.
 * @param scene - The Three.js scene to add the molecule to.
 * @param name - An optional name for the molecule. Defaults to "unknown".
 * @param position - The initial position of the molecule. Optional.
 */
export function getMolecule(
  CSID: string,
  moleculeManager: MoleculeManager,
  scene: THREE.Scene,
  name?: string,
  position?: Position
): void {
  // Set default position to a random value between -25 and 25 if not provided
  const defaultPosition: Position = {
    x: Math.floor(Math.random() * 51) - 25, // Random integer between -50 and 50
    y: Math.floor(Math.random() * 51) - 25,
    z: Math.floor(Math.random() * 51) - 25,
  };

  const finalPosition = position === undefined ? defaultPosition : position;

  _moleculeCount++; // unused, could be used for passing in automatic naming later!!!

  // Fetch the .mol file. Handles the asynchronous nature of file loading.
  fetch(`molecules/${CSID}.mol`)
    .then(response => response.text()) // Get the file content as text.
    .then(molFile => {
      // Once the file is loaded, parse and draw the molecule.
      drawMolecule(molFile, moleculeManager, scene, finalPosition, name);
    })
    .catch(error => {
      console.error('Error fetching or processing .mol file:', error);
      // Handle the error appropriately, e.g., show a message to the user
    });
}

/**
 * Parses a .mol file string and draws the molecule in the Three.js scene.
 * This function does the heavy lifting of parsing the molecule data and
 * creating the Three.js objects (spheres for atoms, cylinders for bonds)
 * to represent the molecule visually.
 *
 * @param molFile - The content of the .mol file as a string.
 * @param moleculeManager - The MoleculeManager instance.
 * @param scene - The Three.js scene to add the molecule to.
 * @param position - The position to draw the molecule.
 * @param name - The name of the molecule.
 */
export function drawMolecule(
  molFile: string,
  moleculeManager: MoleculeManager,
  scene: THREE.Scene,
  position: Position = { x: 0, y: 0, z: 0 },
  name: string = 'unknown',
  applyRandomRotation: boolean = true
): void {
  const molObject: MolObject = molFileToJSON(molFile); // Parse the .mol file content into a JavaScript object.

  const molecule = moleculeManager.newMolecule(name); // Create a new molecule group using the manager.

  // ### Handle Molecule Shapes ###

  // Determine the center of the molecule for proper positioning.
  const firstPoint = new THREE.Vector3(
    parseFloat(molObject.atoms[0].position.x),
    parseFloat(molObject.atoms[0].position.y),
    parseFloat(molObject.atoms[0].position.z)
  );

  // Initialize the limits for finding the bounding box of the molecule.
  const limits: Limits = {
    x: { min: firstPoint.x, max: firstPoint.x },
    y: { min: firstPoint.y, max: firstPoint.y },
    z: { min: firstPoint.z, max: firstPoint.z },
  };

  // Iterate through the atoms to find the bounding box.
  for (const item of molObject.atoms) {
    const point = new THREE.Vector3(
      parseFloat(item.position.x),
      parseFloat(item.position.y),
      parseFloat(item.position.z)
    );
    // Update the limits if we find a more extreme point.
    if (Number(point.x) < Number(limits.x.min)) limits.x.min = point.x;
    if (Number(point.x) > Number(limits.x.max)) limits.x.max = point.x;
    if (Number(point.y) < Number(limits.y.min)) limits.y.min = point.y;
    if (Number(point.y) > Number(limits.y.max)) limits.y.max = point.y;
    if (Number(point.z) < Number(limits.z.min)) limits.z.min = point.z;
    if (Number(point.z) > Number(limits.z.max)) limits.z.max = point.z;
  }

  // Calculate the center of the molecule's bounding box.
  const moleculeCenter = new THREE.Vector3(
    (Number(limits.x.min) + Number(limits.x.max)) / 2,
    (Number(limits.y.min) + Number(limits.y.max)) / 2,
    (Number(limits.z.min) + Number(limits.z.max)) / 2
  );

  // Store molecule data for future updates
  molecule.molObject = molObject;

  // Set the molecule group position to the specified position
  molecule.group.position.set(position.x, position.y, position.z);

  // Add random initial rotation around X and Z axes for more realistic starting orientations
  // Only apply random rotations if requested (default behavior for general molecule loading)
  if (applyRandomRotation) {
    molecule.group.rotation.x = (Math.random() - 0.5) * Math.PI; // Random rotation around X-axis (-π/2 to π/2)
    molecule.group.rotation.z = (Math.random() - 0.5) * Math.PI; // Random rotation around Z-axis (-π/2 to π/2)
  }

  // Set up physics-based rotation system
  try {
    // Use the converter to get molecular properties from parsed MOL data
    const molecularProperties = MolToPhysicsConverter.calculateProperties(molObject);

    // Validate the MOL data
    const validation = MolToPhysicsConverter.validateMolData(molObject);
    if (!validation.isValid) {
      log(`MOL data validation failed for ${name}: ${validation.errors.join(', ')}`);
      return;
    }

    // Get molecular summary for debugging
    const summary = MolToPhysicsConverter.getMolecularSummary(molObject);
    log(
      `Molecule ${name}: ${summary.atomCount} atoms, ${summary.bondCount} bonds, mass: ${summary.totalMass.toFixed(2)}, radius: ${summary.boundingRadius.toFixed(2)}`
    );

    // Store molecular properties for future use
    (molecule as any).molecularProperties = molecularProperties;

    // Debug logging removed for performance
  } catch (error) {
    log(`Failed to initialize rotation and physics systems for ${name}: ${error}`);
  }

  // Create and position the atom spheres.
  for (let atomIndex = 0; atomIndex < molObject.atoms.length; atomIndex++) {
    const item = molObject.atoms[atomIndex];
    const geometry = moleculeGeometries[item.type] || moleculeGeometries.C; // Default to Carbon if type not found
    const material = moleculeMaterials[item.type] || moleculeMaterials.C; // Default to Carbon if type not found

    // Ensure geometry bounds are computed once
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();

    const sphere = new THREE.Mesh(geometry, material);
    // Position the sphere relative to the molecule's center.
    sphere.position.x = parseFloat(item.position.x) - moleculeCenter.x;
    sphere.position.y = parseFloat(item.position.y) - moleculeCenter.y;
    sphere.position.z = parseFloat(item.position.z) - moleculeCenter.z;
    // Tag with atom index and element type for later updates/removal during reactions
    (sphere as any).userData = { atomIndex, element: item.type };
    molecule.add(sphere); // Add the sphere to the molecule group.
  }

  // ### Handle Bond Shapes (Cylinders) ###

  // Iterate through the bonds and create cylinders to represent them.
  for (const bond of molObject.bonds) {
    const index1 = Number(bond[0]) - 1; // Get the indices of the connected atoms.
    const index2 = Number(bond[1]) - 1;

    const atom1 = molObject.atoms[index1]; // Get the atom objects.
    const atom2 = molObject.atoms[index2];

    // Get the positions of the atoms relative to the molecule's center.
    const point1 = new THREE.Vector3(
      parseFloat(atom1.position.x) - moleculeCenter.x,
      parseFloat(atom1.position.y) - moleculeCenter.y,
      parseFloat(atom1.position.z) - moleculeCenter.z
    );
    const point2 = new THREE.Vector3(
      parseFloat(atom2.position.x) - moleculeCenter.x,
      parseFloat(atom2.position.y) - moleculeCenter.y,
      parseFloat(atom2.position.z) - moleculeCenter.z
    );

    const distance = point1.distanceTo(point2); // Calculate the distance between the atoms.
    const cylinderRadius = bond[2] === '1' ? 0.05 : 0.15; // Bond order determines radius.

    // Create the cylinder geometry.
    const cylinderGeometry = new THREE.CylinderGeometry(
      cylinderRadius,
      cylinderRadius,
      distance,
      8 // Number of segments
    );
    // Compute bounds for bond geometry
    cylinderGeometry.computeBoundingBox();
    cylinderGeometry.computeBoundingSphere();
    cylinderGeometry.translate(0, distance / 2, 0); // Translate to center it.
    cylinderGeometry.rotateX(Math.PI / 2); // Rotate to align with the bond.

    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial); // Create the cylinder mesh.
    cylinder.position.x = parseFloat(atom1.position.x) - moleculeCenter.x; // Position at the first atom.
    cylinder.position.y = parseFloat(atom1.position.y) - moleculeCenter.y;
    cylinder.position.z = parseFloat(atom1.position.z) - moleculeCenter.z;
    cylinder.lookAt(point2); // Make the cylinder point at the second atom.
    // Tag as bond and record connected atom indices for fast lookup during reactions
    (cylinder as any).userData = { type: 'bond', a: index1, b: index2 };
    molecule.add(cylinder); // Add the cylinder to the molecule group.
  }
  molecule.group.position.z = centerOffset; // Apply the global z offset (currently unused).

  // ### Handle Initial Positions and Velocities ###

  // set the molecules group position (using three group)
  molecule.group.position.copy(new THREE.Vector3(position.x, position.y, position.z));

  // Don't set automatic velocities - let the physics configuration handle this
  // moleculeManager.setMoleculeVelocity(name, targetPosition, 4); // REMOVED - interferes with physics config
  
  // Initialize with zero velocity - physics configuration will set proper velocities
  // IMPORTANT: Don't overwrite if velocity is already set (e.g., by MoleculeSpawner)
  // But since molecule is just created, velocity will be zero, so set it
  molecule.velocity.set(0, 0, 0);

  // Ensure physics body exists
  try {
    const props = (molecule as any).molecularProperties;
    
    if (!molecule.hasPhysics && props) {
      const success = physicsEngine.addMolecule(molecule, props);
      if (success) {
        molecule.hasPhysics = true;
        molecule.physicsBody = physicsEngine.getPhysicsBody(molecule);
      }
    }
    
    // Set velocity on physics body to current molecule velocity (zero for now)
    // MoleculeSpawner will set proper velocity after this function returns
    if (molecule.hasPhysics) {
      physicsEngine.setVelocity(molecule, molecule.velocity.clone());
    }
  } catch (e) {
    log(`Physics setup failed for ${name}: ${e}`);
  }

  // add the molecule to the scene
  scene.add(molecule.group);
}

import * as THREE from "three";
import { molFileToJSON } from "./molFileToJSON";
import { log } from "./debug";
import { MolToPhysicsConverter } from "./molToPhysics";
import { RotationController } from "./rotationController";

import { MoleculeGroup, MoleculeManager, Position } from "../types";

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
const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });  // White

let centerOffset = 0; // Global offset for molecule positioning (currently unused)
let moleculeCount = 0; // Global counter for the number of molecules drawn

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

  moleculeCount++; // unused, could be used for passing in automatic naming later!!!

  // Fetch the .mol file. Handles the asynchronous nature of file loading.
  fetch("molecules/" + CSID + ".mol")
    .then((response) => response.text()) // Get the file content as text.
    .then((molFile) => {
      // Once the file is loaded, parse and draw the molecule.
      drawMolecule(molFile, moleculeManager, scene, finalPosition, name);
    })
    .catch(error => {
      console.error("Error fetching or processing .mol file:", error);
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
  name: string = "unknown"
): void {

  const molObject: MolObject = molFileToJSON(molFile); // Parse the .mol file content into a JavaScript object.

  const molecule = moleculeManager.newMolecule(name); // Create a new molecule group using the manager.
  
  // Debug: Log the first few atoms to see the data structure
  log(`Molecule ${name} has ${molObject.atoms.length} atoms`);
  if (molObject.atoms.length > 0) {
    const firstAtom = molObject.atoms[0];
    log(`First atom: type=${firstAtom.type}, pos=(${firstAtom.position.x}, ${firstAtom.position.y}, ${firstAtom.position.z})`);
  }

  // ### Handle Molecule Shapes ###

  // Determine the center of the molecule for proper positioning.
  let firstPoint = new THREE.Vector3(
    parseFloat(molObject.atoms[0].position.x),
    parseFloat(molObject.atoms[0].position.y),
    parseFloat(molObject.atoms[0].position.z)
  );

  // Initialize the limits for finding the bounding box of the molecule.
  let limits: Limits = {
    x: { min: firstPoint.x, max: firstPoint.x },
    y: { min: firstPoint.y, max: firstPoint.y },
    z: { min: firstPoint.z, max: firstPoint.z },
  };

  // Iterate through the atoms to find the bounding box.
  for (let item of molObject.atoms) {
    let point = new THREE.Vector3(
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
  let moleculeCenter = new THREE.Vector3(
    (Number(limits.x.min) + Number(limits.x.max)) / 2,
    (Number(limits.y.min) + Number(limits.y.max)) / 2,
    (Number(limits.z.min) + Number(limits.z.max)) / 2
  );

  // Store molecule data for future updates
  molecule.molObject = molObject;
  
  // Set the molecule group position to the specified position
  molecule.group.position.set(position.x, position.y, position.z);
  
  // Add random initial rotation around X and Z axes for more realistic starting orientations
  molecule.group.rotation.x = (Math.random() - 0.5) * Math.PI; // Random rotation around X-axis (-π/2 to π/2)
  molecule.group.rotation.z = (Math.random() - 0.5) * Math.PI; // Random rotation around Z-axis (-π/2 to π/2)

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
    log(`Molecule ${name}: ${summary.atomCount} atoms, ${summary.bondCount} bonds, mass: ${summary.totalMass.toFixed(2)}, radius: ${summary.boundingRadius.toFixed(2)}`);
    
    // Create rotation controller
    const rotationController = new RotationController({
      mode: 'realistic',
      temperature: 150, // Reduced from 300K to 150K for slower rotation
      speedMultiplier: 0.5, // Reduced from 1.0 to 0.5 for slower rotation
      dampingFactor: 0.99, // Increased from 0.98 to 0.99 for more damping
      enableThermalNoise: true
    });
    
    // Set molecular properties and initialize rotation
    rotationController.setMolecule(molecularProperties);
    
    // Store in molecule for future use
    (molecule as any).molecularProperties = molecularProperties;
    (molecule as any).rotationController = rotationController;
    
    log(`Rotation system initialized for ${name} with ${summary.atomCount} atoms`);
  } catch (error) {
    log(`Failed to initialize rotation system for ${name}: ${error}`);
  }

  // Create and position the atom spheres.
  for (let item of molObject.atoms) {
    const geometry = moleculeGeometries[item.type] || moleculeGeometries['C']; // Default to Carbon if type not found
    const material = moleculeMaterials[item.type] || moleculeMaterials['C']; // Default to Carbon if type not found
    
    // Ensure geometry bounds are computed once
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();

    const sphere = new THREE.Mesh(geometry, material);
    // Position the sphere relative to the molecule's center.
    sphere.position.x = parseFloat(item.position.x) - moleculeCenter.x;
    sphere.position.y = parseFloat(item.position.y) - moleculeCenter.y;
    sphere.position.z = parseFloat(item.position.z) - moleculeCenter.z;
    molecule.add(sphere); // Add the sphere to the molecule group.
  }

  // ### Handle Bond Shapes (Cylinders) ###

  // Iterate through the bonds and create cylinders to represent them.
  for (let bond of molObject.bonds) {
    let index1 = Number(bond[0]) - 1; // Get the indices of the connected atoms.
    let index2 = Number(bond[1]) - 1;

    let atom1 = molObject.atoms[index1]; // Get the atom objects.
    let atom2 = molObject.atoms[index2];

    // Get the positions of the atoms relative to the molecule's center.
    let point1 = new THREE.Vector3(
      parseFloat(atom1.position.x) - moleculeCenter.x,
      parseFloat(atom1.position.y) - moleculeCenter.y,
      parseFloat(atom1.position.z) - moleculeCenter.z
    );
    let point2 = new THREE.Vector3(
      parseFloat(atom2.position.x) - moleculeCenter.x,
      parseFloat(atom2.position.y) - moleculeCenter.y,
      parseFloat(atom2.position.z) - moleculeCenter.z
    );

    let distance = point1.distanceTo(point2); // Calculate the distance between the atoms.
    let cylinderRadius = bond[2] === '1' ? 0.05 : 0.15; // Bond order determines radius.

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
    molecule.add(cylinder); // Add the cylinder to the molecule group.
  }
  molecule.group.position.z = centerOffset; // Apply the global z offset (currently unused).

  // ### Handle Initial Positions and Velocities ###

  // set the molecules group position (using three group)
  molecule.group.position.copy(
    new THREE.Vector3(position.x, position.y, position.z)
  );

  // Use this to define a target for the molecule, currently they all vector to the center
  const targetPosition = new THREE.Vector3(1, 1, 1);

  // Set an initial velocity toward the target
  moleculeManager.setMoleculeVelocity(name, targetPosition, 4); // sped up for faster testing and sim

  // add the molecule to the scene
  scene.add(molecule.group);
} 
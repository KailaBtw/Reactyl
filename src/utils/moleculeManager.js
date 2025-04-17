import * as THREE from "three";

// MoleculeGroup factory function (remains the same)
export const createMoleculeGroup = (name, position = { x: 0, y: 0, z: 0 }) => {
  const group = new THREE.Group();
  return {
      name,
      position, // Still storing the initial position data
      group,
      add: (mesh) => {
          group.add(mesh);
      },
      getGroup: () => group,
      velocity: new THREE.Vector3(0, 0, 0), // Initialize velocity here
  };
};

// MoleculeManager factory function (using a closure to manage molecules)
export const createMoleculeManager = () => {
  let molecules = {}; // Private state managed by the closure

  return {
      newMolecule: (name, position = { x: 0, y: 0, z: 0 }) => {
          const newMolecule = createMoleculeGroup(name, position);
          molecules = { ...molecules, [name]: newMolecule }; // Create a new object with the added molecule
          return newMolecule;
      },
      getMolecule: (name) => molecules[name],
      getAllMolecules: () => Object.values(molecules),
      removeMolecule: (name) => {
          if (molecules[name]) {
              const { [name]: removed, ...rest } = molecules; // Destructure to remove
              molecules = rest; // Update the molecules object immutably
              return true;
          }
          return false;
      },
      // Optional: Method to set initial velocities if needed
      setInitialVelocities: (initialSpeed = 0.1) => {
          for (const molecule of Object.values(molecules)) {
              molecule.velocity.set(
                  (Math.random() - 0.5) * initialSpeed,
                  (Math.random() - 0.5) * initialSpeed,
                  (Math.random() - 0.5) * initialSpeed
              );
          }
      },
  };
};
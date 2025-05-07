import * as THREE from "three";

// MoleculeGroup factory function
export const createMoleculeGroup = (name, position = { x: 0, y: 0, z: 0 }) => {
  const group = new THREE.Group();
  return {
    name,
    position,
    group,
    add: (mesh) => {
      group.add(mesh);
    },
    // If needed, a way to get the group for adding to the scene later
    getGroup: () => group,
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
  };
};
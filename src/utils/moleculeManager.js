import * as THREE from "three";

export { MoleculeManager };

class MoleculeGroup {
    constructor(name, position = { x: 0, y: 0, z: 0 }) {
      this.position = position;
      this.name = name;
      this.group = new THREE.Group();
      //this.mesh = new THREE.Mesh(geometry, material);
      //this.group.add(this.mesh);
    }
    add(mesh) {
      this.group.add(mesh);
    }

  }

class MoleculeManager {
    constructor() {
      this.molecules = {}; // object (dictionary) to store molecules
    }
  
    newMolecule(name, position = { x: 0, y: 0, z: 0 }) {
      const newMolecule = new MoleculeGroup(name, position);
      this.molecules[name] = newMolecule; // Store by name for easy access (change to CSID?)
      return newMolecule;
    }
    // can change lookup later
    getMolecule(name) {
      return this.molecules[name];
    }
  
    getAllMolecules() {
      return Object.values(this.molecules); // Get an array of all molecule objects
    }
  
    // remove a molecule
    removeMolecule(name) {
      if (this.molecules[name]) {
        delete this.molecules[name];
        return true;
      }
      return false;
    }
  }
  
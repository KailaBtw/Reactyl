import * as THREE from 'three';

interface HasGroup {
  group: THREE.Group;
}

export class BondHandler {
  static findBond(molecule: HasGroup, atomAIndex: number, atomBIndex: number): THREE.Object3D | null {
    for (const child of molecule.group.children) {
      const ud = (child as any).userData;
      if (ud && ud.type === 'bond') {
        if ((ud.a === atomAIndex && ud.b === atomBIndex) || (ud.a === atomBIndex && ud.b === atomAIndex)) {
          return child;
        }
      }
    }
    return null;
  }

  static hideBond(molecule: HasGroup, atomAIndex: number, atomBIndex: number): void {
    const bond = this.findBond(molecule, atomAIndex, atomBIndex);
    if (bond) bond.visible = false;
  }

  static showBond(molecule: HasGroup, atomAIndex: number, atomBIndex: number, colorHex?: number): void {
    const bond = this.findBond(molecule, atomAIndex, atomBIndex);
    if (bond) {
      bond.visible = true;
      if (colorHex && (bond as any).material) {
        (bond as any).material.color.setHex(colorHex);
      }
    }
  }

  static detachAtomToScene(molecule: HasGroup, atomIndex: number, scene: THREE.Scene): THREE.Object3D | null {
    for (const child of molecule.group.children) {
      const ud = (child as any).userData;
      if (ud && ud.atomIndex === atomIndex) {
        molecule.group.remove(child);
        scene.add(child);
        return child;
      }
    }
    return null;
  }
}




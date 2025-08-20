import * as THREE from "three";

// Type definitions
interface Atom {
  position: {
    x: number;
    y: number;
    z: number;
  };
}

interface MolObject {
  atoms: Atom[];
}

interface Limits {
  x: { min: number; max: number };
  y: { min: number; max: number };
  z: { min: number; max: number };
}

/**
 * Calculates the geometric center of a molecule represented by a molObject.
 *
 * This function takes a molObject, which contains an array of atom positions,
 * and calculates the center point of the molecule by finding the average of
 * the x, y, and z coordinates of all the atoms.
 *
 * @param molObject - An object representing the molecule. It is expected
 * to have an 'atoms' property, which is an array of atom objects. Each atom
 * object is expected to have a 'position' property with x, y, and z coordinates.
 * @returns A THREE.Vector3 object representing the calculated center point of the molecule.
 */
export function findCenter(molObject: MolObject): THREE.Vector3 {
    // Get the first point in the molecule.
    let firstPoint = new THREE.Vector3(
        molObject.atoms[0].position.x,
        molObject.atoms[0].position.y,
        molObject.atoms[0].position.z
    );

    // Set the initial limits to the first point. These limits will be expanded
    // to encompass the entire molecule.
    let limits: Limits = {
        x: { min: firstPoint.x, max: firstPoint.x },
        y: { min: firstPoint.y, max: firstPoint.y },
        z: { min: firstPoint.z, max: firstPoint.z },
    };

    // Iterate over all atoms in the molecule to find the bounding box.
    for (let item of molObject.atoms) {
        let point = new THREE.Vector3(
            item.position.x,
            item.position.y,
            item.position.z
        );

        // Update the limits if we find more extreme coordinates.
        if (Number(point.x) < Number(limits.x.min)) {
            limits.x.min = point.x;
        }
        if (Number(point.x) > Number(limits.x.max)) {
            limits.x.max = point.x;
        }
        if (Number(point.y) < Number(limits.y.min)) {
            limits.y.min = point.y;
        }
        if (Number(point.y) > Number(limits.y.max)) {
            limits.y.max = point.y;
        }
        if (Number(point.z) < Number(limits.z.min)) {
            limits.z.min = point.z;
        }
        if (Number(point.z) > Number(limits.z.max)) {
            limits.z.max = point.z;
        }
    }

    // Calculate the center point by averaging the min and max coordinates.
    let moleculeCenter = new THREE.Vector3(
        (Number(limits.x.min) + Number(limits.x.max)) / 2,
        (Number(limits.y.min) + Number(limits.y.max)) / 2,
        (Number(limits.z.min) + Number(limits.z.max)) / 2
    );

    return moleculeCenter; // Return the calculated center point.
} 
import * as THREE from 'three';

export interface MoleculeLike {
  group: THREE.Group;
  rotation: THREE.Euler;
}

export type OrientationStrategy = (substrate: MoleculeLike, nucleophile: MoleculeLike) => void;

export const orientSN2Backside: OrientationStrategy = (substrate, nucleophile) => {
  console.log('🔄 ORIENT SN2 BACKSIDE CALLED');
  console.log('🔄 Initial nucleophile rotation:', nucleophile.group.rotation);
  
  nucleophile.group.lookAt(substrate.group.position);
  console.log('🔄 After lookAt nucleophile rotation:', nucleophile.group.rotation);
  
  nucleophile.group.rotateY(Math.PI/2); // Add 90° more rotation to nucleophile
  console.log('🔄 After rotateY nucleophile rotation:', nucleophile.group.rotation);
  
  substrate.group.rotation.set(0, 0, 0);
  substrate.group.rotateY(-Math.PI); // -180° rotation for proper SN2 backside attack
  console.log('🔄 Final substrate rotation:', substrate.group.rotation);
  console.log('🔄 Final nucleophile rotation:', nucleophile.group.rotation);
  
  // Update physics body quaternions to match Three.js rotations
  if ((nucleophile as any).physicsBody) {
    (nucleophile as any).physicsBody.quaternion.set(
      nucleophile.group.quaternion.x,
      nucleophile.group.quaternion.y,
      nucleophile.group.quaternion.z,
      nucleophile.group.quaternion.w
    );
    console.log('🔄 Updated nucleophile physics body quaternion');
  }
  
  if ((substrate as any).physicsBody) {
    (substrate as any).physicsBody.quaternion.set(
      substrate.group.quaternion.x,
      substrate.group.quaternion.y,
      substrate.group.quaternion.z,
      substrate.group.quaternion.w
    );
    console.log('🔄 Updated substrate physics body quaternion');
  }
  
  substrate.rotation.copy(substrate.group.rotation);
  nucleophile.rotation.copy(nucleophile.group.rotation);
  
  console.log('🔄 Copied rotations - substrate:', substrate.rotation, 'nucleophile:', nucleophile.rotation);
};

export const orientSN1: OrientationStrategy = (substrate, nucleophile) => {
  substrate.group.rotation.set(0, 0, 0);
  nucleophile.group.rotation.set(0, 0, 0);
  substrate.rotation.copy(substrate.group.rotation);
  nucleophile.rotation.copy(nucleophile.group.rotation);
};

export const orientE2: OrientationStrategy = (substrate, nucleophile) => {
  substrate.group.rotation.set(0, 0, 0);
  nucleophile.group.rotation.set(0, 0, 0);
  substrate.rotation.copy(substrate.group.rotation);
  nucleophile.rotation.copy(nucleophile.group.rotation);
};

export function getOrientationStrategy(reactionType: string): OrientationStrategy {
  switch (reactionType.toLowerCase()) {
    case 'sn2':
      return orientSN2Backside;
    case 'sn1':
      return orientSN1;
    case 'e2':
      return orientE2;
    default:
      return orientSN1;
  }
}



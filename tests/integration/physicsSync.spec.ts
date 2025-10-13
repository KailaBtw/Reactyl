import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';

const moleculeManager: any = {
  addMolecule: () => {},
  getAllMolecules: () => [],
  getMolecule: () => undefined,
  clearAllMolecules: () => {}
};

describe('Physics quaternion sync after orientation', () => {
  let scene: THREE.Scene;
  let orchestrator: ReactionOrchestrator;

  beforeEach(() => {
    scene = new THREE.Scene();
    orchestrator = new ReactionOrchestrator(scene, moleculeManager);
  });

  it('updates physicsBody quaternions to match Three.js groups', () => {
    const substrateGroup = new THREE.Group();
    const nucleophileGroup = new THREE.Group();
    const substrate: any = { name: 'Sub', group: substrateGroup, velocity: new THREE.Vector3(), physicsBody: { quaternion: new THREE.Quaternion() } };
    const nucleophile: any = { name: 'Nuc', group: nucleophileGroup, velocity: new THREE.Vector3(), physicsBody: { quaternion: new THREE.Quaternion() } };

    // inject state
    (orchestrator as any).state.molecules.substrate = {
      group: substrate.group,
      position: substrate.group.position.clone(),
      rotation: substrate.group.rotation.clone(),
      quaternion: substrate.group.quaternion.clone(),
      velocity: new THREE.Vector3(),
      name: substrate.name,
      cid: 'sub'
    };
    (orchestrator as any).state.molecules.nucleophile = {
      group: nucleophile.group,
      position: nucleophile.group.position.clone(),
      rotation: nucleophile.group.rotation.clone(),
      quaternion: nucleophile.group.quaternion.clone(),
      velocity: new THREE.Vector3(),
      name: nucleophile.name,
      cid: 'nuc'
    };

    // attach physics bodies to MoleculeLike objects the strategy receives
    ((orchestrator as any).state.molecules as any).substrate.physicsBody = substrate.physicsBody;
    ((orchestrator as any).state.molecules as any).nucleophile.physicsBody = nucleophile.physicsBody;

    // perform orientation (SN2 backside)
    (orchestrator as any).orientMoleculesForReaction('sn2');

    // physics body quats should equal group quats
    expect(substrate.physicsBody.quaternion.equals(substrate.group.quaternion)).toBe(true);
    expect(nucleophile.physicsBody.quaternion.equals(nucleophile.group.quaternion)).toBe(true);
  });
});



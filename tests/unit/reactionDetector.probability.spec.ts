import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ReactionDetector } from '../../src/chemistry/reactionDetector';
import { REACTION_TYPES } from '../../src/chemistry/reactionDatabase';

function makeQuatY(rad: number) { return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rad); }

describe('ReactionDetector probability composition', () => {
  it('increases probability with higher energy and better orientation', () => {
    const det = new ReactionDetector();

    const collisionBase = {
      relativeVelocity: new THREE.Vector3(0,0,5),
      collisionEnergy: det.calculateCollisionEnergy(10, 10, 5),
      approachAngle: 180,
      impactPoint: new THREE.Vector3(),
      moleculeOrientations: {
        substrate: makeQuatY(Math.PI),
        nucleophile: new THREE.Quaternion()
      }
    } as any;

    const reactionType = REACTION_TYPES.sn2;
    const sub: any = { name: 'Sub' };
    const nuc: any = { name: 'Nuc' };

    const lowEnergy = { ...collisionBase, collisionEnergy: det.calculateCollisionEnergy(10,10,1) };
    const highEnergy = { ...collisionBase, collisionEnergy: det.calculateCollisionEnergy(10,10,6) };

    const poorOrientation = { ...collisionBase, approachAngle: 90 };
    const goodOrientation = { ...collisionBase, approachAngle: 180 };

    const pLow = det.detectReaction(lowEnergy, reactionType, 298, sub, nuc).probability;
    const pHigh = det.detectReaction(highEnergy, reactionType, 298, sub, nuc).probability;
    expect(pHigh).toBeGreaterThanOrEqual(pLow - 1e-9);

    const pPoor = det.detectReaction(poorOrientation, reactionType, 298, sub, nuc).probability;
    const pGood = det.detectReaction(goodOrientation, reactionType, 298, sub, nuc).probability;
    expect(pGood).toBeGreaterThan(pPoor + 1e-9);
  });
});



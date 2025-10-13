import * as THREE from 'three';
import { describe, it, expect, beforeEach } from 'vitest';
import { orientSN2Backside } from '../../src/reactions/orientationStrategies';

function createMockMolecule(name: string) {
	const group = new THREE.Group();
	group.name = name;
	group.position.set(0, 0, 0);
	group.rotation.set(0, 0, 0);
	group.updateMatrixWorld();

	const molecule: any = {
		name,
		group,
		rotation: group.rotation.clone(),
		quaternion: group.quaternion.clone(),
		physicsBody: {
			quaternion: new THREE.Quaternion()
		}
	};

	return molecule;
}

describe('orientSN2Backside', () => {
	let substrate: any;
	let nucleophile: any;

	beforeEach(() => {
		substrate = createMockMolecule('Substrate');
		nucleophile = createMockMolecule('Nucleophile');
		nucleophile.group.position.set(0, 0, -5);
	});

	it('rotates substrate ~180° around Y and aligns nucleophile', () => {
		const initialSubstrateQuat = substrate.group.quaternion.clone();
		orientSN2Backside(substrate, nucleophile);

		// Substrate: 180° around Y => quaternion should differ from initial
		expect(substrate.group.quaternion.equals(initialSubstrateQuat)).toBe(false);

		// Physics quaternions should match Three.js quaternions
		expect(substrate.physicsBody.quaternion.equals(substrate.group.quaternion)).toBe(true);
		expect(nucleophile.physicsBody.quaternion.equals(nucleophile.group.quaternion)).toBe(true);
	});
});



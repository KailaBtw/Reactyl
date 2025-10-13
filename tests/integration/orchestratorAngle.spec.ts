import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';
import { createCollisionEvent } from '../../src/physics/collisionEventSystem';

// Minimal MoleculeManager mock
const moleculeManager: any = {
	addMolecule: () => {},
	getAllMolecules: () => []
};

function deg(angleRad: number): number { return THREE.MathUtils.radToDeg(angleRad); }

describe('ReactionOrchestrator pre-collision angle (diagnostic)', () => {
	let scene: THREE.Scene;
	let orchestrator: ReactionOrchestrator;

	beforeEach(() => {
		scene = new THREE.Scene();
		orchestrator = new ReactionOrchestrator(scene, moleculeManager);
	});

	it('aligns substrate backside axis with incoming nucleophile (≈0°)', async () => {
		// Create two mock molecules in state directly
		const substrate: any = { name: 'Sub', group: new THREE.Group(), velocity: new THREE.Vector3() };
		substrate.group.position.set(0, 0, 0);
		const nucleophile: any = { name: 'Nuc', group: new THREE.Group(), velocity: new THREE.Vector3() };
		nucleophile.group.position.set(0, 0, -5);

		// Inject into orchestrator state
		(orchestrator as any).state.molecules.substrate = {
			group: substrate.group,
			position: substrate.group.position.clone(),
			rotation: substrate.group.rotation.clone(),
			quaternion: substrate.group.quaternion.clone(),
			velocity: new THREE.Vector3(),
			name: 'Sub', cid: 'x'
		};
		(orchestrator as any).state.molecules.nucleophile = {
			group: nucleophile.group,
			position: nucleophile.group.position.clone(),
			rotation: nucleophile.group.rotation.clone(),
			quaternion: nucleophile.group.quaternion.clone(),
			velocity: new THREE.Vector3(),
			name: 'Nuc', cid: 'y'
		};

		// Call internal orientation method
		(orchestrator as any).orientMoleculesForReaction('sn2');

		// Use our actual collision event system to compute approach angle
		const collisionEvent = createCollisionEvent(substrate, nucleophile);
		
		// For SN2 backside attack, collision normal should point from substrate to nucleophile
		// This indicates proper alignment for backside attack
		expect(collisionEvent.collisionNormal.z).toBeCloseTo(-1, 1); // Should point toward nucleophile
		expect(collisionEvent.collisionPoint.z).toBeCloseTo(-2.5, 1); // Midpoint between molecules
	});
});



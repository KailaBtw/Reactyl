import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ReactionOrchestrator } from '../../src/systems/ReactionOrchestrator';
import { collisionEventSystem } from '../../src/physics/collisionEventSystem';

// Minimal MoleculeManager mock
const moleculeStore: Record<string, any> = {};
const moleculeManager: any = {
    addMolecule: vi.fn((name: string, mol: any) => { moleculeStore[name] = mol; }),
    getAllMolecules: vi.fn().mockReturnValue([]),
    getMolecule: vi.fn((name: string) => moleculeStore[name])
};

describe('ReactionOrchestrator physics pause on reaction', () => {
	let scene: THREE.Scene;
	let orchestrator: ReactionOrchestrator;

	beforeEach(() => {
		scene = new THREE.Scene();
		orchestrator = new ReactionOrchestrator(scene, moleculeManager);
	});

	it('pauses physics when reaction occurs', async () => {
		// Arrange: ensure running
		orchestrator.getPhysicsEngine().resume();
		expect(orchestrator.getPhysicsEngine().isSimulationPaused()).toBe(false);

		// Act: emit a synthetic reaction event
		const substrate: any = { name: 'Sub', group: new THREE.Group(), velocity: new THREE.Vector3() };
		const nucleophile: any = { name: 'Nuc', group: new THREE.Group(), velocity: new THREE.Vector3() };
		const event: any = {
			type: 'reaction',
			reactionType: 'sn2',
			moleculeA: substrate,
			moleculeB: nucleophile,
			reactionResult: { occurs: true, probability: 1, reactionType: { key: 'sn2' }, substrate, nucleophile },
			collisionData: { approachAngle: 180 }
		};
		collisionEventSystem.emitCollision(event as any);

		// Give orchestrator time to handle (emit is sync but handler may delay)
		await new Promise(r => setTimeout(r, 10));

		// Assert paused
		expect(orchestrator.getPhysicsEngine().isSimulationPaused()).toBe(true);
	});
});



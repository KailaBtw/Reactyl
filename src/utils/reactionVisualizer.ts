import * as THREE from 'three';
import { MoleculeGroup, ReactionStep } from '../types';
import { log } from './debug';

export class ReactionVisualizer {
  private currentStep: number = 0;
  private reactionSteps: ReactionStep[] = [];
  private isPlaying: boolean = false;
  private scene: THREE.Scene;
  private animationId?: number;
  private reactionMeshes: THREE.Mesh[] = [];
  private energyProfileLine?: THREE.Line;
  private transitionStateMesh?: THREE.Mesh;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    log('ReactionVisualizer initialized');
  }

  /**
   * Generate SN2 reaction steps
   */
  generateSN2Reaction(
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup,
    leavingGroupIndex: number = 0
  ): ReactionStep[] {
    const steps: ReactionStep[] = [];
    const numSteps = 60; // frames for animation
    
    log(`Generating SN2 reaction animation with ${numSteps} steps`);
    
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      
      const step: ReactionStep = {
        time: t,
        bondChanges: {
          breaking: [{
            atoms: [0, leavingGroupIndex], // Central carbon to leaving group
            strength: 1 - t // bond weakens
          }],
          forming: [{
            atoms: [0, 1], // Central carbon to nucleophile
            strength: t // bond strengthens
          }]
        },
        atomPositions: this.interpolateSN2Positions(t, substrate, nucleophile),
        energy: this.calculateEnergyProfile(t)
      };
      
      steps.push(step);
    }
    
    this.reactionSteps = steps;
    return steps;
  }
  
  /**
   * Interpolate atom positions for SN2 reaction
   */
  private interpolateSN2Positions(
    t: number,
    substrate: MoleculeGroup,
    nucleophile: MoleculeGroup
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    
    // Nucleophile approaches from back (180° attack)
    const approachDistance = 4.0 * (1 - t);
    const nucPosition = new THREE.Vector3(-approachDistance, 0, 0);
    
    // Leaving group departs
    const departDistance = 4.0 * t;
    const lgPosition = new THREE.Vector3(departDistance, 0, 0);
    
    // Central carbon remains mostly stationary
    const carbonPosition = new THREE.Vector3(0, 0, 0);
    
    // Other substituents undergo Walden inversion
    // (umbrella flip at transition state around t=0.5)
    const inversionAngle = t * Math.PI;
    const substituentDistance = 1.5;
    
    // Add substituents with inversion
    const sub1Position = new THREE.Vector3(
      0,
      Math.sin(inversionAngle) * substituentDistance,
      Math.cos(inversionAngle) * substituentDistance
    );
    
    const sub2Position = new THREE.Vector3(
      0,
      -Math.sin(inversionAngle) * substituentDistance,
      -Math.cos(inversionAngle) * substituentDistance
    );
    
    return [carbonPosition, nucPosition, lgPosition, sub1Position, sub2Position];
  }
  
  /**
   * Calculate energy profile for reaction
   */
  private calculateEnergyProfile(t: number): number {
    // Gaussian energy barrier with transition state at t=0.5
    const barrier = 80; // kJ/mol
    const transitionStateTime = 0.5;
    const width = 0.2;
    
    const energy = barrier * Math.exp(-((t - transitionStateTime) ** 2) / (2 * width ** 2));
    
    return energy;
  }
  
  /**
   * Visualize bond changes
   */
  private visualizeBond(
    atom1: THREE.Vector3,
    atom2: THREE.Vector3,
    strength: number,
    color: number = 0xffffff
  ): THREE.Line {
    const material = new THREE.LineBasicMaterial({
      color: color,
      opacity: strength,
      transparent: true,
      linewidth: 2 * strength
    });
    
    const geometry = new THREE.BufferGeometry().setFromPoints([atom1, atom2]);
    const bond = new THREE.Line(geometry, material);
    
    return bond;
  }
  
  /**
   * Create transition state visualization
   */
  private createTransitionStateVisualization(step: ReactionStep): void {
    // Remove existing transition state
    if (this.transitionStateMesh) {
      this.scene.remove(this.transitionStateMesh);
    }
    
    // Create pentacoordinate transition state for SN2
    if (step.time > 0.4 && step.time < 0.6) {
      const geometry = new THREE.SphereGeometry(0.3, 8, 6);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff6b6b,
        opacity: 0.7,
        transparent: true
      });
      
      this.transitionStateMesh = new THREE.Mesh(geometry, material);
      this.transitionStateMesh.position.set(0, 0, 0); // Central carbon position
      
      this.scene.add(this.transitionStateMesh);
    }
  }
  
  /**
   * Create energy profile visualization
   */
  private createEnergyProfileVisualization(): void {
    if (this.energyProfileLine) {
      this.scene.remove(this.energyProfileLine);
    }
    
    const points: THREE.Vector3[] = [];
    const maxEnergy = 80;
    
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const energy = this.calculateEnergyProfile(t);
      const x = (t - 0.5) * 10; // Center around 0
      const y = energy / maxEnergy * 5; // Scale energy
      
      points.push(new THREE.Vector3(x, y, 0));
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff6b6b,
      linewidth: 3
    });
    
    this.energyProfileLine = new THREE.Line(geometry, material);
    this.energyProfileLine.position.set(0, -8, 0); // Position below molecules
    
    this.scene.add(this.energyProfileLine);
  }
  
  /**
   * Play reaction animation
   */
  play(): void {
    if (this.reactionSteps.length === 0) {
      log('No reaction steps to play');
      return;
    }
    
    this.isPlaying = true;
    this.currentStep = 0;
    this.createEnergyProfileVisualization();
    this.animateReaction();
    
    log('Starting reaction animation');
  }
  
  /**
   * Pause reaction animation
   */
  pause(): void {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    log('Reaction animation paused');
  }
  
  /**
   * Stop and reset reaction animation
   */
  stop(): void {
    this.pause();
    this.currentStep = 0;
    this.clearVisualization();
    
    log('Reaction animation stopped and reset');
  }
  
  /**
   * Animate reaction step by step
   */
  private animateReaction(): void {
    if (!this.isPlaying || this.reactionSteps.length === 0) return;
    
    const step = this.reactionSteps[this.currentStep];
    this.updateMolecularDisplay(step);
    
    // Move to next step
    this.currentStep = (this.currentStep + 1) % this.reactionSteps.length;
    
    // Continue animation
    this.animationId = requestAnimationFrame(() => this.animateReaction());
  }
  
  /**
   * Update molecular display based on reaction step
   */
  private updateMolecularDisplay(step: ReactionStep): void {
    // Clear previous visualization
    this.clearReactionMeshes();
    
    // Create atoms
    this.createAtomVisualization(step.atomPositions);
    
    // Create bonds
    this.createBondVisualization(step);
    
    // Create transition state
    this.createTransitionStateVisualization(step);
    
    // Update energy profile
    this.updateEnergyProfile(step);
  }
  
  /**
   * Create atom visualization
   */
  private createAtomVisualization(positions: THREE.Vector3[]): void {
    const atomColors = [0x404040, 0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4]; // C, Nu, LG, Sub1, Sub2
    const atomSizes = [0.4, 0.3, 0.3, 0.2, 0.2];
    
    positions.forEach((position, index) => {
      const geometry = new THREE.SphereGeometry(atomSizes[index], 16, 12);
      const material = new THREE.MeshBasicMaterial({
        color: atomColors[index],
        opacity: 0.9,
        transparent: true
      });
      
      const atomMesh = new THREE.Mesh(geometry, material);
      atomMesh.position.copy(position);
      
      this.reactionMeshes.push(atomMesh);
      this.scene.add(atomMesh);
    });
  }
  
  /**
   * Create bond visualization
   */
  private createBondVisualization(step: ReactionStep): void {
    const positions = step.atomPositions;
    
    // Breaking bond (red, fading)
    step.bondChanges.breaking.forEach(bond => {
      const [atom1Index, atom2Index] = bond.atoms;
      if (positions[atom1Index] && positions[atom2Index]) {
        const bondLine = this.visualizeBond(
          positions[atom1Index],
          positions[atom2Index],
          bond.strength,
          0xff4444 // Red for breaking
        );
        this.reactionMeshes.push(bondLine as any);
        this.scene.add(bondLine);
      }
    });
    
    // Forming bond (green, strengthening)
    step.bondChanges.forming.forEach(bond => {
      const [atom1Index, atom2Index] = bond.atoms;
      if (positions[atom1Index] && positions[atom2Index]) {
        const bondLine = this.visualizeBond(
          positions[atom1Index],
          positions[atom2Index],
          bond.strength,
          0x44ff44 // Green for forming
        );
        this.reactionMeshes.push(bondLine as any);
        this.scene.add(bondLine);
      }
    });
  }
  
  /**
   * Update energy profile visualization
   */
  private updateEnergyProfile(step: ReactionStep): void {
    if (!this.energyProfileLine) return;
    
    // Highlight current energy point
    const currentEnergy = step.energy;
    const maxEnergy = 80;
    const y = currentEnergy / maxEnergy * 5;
    
    // Create energy indicator
    const indicatorGeometry = new THREE.SphereGeometry(0.1, 8, 6);
    const indicatorMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      opacity: 0.8,
      transparent: true
    });
    
    const energyIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    energyIndicator.position.set(0, y - 8, 0);
    
    this.reactionMeshes.push(energyIndicator);
    this.scene.add(energyIndicator);
  }
  
  /**
   * Clear reaction meshes
   */
  private clearReactionMeshes(): void {
    this.reactionMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    this.reactionMeshes = [];
  }
  
  /**
   * Clear all visualization
   */
  private clearVisualization(): void {
    this.clearReactionMeshes();
    
    if (this.transitionStateMesh) {
      this.scene.remove(this.transitionStateMesh);
      this.transitionStateMesh = undefined;
    }
    
    if (this.energyProfileLine) {
      this.scene.remove(this.energyProfileLine);
      this.energyProfileLine = undefined;
    }
  }
  
  /**
   * Get current reaction progress
   */
  getProgress(): number {
    if (this.reactionSteps.length === 0) return 0;
    return this.currentStep / this.reactionSteps.length;
  }
  
  /**
   * Set reaction progress
   */
  setProgress(progress: number): void {
    if (this.reactionSteps.length === 0) return;
    
    const stepIndex = Math.floor(progress * this.reactionSteps.length);
    this.currentStep = Math.max(0, Math.min(stepIndex, this.reactionSteps.length - 1));
    
    if (this.reactionSteps[this.currentStep]) {
      this.updateMolecularDisplay(this.reactionSteps[this.currentStep]);
    }
  }
  
  /**
   * Get reaction statistics
   */
  getReactionStats(): {
    totalSteps: number;
    currentStep: number;
    progress: number;
    isPlaying: boolean;
    currentEnergy: number;
  } {
    const currentStep = this.reactionSteps[this.currentStep];
    return {
      totalSteps: this.reactionSteps.length,
      currentStep: this.currentStep,
      progress: this.getProgress(),
      isPlaying: this.isPlaying,
      currentEnergy: currentStep ? currentStep.energy : 0
    };
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.clearVisualization();
    log('ReactionVisualizer disposed');
  }
}

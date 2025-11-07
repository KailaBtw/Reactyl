import * as THREE from 'three';

/**
 * Manages the visual representation of container bounds for rate simulations
 * Creates and manages a transparent wireframe box to show the container boundaries
 */
export class ContainerVisualization {
  private scene: THREE.Scene;
  private visualization: THREE.Group | null = null;
  private size: number;
  private color: number;
  private wireframeOpacity: number;
  private fillOpacity: number;

  constructor(
    scene: THREE.Scene,
    size: number = 50,
    color: number = 0x00aaff,
    wireframeOpacity: number = 0.6,
    fillOpacity: number = 0.05
  ) {
    this.scene = scene;
    this.size = size;
    this.color = color;
    this.wireframeOpacity = wireframeOpacity;
    this.fillOpacity = fillOpacity;
  }

  /**
   * Create and add the container visualization to the scene
   */
  create(): void {
    // Remove existing visualization if any
    this.remove();

    const size = this.size;
    const group = new THREE.Group();

    // Create wireframe edges using EdgesGeometry
    const geometry = new THREE.BoxGeometry(size, size, size);
    const edges = new THREE.EdgesGeometry(geometry);

    // Create material for wireframe (semi-transparent, colored)
    const material = new THREE.LineBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: this.wireframeOpacity,
      linewidth: 2
    });

    // Create line segments for the edges
    const wireframe = new THREE.LineSegments(edges, material);
    group.add(wireframe);

    // Also add a transparent box for better visibility
    const boxGeometry = new THREE.BoxGeometry(size, size, size);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: this.fillOpacity,
      side: THREE.DoubleSide,
      wireframe: false
    });
    const transparentBox = new THREE.Mesh(boxGeometry, boxMaterial);
    group.add(transparentBox);

    // Position at center (0, 0, 0)
    group.position.set(0, 0, 0);

    // Add to scene
    this.scene.add(group);
    this.visualization = group;
  }

  /**
   * Remove container visualization from scene and dispose of resources
   */
  remove(): void {
    if (this.visualization) {
      this.scene.remove(this.visualization);
      // Dispose of geometries and materials
      this.visualization.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      this.visualization = null;
    }
  }

  /**
   * Update the container size and recreate visualization
   */
  setSize(size: number): void {
    this.size = size;
    if (this.visualization) {
      this.create();
    }
  }

  /**
   * Check if visualization exists
   */
  exists(): boolean {
    return this.visualization !== null;
  }
}


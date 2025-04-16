
import * as THREE from "three";

export const DEBUG_MODE = true; // Set to false to disable debug logs
const light = new THREE.PointLight(0xffffff, 1, 100);

export function log(...messages) {
    if (DEBUG_MODE) {
      console.log("[DEBUG]: ", ...messages);
    }
  }

export function addLightingDebug(scene, spotLightHelper, directionalLightHelper) {
    const SHAPE_DEBUG = false;
    const SHADOW_DEBUG = false;
    const GROUND_DEBUG = false;
    const SPOTLIGHT_DEBUG = false;
    const DIRECTIONAL_LIGHT_DEBUG = true;
  
    if (SHAPE_DEBUG) {
      // Create a basic shape (cube)
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green material
      const cube = new THREE.Mesh(geometry, material);
      cube.castShadow = true; // Cube casts shadows
      scene.add(cube);
    }
    if(SHADOW_DEBUG) {
      const shadowHelper = new THREE.CameraHelper(this.light.shadow.camera);
      this.scene.add(shadowHelper);
  
      // Add a point light with shadows
      light.position.set(0, 0, 0);
      light.castShadow = true;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 100;
      scene.add(light);
    }
    if (SPOTLIGHT_DEBUG) {
      scene.add(spotLightHelper);
    }
    if (GROUND_DEBUG) {
      const groundGeometry = new THREE.PlaneGeometry(500, 500);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
      });
      // ground plane
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1;
      ground.receiveShadow = true;
      scene.add(ground);
    }
    if(DIRECTIONAL_LIGHT_DEBUG) {
      //Add a DirectionalLightHelper to visualize the light's direction
      scene.add(directionalLightHelper);
    }
  }
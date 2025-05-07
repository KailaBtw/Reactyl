
import * as THREE from "three";

export const DEBUG_MODE = true; // Set to false to disable debug log messages
export const LIGHTING_DEBUG = false;
const OBJECT_DEBUG = false;

const light = new THREE.PointLight(0xffffff, 1, 100);

/**
 * Call this method to log information about the program
 * Prints to console.log()
 * 
 * TODO: Save to a shared log files parameter. 
 * 
 * @param  {...any} messages 
 * @returns 
 */
export function log(...messages) {
    if (!DEBUG_MODE) return;

    console.log("[DEBUG]: ", ...messages);
  }

  /**
   * 
   * @param {*} scene 
   * @returns 
   */
export function addObjectDebug(scene) {
        const GROUND_DEBUG = false;
        const SHAPE_DEBUG = true;

        if(!OBJECT_DEBUG) return;

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
      // Create a basic shape (cube)
      if(SHAPE_DEBUG) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green material
        const cube = new THREE.Mesh(geometry, material);
        cube.castShadow = true; // Cube casts shadows
        scene.add(cube);
      }
}

/**
 * 
 * @param {*} scene 
 * @param {*} spotLightHelper 
 * @param {*} directionalLightHelper 
 * @returns 
 */
export function addLightingDebug(scene, spotLightHelper, directionalLightHelper) {
    const SHADOW_DEBUG = false;
    const SPOTLIGHT_DEBUG = true;
    const DIRECTIONAL_LIGHT_DEBUG = false;

    if(!LIGHTING_DEBUG) return;
    
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
    if(DIRECTIONAL_LIGHT_DEBUG) {
      //Add a DirectionalLightHelper to visualize the light's direction
      scene.add(directionalLightHelper);
    }
  }
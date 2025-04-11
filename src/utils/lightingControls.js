import * as THREE from "three";

export { LightingControls };

const LIGHTING_DEBUG = false; // Set to false to disable lighting debug
const light = new THREE.PointLight(0xffffff, 1, 100);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
const spotLight = new THREE.SpotLight(0xffffff, 30);
const spotLightHelper = new THREE.SpotLightHelper(spotLight);

class LightingControls {

  constructor(scene, center, camera) {
    this.scene = scene;
    this.center = center;
    this.camera = camera;
  }

  applyLighting() {
    if (false && LIGHTING_DEBUG) {
        // Create a basic shape (cube)
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green material
        const cube = new THREE.Mesh(geometry, material);
        cube.castShadow = true; // Cube casts shadows
        this.scene.add(cube);
      }

    // Add a point light with shadows
    if (LIGHTING_DEBUG) {
      light.position.set(this.center.x, this.center.y + 15, this.center.z);
      light.castShadow = true;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 100;
      this.scene.add(this.light);

    //   const shadowHelper = new THREE.CameraHelper(this.light.shadow.camera);
    //   this.scene.add(shadowHelper);
       this.scene.add(spotLightHelper);
    }

    spotLight.position.set(3, 5, 3);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 500;
    spotLight.shadow.camera.far = 4000;
    spotLight.shadow.camera.fov = 30;
    this.scene.add(spotLight);
    this.scene.add(ambientLight);
    // move to new spot light position
    spotLightHelper.update();

    if (this.LIGHTING_DEBUG) {
    //   const groundGeometry = new THREE.PlaneGeometry(500, 500);
    //   const groundMaterial = new THREE.MeshStandardMaterial({
    //     color: 0x555555,
    //   });
    //   // ground plane
    //   const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    //   ground.rotation.x = -Math.PI / 2;
    //   ground.position.y = -1;
    //   ground.receiveShadow = true;
    //   scene.add(ground);
    }
  }

  updateSpotlightPosition() {
    spotLight.position.copy(this.camera.position);
    spotLight.position.y += 1;
  
    const targetPosition = new THREE.Vector3();
    this.camera.getWorldDirection(targetPosition); // Get the direction the camera is facing
    targetPosition.multiplyScalar(1); // Adjust the distance in front of the camera
    targetPosition.add(this.camera.position); // Add the camera's position to get the world point
  
    spotLight.lookAt(targetPosition);
  
    if (LIGHTING_DEBUG) {
      spotLightHelper.update();
    }
  }
}

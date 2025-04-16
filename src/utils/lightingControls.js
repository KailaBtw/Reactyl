import * as THREE from "three";

export { applyLighting, updateSpotlightPosition };

const LIGHTING_DEBUG = true; // Set to false to disable lighting debug

const light = new THREE.PointLight(0xffffff, 1, 100);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
const spotLight = new THREE.SpotLight(0xffffff, 50);
const spotLightHelper = new THREE.SpotLightHelper(spotLight);

// Define the offset from the camera
const spotlightOffset = new THREE.Vector3(2, 4, -4); // Right, Up, Behind (relative to camera's forward)

function applyLighting(scene) {
    if (false && LIGHTING_DEBUG) {
      // Create a basic shape (cube)
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green material
      const cube = new THREE.Mesh(geometry, material);
      cube.castShadow = true; // Cube casts shadows
      scene.add(cube);
    }

  // Add a point light with shadows
  if (LIGHTING_DEBUG) {
    light.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 100;
    scene.add(light);

  //   const shadowHelper = new THREE.CameraHelper(this.light.shadow.camera);
  //   this.scene.add(shadowHelper);
    scene.add(spotLightHelper);
  }

  spotLight.position.set(3, 8, 3);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 500;
  spotLight.shadow.camera.far = 4000;
  spotLight.shadow.camera.fov = 30;
  scene.add(spotLight);
  scene.add(ambientLight);
  // move to new spot light position
  spotLightHelper.update();

  if (false && this.LIGHTING_DEBUG) {
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
}
function updateSpotlightPosition(camera, scene) {
  const cameraWorldPosition = new THREE.Vector3();
  cameraWorldPosition.copy(camera.position);

  const cameraRotation = new THREE.Quaternion();
  cameraRotation.copy(camera.quaternion);

  const localOffset = spotlightOffset.clone();
  const worldOffset = localOffset.applyQuaternion(cameraRotation);
  const spotlightWorldPosition = new THREE.Vector3();
  spotlightWorldPosition.addVectors(cameraWorldPosition, worldOffset);
  spotLight.position.copy(spotlightWorldPosition);  // set spotlight position

  // fix this to allow the spotlight to focus on a point in front of the camera instead of scene center 
  // // Calculate the target point in front of the camera
  // const targetPosition = new THREE.Vector3();
  // camera.getWorldDirection(targetPosition); // Get the direction the camera is facing
  // targetPosition.normalize(); // Ensure it's a unit vector

  // const lookAtDistance = 10; // Adjust this value
  // targetPosition.multiplyScalar(lookAtDistance);

  // const lookAtWorldPosition = new THREE.Vector3();
  // lookAtWorldPosition.addVectors(cameraWorldPosition, targetPosition);

  // // Make the spotlight look at this calculated point
  // console.log("lookAtWorldPosition:", lookAtWorldPosition);
  // spotLight.lookAt(lookAtWorldPosition); // set spotlight to look at target
  // spotLight.updateWorldMatrix(true, false); // Ensure world matrix is updated
  // const targetWorldPosition = new THREE.Vector3();
  // spotLight.target.getWorldPosition(targetWorldPosition);
  // console.log("spotLight.target.worldPosition:", targetWorldPosition);

  if (LIGHTING_DEBUG) {
      spotLightHelper.update();
  }
}

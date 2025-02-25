/**
 * 
 */

// create canvas element
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

// Create the scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Set up the renderer
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
//document.body.appendChild( renderer.domElement );

/**
 * Initialize the MolMod scene when page is opened
 */
function init() {
  // Create a rudamentry shape (from three.js tutorial)
  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  const cube = new THREE.Mesh( geometry, material );
  scene.add( cube );

  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);
}

/**
 * animate - called each time the scene is updated
 */
function animate() {
  requestAnimationFrame(animate);
  // cube.rotation.x += 0.01;  // broken now
  // cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}
// initialize the program
init();
// start animation loop
animate();

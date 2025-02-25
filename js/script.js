/**
 *
 */

// create canvas element
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

// Create the scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.SphereGeometry( .1, 32, 32 );
const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );

function drawMolecule(molFile){
    const molObject = molFileToJSON(molFile);
    
    for(let item of molObject.atoms){
        const sphere = new THREE.Mesh( geometry, material );
        sphere.position.x = item.position.x;
        sphere.position.y = item.position.y;
        sphere.position.z = item.position.z;
        scene.add( sphere );
    }
}

/**
 * Initialize the MolMod scene when page is opened
 */
function init(CSID) {

  // Clear the scene when the init function is called:
  while(scene.children.length > 0){ 
    scene.remove(scene.children[0]); 
  }

  fetch('molecules/' + CSID + '.mol')
  .then(response => response.text())
  .then(molFile => {
      drawMolecule(molFile);
  });

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
const defaultCSID = 2424;
init(defaultCSID);
// start animation loop
animate();

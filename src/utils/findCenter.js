import * as THREE from "three";

export function findCenter(molObject) {
    //Get the first point in the molecule:  
  let firstPoint = new THREE.Vector3(
    molObject.atoms[0].position.x, 
    molObject.atoms[0].position.y, 
    molObject.atoms[0].position.z);
  //Set the initial limits to the first point:
  let limits = {
    x: {
        min: firstPoint.x,
        max: firstPoint.x
    },
    y: {
        min: firstPoint.y,
        max: firstPoint.y
    },
    z: {
        min: firstPoint.z,
        max: firstPoint.z
    }
  }
  for(let item of molObject.atoms){
    let point = new THREE.Vector3(
        item.position.x, 
        item.position.y, 
        item.position.z);
  
    if(Number(point.x) < Number(limits.x.min)){
        limits.x.min = point.x;
    }
    if(Number(point.x) > Number(limits.x.max)){
        limits.x.max = point.x;
    }
    if(Number(point.y) < Number(limits.y.min)){
        limits.y.min = point.y;
    }
    if(Number(point.y) > Number(limits.y.max)){
        limits.y.max = point.y;
    }
    if(Number(point.z) < Number(limits.z.min)){
        limits.z.min = point.z;
    }
    if(Number(point.z) > Number(limits.z.max)){
        limits.z.max = point.z;
    }
  }
  let moleculeCenter = new THREE.Vector3(
    (Number((limits.x.min)) + Number(limits.x.max))/2,
    (Number((limits.y.min)) + Number(limits.y.max))/2,
    (Number((limits.z.min)) + Number(limits.z.max))/2);
  
  return moleculeCenter;
  }
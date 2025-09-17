// src/createSphere.js
import * as THREE from 'three';

export function createSphere(clipPlanes, callback, position = new THREE.Vector3()) {
  const textureLoader = new THREE.TextureLoader();

  textureLoader.load('/textures/hdr_high.png', (texture) => {
    console.log('Texture loaded successfully!');

    texture.flipY = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      clippingPlanes: clipPlanes
    });

    const sphere = new THREE.Mesh(geometry, material);

    sphere.scale.set(0.5, 0.5, 0.5);
    sphere.rotation.y = Math.PI / 4;

    // Apply the initial local offset (relative to the anchor when added)
    sphere.position.copy(position);

    if (callback) callback(sphere);
  });
}

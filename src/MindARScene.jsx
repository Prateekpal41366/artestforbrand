// src/MindARScene.jsx
import React, { useEffect } from 'react';
import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { createSphere } from './createSphere.js';

const MindARScene = () => {
  useEffect(() => {
    let sphere = null;
    let anchor = null;
    let initialized = false;

    const mindarThree = new MindARThree({
      container: document.body,
      imageTargetSrc: '/targets.mind',
    });
    const { renderer, scene, camera } = mindarThree;

    // clipping planes (same as before)
    const sphereRadius = 350;
    const clipPlanes = [
      new THREE.Plane(new THREE.Vector3( 2, 0, 0), sphereRadius),
      new THREE.Plane(new THREE.Vector3(-2, 0, 0), sphereRadius),
      new THREE.Plane(new THREE.Vector3( 0, 1, 0), sphereRadius),
      new THREE.Plane(new THREE.Vector3( 0,-1, 0), sphereRadius),
    ];
    renderer.localClippingEnabled = true;
    clipPlanes.forEach(p => scene.add(new THREE.PlaneHelper(p, 3, 0xff0000)));

    // --- OFFSET you can change this to move the sphere relative to the anchor ---
    // (x right, y up, z forward). Positive z moves the sphere *toward* camera when anchor faces camera.
    const offset = new THREE.Vector3(0, 0, 100); // change this to move the portal
    // -------------------------------------------------------------------------

    // smoothing buffers
    const smoothingFactor = 0.12; // 0 = no follow, 1 = instant follow
    const smoothedWorldPos = new THREE.Vector3();
    const smoothedWorldQuat = new THREE.Quaternion();

    // create sphere (createSphere will set its local position to the passed offset)
    createSphere(clipPlanes, (createdSphere) => {
      sphere = createdSphere;
      anchor = mindarThree.addAnchor(0);

      // Ensure the sphere has the local offset when added as child
      // (createSphere already copies the passed position; this is safe/redundant)
      sphere.position.copy(offset);

      anchor.group.add(sphere);
    }, offset); // pass offset so createSphere can set initial local position

    async function start() {
      await mindarThree.start();

      renderer.setAnimationLoop(() => {
        // If sphere/anchor not ready, just render
        if (!sphere || !anchor) {
          renderer.render(scene, camera);
          return;
        }

        if (sphere.parent && sphere.parent.visible) {
          // 1) get anchor's world position & quaternion
          const parentWorldPos = new THREE.Vector3();
          const parentWorldQuat = new THREE.Quaternion();
          anchor.group.getWorldPosition(parentWorldPos);
          anchor.group.getWorldQuaternion(parentWorldQuat);

          // 2) rotate offset by anchor orientation to place offset in world space
          const rotatedOffset = offset.clone().applyQuaternion(parentWorldQuat);

          // 3) desired world position for the sphere = anchorWorld + rotatedOffset
          const desiredWorldPos = parentWorldPos.clone().add(rotatedOffset);

          // initialize smoothing buffers on the first frame
          if (!initialized) {
            smoothedWorldPos.copy(desiredWorldPos);
            smoothedWorldQuat.copy(parentWorldQuat);
            initialized = true;
          } else {
            // smooth in world space
            smoothedWorldPos.lerp(desiredWorldPos, smoothingFactor);
            smoothedWorldQuat.slerp(parentWorldQuat, smoothingFactor);
          }

          // 4) convert smoothed world position into anchor's local coordinates and set the sphere's local position
          const localPos = anchor.group.worldToLocal(smoothedWorldPos.clone());
          sphere.position.copy(localPos);

          // 5) set sphere local quaternion so its world quaternion equals smoothedWorldQuat
          //    worldQuat = parentWorldQuat * localQuat  => localQuat = parentWorldQuat^-1 * worldQuat
          const invParentQuat = parentWorldQuat.clone().invert();
          const localQuat = invParentQuat.multiply(smoothedWorldQuat);
          sphere.quaternion.copy(localQuat);
        }

        renderer.render(scene, camera);
      });
    }

    start();

    return () => {
      mindarThree.stop();
      renderer.setAnimationLoop(null);
    };
  }, []);

  return <div className="container"></div>;
};

export default MindARScene;

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Fixed camera at the centre of the cylinder. Mouse movement is handled by
 * the independent reactive backdrop and does not alter the framing.
 */
export function CameraRig(): null {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const targetPos = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, dt) => {
    // The camera stays fixed at the cylinder centre. Pointer movement is
    // reserved for hover/click interactions and never changes the framing.
    targetPos.current.set(0, 0, 0);
    camera.position.lerp(targetPos.current, Math.min(1, dt * 2.5));
    camera.lookAt(0, 0, -25.5);
  });

  return null;
}

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Fixed camera at the centre of the cylinder. Mouse movement is handled by
 * the independent reactive backdrop and does not alter the framing.
 */
export function CameraRig(): null {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const viewport = useThree((s) => s.size);

  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  // Track the last applied lookAt target so the matrix is rebuilt only when
  // the breakpoint changes, not every frame.
  const lastLookAtZRef = useRef<number | null>(null);

  useFrame((_, dt) => {
    targetPos.current.set(0, 0, 0);
    const targetZ = viewport.width <= 720 ? -36 : -25.5;
    const positionSettled =
      camera.position.distanceToSquared(targetPos.current) <= 1e-6;

    if (positionSettled && lastLookAtZRef.current === targetZ) {
      return;
    }

    if (!positionSettled) {
      camera.position.lerp(targetPos.current, Math.min(1, dt * 2.5));
    }
    camera.lookAt(0, 0, targetZ);
    lastLookAtZRef.current = targetZ;
  });

  return null;
}

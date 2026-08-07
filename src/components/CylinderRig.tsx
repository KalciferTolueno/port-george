import { createContext, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CylinderRigProps {
  children: ReactNode;
  introReady: boolean;
  paused: boolean;
}

interface CylinderIntroContextValue {
  progress: MutableRefObject<number>;
  rotation: MutableRefObject<number>;
}

export const CylinderIntroContext = createContext<CylinderIntroContextValue | null>(null);

const INTRO_DURATION = 2.4;
const FINAL_ROTATION_SPEED = 0.16;
export const cylinderRotationState = { current: 0 };
const cylinderIntroState = { progress: 0, finished: false };

/** Rotates the cylinder continuously and lets the wheel steer it. */
export function CylinderRig({ children, introReady, paused }: CylinderRigProps): JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const rotation = useRef(cylinderRotationState.current);
  const targetRotation = useRef(cylinderRotationState.current);
  const lastInteraction = useRef(0);
  const introStartedAt = useRef<number | null>(null);
  const introFinished = useRef(cylinderIntroState.finished);
  const introProgress = useRef(cylinderIntroState.progress);
  const pausedAt = useRef<number | null>(null);
  const introContext = useMemo(() => ({ progress: introProgress, rotation }), []);

  useEffect(() => {
    const onWheel = (event: WheelEvent): void => {
      targetRotation.current += event.deltaY * 0.0012;
      lastInteraction.current = performance.now();
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  useFrame((_, rawDt) => {
    const group = groupRef.current;
    if (!group) return;

    if (paused) {
      if (pausedAt.current === null) pausedAt.current = performance.now();
      return;
    }

    if (pausedAt.current !== null) {
      const pauseDuration = performance.now() - pausedAt.current;
      if (introStartedAt.current !== null) introStartedAt.current += pauseDuration;
      lastInteraction.current += pauseDuration;
      pausedAt.current = null;
    }

    const dt = Math.min(0.05, rawDt);

    if (introFinished.current) group.rotation.y = rotation.current;

    if (!introReady) {
      if (cylinderIntroState.finished) {
        group.rotation.y = cylinderRotationState.current;
        return;
      }
      introStartedAt.current = null;
      introFinished.current = false;
      rotation.current = 0;
      targetRotation.current = 0;
      cylinderRotationState.current = 0;
      cylinderIntroState.progress = 0;
      cylinderIntroState.finished = false;
      group.rotation.y = 0;
      introProgress.current = 0;
      return;
    }

    // Cinematic entrance: cards begin at the centre (PhotoNode starts with
    // scale 0) while the parent performs three fast, easing-out turns. As
    // each card damps toward its grid slot, the result is a radial expansion.
    if (!introFinished.current) {
      if (introStartedAt.current === null) introStartedAt.current = performance.now();
      const elapsed = (performance.now() - introStartedAt.current) / 1000;
      const progress = THREE.MathUtils.clamp(elapsed / INTRO_DURATION, 0, 1);
      introProgress.current = progress;
      cylinderIntroState.progress = progress;
      // Rotate the whole cylinder from the first frame. The quadratic ramp
      // starts gently and reaches the normal idle speed at the exact moment
      // the pulse ends, so there is no visible pause between animations.
      rotation.current = FINAL_ROTATION_SPEED * INTRO_DURATION * (progress ** 2) / 2;
      cylinderRotationState.current = rotation.current;
      group.rotation.y = rotation.current;

      if (progress >= 1) {
        introFinished.current = true;
        introProgress.current = 1;
        cylinderIntroState.progress = 1;
        cylinderIntroState.finished = true;
        targetRotation.current = 0;
      }
      if (!introFinished.current) return;
    }

    const idle = (performance.now() - lastInteraction.current) > 900;
    if (idle) {
      // Continue directly from the entrance motion. Do not damp the first
      // frames after the intro, otherwise the cylinder appears to pause.
      rotation.current += dt * FINAL_ROTATION_SPEED;
      targetRotation.current = rotation.current;
    } else {
      rotation.current = THREE.MathUtils.damp(rotation.current, targetRotation.current, 3.2, dt);
    }
    group.rotation.y = rotation.current;
    cylinderRotationState.current = rotation.current;
  });

  return (
    <CylinderIntroContext.Provider value={introContext}>
      <group ref={groupRef}>{children}</group>
    </CylinderIntroContext.Provider>
  );
}

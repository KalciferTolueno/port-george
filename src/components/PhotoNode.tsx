import { useContext, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Photo } from '../data/photos';
import { CylinderIntroContext } from './CylinderRig';

type PhotoVisibilityState = 'visible' | 'buffer' | 'hidden';

interface PhotoNodeProps {
  photo: Photo;
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  targetScale: number;
  isFocal: boolean;
  onSelect: () => void;
  introReady: boolean;
  introIndex: number;
  introTotal: number;
  closing?: boolean;
  paused: boolean;
  /**
   * Controls the HTML card without unmounting the 3D node.
   * `visible` keeps the card on screen, `buffer` keeps it mounted but hidden
   * (so its decoded bitmap survives the rotation), `hidden` unmounts the
   * `<Html>` subtree entirely.
   */
  visibilityState?: PhotoVisibilityState;
  /** Mobile viewport flag — enables buffer-card skip optimization. */
  isMobile?: boolean;
  initialPosition?: [number, number, number];
  initialRotation?: [number, number, number];
  initialScale?: number;
}

const CARD_WIDTH = 224;
const CARD_HEIGHT = 280;
const LAMP_POSITION = new THREE.Vector3(0, 12, -4);

function cinematicEase(value: number): number {
  return value < 0.5
    ? 16 * value ** 5
    : 1 - Math.pow(-2 * value + 2, 5) / 2;
}

/**
 * A photo card positioned by Three.js but rendered as a real HTML image.
 * This avoids WebGL texture/CORS problems while preserving the 3D camera,
 * perspective, floating motion, parallax and pointer interaction.
 */
export function PhotoNode({
  photo,
  targetPosition,
  targetRotation,
  targetScale,
  isFocal,
  onSelect,
  introReady,
  introIndex,
  introTotal,
  closing = false,
  paused,
  visibilityState = 'visible',
  isMobile = false,
  initialPosition,
  initialRotation,
  initialScale
}: PhotoNodeProps): JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const worldPositionRef = useRef(new THREE.Vector3());
  const lightDirectionRef = useRef(new THREE.Vector3());
  const cardNormalRef = useRef(new THREE.Vector3());
  const scaleRef = useRef(initialScale ?? (closing ? targetScale : 0));
  const closeProgressRef = useRef(0);
  const initialPlacedRef = useRef(false);
  const initialWorldPositionRef = useRef(new THREE.Vector3());
  const brightnessRef = useRef(1);
  const glowRef = useRef(0);
  const targetBrightnessRef = useRef(1);
  const targetGlowRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  const introContext = useContext(CylinderIntroContext);

  useFrame((state, dtRaw) => {
    const group = groupRef.current;
    if (!group) return;
    if (paused) return;

    const dt = Math.min(0.05, dtRaw);
    const time = state.clock.elapsedTime;

    if (initialPosition && !initialPlacedRef.current) {
      initialWorldPositionRef.current.set(...initialPosition);
      if (introContext) {
        initialWorldPositionRef.current.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          -introContext.rotation.current
        );
      }
      group.position.copy(initialWorldPositionRef.current);
      initialPlacedRef.current = true;
    }
    // Secondary cards stay locked in their grid slots. Only the selected
    // focal card gets a restrained floating motion.
    const introProgress = introContext?.progress.current ?? (introReady ? 1 : 0);

    // Mobile-only optimization: once the intro has finished, buffer cards
    // are CSS-hidden so the browser never composites their HTML layer. We
    // can skip the entire per-frame transform update. NOTE: this stops
    // `PhotoNode`'s own writes (opacity, brightness), but drei's internal
    // `<Html transform>` continues writing `matrix3d(...)` because it reads
    // the parent group's `matrixWorld` directly. See the render path below
    // — for mobile + buffer we unmount the entire `<Html>` subtree to
    // eliminate those writes. The trade-off is a brief image re-decode when
    // a buffer card transitions to visible (acceptable: preloaded URLs +
    // `decoding="async"` make this one-frame).
    if (visibilityState === 'buffer' && isMobile && introProgress >= 1) return;
    // The intro is a radial wave: central ranks reveal first, outer ranks
    // follow as the pulse expands toward the edges.
    const waveStart = introIndex >= 0
      ? (introIndex / Math.max(1, introTotal - 1)) * 0.76
      : 0;
    const waveWidth = 0.24;
    const cardProgress = introIndex >= 0 && introContext
      ? THREE.MathUtils.clamp(
          (introProgress - waveStart) / waveWidth,
          0,
          1
        )
      : introReady ? 1 : 0;
    const introEase = cinematicEase(cardProgress);

    closeProgressRef.current = closing
      ? THREE.MathUtils.damp(closeProgressRef.current, 1, 5, dt)
      : 0;
    const closeFactor = closing ? 1 - closeProgressRef.current : 1;
    const floatY = introReady && isFocal ? Math.sin(time * 0.55) * 0.18 : 0;
    const floatX = 0;
    const swayX = 0;
    const swayZ = isFocal ? Math.sin(time * 0.45) * 0.012 : 0;

    let destinationPosition: [number, number, number] = targetPosition;
    let destinationRotation: [number, number, number] = targetRotation;
    let animationScale = targetScale;
    let animationOpacity = 1;

    if (introIndex >= 0 && introContext && introReady) {
      // The card never leaves its assigned cell. Only its opacity and
      // scale react to the expanding pulse.
      animationScale = targetScale * (1.2 - introEase * 0.2);
      animationOpacity = introEase;
    } else if (!introReady) {
      destinationPosition = [0, 0, 0];
      // Keep the final radial orientation even while transparent. This
      // prevents each image from visibly spinning when it appears.
      destinationRotation = targetRotation;
      animationScale = 0.001;
      animationOpacity = 0;
    }

    group.position.x = THREE.MathUtils.damp(group.position.x, destinationPosition[0] + floatX, 4.2, dt);
    group.position.y = THREE.MathUtils.damp(group.position.y, destinationPosition[1] + floatY, 4.2, dt);
    group.position.z = THREE.MathUtils.damp(group.position.z, destinationPosition[2], 4.2, dt);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, destinationRotation[0] + swayX, 4.2, dt);
    // The radial orientation belongs to the cylinder's local space. The
    // parent rotates the whole rigid cylinder, so the card must not receive
    // any additional independent rotation around its own axis.
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, destinationRotation[1], 5, dt);
    group.rotation.z = THREE.MathUtils.damp(group.rotation.z, destinationRotation[2] + swayZ, 4.2, dt);

    const desiredScale = animationScale * closeFactor;
    scaleRef.current = THREE.MathUtils.damp(scaleRef.current, desiredScale, isFocal ? 4 : 6, dt);
    group.scale.setScalar(Math.max(0.001, scaleRef.current));

    // Approximate the lamp's incidence on an HTML card. The 3D light is
    // present in the scene as well, while these CSS values illuminate the
    // actual DOM image that the browser renders.
    if (cardRef.current) {
      // Opacity is written every frame so the intro radial wave actually
      // fades each card in. Without this the DOM keeps the default opacity
      // (1) and cards pop into view when their scale becomes visible.
      cardRef.current.style.opacity = (animationOpacity * closeFactor).toFixed(3);
    }

    if (cardRef.current && (!introContext || introProgress >= 1)) {
      group.getWorldPosition(worldPositionRef.current);
      lightDirectionRef.current
        .copy(LAMP_POSITION)
        .sub(worldPositionRef.current)
        .normalize();

      cardNormalRef.current
        .set(-worldPositionRef.current.x, 0, -worldPositionRef.current.z)
        .normalize();

      const incidence = Math.max(
        0,
        cardNormalRef.current.dot(lightDirectionRef.current)
      );
      const distance = worldPositionRef.current.distanceTo(LAMP_POSITION);
      const distanceLight = THREE.MathUtils.clamp(1 - distance / 27, 0, 1);
      const heightLight = THREE.MathUtils.clamp(
        (worldPositionRef.current.y + 10) / 22,
        0,
        1
      );
      const intensity = THREE.MathUtils.clamp(
        0.12 + incidence * 0.5 + distanceLight * 0.2 + heightLight * 0.12,
        0,
        1
      );

      targetBrightnessRef.current = 0.9 + intensity * 0.25;
      targetGlowRef.current = intensity * 0.22;
    }

    if (cardRef.current) {
      // Smooth the light values independently from the cylinder rotation.
      brightnessRef.current = THREE.MathUtils.damp(
        brightnessRef.current,
        targetBrightnessRef.current,
        5,
        dt
      );
      glowRef.current = THREE.MathUtils.damp(
        glowRef.current,
        targetGlowRef.current,
        5,
        dt
      );
      cardRef.current.style.setProperty(
        '--photo-brightness',
        brightnessRef.current.toFixed(3)
      );
      cardRef.current.style.setProperty(
        '--photo-lamp-glow',
        glowRef.current.toFixed(3)
      );
    }
  });

  const handleEnter = (): void => {
    setHovered(true);
  };

  const handleLeave = (): void => {
    setHovered(false);
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    onSelect();
  };

  return (
    <group
      ref={groupRef}
      rotation={initialRotation}
    >
      {/*
        Mobile + buffer: do not mount the drei `<Html>` subtree. drei writes
        a fresh `matrix3d(...)` to its internal wrapper on every frame
        regardless of the photo card's CSS visibility, and 20 cards doing
        that at 60fps saturates the mobile compositor and causes flicker.
        Skipping the mount eliminates those writes entirely. When the card
        transitions back to visible, the URL is already preloaded by
        `useImageProgress` and `decoding="async"` keeps the re-decode
        non-blocking, so the entrance is one frame, not a pop.
      */}
      {visibilityState !== 'hidden' && (visibilityState === 'visible' || !isMobile) && (
        <Html
          transform
          center
          distanceFactor={10}
          // The focal card must always sit above every cylinder duplicate.
          zIndexRange={isFocal ? [2000, 2000] : [100, 0]}
          style={{
            pointerEvents: visibilityState === 'visible' ? 'auto' : 'none'
          }}
        >
          <div
            className="photo-hit"
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              visibility: visibilityState === 'buffer' ? 'hidden' : 'visible'
            }}
            onPointerEnter={handleEnter}
            onPointerLeave={handleLeave}
            onClick={handleClick}
          >
            <div
              ref={cardRef}
              className={`photo-card${isFocal ? ' photo-card--focal' : ''}${hovered ? ' photo-card--hovered' : ''}`}
              style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                decoding="async"
                draggable={false}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
              />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

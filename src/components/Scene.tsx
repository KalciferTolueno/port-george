import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

import { photos } from '../data/photos';
import {
  generateCylinderLayout,
  createCylinderIntroRanks,
  getCylinderColumns,
  FOCAL_POSITION,
  MOBILE_FOCAL_POSITION
} from '../utils/layout';
import { PhotoNode } from './PhotoNode';
import { CameraRig } from './CameraRig';
import { CylinderRig, cylinderRotationState } from './CylinderRig';
import { ReactiveBackdrop } from './ReactiveBackdrop';
import type { Theme } from '../types';

const FOCAL_SCALE = 1.8;
// The phone camera can only see a small arc of the cylinder at once. Keeping
// a two-column buffer on both sides makes cards available before they enter
// frame, without asking the mobile compositor to maintain 160 transformed
// HTML layers that are physically behind the camera.
const MOBILE_VISIBLE_COLUMN_RADIUS = 2;

interface SceneProps {
  onFocusChange: (index: number | null) => void;
  theme: Theme;
  introReady: boolean;
  paused: boolean;
}

interface FocusTransitionStart {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export function Scene({ onFocusChange, theme, introReady, paused }: SceneProps): JSX.Element {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [returningIndex, setReturningIndex] = useState<number | null>(null);
  const [returningSlot, setReturningSlot] = useState<number | null>(null);
  const [instantRestoreIndex, setInstantRestoreIndex] = useState<number | null>(null);
  const [focusStart, setFocusStart] = useState<FocusTransitionStart | null>(null);
  const [lensState, setLensState] = useState<'hidden' | 'visible' | 'closing'>('hidden');
  const lensTimerRef = useRef<number | null>(null);

  const scene = useThree((s) => s.scene);
  const viewport = useThree((s) => s.size);
  const isMobile = viewport.width <= 720;
  const cylinderColumns = getCylinderColumns(isMobile);
  const focalPosition = isMobile ? MOBILE_FOCAL_POSITION : FOCAL_POSITION;
  const [mobileFrontColumn, setMobileFrontColumn] = useState(0);
  const mobileFrontColumnRef = useRef(0);

  useFrame(() => {
    if (!isMobile) return;
    const turn = THREE.MathUtils.euclideanModulo(
      cylinderRotationState.current,
      Math.PI * 2
    );
    const nextColumn = Math.round((turn / (Math.PI * 2)) * cylinderColumns) % cylinderColumns;
    if (nextColumn !== mobileFrontColumnRef.current) {
      mobileFrontColumnRef.current = nextColumn;
      setMobileFrontColumn(nextColumn);
    }
  });

  useEffect(() => {
    const background = theme === 'dark' ? '#0d0f15' : '#f5f3ee';
    scene.background = new THREE.Color(background);
    scene.fog = new THREE.Fog(background, 24, 44);
    return () => {
      scene.background = null;
      scene.fog = null;
    };
  }, [scene, theme]);

  const closeFocal = useCallback((): void => {
    if (focusedIndex === null) return;
    const index = focusedIndex;
    const candidates = cylinderItems
      .filter((item) => item.photoIndex === index)
      .map((item) => {
        const position = layout[item.slot]?.position ?? [0, 0, 0];
        const angle = cylinderRotationState.current;
        return {
          slot: item.slot,
          worldZ: -Math.sin(angle) * position[0] + Math.cos(angle) * position[2]
        };
      })
      .sort((a, b) => a.worldZ - b.worldZ);
    const nearest = candidates[0]?.slot ?? null;
    setFocusStart(null);
    setInstantRestoreIndex(null);
    setReturningSlot(nearest);
    setReturningIndex(index);
    setFocusedIndex(null);
    window.setTimeout(() => {
      setReturningIndex((current) => current === index ? null : current);
      setReturningSlot((current) => current === nearest ? null : current);
    }, 900);
  }, [focusedIndex]);

  useEffect(() => {
    window.addEventListener('portfolio:close-focal', closeFocal);
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeFocal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('portfolio:close-focal', closeFocal);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeFocal]);

  useEffect(() => {
    onFocusChange(focusedIndex);
  }, [focusedIndex, onFocusChange]);

  useEffect(() => {
    if (lensTimerRef.current !== null) window.clearTimeout(lensTimerRef.current);
    if (focusedIndex !== null) {
      setLensState('visible');
    } else if (lensState !== 'hidden') {
      setLensState('closing');
      lensTimerRef.current = window.setTimeout(() => setLensState('hidden'), 500);
    }
    return () => {
      if (lensTimerRef.current !== null) window.clearTimeout(lensTimerRef.current);
    };
  }, [focusedIndex]);

  // Keep the cylinder visually dense even when the photographer has a
  // small collection. Extra slots reuse images in a spaced sequence rather
  // than leaving large empty columns.
  const cylinderCount = Math.max(
    isMobile ? cylinderColumns * 5 : cylinderColumns * 4,
    photos.length
  );
  const layout = useMemo(
    () => generateCylinderLayout(cylinderCount, 7, isMobile),
    [cylinderCount, isMobile]
  );
  const introSequence = useMemo(() => {
    const baseRanks = createCylinderIntroRanks(cylinderCount, cylinderColumns);
    const visibleSlots = Array.from({ length: cylinderCount }, (_, slot) => slot)
      // Camera looks toward -Z, so only the front hemisphere participates
      // in the entrance animation.
      .filter((slot) => (layout[slot]?.position[2] ?? 0) < 0)
      .sort((a, b) => (baseRanks[a] ?? 0) - (baseRanks[b] ?? 0));
    const rankBySlot = new Array<number>(cylinderCount).fill(-1);
    visibleSlots.forEach((slot, rank) => {
      rankBySlot[slot] = rank;
    });
    return { rankBySlot, total: visibleSlots.length };
  }, [cylinderCount, cylinderColumns, layout]);
  const cylinderItems = useMemo(
    () => Array.from({ length: cylinderCount }, (_, slot) => {
      const column = slot % cylinderColumns;
      const row = Math.floor(slot / cylinderColumns);
      return {
        slot,
        column,
        // A different deterministic offset per row prevents identical
        // horizontal strips while keeping the physical grid aligned.
        photoIndex: (column * 7 + row * 13 + row * row * 3) % photos.length
      };
    }),
    [cylinderCount, cylinderColumns]
  );

  const handleSelect = useCallback((i: number, slot?: number) => {
    // While a focal image is open, any other card is considered an outside
    // click. Close the current image instead of opening a second one.
    if (focusedIndex !== null && focusedIndex !== i) {
      closeFocal();
      return;
    }
    if (focusedIndex === i) {
      closeFocal();
      return;
    }
    if (focusedIndex !== null) {
      // The previous focal is restored directly into its cylinder cells;
      // only the newly selected image performs the centre transition.
      setInstantRestoreIndex(focusedIndex);
    } else {
      setInstantRestoreIndex(null);
    }
    if (slot !== undefined) {
      const entry = layout[slot] ?? layout[0];
      const position = new THREE.Vector3(...entry.position).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        cylinderRotationState.current
      );
      setFocusStart({
        position: [position.x, position.y, position.z],
        rotation: [
          entry.rotation[0],
          THREE.MathUtils.euclideanModulo(
            entry.rotation[1] + cylinderRotationState.current + Math.PI,
            Math.PI * 2
          ) - Math.PI,
          entry.rotation[2]
        ],
        scale: entry.scale
      });
    } else {
      setFocusStart(null);
    }
    setReturningIndex(null);
    setReturningSlot(null);
    setFocusedIndex(i);
  }, [closeFocal, focusedIndex, layout]);

  return (
    <>
      {/* Lighting — only the ContactShadows needs them; textures are
          MeshBasicMaterial so they're unaffected by lights. */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 8, 5]} intensity={0.45} />
      <pointLight
        position={[0, 12, -4]}
        color="#fff1d4"
        intensity={24}
        distance={28}
        decay={2}
      />

      <ReactiveBackdrop theme={theme} />

      {lensState !== 'hidden' && (
        <Html
          fullscreen
          zIndexRange={[180, 180]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`focus-lens-blur${lensState === 'closing' ? ' focus-lens-blur--closing' : ''}`}
            aria-hidden="true"
          />
        </Html>
      )}

      {/* No focal photo is rendered initially. A click promotes one card
          here, where it floats in front of the cylinder. */}
      {focusedIndex !== null && (() => {
        const activeIndex = focusedIndex;
        const photo = photos[activeIndex];
        return (
          <PhotoNode
            key={`focal-${photo.src}`}
            photo={photo}
            targetPosition={focalPosition}
            targetRotation={[0, 0, 0]}
            targetScale={FOCAL_SCALE}
            isFocal
            onSelect={() => {
              handleSelect(activeIndex);
            }}
            introReady={introReady}
            introIndex={-1}
            introTotal={cylinderCount}
            closing={false}
            paused={paused}
            initialPosition={focusStart?.position}
            initialRotation={focusStart?.rotation}
            initialScale={focusStart?.scale}
          />
        );
      })()}

      <CylinderRig introReady={introReady} paused={paused}>
        {cylinderItems.map(({ slot, photoIndex, column }) => {
          // The focal image (and its copy while closing) is already in
          // front. Do not repeat it on the cylinder, otherwise it competes
          // with the central card or creates a ghost while fading out.
          if (photoIndex === focusedIndex) return null;
          const columnDistance = Math.min(
            Math.abs(column - mobileFrontColumn),
            cylinderColumns - Math.abs(column - mobileFrontColumn)
          );
          if (isMobile && columnDistance > MOBILE_VISIBLE_COLUMN_RADIUS) return null;
          const photo = photos[photoIndex];
          const entry = layout[slot] ?? layout[0];
          const isReturning = photoIndex === returningIndex && slot === returningSlot;
          const isReturningCopy = photoIndex === returningIndex;
          const isInstantRestore = photoIndex === instantRestoreIndex;
          return (
            <PhotoNode
              key={`cylinder-${slot}-${photo.src}`}
              photo={photo}
              targetPosition={entry.position}
              targetRotation={entry.rotation}
              targetScale={entry.scale}
              isFocal={false}
              onSelect={() => handleSelect(photoIndex, slot)}
              introReady={introReady}
              introIndex={introSequence.rankBySlot[slot] ?? -1}
              introTotal={introSequence.total}
              paused={paused}
              initialPosition={isReturning
                ? focalPosition
                : isReturningCopy || isInstantRestore
                  ? entry.position
                  : undefined}
              initialRotation={isReturning
                ? [0, 0, 0]
                : isReturningCopy || isInstantRestore
                  ? entry.rotation
                  : undefined}
              initialScale={isReturning
                ? FOCAL_SCALE
                : isReturningCopy || isInstantRestore
                  ? entry.scale
                  : undefined}
            />
          );
        })}
      </CylinderRig>

      <CameraRig />
    </>
  );
}

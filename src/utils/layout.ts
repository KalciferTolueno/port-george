import { mulberry32 } from './random';

export interface CloudEntry {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  /** Used as a per-photo phase offset for floating/rotation animations. */
  seed: number;
}

/** Position of the central focal photo, just in front of the cylinder wall. */
export const FOCAL_POSITION: [number, number, number] = [0, 0, -23];
export const CYLINDER_COLUMNS = 28;

/**
 * Build a cylindrical gallery layout. Each card sits on the surface of
 * a vertical cylinder and faces outward from its axis.
 */
export function generateCylinderLayout(count: number, seed: number): CloudEntry[] {
  const rand = mulberry32(seed);
  const layout: CloudEntry[] = [];
  const radius = 26;
  const columns = CYLINDER_COLUMNS;
  const rows = Math.ceil(count / columns);
  // Identical padding in both directions: one row gap equals the arc gap
  // between adjacent columns on the cylinder surface.
  const rowGap = (Math.PI * 2 * radius) / columns;

  for (let i = 0; i < count; i++) {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const angle = (column / columns) * Math.PI * 2;
    const y = ((rows - 1) / 2 - row) * rowGap;
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius;
    const distanceFromCamera = Math.hypot(x, y, z);

    layout.push({
      // angle 0 is the wall directly in front of the camera (-Z).
      position: [x, y, z],
      // Every card uses the same upright orientation. The cylinder itself
      // supplies the perspective; cards must not have random tilts.
      rotation: [
        0,
        -angle,
        0
      ],
      // Compensate the extra distance of the upper/lower rows so every
      // card keeps approximately the same apparent size.
      scale: 0.7 * (distanceFromCamera / radius),
      seed: rand() * 1000
    });
  }

  return layout;
}

/**
 * Intro order from the visual centre outward. The first six slots are the
 * two middle rows and the three nearest columns on either side of the front.
 */
export function createCylinderIntroRanks(count: number): number[] {
  const rows = Math.ceil(count / CYLINDER_COLUMNS);
  const centreRow = (rows - 1) / 2;
  const slots = Array.from({ length: count }, (_, slot) => slot);

  slots.sort((a, b) => {
    const rowA = Math.floor(a / CYLINDER_COLUMNS);
    const rowB = Math.floor(b / CYLINDER_COLUMNS);
    const colA = a % CYLINDER_COLUMNS;
    const colB = b % CYLINDER_COLUMNS;
    const columnDistanceA = Math.min(colA, CYLINDER_COLUMNS - colA);
    const columnDistanceB = Math.min(colB, CYLINDER_COLUMNS - colB);
    const rowDistanceA = Math.abs(rowA - centreRow);
    const rowDistanceB = Math.abs(rowB - centreRow);
    const scoreA = columnDistanceA + Math.max(0, rowDistanceA - 0.5) * 3;
    const scoreB = columnDistanceB + Math.max(0, rowDistanceB - 0.5) * 3;
    return scoreA - scoreB || a - b;
  });

  const ranks = new Array<number>(count);
  slots.forEach((slot, rank) => {
    ranks[slot] = rank;
  });
  return ranks;
}

/**
 * Build a deterministic 3D cloud of `count` photo cards arranged in a
 * slightly oblate torus around the focal point, with vertical jitter.
 *
 * Deterministic — same `seed` always produces the same layout.
 */
export function generateCloudLayout(count: number, seed: number): CloudEntry[] {
  const rand = mulberry32(seed);
  const layout: CloudEntry[] = [];

  for (let i = 0; i < count; i++) {
    // Distribute around a torus with extra radial noise + height jitter.
    const u = i / count;
    const turns = 2.2;
    const angle = u * Math.PI * 2 * turns + rand() * 0.6;
    const ringR = 3.8 + Math.sin(u * Math.PI * 3.4) * 1.8 + rand() * 1.6;

    const x = Math.cos(angle) * ringR + (rand() - 0.5) * 0.6;
    const y = (rand() - 0.5) * 7.0;
    const z = Math.sin(angle) * ringR * 0.85 - 4.2 + (rand() - 0.5) * 1.3;

    const scale = 0.42 + rand() * 0.55;

    layout.push({
      position: [x, y, z],
      rotation: [
        (rand() - 0.5) * 0.5,
        (rand() - 0.5) * 0.7,
        (rand() - 0.5) * 0.25
      ],
      scale,
      seed: rand() * 1000
    });
  }

  return layout;
}
